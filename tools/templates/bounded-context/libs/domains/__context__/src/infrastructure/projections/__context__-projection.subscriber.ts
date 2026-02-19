import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import type { IEventBus, IInbox, IntegrationEventEnvelope } from '@oksai/messaging';
import { OKSAI_EVENT_BUS_TOKEN, OKSAI_INBOX_TOKEN } from '@oksai/messaging';
import { DatabaseUnitOfWork } from '@oksai/database';
import { EntityRepository } from '@mikro-orm/core';
import { InjectRepository } from '@mikro-orm/nestjs';
import { __CONTEXT__ReadModelEntity } from '../read-model/__context__-read-model.entity';

/**
 * @description __CONTEXT__ 投影订阅者（模板）
 *
 * 强约束：
 * - 消费必须幂等（使用 Inbox 基于 messageId 去重）
 * - 写入读模型与 Inbox 标记应在同一事务内（通过 UoW）
 */
@Injectable()
export class __CONTEXT__ProjectionSubscriber implements OnModuleInit {
	private readonly logger = new Logger(__CONTEXT__ProjectionSubscriber.name);

	constructor(
		@Inject(OKSAI_EVENT_BUS_TOKEN) private readonly bus: IEventBus,
		@Inject(OKSAI_INBOX_TOKEN) private readonly inbox: IInbox,
		private readonly uow: DatabaseUnitOfWork,
		@InjectRepository(__CONTEXT__ReadModelEntity)
		private readonly readRepo: EntityRepository<__CONTEXT__ReadModelEntity>
	) {}

	onModuleInit(): void {
		// 模板：订阅 __CONTEXT__Created（实际事件名需与你的领域事件保持一致）
		this.bus.subscribe('__CONTEXT__Created', (env) => this.onCreated(env));
	}

	private async onCreated(env: IntegrationEventEnvelope<any>): Promise<void> {
		const messageId = env.messageId;
		const tenantId = env.tenantId;

		if (!tenantId) {
			// 强约束：多租户事件必须具备 tenantId（来自 CLS / ContextAwareOutbox）
			this.logger.warn(`忽略无 tenantId 的事件：${env.eventType} / ${messageId}`);
			return;
		}

		const processed = await this.inbox.isProcessed(messageId);
		if (processed) return;

		try {
			await this.uow.transactional(async () => {
				await this.readRepo.upsert({
					tenantId,
					name: String(env.payload?.eventData?.name ?? ''),
					updatedAt: new Date()
				});
				await this.inbox.markProcessed(messageId);
			});
		} catch (e) {
			throw e;
		}
	}
}
