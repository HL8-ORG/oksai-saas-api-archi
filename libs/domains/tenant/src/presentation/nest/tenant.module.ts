import { Module } from '@nestjs/common';
import { OKSAI_OUTBOX_TOKEN, type IOutbox } from '@oksai/messaging';
import { InMemoryTenantRepository } from '../../infrastructure/persistence/in-memory-tenant.repository';
import { TenantApplicationService } from '../../application/services/tenant-application.service';

/**
 * @description
 * Tenant 上下文 Nest 装配模块（示例）。
 *
 * 说明：
 * - 该模块负责把“端口接口”绑定到“基础设施实现”
 * - 当前使用 InMemory 实现，仅用于跑通架构闭环
 * - 后续可替换为：Postgres Repository + EventStore + OutboxPublisher 等
 */
@Module({
	providers: [
		// Ports implementations
		InMemoryTenantRepository,

		// Application service facade
		{
			provide: TenantApplicationService,
			useFactory: (repo: InMemoryTenantRepository, outbox: IOutbox) => new TenantApplicationService(repo, outbox),
			inject: [InMemoryTenantRepository, OKSAI_OUTBOX_TOKEN]
		}
	],
	exports: [TenantApplicationService]
})
export class TenantModule {}

