import { AnalyzableAggregateRoot, type EventStoreDomainEvent } from '@oksai/event-store';
import { BillingId, Money, BillingStatus, BillingType } from '../value-objects';
import {
	BillingCanBePaidSpecification,
	BillingCanBeRefundedSpecification,
	BillingCanBeCancelledSpecification
} from '../specifications';

/**
 * @description 账单领域事件类型
 */
type BillingEvent = EventStoreDomainEvent;

/**
 * @description 账单异常
 */
export class BillingException extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'BillingException';
	}
}

/**
 * @description 账单聚合根（Rich Model 风格 + 数据分析能力）
 *
 * 继承 AnalyzableAggregateRoot，获得数据分析能力：
 * - 标签管理：为账单打标签（如 "高价值"、"待跟进"）
 * - 业务分类：设置账单分类（如 "订阅"、"一次性"、"退款"）
 * - 分析维度：设置时间、金额、货币等维度
 * - 数据质量：自动计算数据质量分数
 *
 * 职责：
 * - 管理账单生命周期（创建、支付、失败、退款）
 * - 维护账单状态一致性
 * - 记录领域事件
 * - 提供数据分析维度
 *
 * 强约束：
 * - tenantId 必须来自 CLS（由应用层保证）
 * - 金额不能为负数
 * - 状态转换必须符合业务规则
 *
 * @example
 * ```typescript
 * // 创建账单时设置分析维度
 * const billing = BillingAggregate.create(id, tenantId, amount, type, desc);
 * billing.setCategory('subscription');
 * billing.addTag('high-value');
 * billing.setAnalyticsDimension('currency', 'CNY');
 * billing.setAnalyticsDimension('amount_range', '1000-5000');
 * ```
 */
export class BillingAggregate extends AnalyzableAggregateRoot<BillingEvent> {
	private readonly _id: BillingId;
	private readonly _tenantId: string;
	private readonly _amount: Money;
	private readonly _billingType: BillingType;
	private _status: BillingStatus;
	private _description: string;
	private _paidAt?: Date;
	private _failedAt?: Date;
	private _refundAmount?: number;
	private _retryCount: number = 0;

	private constructor(
		id: BillingId,
		tenantId: string,
		amount: Money,
		billingType: BillingType,
		description: string,
		status: BillingStatus
	) {
		super();
		this._id = id;
		this._tenantId = tenantId;
		this._amount = amount;
		this._billingType = billingType;
		this._description = description;
		this._status = status;
	}

	// ==================== 工厂方法 ====================

	/**
	 * @description 创建新账单
	 *
	 * @param id - 账单 ID
	 * @param tenantId - 租户 ID
	 * @param amount - 金额
	 * @param billingType - 账单类型
	 * @param description - 描述
	 * @returns 账单聚合根
	 */
	static create(
		id: BillingId,
		tenantId: string,
		amount: Money,
		billingType: BillingType,
		description: string
	): BillingAggregate {
		const billing = new BillingAggregate(id, tenantId, amount, billingType, description, BillingStatus.PENDING);

		billing.initAuditTimestamps();

		// 设置分析维度
		billing.setAnalyticsDimension('currency', amount.getCurrency());
		billing.setAnalyticsDimension('amount', amount.getAmount());
		billing.setAnalyticsDimension('billing_type', billingType);
		billing.setAnalyticsDimension('status', BillingStatus.PENDING);

		// 根据账单类型设置默认分类
		if (billingType === BillingType.SUBSCRIPTION) {
			billing.setCategory('subscription');
		} else if (billingType === BillingType.ONE_TIME) {
			billing.setCategory('one-time');
		}

		// 根据金额添加标签
		if (amount.getAmount() >= 1000) {
			billing.addTag('high-value');
		}
		if (amount.getAmount() < 100) {
			billing.addTag('low-value');
		}

		billing.addDomainEvent({
			eventType: 'BillingCreated',
			aggregateId: id.toString(),
			occurredAt: billing._createdAt,
			eventData: {
				tenantId,
				amount: amount.getAmount(),
				currency: amount.getCurrency(),
				billingType,
				description
			},
			schemaVersion: 1
		});

		return billing;
	}

