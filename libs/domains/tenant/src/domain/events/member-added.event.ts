import { DomainEventBase, DomainEventMetadata } from './domain-event.base';
import type { DomainEvent } from './domain-event';

/**
 * @description 成员角色
 */
export type MemberRole = 'owner' | 'admin' | 'member';

/**
 * @description 成员添加事件载荷
 */
export interface MemberAddedPayload {
	/**
	 * 成员用户 ID
	 */
	userId: string;

	/**
	 * 成员邮箱
	 */
	email: string;

	/**
	 * 成员角色
	 */
	role: MemberRole;
}

/**
 * @description 成员添加事件
 *
 * 当新成员被添加到租户时触发此事件
 */
export class MemberAddedEvent extends DomainEventBase<MemberAddedPayload> implements DomainEvent<MemberAddedPayload> {
	readonly eventType = 'MemberAdded';

	constructor(aggregateId: string, payload: MemberAddedPayload, metadata?: Partial<DomainEventMetadata>) {
		super(aggregateId, 'Tenant', payload, metadata);
	}
}
