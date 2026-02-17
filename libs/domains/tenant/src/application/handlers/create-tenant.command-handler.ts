import { createIntegrationEventEnvelope, OKSAI_OUTBOX_TOKEN, type IOutbox } from '@oksai/messaging';
import { Inject } from '@nestjs/common';
import type { ITenantRepository } from '../ports/tenant.repository.port';
import type { CreateTenantCommand } from '../commands/create-tenant.command';
import { TenantAggregate } from '../../domain/aggregates/tenant.aggregate';
import { TenantId } from '../../domain/value-objects/tenant-id.value-object';
import { TenantName } from '../../domain/value-objects/tenant-name.value-object';
import { TenantSettings } from '../../domain/value-objects/tenant-settings.value-object';

/**
 * @description
 * 创建租户用例处理器（Application Layer）。
 *
 * 说明：
 * - 负责编排：创建聚合 → 持久化 → 发布事件
 * - 不包含业务规则细节（交由领域对象保证）
 */
export class CreateTenantCommandHandler {
	/**
	 * @param repo - 租户仓储端口
	 * @param outbox - Outbox（发布侧一致性：先写 Outbox，再由 Publisher 投递到事件总线）
	 */
	constructor(
		private readonly repo: ITenantRepository,
		@Inject(OKSAI_OUTBOX_TOKEN) private readonly outbox: IOutbox
	) {}

	/**
	 * @param command - 创建租户命令
	 * @returns 新租户 ID
	 */
	async execute(command: CreateTenantCommand): Promise<{ tenantId: string }> {
		const tenantId = new TenantId(generateTenantId());
		const tenantName = new TenantName(command.name);
		const settings = new TenantSettings(command.maxMembers ?? 50);

		const tenant = TenantAggregate.create(tenantId, tenantName, settings);
		await this.repo.save(tenant);

		// 领域事件发布（Outbox：先写入待发布队列，后台 publisher 负责投递）
		const events = tenant.pullUncommittedEvents();
		for (const e of events) {
			// 最小实现：发布“集成事件 Envelope”（提供 messageId 幂等键）
			const envelope = createIntegrationEventEnvelope(e.eventType, {
				aggregateId: e.aggregateId,
				occurredAt: e.occurredAt.toISOString(),
				eventData: e.eventData,
				schemaVersion: e.schemaVersion ?? 1
			});
			await this.outbox.append(envelope);
		}

		return { tenantId: tenantId.toString() };
	}
}

function generateTenantId(): string {
	// 最小实现：真实项目应使用雪花/UUID/ULID 等，并在边界处保持稳定
	const rand = Math.random().toString(36).slice(2, 8);
	return `t_${Date.now()}_${rand}`;
}