	/**
	 * @description 从历史事件重建聚合（事件溯源）
	 *
	 * @param id - 账单 ID
	 * @param events - 历史事件（按 version 升序）
	 * @returns 聚合根
	 */
	static rehydrate(id: BillingId, events: EventStoreDomainEvent[]): BillingAggregate {
		const createdEvent = events.find((e) => e.eventType === 'BillingCreated');
		if (!createdEvent) {
			throw new BillingException(`账单事件流非法：缺少创建事件（billingId=${id.toString()}）。`);
		}

		const data = createdEvent.eventData as any;
		const billing = new BillingAggregate(
			id,
			data.tenantId,
			Money.from(data.amount, data.currency),
			data.billingType as BillingType,
			data.description,
			BillingStatus.PENDING
		);

		// 重建分析维度
		billing.setAnalyticsDimension('currency', data.currency);
		billing.setAnalyticsDimension('amount', data.amount);
		billing.setAnalyticsDimension('billing_type', data.billingType);

		for (const event of events) {
			billing.apply(event);
			billing.version += 1;
		}
		billing.resetEventStateAfterRehydrate();

		return billing;
	}

	// ==================== 业务方法（Rich Model 风格） ====================

	/**
	 * @description 标记账单已支付
	 *
	 * 业务规则：
	 * - 只有待支付状态的账单才能标记为已支付
	 *
	 * @param paymentMethod - 支付方式
	 * @param transactionId - 交易 ID
	 * @throws BillingException 状态不允许时抛出
	 */
	markAsPaid(paymentMethod: string, transactionId: string): void {
		const canBePaid = new BillingCanBePaidSpecification();
		if (!canBePaid.isSatisfiedBy(this)) {
			throw new BillingException(`只有待支付状态的账单才能标记为已支付，当前状态：${this._status}。`);
		}

		this._status = BillingStatus.PAID;
		this._paidAt = new Date();
		this.markUpdated();

		// 更新分析维度
		this.setAnalyticsDimension('status', BillingStatus.PAID);
		this.addTag('paid');

		this.addDomainEvent({
			eventType: 'BillingPaid',
			aggregateId: this._id.toString(),
			occurredAt: this._paidAt,
			eventData: {
				paidAt: this._paidAt,
				paymentMethod,
				transactionId
			},
			schemaVersion: 1
		});
	}

	/**
	 * @description 标记账单支付失败
	 *
	 * 业务规则：
	 * - 只有待支付状态的账单才能标记为失败
	 *
	 * @param reason - 失败原因
	 * @throws BillingException 状态不允许时抛出
	 */
	markAsFailed(reason: string): void {
		const canBePaid = new BillingCanBePaidSpecification();
		if (!canBePaid.isSatisfiedBy(this)) {
			throw new BillingException(`只有待支付状态的账单才能标记为失败，当前状态：${this._status}。`);
		}

		this._status = BillingStatus.FAILED;
		this._failedAt = new Date();
		this._retryCount += 1;
		this.markUpdated();

		this.addDomainEvent({
			eventType: 'BillingFailed',
			aggregateId: this._id.toString(),
			occurredAt: this._failedAt,
			eventData: {
				failedAt: this._failedAt,
				reason,
				retryCount: this._retryCount
			},
			schemaVersion: 1
		});
	}

	/**
	 * @description 退款
	 *
	 * 业务规则：
	 * - 只有已支付状态的账单才能退款
	 *
	 * @param reason - 退款原因
	 * @throws BillingException 状态不允许时抛出
	 */
	refund(reason: string): void {
		const canBeRefunded = new BillingCanBeRefundedSpecification();
		if (!canBeRefunded.isSatisfiedBy(this)) {
			throw new BillingException(`只有已支付状态的账单才能退款，当前状态：${this._status}。`);
		}

		this._status = BillingStatus.REFUNDED;
		this._refundAmount = this._amount.getAmount();
		this.markUpdated();

		this.addDomainEvent({
			eventType: 'BillingRefunded',
			aggregateId: this._id.toString(),
			occurredAt: this._updatedAt,
			eventData: {
				refundedAt: this._updatedAt,
				refundAmount: this._refundAmount,
				reason
			},
			schemaVersion: 1
		});
	}

