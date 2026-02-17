/**
 * @description 领域事件最小契约（Identity）
 */
export interface DomainEvent<TEventData extends object = object> {
	readonly eventType: string;
	readonly occurredAt: Date;
	readonly aggregateId: string;
	readonly eventData: TEventData;
	readonly schemaVersion?: number;
}

