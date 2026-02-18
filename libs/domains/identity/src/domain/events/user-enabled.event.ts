import type { DomainEvent } from './domain-event';

export interface UserEnabledEventData {}

/**
 * @description 用户启用领域事件
 */
export class UserEnabledEvent implements DomainEvent<UserEnabledEventData> {
	readonly eventType = 'UserEnabled';
	readonly occurredAt: Date = new Date();
	readonly schemaVersion = 1;

	constructor(
		readonly aggregateId: string,
		readonly eventData: UserEnabledEventData
	) {}
}
