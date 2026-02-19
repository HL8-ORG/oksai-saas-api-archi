import type { IntegrationEventEnvelope } from './integration-event-envelope';

/**
 * @description Outbox 记录状态
 *
 * 说明：
 * - pending：待发布
 * - published：已成功发布到事件总线
 */
export type OutboxRecordStatus = 'pending' | 'published';

/**
 * @description Outbox 记录（发布侧可靠投递的持久化/缓存单元）
 *
 * 设计目标：
 * - 用 `messageId` 作为幂等键（强约束：全局唯一）
 * - 允许失败重试（attempts/nextAttemptAt/lastError）
 * - 不绑定具体存储（内存/Redis/DB 等可替换）
 */
export interface OutboxRecord<TPayload extends object = object> {
	/**
	 * @description 幂等键（强约束：唯一）
	 */
	messageId: string;

	/**
	 * @description 事件类型（稳定字符串）
	 */
	eventType: string;

	/**
	 * @description 事件发生时间
	 */
	occurredAt: Date;

	/**
	 * @description schema 版本
	 */
	schemaVersion: number;

	/**
	 * @description 上下文字段（用于可观测性与多租户隔离）
	 *
	 * 注意：
	 * - tenantId 强约束必须来自 CLS（由 app-kit 的 ContextAwareOutbox 注入）
	 */
	tenantId?: string;
	userId?: string;
	requestId?: string;

	/**
	 * @description 事件负载（业务字段）
	 */
	payload: TPayload;

	/**
	 * @description 发布状态
	 */
	status: OutboxRecordStatus;

	/**
	 * @description 发布尝试次数
	 */
	attempts: number;

	/**
	 * @description 下次允许重试的时间（用于退避）
	 */
	nextAttemptAt: Date;

	/**
	 * @description 最近一次失败原因（仅用于诊断；禁止包含敏感信息）
	 */
	lastError?: string;

	/**
	 * @description 首次写入 Outbox 的时间
	 */
	createdAt: Date;

	/**
	 * @description 更新时间
	 */
	updatedAt: Date;
}

/**
 * @description Outbox 接口（发布侧一致性保障）
 *
 * 说明：
 * - 生产落地通常由 DB/Redis 等实现
 * - 当前阶段优先提供 InMemory 实现以跑通闭环
 */
export interface IOutbox {
	/**
	 * @description 追加一条待发布记录
	 *
	 * 业务规则：
	 * - `messageId` 必须唯一；重复追加应 fail-fast（防止重复副作用）
	 *
	 * @param envelope - 集成事件 Envelope
	 * @throws Error 当 `messageId` 重复或记录不可写入时
	 */
	append<TPayload extends object>(envelope: IntegrationEventEnvelope<TPayload>): Promise<void>;

	/**
	 * @description 列出待发布记录（仅返回到期可发布的记录）
	 * @param params - 查询参数
	 */
	listPending(params?: { now?: Date; limit?: number }): Promise<OutboxRecord[]>;

	/**
	 * @description 将记录标记为已发布
	 * @param messageId - 幂等键
	 */
	markPublished(messageId: string): Promise<void>;

	/**
	 * @description 记录发布失败并安排重试
	 * @param params - 失败信息
	 */
	markFailed(params: { messageId: string; attempts: number; nextAttemptAt: Date; lastError?: string }): Promise<void>;
}
