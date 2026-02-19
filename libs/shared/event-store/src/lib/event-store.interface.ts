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
 *
 * 扩展能力（Phase 8）：
 * - 批量事件加载（用于分析场景）
 * - 事件订阅（用于投影实时同步）
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

	/**
	 * @description 批量加载事件（用于分析和投影重建）
	 *
	 * ⚠️ 此方法用于分析场景，不用于业务逻辑
	 *
	 * @param filter - 事件过滤器
	 * @param options - 加载选项
	 * @returns 事件列表
	 */
	loadAllEvents?(filter?: EventFilter, options?: EventLoadOptions): Promise<StoredEvent[]>;

	/**
	 * @description 流式加载事件（用于大数据量处理）
	 *
	 * 使用 AsyncIterable 支持处理大量事件而不占用过多内存
	 *
	 * @param filter - 事件过滤器
	 * @param options - 加载选项
	 * @returns 事件异步迭代器
	 */
	streamAllEvents?(filter?: EventFilter, options?: EventLoadOptions): AsyncIterable<StoredEvent>;

	/**
	 * @description 订阅事件流（用于投影实时同步）
	 *
	 * @param handler - 事件处理器
	 * @param filter - 事件过滤器（可选）
	 * @returns 取消订阅函数
	 */
	subscribe?(handler: (event: StoredEvent) => Promise<void>, filter?: EventFilter): () => void;
}

/**
 * @description 事件过滤器接口
 *
 * 用于 loadAllEvents 场景，支持多维度过滤
 */
export interface EventFilter {
	tenantId?: string;
	aggregateType?: string;
	aggregateId?: string;
	eventType?: string;
	eventTypes?: string[];
	from?: Date;
	to?: Date;
	fromVersion?: number;
	batchSize?: number;
}

/**
 * @description 事件加载选项
 *
 * 控制事件加载行为
 */
export interface EventLoadOptions {
	includeMetadata?: boolean;
	ascending?: boolean;
	limit?: number;
	offset?: number;
}
