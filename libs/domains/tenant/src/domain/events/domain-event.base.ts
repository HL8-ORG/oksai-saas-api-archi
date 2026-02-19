import { DomainEvent } from './domain-event';

/**
 * @description 领域事件基类
 *
 * 所有领域事件都应继承此类，提供完整的事件元数据支持。
 * 与原始 DomainEvent 接口完全兼容。
 *
 * 特性：
 * - 完整的事件元数据（tenantId、userId、correlationId）
 * - 事件版本控制
 * - JSON 序列化支持
 * - 与现有 DomainEvent 接口兼容
 *
 * @template TPayload - 事件载荷类型
 *
 * @example
 * ```typescript
 * // 定义事件载荷
 * export interface TenantCreatedPayload {
 *   tenantId: string;
 *   name: string;
 *   createdAt: Date;
 * }
 *
 * // 创建领域事件
 * export class TenantCreatedEvent extends DomainEventBase<TenantCreatedPayload> {
 *   readonly eventType = 'TenantCreated';
 *
 *   constructor(
 *     aggregateId: string,
 *     payload: TenantCreatedPayload,
 *     metadata?: Partial<DomainEventMetadata>
 *   ) {
 *     super(aggregateId, 'Tenant', payload, metadata);
 *   }
 * }
 * ```
 */
export abstract class DomainEventBase<TPayload extends object = object> implements DomainEvent<TPayload> {
	/**
	 * 事件类型（稳定字符串，禁止随意改名）
	 */
	abstract readonly eventType: string;

	/**
	 * 事件发生时间
	 */
	readonly occurredAt: Date;

	/**
	 * 聚合标识（字符串化）
	 */
	readonly aggregateId: string;

	/**
	 * 聚合类型
	 */
	readonly aggregateType: string;

	/**
	 * 事件载荷（业务字段）
	 */
	readonly eventData: TPayload;

	/**
	 * schema 版本（用于事件演进）
	 */
	readonly schemaVersion: number;

	/**
	 * 事件元数据（用于追踪和关联）
	 */
	readonly metadata: DomainEventMetadata;

	/**
	 * @param aggregateId - 聚合根 ID
	 * @param aggregateType - 聚合根类型
	 * @param payload - 事件载荷
	 * @param metadata - 事件元数据（可选）
	 * @param schemaVersion - Schema 版本（默认 1）
	 */
	constructor(
		aggregateId: string,
		aggregateType: string,
		payload: TPayload,
		metadata?: Partial<DomainEventMetadata>,
		schemaVersion: number = 1
	) {
		this.aggregateId = aggregateId;
		this.aggregateType = aggregateType;
		this.eventData = payload;
		this.occurredAt = new Date();
		this.schemaVersion = schemaVersion;
		this.metadata = {
			tenantId: metadata?.tenantId ?? '',
			userId: metadata?.userId ?? '',
			correlationId: metadata?.correlationId ?? crypto.randomUUID(),
			causationId: metadata?.causationId,
		};
	}

	/**
	 * @description 序列化为 JSON
	 *
	 * @returns JSON 对象
	 */
	toJSON(): Record<string, unknown> {
		return {
			eventType: this.eventType,
			aggregateId: this.aggregateId,
			aggregateType: this.aggregateType,
			eventData: this.eventData,
			occurredAt: this.occurredAt.toISOString(),
			schemaVersion: this.schemaVersion,
			metadata: this.metadata,
		};
	}
}

/**
 * @description 领域事件元数据
 */
export interface DomainEventMetadata {
	/**
	 * 租户 ID
	 */
	tenantId: string;

	/**
	 * 用户 ID
	 */
	userId: string;

	/**
	 * 关联 ID（用于追踪请求链）
	 */
	correlationId: string;

	/**
	 * 因果 ID（触发此事件的事件 ID）
	 */
	causationId?: string;
}
