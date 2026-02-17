import type { DomainEvent } from './domain-event';

export interface RoleGrantedToUserEventData {
	tenantId: string;
	role: string;
}

/**
 * @description 授予用户角色领域事件
 */
export class RoleGrantedToUserEvent implements DomainEvent<RoleGrantedToUserEventData> {
	readonly eventType = 'RoleGrantedToUser';
	readonly occurredAt: Date = new Date();
	readonly schemaVersion = 1;

	constructor(
		readonly aggregateId: string,
		readonly eventData: RoleGrantedToUserEventData
	) {}
}

