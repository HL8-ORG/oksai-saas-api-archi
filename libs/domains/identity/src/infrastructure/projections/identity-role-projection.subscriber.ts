import { EntityRepository } from '@mikro-orm/core';
import { InjectRepository } from '@mikro-orm/nestjs';
import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { DatabaseUnitOfWork } from '@oksai/database';
import type { IEventBus, IInbox, IntegrationEventEnvelope } from '@oksai/messaging';
import { OKSAI_EVENT_BUS_TOKEN, OKSAI_INBOX_TOKEN } from '@oksai/messaging';
import { IdentityRoleAssignmentEntity } from '../read-model/role-assignment.entity';

/**
 * @description Identity 角色投影订阅者
 *
 * 订阅事件：
 * - AuthUserSignedUp：在 test/dev 环境给首个用户授予 PlatformAdmin（用于打通管理端）
 * - TenantCreated：给创建者授予 TenantOwner（租户侧默认权限）
 *
 * 强约束：
 * - 幂等消费（Inbox messageId）
 * - UoW 事务内写入 read model + inbox 标记
 */
@Injectable()
export class IdentityRoleProjectionSubscriber implements OnModuleInit {
	private readonly logger = new Logger(IdentityRoleProjectionSubscriber.name);

	constructor(
		@Inject(OKSAI_EVENT_BUS_TOKEN) private readonly bus: IEventBus,
		@Inject(OKSAI_INBOX_TOKEN) private readonly inbox: IInbox,
		private readonly uow: DatabaseUnitOfWork,
		@InjectRepository(IdentityRoleAssignmentEntity)
		private readonly repo: EntityRepository<IdentityRoleAssignmentEntity>
	) {}

	onModuleInit(): void {
		this.bus.subscribe<IntegrationEventEnvelope<any>>('AuthUserSignedUp', (env) => this.onAuthUserSignedUp(env));
		this.bus.subscribe<IntegrationEventEnvelope<any>>('TenantCreated', (env) => this.onTenantCreated(env));
		this.logger.log('Identity 角色投影订阅已注册（AuthUserSignedUp/TenantCreated）。');
	}

	private async onAuthUserSignedUp(env: IntegrationEventEnvelope<any>): Promise<void> {
		const messageId = env.messageId;
		if (await this.inbox.isProcessed(messageId)) return;

		const bootstrapEnabled = (process.env.AUTHZ_BOOTSTRAP_PLATFORM_ADMIN ?? '') !== 'false';
		if (!bootstrapEnabled) {
			await this.inbox.markProcessed(messageId);
			return;
		}

		const userId = String(env.payload?.userId ?? '');
		if (!userId) {
			await this.inbox.markProcessed(messageId);
			return;
		}

		await this.uow.transactional(async () => {
			// 若已有任意平台管理员，则不再自动授予
			const existingAdmin = await this.repo.findOne({ tenantId: null, role: 'PlatformAdmin' });
			if (!existingAdmin) {
				const id = roleAssignmentId({ userId, tenantId: null, role: 'PlatformAdmin' });
				const existing = await this.repo.findOne({ id });
				if (!existing) {
					const entity = this.repo.create({
							id,
							userId,
							tenantId: null,
							role: 'PlatformAdmin',
							createdAt: new Date()
						});
					this.repo.getEntityManager().persist(entity);
				}
				await this.repo.getEntityManager().flush();
			}
			await this.inbox.markProcessed(messageId);
		});
	}

	private async onTenantCreated(env: IntegrationEventEnvelope<any>): Promise<void> {
		const messageId = env.messageId;
		if (await this.inbox.isProcessed(messageId)) return;

		const tenantId = env.tenantId;
		const userId = env.userId;
		if (!tenantId || !userId) {
			await this.inbox.markProcessed(messageId);
			return;
		}

		await this.uow.transactional(async () => {
			const id = roleAssignmentId({ userId, tenantId, role: 'TenantOwner' });
			const existing = await this.repo.findOne({ id });
			if (!existing) {
				const entity = this.repo.create({
						id,
						userId,
						tenantId,
						role: 'TenantOwner',
						createdAt: new Date()
					});
				this.repo.getEntityManager().persist(entity);
				await this.repo.getEntityManager().flush();
			}
			await this.inbox.markProcessed(messageId);
		});
	}
}

function roleAssignmentId(params: { userId: string; tenantId: string | null; role: string }): string {
	// 说明：使用“可复现 id”避免重复插入（在至少一次投递 + 幂等条件下更稳）
	const tenantPart = params.tenantId ?? 'platform';
	return `00000000-0000-0000-0000-${hash12(`${params.userId}:${tenantPart}:${params.role}`)}`;
}

function hash12(input: string): string {
	let h = 0;
	for (let i = 0; i < input.length; i++) {
		h = (h * 31 + input.charCodeAt(i)) >>> 0;
	}
	return h.toString(16).padStart(12, '0').slice(0, 12);
}

