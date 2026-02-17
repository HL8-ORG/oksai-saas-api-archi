import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import type { IEventBus, IInbox, IntegrationEventEnvelope, Disposable } from '@oksai/messaging';
import { OKSAI_EVENT_BUS_TOKEN, OKSAI_INBOX_TOKEN } from '@oksai/messaging';
import type { DatabaseUnitOfWork } from '@oksai/database';

/**
 * @description
 * 集成事件订阅者基类：封装"订阅 + inbox 幂等 + UoW 事务 + 可观测字段"。
 *
 * 强约束：
 * - 消费端必须幂等（Inbox 去重：messageId）
 * - 投影只更新读模型，不修改聚合
 */
@Injectable()
export abstract class BaseIntegrationEventSubscriber implements OnModuleInit, OnModuleDestroy {
	protected readonly logger = new Logger(this.constructor.name);
	private readonly disposables: Disposable[] = [];

	constructor(
		@Inject(OKSAI_EVENT_BUS_TOKEN) protected readonly bus: IEventBus,
		@Inject(OKSAI_INBOX_TOKEN) protected readonly inbox: IInbox,
		protected readonly uow: DatabaseUnitOfWork
	) {}

	async onModuleInit(): Promise<void> {
		await this.setupSubscriptions();
		this.logger.log(`集成事件订阅者已初始化：${this.constructor.name}`);
	}

	async onModuleDestroy(): Promise<void> {
		for (const disposable of this.disposables) {
			await disposable.dispose();
		}
		this.disposables.length = 0;
	}

	/**
	 * @description 子类实现此方法，通过 `subscribe` 注册事件处理器。
	 */
	protected abstract setupSubscriptions(): Promise<void>;

	/**
	 * @description 订阅指定事件类型，自动处理幂等、事务和日志。
	 *
	 * @param eventType - 事件类型
	 * @param handler - 事件处理器（在事务内执行）
	 */
	protected async subscribe<TPayload extends object>(
		eventType: string,
		handler: (env: IntegrationEventEnvelope<TPayload>) => Promise<void>
	): Promise<void> {
		const disposable = await this.bus.subscribe<IntegrationEventEnvelope<TPayload>>(eventType, async (env) => {
			await this.handleWithIdempotency(env, handler);
		});
		this.disposables.push(disposable);
	}

	/**
	 * @description 在幂等和事务保护下执行事件处理器。
	 *
	 * @param env - 集成事件 Envelope
	 * @param handler - 事件处理器
	 */
	private async handleWithIdempotency<TPayload extends object>(
		env: IntegrationEventEnvelope<TPayload>,
		handler: (env: IntegrationEventEnvelope<TPayload>) => Promise<void>
	): Promise<void> {
		const { messageId, eventType, tenantId, userId, requestId } = env;

		// 快速检查是否已处理
		const processed = await this.inbox.isProcessed(messageId);
		if (processed) {
			this.logger.debug(
				`事件已处理，跳过：eventType=${eventType}, messageId=${messageId}, tenantId=${tenantId ?? ''}, userId=${userId ?? ''}, requestId=${requestId ?? ''}`
			);
			return;
		}

		try {
			await this.uow.transactional(async () => {
				// 事务内再次检查，防止并发
				const again = await this.inbox.isProcessed(messageId);
				if (again) return;

				await handler(env);
				await this.inbox.markProcessed(messageId);
			});
		} catch (error) {
			this.logger.error(
				`事件处理失败：eventType=${eventType}, messageId=${messageId}, tenantId=${tenantId ?? ''}, userId=${userId ?? ''}, requestId=${requestId ?? ''}`,
				error instanceof Error ? error.stack : String(error)
			);
			throw error;
		}
	}
}
