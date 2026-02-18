import { type DynamicModule, Module } from '@nestjs/common';
import { setupEventStoreModule } from '@oksai/event-store';
import { OksaiCqrsModule } from '@oksai/cqrs';
import { __CONTEXT__ApplicationService } from '../../application/services/__context__-application.service';
import { Create__CONTEXT__CommandHandler } from '../../application/handlers/create-__context__.command-handler';
import { OKSAI___CONTEXT___READ_MODEL_TOKEN } from '../../application/ports/__context__-read-model.port';
import { InMemory__CONTEXT__Repository } from '../../infrastructure/persistence/in-memory-__context__.repository';
import { EventSourced__CONTEXT__Repository } from '../../infrastructure/persistence/event-sourced-__context__.repository';
import { Pg__CONTEXT__ReadModel } from '../../infrastructure/read-model/pg-__context__-read-model';
import { __CONTEXT__ProjectionSubscriber } from '../../infrastructure/projections/__context__-projection.subscriber';

/**
 * @description __CONTEXT__ 上下文 Nest 装配模块（模板）
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
		// 默认：纯内存仓储（便于快速验证）
		InMemory__CONTEXT__Repository,
		// CQRS Handler（通过 @CommandHandler 自动注册）
		Create__CONTEXT__CommandHandler,
		// ApplicationService（注入 CommandBus）
		__CONTEXT__ApplicationService
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

		const imports =
			persistence === 'eventStore'
				? [setupEventStoreModule({ isGlobal: false }), OksaiCqrsModule]
				: [OksaiCqrsModule];
		const repoProvider =
			persistence === 'eventStore' ? EventSourced__CONTEXT__Repository : InMemory__CONTEXT__Repository;

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
				// CQRS Handler（通过 @CommandHandler 自动注册）
				Create__CONTEXT__CommandHandler,
				// ApplicationService（注入 CommandBus）
				__CONTEXT__ApplicationService
			],
			exports: [__CONTEXT__ApplicationService, OKSAI___CONTEXT___READ_MODEL_TOKEN]
		};
	}
}
