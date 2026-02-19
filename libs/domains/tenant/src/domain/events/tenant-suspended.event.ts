import { DomainEventBase, DomainEventMetadata } from './domain-event.base';
import type { DomainEvent } from './domain-event';

/**
 * @description 租户暂停事件载荷
 */
export interface TenantSuspendedPayload {
	/**
	 * 暂停原因
	 */
	reason: string;

	/**
	 * 暂停类型
	 */
	suspensionType?: 'manual' | 'payment' | 'violation' | 'system';
}

/**
 * @description 租户暂停事件
 *
 * 当租户被暂停时触发此事件
 */
export class TenantSuspendedEvent
	extends DomainEventBase<TenantSuspendedPayload>
	implements DomainEvent<TenantSuspendedPayload>
{
	readonly eventType = 'TenantSuspended';

	constructor(aggregateId: string, payload: TenantSuspendedPayload, metadata?: Partial<DomainEventMetadata>) {
		super(aggregateId, 'Tenant', payload, metadata);
	}
}
