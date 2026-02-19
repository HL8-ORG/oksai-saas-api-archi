import type { EventStoreDomainEvent } from './event-store.interface';
import type { AuditInfo, AggregateRootOptions } from './audit-info.interface';

/**
 * @description 聚合根基类
 *
 * 提供所有聚合根共享的基础能力：
 * - 事件版本管理（committedVersion、version）
 * - 领域事件管理（收集、提交、清空）
 * - 审计时间戳（createdAt、updatedAt）
 * - 审计追踪（createdBy、updatedBy）
 * - 软删除能力（deletedAt、deletedBy、isDeleted）
 *
 * @template TEvent - 领域事件类型，默认为 EventStoreDomainEvent
 *
 * @example
 * ```typescript
 * // 定义具体聚合根
 * export class BillingAggregate extends AggregateRoot<BillingEvent> {
 *   private readonly _id: BillingId;
 *
 *   // 工厂方法
 *   static create(id: BillingId, tenantId: string): BillingAggregate {
 *     const agg = new BillingAggregate(id);
 *     agg.initAuditTimestamps(); // 初始化审计时间戳
 *     agg.addDomainEvent({ eventType: 'BillingCreated', ... });
 *     return agg;
 *   }
 *
 *   // 业务方法
 *   markAsPaid(): void {
 *     this._status = BillingStatus.PAID;
 *     this.markUpdated(); // 更新时间戳
 *     this.addDomainEvent({ eventType: 'BillingPaid', ... });
 *   }
 * }
 * ```
 */
export abstract class AggregateRoot<TEvent extends EventStoreDomainEvent = EventStoreDomainEvent> {
	// ==================== 事件版本管理 ====================

	/**
	 * 已提交的事件版本号
	 * 用于乐观并发控制（expectedVersion）
	 */
	protected committedVersion = 0;

	/**
	 * 当前版本号（包含未提交的事件）
	 */
	protected version = 0;

	// ==================== 领域事件管理 ====================

	/**
	 * 未提交的领域事件缓冲区
	 */
	private readonly _domainEvents: TEvent[] = [];

	// ==================== 审计时间戳 ====================

	/**
	 * 创建时间
	 */
	protected _createdAt!: Date;

	/**
	 * 最后更新时间
	 */
	protected _updatedAt!: Date;

	// ==================== 审计追踪 ====================

	/**
	 * 创建者用户 ID
	 */
	protected _createdBy?: string;

	/**
	 * 最后更新者用户 ID
	 */
	protected _updatedBy?: string;

	// ==================== 软删除 ====================

	/**
	 * 软删除时间
	 */
	protected _deletedAt?: Date;

	/**
	 * 删除者用户 ID
	 */
	protected _deletedBy?: string;

	// ==================== 配置选项 ====================

	private readonly _options: Required<AggregateRootOptions>;

	/**
	 * @description 构造函数
	 *
	 * @param options - 配置选项
	 */
	constructor(options?: AggregateRootOptions) {
		this._options = {
			enableSoftDelete: options?.enableSoftDelete ?? true,
			enableAuditTracking: options?.enableAuditTracking ?? true
		};
	}

	// ==================== 审计时间戳方法 ====================

	/**
	 * @description 初始化审计时间戳
	 *
	 * 在聚合根创建时调用，设置 createdAt 和 updatedAt 为当前时间。
	 * 通常在工厂方法的 create 中使用。
	 *
	 * @example
	 * ```typescript
	 * static create(id: string): MyAggregate {
	 *   const agg = new MyAggregate(id);
	 *   agg.initAuditTimestamps();
	 *   return agg;
	 * }
	 * ```
	 */
	protected initAuditTimestamps(): void {
		const now = new Date();
		this._createdAt = now;
		this._updatedAt = now;
	}

	/**
	 * @description 标记为已更新
	 *
	 * 在聚合根状态变更时调用，更新 updatedAt 为当前时间。
	 * 通常在业务方法中调用。
	 *
	 * @param updatedBy - 更新者用户 ID（可选）
	 *
	 * @example
	 * ```typescript
	 * changeStatus(newStatus: Status): void {
	 *   this._status = newStatus;
	 *   this.markUpdated('user-123');
	 * }
	 * ```
	 */
	protected markUpdated(updatedBy?: string): void {
		this._updatedAt = new Date();
		if (this._options.enableAuditTracking && updatedBy) {
			this._updatedBy = updatedBy;
		}
	}

	// ==================== 审计追踪方法 ====================

	/**
	 * @description 设置创建者
	 *
	 * @param createdBy - 创建者用户 ID
	 */
	setCreatedBy(createdBy: string): void {
		if (this._options.enableAuditTracking) {
			this._createdBy = createdBy;
		}
	}

	/**
	 * @description 设置更新者
	 *
	 * 同时更新 updatedAt 时间戳。
	 *
	 * @param updatedBy - 更新者用户 ID
	 */
	setUpdatedBy(updatedBy: string): void {
		if (this._options.enableAuditTracking) {
			this._updatedBy = updatedBy;
			this._updatedAt = new Date();
		}
	}

	/**
	 * @description 获取完整审计信息
	 *
	 * @returns 审计信息对象
	 */
	getAuditInfo(): AuditInfo {
		return {
			createdAt: this._createdAt,
			updatedAt: this._updatedAt,
			createdBy: this._createdBy,
			updatedBy: this._updatedBy,
			deletedAt: this._deletedAt,
			deletedBy: this._deletedBy,
			isDeleted: this.isDeleted()
		};
	}

