import type { StoredEvent } from '../../event-store.interface';

/**
 * @description 聚合快照
 *
 * 存储聚合根在某一时刻的完整状态，用于加速重建。
 * 当聚合事件数量过多时，从快照重建比从事件流重建更高效。
 */
export interface AggregateSnapshot<TState = unknown> {
	/**
	 * 快照 ID
	 */
	id: string;

	/**
	 * 租户 ID
	 */
	tenantId: string;

	/**
	 * 聚合类型
	 *
	 * 例如：'Tenant', 'Billing', 'User'
	 */
	aggregateType: string;

	/**
	 * 聚合 ID
	 */
	aggregateId: string;

	/**
	 * 快照版本号
	 *
	 * 对应聚合在此时的事件版本号
	 */
	version: number;

	/**
	 * 聚合状态
	 *
	 * 聚合根在此时版本的完整状态
	 */
	state: TState;

	/**
	 * 快照创建时间
	 */
	createdAt: Date;

	/**
	 * 快照元数据
	 */
	metadata?: SnapshotMetadata;
}

/**
 * @description 快照元数据
 */
export interface SnapshotMetadata {
	/**
	 * 创建快照的触发原因
	 *
	 * 例如：'event_count_threshold', 'manual', 'scheduled'
	 */
	trigger?: string;

	/**
	 * 快照压缩算法
	 *
	 * 如果 state 被压缩，记录压缩算法
	 * 例如：'gzip', 'none'
	 */
	compression?: 'gzip' | 'none';

	/**
	 * 状态序列化格式
	 *
	 * 例如：'json', 'protobuf'
	 */
	format?: string;
}

/**
 * @description 快照存储接口
 *
 * 提供快照的存储和加载能力
 */
export interface ISnapshotStore {
	/**
	 * @description 保存快照
	 *
	 * @param snapshot - 聚合快照
	 */
	saveSnapshot<TState = unknown>(snapshot: AggregateSnapshot<TState>): Promise<void>;

	/**
	 * @description 加载最新快照
	 *
	 * 返回聚合的最新快照，如果不存在则返回 null
	 *
	 * @param tenantId - 租户 ID
	 * @param aggregateType - 聚合类型
	 * @param aggregateId - 聚合 ID
	 * @returns 最新快照或 null
	 */
	loadLatestSnapshot<TState = unknown>(
		tenantId: string,
		aggregateType: string,
		aggregateId: string
	): Promise<AggregateSnapshot<TState> | null>;

	/**
	 * @description 加载指定版本的快照
	 *
	 * 返回指定版本或之前最新的快照
	 *
	 * @param tenantId - 租户 ID
	 * @param aggregateType - 聚合类型
	 * @param aggregateId - 聚合 ID
	 * @param maxVersion - 最大版本号
	 * @returns 快照或 null
	 */
	loadSnapshotAtVersion<TState = unknown>(
		tenantId: string,
		aggregateType: string,
		aggregateId: string,
		maxVersion: number
	): Promise<AggregateSnapshot<TState> | null>;

	/**
	 * @description 删除快照
	 *
	 * 删除指定聚合的所有快照
	 *
	 * @param tenantId - 租户 ID
	 * @param aggregateType - 聚合类型
	 * @param aggregateId - 聚合 ID
	 */
	deleteSnapshots(tenantId: string, aggregateType: string, aggregateId: string): Promise<void>;
}

/**
 * @description 快照策略配置
 *
 * 控制何时创建快照
 */
export interface SnapshotStrategy {
	/**
	 * 事件数量阈值
	 *
	 * 当聚合的事件数量超过此值时创建快照
	 * 默认值：100
	 */
	eventCountThreshold: number;

	/**
	 * 版本间隔阈值
	 *
	 * 当聚合版本与上次快照版本的差值超过此值时创建快照
	 * 默认值：50
	 */
	versionIntervalThreshold: number;

	/**
	 * 时间间隔阈值（毫秒）
	 *
	 * 距离上次快照超过此时间时创建快照
	 * 设置为 0 表示禁用时间阈值
	 * 默认值：0（禁用）
	 */
	timeIntervalThresholdMs: number;

	/**
	 * 是否启用压缩
	 *
	 * 启用后使用 gzip 压缩快照数据
	 * 默认值：true
	 */
	enableCompression: boolean;
}

/**
 * @description 默认快照策略
 */
export const DEFAULT_SNAPSHOT_STRATEGY: SnapshotStrategy = {
	eventCountThreshold: 100,
	versionIntervalThreshold: 50,
	timeIntervalThresholdMs: 0,
	enableCompression: true
};

/**
 * @description 快照构建器接口
 *
 * 用于从事件流构建聚合状态
 */
export interface ISnapshotBuilder<TState = unknown> {
	/**
	 * @description 从事件流构建状态
	 *
	 * @param initialState - 初始状态（可选）
	 * @param events - 事件列表
	 * @returns 最终状态
	 */
	buildFromEvents(initialState: TState | null, events: StoredEvent[]): TState;
}
