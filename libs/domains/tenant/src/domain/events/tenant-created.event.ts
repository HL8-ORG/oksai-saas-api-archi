import { DomainEventBase, DomainEventMetadata } from './domain-event.base';
import type { DomainEvent } from './domain-event';

/**
 * @description 租户创建事件载荷
 */
export interface TenantCreatedPayload {
	/**
	 * 租户名称
	 */
	name: string;
}

/**
 * @description 租户创建事件
 *
 * 当租户被成功创建时触发此事件。
 * 继承自 DomainEventBase，提供完整的事件元数据支持。
 *
 * @example
 * ```typescript
 * const event = new TenantCreatedEvent(
 *   't-abc123',
 *   { name: '测试租户' },
 *   { tenantId: 't-abc123', userId: 'u-123' }
 * );
 *
 * // 事件类型
 * console.log(event.eventType); // 'TenantCreated'
 *
 * // 事件载荷
 * console.log(event.eventData.name); // '测试租户'
 *
 * // 元数据
 * console.log(event.metadata.correlationId); // UUID
 * ```
 */
export class TenantCreatedEvent
	extends DomainEventBase<TenantCreatedPayload>
	implements DomainEvent<TenantCreatedPayload>
{
	/**
	 * 事件类型（稳定字符串，禁止随意改名）
	 */
	readonly eventType = 'TenantCreated';

	/**
	 * @param aggregateId - tenantId（字符串化）
	 * @param payload - 事件载荷
	 * @param metadata - 事件元数据（可选）
	 */
	constructor(
		aggregateId: string,
		payload: TenantCreatedPayload,
		metadata?: Partial<DomainEventMetadata>
	) {
		super(aggregateId, 'Tenant', payload, metadata);
	}

	/**
	 * @description 向后兼容构造函数
	 *
	 * @param aggregateId - tenantId（字符串化）
	 * @param name - 租户名称
	 * @deprecated 推荐使用新的构造函数签名，传入完整的 payload 对象
	 */
	static fromLegacy(aggregateId: string, name: string): TenantCreatedEvent {
		return new TenantCreatedEvent(aggregateId, { name });
	}
}
