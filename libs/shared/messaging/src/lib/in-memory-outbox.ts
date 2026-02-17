import type { IntegrationEventEnvelope } from './integration-event-envelope';
import type { IOutbox, OutboxRecord } from './outbox';

/**
 * @description
 * 内存 Outbox（仅用于开发/测试）。
 *
 * 注意事项：
 * - 进程重启会丢失记录
 * - 不适用于生产环境
 */
export class InMemoryOutbox implements IOutbox {
	private readonly records = new Map<string, OutboxRecord>();

	async append<TPayload extends object>(envelope: IntegrationEventEnvelope<TPayload>): Promise<void> {
		const messageId = envelope.messageId;
		if (this.records.has(messageId)) {
			throw new Error(`Outbox 追加失败：messageId=${messageId} 已存在。`);
		}

		const now = new Date();
		const record: OutboxRecord<TPayload> = {
			messageId,
			eventType: envelope.eventType,
			occurredAt: envelope.occurredAt,
			schemaVersion: envelope.schemaVersion,
			tenantId: envelope.tenantId,
			userId: envelope.userId,
			requestId: envelope.requestId,
			payload: envelope.payload,
			status: 'pending',
			attempts: 0,
			nextAttemptAt: now,
			createdAt: now,
			updatedAt: now
		};

		this.records.set(messageId, record as unknown as OutboxRecord);
	}

	async listPending(params: { now?: Date; limit?: number } = {}): Promise<OutboxRecord[]> {
		const now = params.now ?? new Date();
		const limit = params.limit ?? 100;
		const result: OutboxRecord[] = [];

		for (const record of this.records.values()) {
			if (record.status !== 'pending') continue;
			if (record.nextAttemptAt.getTime() > now.getTime()) continue;
			result.push(record);
			if (result.length >= limit) break;
		}

		// 稳定排序：先 occurredAt 再 messageId（便于测试与可观测性）
		result.sort((a, b) => {
			const t = a.occurredAt.getTime() - b.occurredAt.getTime();
			return t !== 0 ? t : a.messageId.localeCompare(b.messageId);
		});

		return result;
	}

	async markPublished(messageId: string): Promise<void> {
		const record = this.records.get(messageId);
		if (!record) return;
		record.status = 'published';
		record.updatedAt = new Date();
	}

	async markFailed(params: { messageId: string; attempts: number; nextAttemptAt: Date; lastError?: string }): Promise<void> {
		const record = this.records.get(params.messageId);
		if (!record) return;
		record.attempts = params.attempts;
		record.nextAttemptAt = params.nextAttemptAt;
		record.lastError = params.lastError;
		record.updatedAt = new Date();
	}

	/**
	 * @description （仅用于测试）按 messageId 读取记录快照
	 * @param messageId - 幂等键
	 */
	getSnapshot(messageId: string): OutboxRecord | undefined {
		const r = this.records.get(messageId);
		if (!r) return undefined;
		return { ...r };
	}
}

