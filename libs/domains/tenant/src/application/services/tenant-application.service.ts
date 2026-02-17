import type { IOutbox } from '@oksai/messaging';
import type { DatabaseUnitOfWork } from '@oksai/database';
import type { OksaiRequestContextService } from '@oksai/context';
import type { ITenantRepository } from '../ports/tenant.repository.port';
import type { CreateTenantCommand } from '../commands/create-tenant.command';
import { CreateTenantCommandHandler } from '../handlers/create-tenant.command-handler';

/**
 * @description
 * Tenant 应用服务（用例门面）。
 *
 * 使用场景：
 * - Presentation 层（Controller/Resolver）调用应用层时的入口点
 * - 避免 Controller 直接依赖多个 handler / port（降低装配复杂度）
 *
 * 注意事项：
 * - 该类保持无状态
 * - 不包含领域规则细节
 */
export class TenantApplicationService {
	private readonly createTenantHandler: CreateTenantCommandHandler;

	constructor(repo: ITenantRepository, outbox: IOutbox, ctx: OksaiRequestContextService, uow?: DatabaseUnitOfWork) {
		this.createTenantHandler = new CreateTenantCommandHandler(repo, outbox, ctx, uow);
	}

	/**
	 * @description 创建租户
	 * @param command - 命令
	 * @returns 新租户 ID
	 */
	async createTenant(command: CreateTenantCommand): Promise<{ tenantId: string }> {
		return await this.createTenantHandler.execute(command);
	}
}