	/**
	 * @description 取消账单
	 *
	 * 业务规则：
	 * - 只有待支付状态的账单才能取消
	 *
	 * @throws BillingException 状态不允许时抛出
	 */
	cancel(): void {
		const canBeCancelled = new BillingCanBeCancelledSpecification();
		if (!canBeCancelled.isSatisfiedBy(this)) {
			throw new BillingException(`只有待支付状态的账单才能取消，当前状态：${this._status}。`);
		}

		this._status = BillingStatus.CANCELLED;
		this.markUpdated();

		this.addDomainEvent({
			eventType: 'BillingCancelled',
			aggregateId: this._id.toString(),
			occurredAt: this._updatedAt,
			eventData: {},
			schemaVersion: 1
		});
	}

	// ==================== 查询方法 ====================

	/**
	 * @description 检查是否可以支付
	 */
	canPay(): boolean {
		return this._status === BillingStatus.PENDING;
	}

	/**
	 * @description 检查是否可以退款
	 */
	canRefund(): boolean {
		return this._status === BillingStatus.PAID;
	}

	/**
	 * @description 检查是否可以取消
	 */
	canCancel(): boolean {
		return this._status === BillingStatus.PENDING;
	}

	/**
	 * @description 检查是否为最终状态
	 */
	isFinalStatus(): boolean {
		return (
			this._status === BillingStatus.PAID ||
			this._status === BillingStatus.REFUNDED ||
			this._status === BillingStatus.CANCELLED
		);
	}

	// ==================== 事件应用（用于 rehydrate） ====================

	/**
	 * @description 应用事件（用于 rehydrate）
	 */
	protected apply(event: EventStoreDomainEvent): void {
		const data = event.eventData as any;

		switch (event.eventType) {
			case 'BillingCreated':
				this._status = BillingStatus.PENDING;
				this._createdAt = event.occurredAt;
				this._updatedAt = event.occurredAt;
				break;

			case 'BillingPaid':
				this._status = BillingStatus.PAID;
				this._paidAt = data.paidAt;
				this._updatedAt = event.occurredAt;
				break;

			case 'BillingFailed':
				this._status = BillingStatus.FAILED;
				this._failedAt = data.failedAt;
				this._retryCount = data.retryCount;
				this._updatedAt = event.occurredAt;
				break;

			case 'BillingRefunded':
				this._status = BillingStatus.REFUNDED;
				this._refundAmount = data.refundAmount;
				this._updatedAt = event.occurredAt;
				break;

			case 'BillingCancelled':
				this._status = BillingStatus.CANCELLED;
				this._updatedAt = event.occurredAt;
				break;
		}
	}

	// ==================== Getters ====================

	get id(): BillingId {
		return this._id;
	}

	get tenantId(): string {
		return this._tenantId;
	}

	get amount(): Money {
		return this._amount;
	}

	get status(): BillingStatus {
		return this._status;
	}

	get billingType(): BillingType {
		return this._billingType;
	}

	get description(): string {
		return this._description;
	}

	get retryCount(): number {
		return this._retryCount;
	}

	get paidAt(): Date | undefined {
		return this._paidAt;
	}

	get failedAt(): Date | undefined {
		return this._failedAt;
	}

	get refundAmount(): number | undefined {
		return this._refundAmount;
	}

	// 兼容旧 API
	getId(): BillingId {
		return this._id;
	}

	getTenantId(): string {
		return this._tenantId;
	}

	getAmount(): Money {
		return this._amount;
	}

	getStatus(): BillingStatus {
		return this._status;
	}

	getBillingType(): BillingType {
		return this._billingType;
	}

	getDescription(): string {
		return this._description;
	}

	getRetryCount(): number {
		return this._retryCount;
	}
}
