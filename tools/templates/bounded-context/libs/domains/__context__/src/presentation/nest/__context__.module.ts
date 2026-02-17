import { type DynamicModule, Module } from '@nestjs/common';
import { OksaiRequestContextService } from '@oksai/context';
import { DatabaseUnitOfWork } from '@oksai/database';
import { setupEventStoreModule } from '@oksai/event-store';
import { OKSAI_OUTBOX_TOKEN, type IOutbox } from '@oksai/messaging';
import { __CONTEXT__ApplicationService } from '../../application/services/__context__-application.service';
import { OKSAI___CONTEXT___READ_MODEL_TOKEN } from '../../application/ports/__context__-read-model.port';
import { InMemory__CONTEXT__Repository } from '../../infrastructure/persistence/in-memory-__context__.repository';
import { EventSourced__CONTEXT__Repository } from '../../infrastructure/persistence/event-sourced-__context__.repository';
import { Pg__CONTEXT__ReadModel } from '../../infrastructure/read-model/pg-__context__-read-model';
import { __CONTEXT__ProjectionSubscriber } from '../../infrastructure/projections/__context__-projection.subscriber';

/**
 * @description __CONTEXT__ 上下文 Nest 装配模块（模板）
 *
 * 说明：
 * - 该模块负责把“端口接口”绑定到“基础设施实现”
 * - 支持 `inMemory` 与 `eventStore` 两种持久化装配路径
 */
@Module({
	providers: [
		// 默认：纯内存仓储（便于快速验证）
		InMemory__CONTEXT__Repository,
		{
			provide: __CONTEXT__ApplicationService,
			useFactory: (repo: InMemory__CONTEXT__Repository, outbox: IOutbox, ctx: OksaiRequestContextService, uow?: DatabaseUnitOfWork) =>
				new __CONTEXT__ApplicationService(repo, outbox, ctx, uow),
			inject: [InMemory__CONTEXT__Repository, OKSAI_OUTBOX_TOKEN, OksaiRequestContextService, { token: DatabaseUnitOfWork, optional: true }]
		}
	],
	exports: [__CONTEXT__ApplicationService]
})
export class __CONTEXT__Module {
	/**
	 * @description 初始化装配
	 *
	 * @param options - 装配选项
	 * @returns DynamicModule
	 */
	static init(options: { persistence?: 'inMemory' | 'eventStore' } = {}): DynamicModule {
		const persistence = options.persistence ?? 'inMemory';

		if (persistence === 'inMemory') {
			return { module: __CONTEXT__Module };
		}

		const imports = persistence === 'eventStore' ? [setupEventStoreModule({ isGlobal: false })] : [];
		const repoProvider = persistence === 'eventStore' ? EventSourced__CONTEXT__Repository : InMemory__CONTEXT__Repository;

		return {
			module: __CONTEXT__Module,
			imports,
			providers: [
				repoProvider,
				Pg__CONTEXT__ReadModel,
				__CONTEXT__ProjectionSubscriber,
				{
					provide: OKSAI___CONTEXT___READ_MODEL_TOKEN,
					useExisting: Pg__CONTEXT__ReadModel
				},
				{
					provide: __CONTEXT__ApplicationService,
					useFactory: (
						repo: InMemory__CONTEXT__Repository | EventSourced__CONTEXT__Repository,
						outbox: IOutbox,
						ctx: OksaiRequestContextService,
						uow?: DatabaseUnitOfWork
					) => new __CONTEXT__ApplicationService(repo, outbox, ctx, uow),
					inject: [repoProvider, OKSAI_OUTBOX_TOKEN, OksaiRequestContextService, { token: DatabaseUnitOfWork, optional: true }]
				}
			],
			exports: [__CONTEXT__ApplicationService, OKSAI___CONTEXT___READ_MODEL_TOKEN]
		};
	}
}

