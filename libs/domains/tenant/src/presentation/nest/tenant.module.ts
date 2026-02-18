import { type DynamicModule, Module } from '@nestjs/common';
import { setupEventStoreModule } from '@oksai/event-store';
import { OksaiCqrsModule } from '@oksai/cqrs';
import { InMemoryTenantRepository } from '../../infrastructure/persistence/in-memory-tenant.repository';
import { EventSourcedTenantRepository } from '../../infrastructure/persistence/event-sourced-tenant.repository';
import { TenantApplicationService } from '../../application/services/tenant-application.service';
import { CreateTenantCommandHandler } from '../../application/handlers/create-tenant.command-handler';
import { OKSAI_TENANT_READ_MODEL_TOKEN } from '../../application/ports/tenant-read-model.port';
import { PgTenantReadModel } from '../../infrastructure/read-model/pg-tenant-read-model';
import { TenantProjectionSubscriber } from '../../infrastructure/projections/tenant-projection.subscriber';

/**
 * @description Tenant 上下文 Nest 装配模块
 *
 * 说明：
 * - 该模块负责把"端口接口"绑定到"基础设施实现"
 * - 支持 `inMemory` 与 `eventStore` 两种持久化装配路径
 * - 通过 CQRS 调度路径执行用例（CommandBus → Handler）
 *
 * 变更说明：
 * - 已迁移到 CQRS 调度路径
 * - ApplicationService 通过注入 CommandBus 调用 handler
 * - Handler 通过 @CommandHandler 装饰器自动注册
 *
 * 强约束：
 * - 必须启用 `@oksai/app-kit` 的 `cqrs.enabled: true` 或自行装配 OksaiCqrsModule
 */
@Module({
	imports: [OksaiCqrsModule],
	providers: [
		// 默认：纯内存仓储（兼容 demo-api）
		InMemoryTenantRepository,
		// CQRS Handler（通过 @CommandHandler 自动注册）
		CreateTenantCommandHandler,
		// ApplicationService（注入 CommandBus）
		TenantApplicationService
	],
	exports: [TenantApplicationService]
})
export class TenantModule {
	/**
	 * @description 默认装配（兼容 demo-api：纯内存仓储）
	 *
	 * @param options - 装配选项
	 * @returns DynamicModule
	 */
	static init(options: { persistence?: 'inMemory' | 'eventStore' } = {}): DynamicModule {
		const persistence = options.persistence ?? 'inMemory';

		if (persistence === 'inMemory') {
			return { module: TenantModule };
		}

		const imports =
			persistence === 'eventStore'
				? [setupEventStoreModule({ isGlobal: false }), OksaiCqrsModule]
				: [OksaiCqrsModule];
		const repoProvider = persistence === 'eventStore' ? EventSourcedTenantRepository : InMemoryTenantRepository;

		return {
			module: TenantModule,
			imports,
			providers: [
				repoProvider,
				PgTenantReadModel,
				TenantProjectionSubscriber,
				{
					provide: OKSAI_TENANT_READ_MODEL_TOKEN,
					useExisting: PgTenantReadModel
				},
				// CQRS Handler（通过 @CommandHandler 自动注册）
				CreateTenantCommandHandler,
				// ApplicationService（注入 CommandBus）
				TenantApplicationService
			],
			exports: [TenantApplicationService, OKSAI_TENANT_READ_MODEL_TOKEN]
		};
	}
}
