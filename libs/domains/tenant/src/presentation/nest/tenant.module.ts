import { type DynamicModule, Module } from '@nestjs/common';
import { OksaiRequestContextService } from '@oksai/context';
import { DatabaseUnitOfWork } from '@oksai/database';
import { setupEventStoreModule } from '@oksai/event-store';
import { OKSAI_OUTBOX_TOKEN, type IOutbox } from '@oksai/messaging';
import { InMemoryTenantRepository } from '../../infrastructure/persistence/in-memory-tenant.repository';
import { EventSourcedTenantRepository } from '../../infrastructure/persistence/event-sourced-tenant.repository';
import { TenantApplicationService } from '../../application/services/tenant-application.service';
import { OKSAI_TENANT_READ_MODEL_TOKEN } from '../../application/ports/tenant-read-model.port';
import { PgTenantReadModel } from '../../infrastructure/read-model/pg-tenant-read-model';
import { TenantProjectionSubscriber } from '../../infrastructure/projections/tenant-projection.subscriber';

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
		// 默认：纯内存仓储（兼容 demo-api）
		InMemoryTenantRepository,
		{
			provide: TenantApplicationService,
			useFactory: (repo: InMemoryTenantRepository, outbox: IOutbox, ctx: OksaiRequestContextService, uow?: DatabaseUnitOfWork) =>
				new TenantApplicationService(repo, outbox, ctx, uow),
			inject: [InMemoryTenantRepository, OKSAI_OUTBOX_TOKEN, OksaiRequestContextService, { token: DatabaseUnitOfWork, optional: true }]
		}
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

		const imports = persistence === 'eventStore' ? [setupEventStoreModule({ isGlobal: false })] : [];
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
				{
					provide: TenantApplicationService,
					useFactory: (
						repo: InMemoryTenantRepository | EventSourcedTenantRepository,
						outbox: IOutbox,
						ctx: OksaiRequestContextService,
						uow?: DatabaseUnitOfWork
					) => new TenantApplicationService(repo, outbox, ctx, uow),
					inject: [repoProvider, OKSAI_OUTBOX_TOKEN, OksaiRequestContextService, { token: DatabaseUnitOfWork, optional: true }]
				}
			],
			exports: [TenantApplicationService, OKSAI_TENANT_READ_MODEL_TOKEN]
		};
	}
}

