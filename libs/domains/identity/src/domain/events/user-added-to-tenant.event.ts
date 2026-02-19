import type { DomainEvent } from './domain-event';

export interface UserAddedToTenantEventData {
	tenantId: string;
}

/**
 * @description 用户加入租户领域事件
 */
export class UserAddedToTenantEvent implements DomainEvent<UserAddedToTenantEventData> {
	readonly eventType = 'UserAddedToTenant';
	readonly occurredAt: Date = new Date();
	readonly schemaVersion = 1;

	constructor(
		readonly aggregateId: string,
		readonly eventData: UserAddedToTenantEventData
	) {}
}