	// ==================== 软删除方法 ====================

	/**
	 * @description 软删除聚合根
	 *
	 * 业务规则：
	 * - 幂等操作：已删除则无操作
	 * - 设置 deletedAt 和 deletedBy
	 *
	 * @param deletedBy - 删除者用户 ID（可选）
	 */
	softDelete(deletedBy?: string): void {
		if (!this._options.enableSoftDelete) {
			return;
		}

		// 幂等检查
		if (this._deletedAt) {
			return;
		}

		this._deletedAt = new Date();
		if (this._options.enableAuditTracking && deletedBy) {
			this._deletedBy = deletedBy;
		}
		this._updatedAt = this._deletedAt;
	}

	/**
	 * @description 恢复软删除的聚合根
	 *
	 * 业务规则：
	 * - 幂等操作：未删除则无操作
	 * - 清空 deletedAt 和 deletedBy
	 */
	restore(): void {
		if (!this._options.enableSoftDelete) {
			return;
		}

		// 幂等检查
		if (!this._deletedAt) {
			return;
		}

		this._deletedAt = undefined;
		this._deletedBy = undefined;
		this._updatedAt = new Date();
	}

	/**
	 * @description 检查是否已软删除
	 *
	 * @returns 是否已删除
	 */
	isDeleted(): boolean {
		return this._deletedAt !== undefined;
	}

	// ==================== 领域事件管理方法 ====================

	/**
	 * @description 添加领域事件
	 *
	 * 将事件添加到未提交事件缓冲区，并递增版本号。
	 *
	 * @param event - 领域事件
	 */
	protected addDomainEvent(event: TEvent): void {
		this._domainEvents.push(event);
		this.version += 1;
	}

	/**
	 * @description 获取未提交事件快照（不会清空）
	 *
	 * @returns 未提交事件的副本
	 */
	getUncommittedEvents(): TEvent[] {
		return [...this._domainEvents];
	}

	/**
	 * @description 提交未提交事件
	 *
	 * 清空未提交事件缓冲区，并推进 committedVersion。
	 * 通常在事件持久化成功后调用。
	 */
	commitUncommittedEvents(): void {
		this._domainEvents.splice(0, this._domainEvents.length);
		this.committedVersion = this.version;
	}

	/**
	 * @description 获取并清空未提交事件
	 *
	 * 原子操作：获取事件列表后立即清空缓冲区。
	 * 供应用层持久化/发布使用。
	 *
	 * @returns 未提交事件列表
	 */
	pullUncommittedEvents(): TEvent[] {
		const events = this.getUncommittedEvents();
		this.commitUncommittedEvents();
		return events;
	}

	/**
	 * @description 获取当前已提交版本
	 *
	 * 用于乐观并发控制的 expectedVersion 参数。
	 *
	 * @returns 已提交版本号
	 */
	getExpectedVersion(): number {
		return this.committedVersion;
	}

	/**
	 * @description 检查是否有未提交事件
	 *
	 * @returns 是否有未提交事件
	 */
	hasUncommittedEvents(): boolean {
		return this._domainEvents.length > 0;
	}

	/**
	 * @description 获取未提交事件数量
	 *
	 * @returns 未提交事件数量
	 */
	getUncommittedEventCount(): number {
		return this._domainEvents.length;
	}

	// ==================== 事件溯源支持 ====================

	/**
	 * @description 重置事件状态（用于 rehydrate）
	 *
	 * 在从历史事件重建聚合后调用，用于同步版本号和清空事件缓冲区。
	 *
	 * @example
	 * ```typescript
	 * static rehydrate(id: string, events: DomainEvent[]): MyAggregate {
	 *   const agg = new MyAggregate(id);
	 *   for (const e of events) {
	 *     agg.apply(e);
	 *     agg.version += 1;
	 *   }
	 *   agg.resetEventStateAfterRehydrate();
	 *   return agg;
	 * }
	 * ```
	 */
	protected resetEventStateAfterRehydrate(): void {
		this.committedVersion = this.version;
		this._domainEvents.splice(0, this._domainEvents.length);
	}

	/**
	 * @description 应用事件（用于 rehydrate）
	 *
	 * 子类必须实现此方法以支持事件溯源。
	 * 从历史事件恢复聚合状态时调用。
	 *
	 * @param event - 领域事件
	 */
	protected abstract apply(event: TEvent): void;

	// ==================== Getters ====================

	/**
	 * 获取创建时间
	 */
	get createdAt(): Date {
		return this._createdAt;
	}

	/**
	 * 获取最后更新时间
	 */
	get updatedAt(): Date {
		return this._updatedAt;
	}

	/**
	 * 获取创建者
	 */
	get createdBy(): string | undefined {
		return this._createdBy;
	}

	/**
	 * 获取最后更新者
	 */
	get updatedBy(): string | undefined {
		return this._updatedBy;
	}

	/**
	 * 获取删除时间
	 */
	get deletedAt(): Date | undefined {
		return this._deletedAt;
	}

	/**
	 * 获取删除者
	 */
	get deletedBy(): string | undefined {
		return this._deletedBy;
	}
}
