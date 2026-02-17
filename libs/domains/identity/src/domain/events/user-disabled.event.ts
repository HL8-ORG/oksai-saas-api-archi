import type { DomainEvent } from './domain-event';

export interface UserDisabledEventData {
	reason?: string;
}

/**
 * @description 用户禁用领域事件
 */
export class UserDisabledEvent implements DomainEvent<UserDisabledEventData> {
	readonly eventType = 'UserDisabled';
	readonly occurredAt: Date = new Date();
	readonly schemaVersion = 1;

	constructor(
		readonly aggregateId: string,
		readonly eventData: UserDisabledEventData
	) {}
}

