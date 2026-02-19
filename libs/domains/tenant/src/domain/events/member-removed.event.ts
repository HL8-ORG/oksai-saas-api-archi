import { DomainEventBase, DomainEventMetadata } from './domain-event.base';
import type { DomainEvent } from './domain-event';

/**
 * @description 成员移除事件载荷
 */
export interface MemberRemovedPayload {
	/**
	 * 成员用户 ID
	 */
	userId: string;

	/**
	 * 移除原因（可选）
	 */
	reason?: string;
}

/**
 * @description 成员移除事件
 *
 * 当成员从租户中移除时触发此事件
 */
export class MemberRemovedEvent
	extends DomainEventBase<MemberRemovedPayload>
	implements DomainEvent<MemberRemovedPayload>
{
	readonly eventType = 'MemberRemoved';

	constructor(aggregateId: string, payload: MemberRemovedPayload, metadata?: Partial<DomainEventMetadata>) {
		super(aggregateId, 'Tenant', payload, metadata);
	}
}
