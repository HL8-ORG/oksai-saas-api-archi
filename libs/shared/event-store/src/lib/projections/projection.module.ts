import { DynamicModule, Module, Provider, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ProjectionOrchestrator } from './projection-orchestrator';
import { ProjectionLifecycleService } from './projection-lifecycle.service';
import { IProjection } from './interfaces/projection.interface';
import type { IEventStore } from '../event-store.interface';

/**
 * @description 投影模块配置选项
 */
export interface ProjectionModuleOptions {
	/**
	 * 事件存储
	 */
	eventStore: IEventStore;

	/**
	 * 投影列表
	 */
	projections: IProjection[];

	/**
	 * 是否在启动时自动开始实时同步
	 *
	 * 默认值：true
	 */
	autoStartSync?: boolean;

	/**
	 * 是否在启动时自动重建投影
	 *
	 * 默认值：false
	 */
	autoRebuildOnStart?: boolean;

	/**
	 * 是否启用并行分发
	 *
	 * 默认值：false
	 */
	enableParallelDispatch?: boolean;

	/**
	 * 事件分发重试次数
	 *
	 * 默认值：3
	 */
	dispatchRetryCount?: number;

	/**
	 * 事件分发重试延迟（毫秒）
	 *
	 * 默认值：1000
	 */
	dispatchRetryDelayMs?: number;
}

/**
 * @description 投影模块
 *
 * 提供 NestJS 集成，自动管理投影的生命周期
 *
 * @example
 * ```typescript
 * @Module({
 *   imports: [
 *     ProjectionModule.forRoot({
 *       eventStore: pgEventStore,
 *       projections: [tenantAnalyticsProjection, dataSourceStatsProjection],
 *       autoStartSync: true
 *     })
 *   ]
 * })
 * export class AppModule {}
 * ```
 */
@Module({})
export class ProjectionModule implements OnModuleInit, OnModuleDestroy {
	constructor(private readonly lifecycleService: ProjectionLifecycleService) {}

	async onModuleInit(): Promise<void> {
		// 生命周期服务会自动处理
	}

	async onModuleDestroy(): Promise<void> {
		// 生命周期服务会自动处理
	}

	/**
	 * @description 注册投影模块
	 */
	static forRoot(options: ProjectionModuleOptions): DynamicModule {
		const orchestratorProvider: Provider = {
			provide: ProjectionOrchestrator,
			useFactory: () => {
				const autoStartSync = options.autoStartSync ?? true;
				const orchestrator = new ProjectionOrchestrator(options.eventStore, {
					autoRebuildOnStart: options.autoRebuildOnStart ?? false,
					enableParallelDispatch: options.enableParallelDispatch ?? false,
					dispatchRetryCount: options.dispatchRetryCount ?? 3,
					dispatchRetryDelayMs: options.dispatchRetryDelayMs ?? 1000
				});

				// 注册所有投影
				orchestrator.registerProjections(options.projections);

				return orchestrator;
			}
		};

		const projectionProviders: Provider[] = options.projections.map((projection) => ({
			provide: projection.constructor,
			useValue: projection
		}));

		return {
			module: ProjectionModule,
			providers: [orchestratorProvider, ProjectionLifecycleService, ...projectionProviders],
			exports: [
				ProjectionOrchestrator,
				ProjectionLifecycleService,
				...options.projections.map((p) => p.constructor)
			],
			global: true
		};
	}

	/**
	 * @description 异步注册投影模块
	 */
	static forRootAsync(options: {
		/**
		 * 工厂函数
		 */
		useFactory: (...args: any[]) => Promise<ProjectionModuleOptions> | ProjectionModuleOptions;

		/**
		 * 依赖注入
		 */
		inject?: any[];
	}): DynamicModule {
		const orchestratorProvider: Provider = {
			provide: ProjectionOrchestrator,
			useFactory: async (...args: any[]) => {
				const config = await options.useFactory(...args);
				const orchestrator = new ProjectionOrchestrator(config.eventStore, {
					autoRebuildOnStart: config.autoRebuildOnStart ?? false,
					enableParallelDispatch: config.enableParallelDispatch ?? false,
					dispatchRetryCount: config.dispatchRetryCount ?? 3,
					dispatchRetryDelayMs: config.dispatchRetryDelayMs ?? 1000
				});

				// 注册所有投影
				orchestrator.registerProjections(config.projections);

				return orchestrator;
			},
			inject: options.inject ?? []
		};

		return {
			module: ProjectionModule,
			providers: [orchestratorProvider, ProjectionLifecycleService],
			exports: [ProjectionOrchestrator, ProjectionLifecycleService],
			global: true
		};
	}
}
