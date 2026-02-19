import type { DomainEvent } from './domain-event';

/**
 * @description 租户创建事件
 */
export class TenantCreatedEvent implements DomainEvent<{ name: string }> {
	readonly eventType = 'TenantCreated';
	readonly occurredAt = new Date();
	readonly schemaVersion = 1;

	readonly aggregateId: string;
	readonly eventData: { name: string };

	/**
	 * @param aggregateId - tenantId（字符串化）
	 * @param name - 租户名称
	 */
	constructor(aggregateId: string, name: string) {
		this.aggregateId = aggregateId;
		this.eventData = { name };
	}
}
