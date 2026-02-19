/**
 * @description
 * EventStore 事件记录（用于读出重建）。
 *
 * 注意事项：
 * - `eventData` 必须是纯数据结构（禁止 ORM 实体/技术对象）
 * - `tenantId` 作为行级隔离字段（强约束）
 */
export interface StoredEvent<TEventData extends object = object> {
	tenantId: string;
	aggregateType: string;
	aggregateId: string;
	version: number;
	eventType: string;
	occurredAt: Date;
	schemaVersion: number;
	eventData: TEventData;
	userId?: string;
	requestId?: string;
}

/**
 * @description
 * EventStore 接受的领域事件最小契约。
 *
 * 注意事项：
 * - 该契约不依赖任何具体 bounded context（避免 shared 包反向依赖 domains）
 */
export interface EventStoreDomainEvent<TEventData extends object = object> {
	readonly eventType: string;
	readonly occurredAt: Date;
	readonly aggregateId: string;
	readonly eventData: TEventData;
	readonly schemaVersion?: number;
}

export interface AppendToStreamParams {
	tenantId: string;
	aggregateType: string;
	aggregateId: string;
	expectedVersion: number;
	events: EventStoreDomainEvent[];
	userId?: string;
	requestId?: string;
}

export interface LoadStreamParams {
	tenantId: string;
	aggregateType: string;
	aggregateId: string;
	fromVersion?: number;
}

/**
 * @description
 * EventStore 接口（事件溯源存储）。
 *
 * 强约束（对齐 ARCHITECTURE.md 6.5.2）：
 * - 单聚合事件流
 * - 乐观并发（expectedVersion）
 * - 严格顺序（version 单调递增）
 */
export interface IEventStore {
	/**
	 * @description 追加事件到聚合事件流（append-only）
	 *
	 * @param params - 写入参数
	 * @throws Error 当 expectedVersion 不匹配时抛出（乐观并发冲突）
	 */
	appendToStream(params: AppendToStreamParams): Promise<{ newVersion: number }>;

	/**
	 * @description 读取聚合事件流
	 * @param params - 读取参数
	 */
	loadStream(params: LoadStreamParams): Promise<{ currentVersion: number; events: StoredEvent[] }>;
}
