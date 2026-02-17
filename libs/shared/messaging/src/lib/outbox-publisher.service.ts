import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import type { IEventBus } from './event-bus';
import type { IOutbox } from './outbox';
import type { OutboxRecord } from './outbox';
import { OKSAI_EVENT_BUS_TOKEN, OKSAI_OUTBOX_TOKEN } from './tokens';

/**
 * @description
 * Outbox 发布器（后台轮询 pending 记录并投递到事件总线）。
 *
 * 设计目标：
 * - 在 Outbox/Inbox 模式下，实现发布侧“最终一致性”的可靠投递循环
 * - 失败可重试（退避），不阻塞主业务流程
 *
 * 注意事项：
 * - 当前仅适配同进程 `IEventBus`（InMemory）；后续接 MQ 仍可复用本服务的调度与重试逻辑
 * - 默认仅 development 启用；生产可通过 `OUTBOX_PUBLISHER_ENABLED=true` 显式开启
 */
@Injectable()
export class OutboxPublisherService implements OnModuleInit, OnModuleDestroy {
	private readonly logger = new Logger(OutboxPublisherService.name);
	private timer: NodeJS.Timeout | null = null;

	constructor(
		@Inject(OKSAI_OUTBOX_TOKEN) private readonly outbox: IOutbox,
		@Inject(OKSAI_EVENT_BUS_TOKEN) private readonly bus: IEventBus
	) {}

	onModuleInit(): void {
		if (!this.isEnabled()) return;
		const intervalMs = this.getIntervalMs();
		this.timer = setInterval(() => {
			void this.tickOnce();
		}, intervalMs);
		this.logger.log(`Outbox 发布器已启用，轮询间隔 ${intervalMs}ms。`);
	}

	onModuleDestroy(): void {
		if (!this.timer) return;
		clearInterval(this.timer);
		this.timer = null;
	}

	/**
	 * @description 执行一次发布循环（用于测试或手动触发）
	 */
	async tickOnce(): Promise<void> {
		const pending = await this.outbox.listPending({ limit: 100 });
		if (pending.length === 0) return;

		for (const record of pending) {
			await this.publishRecord(record);
		}
	}

	private async publishRecord(record: OutboxRecord): Promise<void> {
		try {
			// 这里直接按 record 字段还原为最小 Envelope 结构（兼容 event bus 的 eventType 推断）
			const envelope = {
				eventType: record.eventType,
				messageId: record.messageId,
				occurredAt: record.occurredAt,
				schemaVersion: record.schemaVersion,
				tenantId: record.tenantId,
				userId: record.userId,
				requestId: record.requestId,
				payload: record.payload
			};

			await this.bus.publish(envelope);
			await this.outbox.markPublished(record.messageId);
		} catch (err: unknown) {
			const attempts = record.attempts + 1;
			const nextAttemptAt = new Date(Date.now() + this.getBackoffMs(attempts));
			const lastError = err instanceof Error ? err.message : '未知错误';
			await this.outbox.markFailed({ messageId: record.messageId, attempts, nextAttemptAt, lastError });
		}
	}

	private isEnabled(): boolean {
		const enabled = String(process.env.OUTBOX_PUBLISHER_ENABLED ?? '').trim().toLowerCase();
		if (enabled === 'true') return true;
		if (enabled === 'false') return false;
		return (process.env.NODE_ENV ?? 'development') === 'development';
	}

	private getIntervalMs(): number {
		const raw = String(process.env.OUTBOX_PUBLISH_INTERVAL_MS ?? '').trim();
		const n = Number(raw);
		if (!Number.isFinite(n) || n <= 0) return 1000;
		return Math.floor(n);
	}

	private getBackoffMs(attempts: number): number {
		// 指数退避：1s,2s,4s,... 最长 60s
		const base = 1000;
		const max = 60_000;
		const exp = Math.min(10, Math.max(0, attempts - 1));
		return Math.min(max, base * 2 ** exp);
	}
}

