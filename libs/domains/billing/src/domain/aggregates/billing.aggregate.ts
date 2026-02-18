import type { EventStoreDomainEvent } from '@oksai/event-store';
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
 * @description 账单聚合根（Rich Model 风格）
 *
 * 职责：
 * - 管理账单生命周期（创建、支付、失败、退款）
 * - 维护账单状态一致性
 * - 记录领域事件
 *
 * 强约束：
 * - tenantId 必须来自 CLS（由应用层保证）
 * - 金额不能为负数
 * - 状态转换必须符合业务规则
 */
export class BillingAggregate {
	private readonly _domainEvents: BillingEvent[] = [];
	private committedVersion = 0;
	private version = 0;

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
	private _createdAt!: Date;
	private _updatedAt!: Date;

	private constructor(
		id: BillingId,
		tenantId: string,
		amount: Money,
		billingType: BillingType,
		description: string,
		status: BillingStatus
	) {
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

		// Rich Model：直接设置状态
		const now = new Date();
		billing._createdAt = now;
		billing._updatedAt = now;

		// 记录领域事件
		billing.addDomainEvent({
			eventType: 'BillingCreated',
			aggregateId: id.toString(),
			occurredAt: now,
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

		for (const event of events) {
			billing.apply(event);
			billing.version += 1;
		}
		billing.committedVersion = billing.version;
		billing._domainEvents.splice(0, billing._domainEvents.length);

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
		// 使用规格进行业务规则校验
		const canBePaid = new BillingCanBePaidSpecification();
		if (!canBePaid.isSatisfiedBy(this)) {
			throw new BillingException(`只有待支付状态的账单才能标记为已支付，当前状态：${this._status}。`);
		}

		// Rich Model：直接修改状态
		this._status = BillingStatus.PAID;
		this._paidAt = new Date();
		this._updatedAt = this._paidAt;

		// 记录领域事件
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
		// 使用规格进行业务规则校验
		const canBePaid = new BillingCanBePaidSpecification();
		if (!canBePaid.isSatisfiedBy(this)) {
			throw new BillingException(`只有待支付状态的账单才能标记为失败，当前状态：${this._status}。`);
		}

		// Rich Model：直接修改状态
		this._status = BillingStatus.FAILED;
		this._failedAt = new Date();
		this._retryCount += 1;
		this._updatedAt = this._failedAt;

		// 记录领域事件
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
		// 使用规格进行业务规则校验
		const canBeRefunded = new BillingCanBeRefundedSpecification();
		if (!canBeRefunded.isSatisfiedBy(this)) {
			throw new BillingException(`只有已支付状态的账单才能退款，当前状态：${this._status}。`);
		}

		// Rich Model：直接修改状态
		this._status = BillingStatus.REFUNDED;
		this._refundAmount = this._amount.getAmount();
		this._updatedAt = new Date();

		// 记录领域事件
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
		// 使用规格进行业务规则校验
		const canBeCancelled = new BillingCanBeCancelledSpecification();
		if (!canBeCancelled.isSatisfiedBy(this)) {
			throw new BillingException(`只有待支付状态的账单才能取消，当前状态：${this._status}。`);
		}

		// Rich Model：直接修改状态
		this._status = BillingStatus.CANCELLED;
		this._updatedAt = new Date();

		// 记录领域事件
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

	// ==================== 事件管理 ====================

	/**
	 * @description 获取未提交事件快照（不会清空）
	 */
	getUncommittedEvents(): BillingEvent[] {
		return [...this._domainEvents];
	}

	/**
	 * @description 提交未提交事件（清空缓冲并推进 committedVersion）
	 */
	commitUncommittedEvents(): void {
		this._domainEvents.splice(0, this._domainEvents.length);
		this.committedVersion = this.version;
	}

	/**
	 * @description 获取当前已提交版本（用于 expectedVersion）
	 */
	getExpectedVersion(): number {
		return this.committedVersion;
	}

	/**
	 * @description 获取并清空未提交事件
	 */
	pullUncommittedEvents(): BillingEvent[] {
		const events = this.getUncommittedEvents();
		this.commitUncommittedEvents();
		return events;
	}

	/**
	 * @description 添加领域事件
	 */
	private addDomainEvent(event: BillingEvent): void {
		this._domainEvents.push(event);
		this.version += 1;
	}

	/**
	 * @description 应用事件（用于 rehydrate）
	 */
	private apply(event: EventStoreDomainEvent): void {
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

	get createdAt(): Date {
		return this._createdAt;
	}

	get updatedAt(): Date {
		return this._updatedAt;
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
