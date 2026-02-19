import { randomUUID } from 'node:crypto';

/**
 * @description
 * 集成事件 Envelope（用于跨模块/跨服务投递的标准包装）。
 *
 * 设计目标：
 * - 统一幂等键（messageId）
 * - 统一可观测性字段（tenantId/userId/requestId）
 * - 统一事件负载结构（payload）
 *
 * 注意事项：
 * - 当前用于“同进程”事件总线演示；后续接 Outbox/MQ 时仍可复用该结构
 */
export class IntegrationEventEnvelope<TPayload extends object = object> {
	/**
	 * @description 事件类型（稳定字符串）
	 */
	readonly eventType: string;

	/**
	 * @description 消息唯一标识（幂等键）
	 */
	readonly messageId: string;

	/**
	 * @description 事件发生时间
	 */
	readonly occurredAt: Date;

	/**
	 * @description schema 版本（用于演进）
	 */
	readonly schemaVersion: number;

	/**
	 * @description 租户标识（强约束：不可被覆盖）
	 */
	readonly tenantId?: string;

	/**
	 * @description 用户标识（如可得）
	 */
	readonly userId?: string;

	/**
	 * @description 请求标识（或 traceId）
	 */
	readonly requestId?: string;

	/**
	 * @description 事件负载（业务字段）
	 */
	readonly payload: TPayload;

	constructor(params: {
		eventType: string;
		payload: TPayload;
		schemaVersion?: number;
		messageId?: string;
		occurredAt?: Date;
		tenantId?: string;
		userId?: string;
		requestId?: string;
	}) {
		this.eventType = params.eventType;
		this.payload = params.payload;
		this.schemaVersion = params.schemaVersion ?? 1;
		this.messageId = params.messageId ?? randomUUID();
		this.occurredAt = params.occurredAt ?? new Date();
		this.tenantId = params.tenantId;
		this.userId = params.userId;
		this.requestId = params.requestId;
	}
}

/**
 * @description 将“领域事件/任意事件对象”包装为集成事件 Envelope（最小实现）
 *
 * @param eventType - 事件类型
 * @param payload - 负载（建议为纯数据结构）
 */
export function createIntegrationEventEnvelope<TPayload extends object>(
	eventType: string,
	payload: TPayload,
	meta: { tenantId?: string; userId?: string; requestId?: string; schemaVersion?: number; messageId?: string } = {}
): IntegrationEventEnvelope<TPayload> {
	return new IntegrationEventEnvelope<TPayload>({
		eventType,
		payload,
		schemaVersion: meta.schemaVersion,
		messageId: meta.messageId,
		tenantId: meta.tenantId,
		userId: meta.userId,
		requestId: meta.requestId
	});
}
