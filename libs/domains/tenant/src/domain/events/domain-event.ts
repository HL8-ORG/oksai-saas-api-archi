/**
 * @description
 * 领域事件抽象（最小集合）。
 *
 * 说明：
 * - 事件应当“自描述”且“不可变”
 * - 事件应当用于：审计、投影、集成（跨上下文/跨服务）
 */
export interface DomainEvent<TEventData extends object = object> {
	/**
	 * @description 事件类型（稳定字符串，禁止随意改名）
	 */
	readonly eventType: string;

	/**
	 * @description 事件发生时间
	 */
	readonly occurredAt: Date;

	/**
	 * @description 聚合标识（字符串化）
	 */
	readonly aggregateId: string;

	/**
	 * @description 事件负载（业务字段）
	 */
	readonly eventData: TEventData;

	/**
	 * @description schema 版本（用于事件演进；可选）
	 */
	readonly schemaVersion?: number;
}
