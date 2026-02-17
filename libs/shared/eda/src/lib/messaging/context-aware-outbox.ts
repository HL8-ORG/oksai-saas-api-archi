import { BadRequestException } from '@nestjs/common';
import { getOksaiRequestContextFromCurrent } from '@oksai/context';
import { IntegrationEventEnvelope, type IOutbox } from '@oksai/messaging';

/**
 * @description
 * 上下文感知 Outbox：在追加 Outbox 记录时，自动从 CLS 注入 `tenantId/userId/requestId`。
 *
 * 强约束：
 * - `tenantId` 必须来自服务端上下文（CLS），禁止客户端透传覆盖。
 * - 当调用方显式传入 tenantId 且与 CLS 不一致时，必须 fail-fast。
 */
export class ContextAwareOutbox implements IOutbox {
	constructor(private readonly inner: IOutbox) {}

	async append<TPayload extends object>(envelope: IntegrationEventEnvelope<TPayload>): Promise<void> {
		const ctx = getOksaiRequestContextFromCurrent();
		const ctxTenantId = ctx.tenantId;

		if (ctxTenantId && envelope.tenantId && envelope.tenantId !== ctxTenantId) {
			throw new BadRequestException(`禁止覆盖租户标识：上下文 tenantId=${ctxTenantId}，入参 tenantId=${envelope.tenantId}。`);
		}

		const enriched = new IntegrationEventEnvelope<TPayload>({
			eventType: envelope.eventType,
			payload: envelope.payload,
			schemaVersion: envelope.schemaVersion,
			messageId: envelope.messageId,
			occurredAt: envelope.occurredAt,
			tenantId: ctxTenantId ?? envelope.tenantId,
			userId: ctx.userId ?? envelope.userId,
			requestId: ctx.requestId ?? envelope.requestId
		});

		await this.inner.append(enriched);
	}

	listPending(params?: { now?: Date; limit?: number }) {
		return this.inner.listPending(params);
	}

	markPublished(messageId: string) {
		return this.inner.markPublished(messageId);
	}

	markFailed(params: { messageId: string; attempts: number; nextAttemptAt: Date; lastError?: string }) {
		return this.inner.markFailed(params);
	}
}

