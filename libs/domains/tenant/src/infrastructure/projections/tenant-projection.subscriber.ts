import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { MikroORM } from '@mikro-orm/core';
import { DatabaseTransactionHost, DatabaseUnitOfWork } from '@oksai/database';
import { OKSAI_EVENT_BUS_TOKEN, OKSAI_INBOX_TOKEN, type Disposable, type IEventBus, type IInbox, type IntegrationEventEnvelope } from '@oksai/messaging';

/**
 * @description
 * Tenant 投影订阅者：把 TenantCreated 事件投影到读模型表。
 *
 * 强约束：
 * - 消费端必须幂等（Inbox 去重：messageId）
 * - 投影只更新读模型，不修改聚合
 */
@Injectable()
export class TenantProjectionSubscriber implements OnModuleInit, OnModuleDestroy {
	private readonly logger = new Logger(TenantProjectionSubscriber.name);
	private disposable: Disposable | null = null;

	constructor(
		@Inject(OKSAI_EVENT_BUS_TOKEN) private readonly bus: IEventBus,
		@Inject(OKSAI_INBOX_TOKEN) private readonly inbox: IInbox,
		private readonly uow: DatabaseUnitOfWork,
		private readonly orm: MikroORM,
		private readonly txHost: DatabaseTransactionHost
	) {}

	async onModuleInit(): Promise<void> {
		this.disposable = await this.bus.subscribe<IntegrationEventEnvelope<any>>('TenantCreated', async (env) => {
			await this.handleTenantCreated(env);
		});
		this.logger.log('Tenant 投影订阅已注册（TenantCreated）。');
	}

	async onModuleDestroy(): Promise<void> {
		if (!this.disposable) return;
		await this.disposable.dispose();
		this.disposable = null;
	}

	private async handleTenantCreated(
		env: IntegrationEventEnvelope<{ aggregateId: string; occurredAt: string; eventData: { name: string }; schemaVersion: number }>
	): Promise<void> {
		// 基础校验：必须有 tenantId（用于行级隔离）
		const tenantId = env.tenantId;
		if (!tenantId) {
			this.logger.warn(`忽略 TenantCreated：缺少 tenantId（messageId=${env.messageId}）。`);
			return;
		}

		const processed = await this.inbox.isProcessed(env.messageId);
		if (processed) return;

		// 投影写入与 inbox 标记使用同事务，避免“写入成功但未标记”导致重复
		await this.uow.transactional(async () => {
			const again = await this.inbox.isProcessed(env.messageId);
			if (again) return;

			const name = String(env.payload.eventData?.name ?? '').trim();
			await this.upsertTenantReadModel({ tenantId, name });
			await this.upsertCheckpoint({ projectionName: 'tenant:readModel', lastMessageId: env.messageId });
			await this.inbox.markProcessed(env.messageId);
		});
	}

	private async upsertTenantReadModel(params: { tenantId: string; name: string }): Promise<void> {
		const em = this.txHost.getCurrentEntityManager() ?? this.orm.em;
		const conn = em.getConnection();
		await conn.execute(
			`insert into tenant_read_model (tenant_id, name, created_at, updated_at)
       values (?, ?, ?, ?)
       on conflict (tenant_id) do update
       set name = excluded.name, updated_at = excluded.updated_at`,
			[params.tenantId, params.name, new Date(), new Date()]
		);
	}

	private async upsertCheckpoint(params: { projectionName: string; lastMessageId: string }): Promise<void> {
		const em = this.txHost.getCurrentEntityManager() ?? this.orm.em;
		const conn = em.getConnection();
		await conn.execute(
			`insert into projection_checkpoints (projection_name, last_message_id, updated_at)
       values (?, ?, ?)
       on conflict (projection_name) do update
       set last_message_id = excluded.last_message_id, updated_at = excluded.updated_at`,
			[params.projectionName, params.lastMessageId, new Date()]
		);
	}
}

