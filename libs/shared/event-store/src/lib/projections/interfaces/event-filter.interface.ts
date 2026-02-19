/**
 * @description 事件流相关接口
 *
 * 包含事件流位置追踪等扩展能力
 */

/**
 * @description 事件流位置
 *
 * 用于记录事件消费位置，支持断点续传
 */
export interface EventStreamPosition {
	/**
	 * 最后处理的事件 ID
	 */
	lastEventId: string;

	/**
	 * 最后处理的事件版本号
	 */
	lastVersion: number;

	/**
	 * 最后处理时间
	 */
	processedAt: Date;
}

/**
 * @description 事件处理进度
 *
 * 用于追踪批量事件处理的进度
 */
export interface EventProcessingProgress {
	/**
	 * 已处理事件数
	 */
	processedCount: number;

	/**
	 * 总事件数（如果已知）
	 */
	totalCount?: number;

	/**
	 * 开始处理时间
	 */
	startedAt: Date;

	/**
	 * 预计完成时间（如果可预估）
	 */
	estimatedCompletionAt?: Date;

	/**
	 * 当前处理的事件 ID
	 */
	currentEventId?: string;
}
