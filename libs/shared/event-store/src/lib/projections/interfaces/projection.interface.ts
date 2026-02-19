import type { StoredEvent } from '../../event-store.interface';

/**
 * @description 投影状态枚举
 */
export enum ProjectionStatus {
	/**
	 * 未初始化
	 */
	NOT_INITIALIZED = 'NOT_INITIALIZED',

	/**
	 * 正在初始化（重建中）
	 */
	INITIALIZING = 'INITIALIZING',

	/**
	 * 正在运行
	 */
	RUNNING = 'RUNNING',

	/**
	 * 已暂停
	 */
	PAUSED = 'PAUSED',

	/**
	 * 错误状态
	 */
	ERROR = 'ERROR',

	/**
	 * 已停止
	 */
	STOPPED = 'STOPPED'
}

/**
 * @description 投影运行时状态
 */
export interface ProjectionRuntimeStatus {
	/**
	 * 投影名称
	 */
	name: string;

	/**
	 * 当前状态
	 */
	status: ProjectionStatus;

	/**
	 * 最后处理的事件 ID
	 */
	lastProcessedEventId?: string;

	/**
	 * 最后处理的事件版本
	 */
	lastProcessedVersion?: number;

	/**
	 * 最后处理时间
	 */
	lastProcessedAt?: Date;

	/**
	 * 已处理事件总数
	 */
	processedEventCount: number;

	/**
	 * 错误次数
	 */
	errorCount: number;

	/**
	 * 最后错误信息
	 */
	lastError?: string;

	/**
	 * 最后错误时间
	 */
	lastErrorAt?: Date;

	/**
	 * 投影创建时间
	 */
	createdAt: Date;

	/**
	 * 投影更新时间
	 */
	updatedAt: Date;
}

/**
 * @description 投影接口
 *
 * 定义投影的基本能力：
 * - 订阅指定事件类型
 * - 处理事件并更新读模型
 * - 支持投影重建
 */
export interface IProjection<TReadModel = unknown> {
	/**
	 * 投影名称（唯一标识）
	 */
	readonly name: string;

	/**
	 * 订阅的事件类型列表
	 *
	 * 只有列表中的事件类型会被分发给此投影
	 */
	readonly subscribedEvents: string[];

	/**
	 * @description 处理单个事件
	 *
	 * @param event - 存储的事件
	 */
	handle(event: StoredEvent): Promise<void>;

	/**
	 * @description 重建整个投影
	 *
	 * 清空现有读模型，从头开始处理所有事件
	 */
	rebuild(): Promise<void>;

	/**
	 * @description 获取投影状态
	 *
	 * @returns 投影运行时状态
	 */
	getStatus(): Promise<ProjectionRuntimeStatus>;

	/**
	 * @description 暂停投影
	 *
	 * 停止处理新事件，但保留当前状态
	 */
	pause?(): Promise<void>;

	/**
	 * @description 恢复投影
	 *
	 * 从暂停状态恢复，继续处理事件
	 */
	resume?(): Promise<void>;

	/**
	 * @description 获取读模型（用于查询）
	 *
	 * @param filter - 过滤条件
	 * @returns 读模型列表
	 */
	getReadModels?(filter?: Record<string, unknown>): Promise<TReadModel[]>;
}

/**
 * @description 投影配置
 */
export interface ProjectionConfig {
	/**
	 * 投影名称
	 */
	name: string;

	/**
	 * 是否在启动时自动重建
	 *
	 * 默认值：false
	 */
	autoRebuild?: boolean;

	/**
	 * 是否启用重试
	 *
	 * 默认值：true
	 */
	enableRetry?: boolean;

	/**
	 * 最大重试次数
	 *
	 * 默认值：3
	 */
	maxRetries?: number;

	/**
	 * 重试延迟（毫秒）
	 *
	 * 默认值：1000
	 */
	retryDelayMs?: number;

	/**
	 * 批量处理大小
	 *
	 * 默认值：100
	 */
	batchSize?: number;

	/**
	 * 是否启用并行处理
	 *
	 * 默认值：false（保证顺序）
	 */
	enableParallel?: boolean;
}

/**
 * @description 默认投影配置
 */
export const DEFAULT_PROJECTION_CONFIG: Required<Omit<ProjectionConfig, 'name'>> = {
	autoRebuild: false,
	enableRetry: true,
	maxRetries: 3,
	retryDelayMs: 1000,
	batchSize: 100,
	enableParallel: false
};
