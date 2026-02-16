import type { IEventBus } from '@oksai/messaging';
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
	 * @param eventBus - 事件总线（用于发布领域事件/触发投影）
	 */
	constructor(
		private readonly repo: ITenantRepository,
		private readonly eventBus: IEventBus
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

		// 领域事件发布（后续可替换为 Outbox）
		const events = tenant.pullUncommittedEvents();
		for (const e of events) {
			await this.eventBus.publish(e);
		}

		return { tenantId: tenantId.toString() };
	}
}

function generateTenantId(): string {
	// 最小实现：真实项目应使用雪花/UUID/ULID 等，并在边界处保持稳定
	const rand = Math.random().toString(36).slice(2, 8);
	return `t_${Date.now()}_${rand}`;
}

