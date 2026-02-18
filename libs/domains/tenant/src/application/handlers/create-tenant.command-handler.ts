import { Injectable } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@oksai/cqrs';
import { createIntegrationEventEnvelope, type IOutbox } from '@oksai/messaging';
import { OksaiRequestContextService } from '@oksai/context';
import type { DatabaseUnitOfWork } from '@oksai/database';
import type { ITenantRepository } from '../ports/tenant.repository.port';
import { CREATE_TENANT_COMMAND_TYPE, type CreateTenantCommand } from '../commands/create-tenant.command';
import { TenantAggregate } from '../../domain/aggregates/tenant.aggregate';
import { TenantId } from '../../domain/value-objects/tenant-id.value-object';
import { TenantName } from '../../domain/value-objects/tenant-name.value-object';
import { TenantSettings } from '../../domain/value-objects/tenant-settings.value-object';

/**
 * @description 创建租户用例处理器（Application Layer）
 *
 * 说明：
 * - 负责编排：创建聚合 → 持久化 → 发布事件
 * - 不包含业务规则细节（交由领域对象保证）
 *
 * 使用方式：
 * - 通过 @CommandHandler 装饰器自动注册到 CommandBus
 * - 由 ApplicationService 通过 commandBus.execute() 调用
 */
@Injectable()
@CommandHandler(CREATE_TENANT_COMMAND_TYPE)
export class CreateTenantCommandHandler implements ICommandHandler<CreateTenantCommand, { tenantId: string }> {
	/**
	 * @param repo - 租户仓储端口
	 * @param outbox - Outbox（发布侧一致性：先写 Outbox，再由 Publisher 投递到事件总线）
	 * @param ctx - 请求上下文（用于写入 tenantId，满足强约束：tenantId 来自 CLS）
	 * @param uow - 数据库工作单元（可选：启用数据库时用于同事务写入）
	 */
	constructor(
		private readonly repo: ITenantRepository,
		private readonly outbox: IOutbox,
		private readonly ctx: OksaiRequestContextService,
		private readonly uow?: DatabaseUnitOfWork
	) {}

	/**
	 * @param command - 创建租户命令
	 * @returns 新租户 ID
	 */
	async execute(command: CreateTenantCommand): Promise<{ tenantId: string }> {
		const tenantId = TenantId.of(generateTenantId());
		const tenantName = TenantName.of(command.name);
		const settings = TenantSettings.of({ maxMembers: command.maxMembers ?? 50 });

		// 强约束：tenantId 必须来自服务端上下文（CLS），禁止客户端透传覆盖
		this.ctx.setTenantId(tenantId.toString());

		const tenant = TenantAggregate.create(tenantId, tenantName, settings);

		// 领域事件发布（Outbox：先写入待发布队列，后台 publisher 负责投递）
		const events = tenant.getUncommittedEvents();
		const envelopes = events.map((e) =>
			createIntegrationEventEnvelope(e.eventType, {
				aggregateId: e.aggregateId,
				occurredAt: e.occurredAt.toISOString(),
				eventData: e.eventData,
				schemaVersion: e.schemaVersion ?? 1
			})
		);

		const persist = async () => {
			await this.repo.save(tenant);
			for (const env of envelopes) {
				await this.outbox.append(env);
			}
			// 对于非事件溯源仓储（例如内存仓储），这里兜底提交事件缓冲，避免重复发布
			tenant.commitUncommittedEvents();
		};

		if (this.uow) {
			await this.uow.transactional(persist);
		} else {
			await persist();
		}

		return { tenantId: tenantId.toString() };
	}
}

function generateTenantId(): string {
	// 最小实现：真实项目应使用雪花/UUID/ULID 等，并在边界处保持稳定
	const rand = Math.random().toString(36).slice(2, 8);
	return `t_${Date.now()}_${rand}`;
}
