import { DomainEventBase, DomainEventMetadata } from './domain-event.base';
import type { DomainEvent } from './domain-event';

/**
 * @description 租户激活事件载荷
 */
export interface TenantActivatedPayload {
	/**
	 * 激活原因（可选）
	 */
	reason?: string;
}

/**
 * @description 租户激活事件
 *
 * 当租户从非激活状态恢复为激活状态时触发此事件
 */
export class TenantActivatedEvent
	extends DomainEventBase<TenantActivatedPayload>
	implements DomainEvent<TenantActivatedPayload>
{
	readonly eventType = 'TenantActivated';

	constructor(aggregateId: string, payload: TenantActivatedPayload = {}, metadata?: Partial<DomainEventMetadata>) {
		super(aggregateId, 'Tenant', payload, metadata);
	}
}
