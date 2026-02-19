/**
 * @description 领域事件最小契约（模板）
 *
 * 注意事项：
 * - 领域事件必须不可变（使用 readonly）
 * - 领域事件只表达业务语义，不包含技术实现细节
 */
export interface DomainEvent<TEventData extends object = object> {
	readonly eventType: string;
	readonly occurredAt: Date;
	readonly aggregateId: string;
	readonly eventData: TEventData;
	readonly schemaVersion?: number;
}
