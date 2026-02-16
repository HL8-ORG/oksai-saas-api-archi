import { Module } from '@nestjs/common';
import { InMemoryEventBus } from '@oksai/messaging';
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
		InMemoryEventBus,

		// Application service facade
		{
			provide: TenantApplicationService,
			useFactory: (repo: InMemoryTenantRepository, bus: InMemoryEventBus) => new TenantApplicationService(repo, bus),
			inject: [InMemoryTenantRepository, InMemoryEventBus]
		}
	],
	exports: [TenantApplicationService]
})
export class TenantModule {}

