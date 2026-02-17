import type { DomainEvent } from './domain-event';

export interface __CONTEXT__CreatedEventData {
	name: string;
}

/**
 * @description 创建 __CONTEXT__ 的领域事件（模板）
 */
export class __CONTEXT__CreatedEvent implements DomainEvent<__CONTEXT__CreatedEventData> {
	readonly eventType = '__CONTEXT__Created';
	readonly occurredAt: Date = new Date();
	readonly schemaVersion = 1;

	constructor(
		readonly aggregateId: string,
		readonly eventData: __CONTEXT__CreatedEventData
	) {}
}

