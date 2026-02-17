import type { DomainEvent } from './domain-event';

export interface UserRegisteredEventData {
	email: string;
}

/**
 * @description 用户注册领域事件
 */
export class UserRegisteredEvent implements DomainEvent<UserRegisteredEventData> {
	readonly eventType = 'UserRegistered';
	readonly occurredAt: Date = new Date();
	readonly schemaVersion = 1;

	constructor(
		readonly aggregateId: string,
		readonly eventData: UserRegisteredEventData
	) {}
}

