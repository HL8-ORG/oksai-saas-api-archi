import { getOksaiRequestContextFromCurrent } from '@oksai/context';
import { IntegrationEventEnvelope, type IEventBus } from '@oksai/messaging';

/**
 * @description
 * 上下文感知事件总线：在 publish 时为 IntegrationEventEnvelope 补齐 CLS 元数据。
 *
 * 能力：
 * - 若 envelope 未携带 tenantId/userId/requestId，则从 CLS 上下文补齐（不覆盖已有值）
 *
 * 注意事项：
 * - 该包装器仅负责“补齐元数据”，不改变投递语义
 * - 幂等与可靠投递仍由 Inbox/Outbox 机制保证
 */
export class ContextAwareEventBus implements IEventBus {
	constructor(private readonly inner: IEventBus) {}

	async publish<TEvent extends object>(event: TEvent): Promise<void> {
		if (event instanceof IntegrationEventEnvelope) {
			const ctx = getOksaiRequestContextFromCurrent();
			const enriched = new IntegrationEventEnvelope({
				eventType: event.eventType,
				payload: event.payload as any,
				schemaVersion: event.schemaVersion,
				messageId: event.messageId,
				occurredAt: event.occurredAt,
				tenantId: event.tenantId ?? ctx.tenantId,
				userId: event.userId ?? ctx.userId,
				requestId: event.requestId ?? ctx.requestId
			});
			return await this.inner.publish(enriched as any);
		}

		return await this.inner.publish(event);
	}

	async subscribe<TEvent extends object>(eventType: string, handler: (event: TEvent) => Promise<void>) {
		return await this.inner.subscribe(eventType, handler);
	}
}
