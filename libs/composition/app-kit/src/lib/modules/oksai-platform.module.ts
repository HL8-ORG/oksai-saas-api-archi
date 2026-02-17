import { DynamicModule, Module } from '@nestjs/common';
import { setupConfigModule, type SetupConfigModuleOptions } from '@oksai/config';
import { setupLoggerModule } from '@oksai/logger';
import { getOksaiRequestContextFromCurrent, OksaiContextModule, setupOksaiContextModule, type SetupOksaiContextModuleOptions } from '@oksai/context';
import { setupDatabaseModule, type SetupDatabaseModuleOptions } from '@oksai/database';
import { PluginModule, type PluginInput } from '@oksai/plugin';
import {
	InMemoryEventBus,
	InMemoryInbox,
	InMemoryOutbox,
	OKSAI_EVENT_BUS_TOKEN,
	OKSAI_INBOX_TOKEN,
	OKSAI_OUTBOX_TOKEN,
	OutboxPublisherService,
	setupMessagingModule,
	type SetupMessagingModuleOptions,
	type IEventBus
} from '@oksai/messaging';
import { PgInbox, PgOutbox, setupMessagingPostgresModule, type SetupMessagingPostgresModuleOptions } from '@oksai/messaging-postgres';
import { ContextAwareEventBus } from '../messaging/context-aware-event-bus';
import { ContextAwareOutbox } from '../messaging/context-aware-outbox';

export interface SetupOksaiPlatformModuleOptions {
	/**
	 * @description ConfigModule 装配选项（主要是 `load`）
	 *
	 * 说明：
	 * - `@oksai/app-kit` 仅负责装配 `@oksai/config`，不强制规定业务配置结构
	 * - 推荐所有 app 使用 `registerAppConfig()` + `setupConfigModule({ load: [...] })`
	 */
	config?: SetupConfigModuleOptions;

	/**
	 * @description 请求上下文（CLS）
	 *
	 * 强约束：
	 * - 多租户场景下，`tenantId` 必须来自服务端上下文（CLS），禁止客户端透传覆盖
	 */
	context?: SetupOksaiContextModuleOptions;

	/**
	 * @description 数据库模块装配（可选）
	 *
	 * 说明：不传则不连接数据库，便于 demo/纯内存模式。
	 *
	 * 使用场景：
	 * - 启用 EventStore/Outbox/Inbox/Projection 等能力时必须打开
	 */
	database?: SetupDatabaseModuleOptions;

	/**
	 * @description 消息模块装配（可选）
	 *
	 * 默认：inMemory inbox/outbox（用于开发演示）。
	 *
	 * 注意事项：
	 * - 事件总线当前仅为同进程实现（InMemory），跨进程 MQ 未来通过替换实现引入
	 * - OutboxPublisher 的“注册位置”属于强约束：必须在装配层（app-kit）上下文内注册
	 */
	messaging?: SetupMessagingModuleOptions;

	/**
	 * @description PostgreSQL 版 Inbox/Outbox 装配（可选）
	 *
	 * 使用场景：
	 * - 引入 Postgres 后，用 PgInbox/PgOutbox 替换内存实现
	 *
	 * 前置条件：
	 * - 必须同时启用 `database`（MikroORM 已连接）
	 */
	messagingPostgres?: SetupMessagingPostgresModuleOptions;

	/**
	 * @description 启用的插件列表（启动期装配）
	 *
	 * 说明：
	 * - 插件属于启动期装配（Composition-time），不提供运行时热插拔
	 * - 推荐在 app 启动时：先 `registerPlugins()` 注册插件清单，再用 `resolvePluginsFromEnv()` 解析启用列表
	 */
	plugins?: PluginInput[];

	/**
	 * @description logger 美化输出开关（默认 development=true）
	 */
	prettyLogs?: boolean;
}

/**
 * @description 统一装配 Oksai 平台基础设施模块（给多个 apps 复用）
 *
 * 设计原则：
 * - 只做“装配与组合”，不引入业务模块
 * - 插件以启动期装配方式加载（PluginModule.init）
 *
 * 能力矩阵（按需装配）：
 * - 必选：Config / Context(CLS) / Logger / Messaging(InProc)
 * - 可选：Database(MikroORM) / MessagingPostgres(PgOutbox+PgInbox) / Plugins
 *
 * 强约束：
 * - tenantId 必须来自 CLS（由 `@oksai/context` 负责）；Outbox append 禁止覆盖 tenantId（由 ContextAwareOutbox 负责）
 * - OutboxPublisherService 必须注册在 app-kit 装配层上下文中（确保注入到被覆盖后的 OKSAI_OUTBOX_TOKEN）
 */
@Module({})
export class OksaiPlatformModule {
	/**
	 * @description 初始化平台装配模块
	 *
	 * @param options - 装配参数
	 * @returns DynamicModule
	 */
	static init(options: SetupOksaiPlatformModuleOptions = {}): DynamicModule {
		assertPlatformKernelOptions(options);
		const plugins = options.plugins ?? [];
		const baseConfig = options.config ?? {};
		const pretty = options.prettyLogs ?? ((process.env.NODE_ENV ?? 'development') === 'development');

		const databaseImports = options.database ? [setupDatabaseModule({ ...options.database, isGlobal: true })] : [];
		const messagingPostgresImports = options.messagingPostgres
			? [setupMessagingPostgresModule({ ...options.messagingPostgres, isGlobal: false })]
			: [];

		const messagingOverrides = options.messagingPostgres
			? [
					// PostgreSQL 版 Inbox/Outbox
					{
						provide: OKSAI_INBOX_TOKEN,
						useExisting: PgInbox
					},
					{
						provide: OKSAI_OUTBOX_TOKEN,
						useFactory: (inner: PgOutbox) => new ContextAwareOutbox(inner),
						inject: [PgOutbox]
					}
				]
			: [
					// 默认：InMemory 版 Outbox 仍由平台层包装（注入 CLS 元数据）
					{
						provide: OKSAI_INBOX_TOKEN,
						useExisting: InMemoryInbox
					},
					{
						provide: OKSAI_OUTBOX_TOKEN,
						useFactory: (inner: InMemoryOutbox) => new ContextAwareOutbox(inner),
						inject: [InMemoryOutbox]
					}
				];

		return {
			module: OksaiPlatformModule,
			global: true,
			imports: [
				setupOksaiContextModule(options.context),
				setupConfigModule(baseConfig),
				...databaseImports,
				...messagingPostgresImports,
				// messaging 作为“平台能力”由 app-kit 统一装配并导出（避免多个 global 模块争抢同一 token）
				setupMessagingModule({ ...(options.messaging ?? {}), isGlobal: false }),
				setupLoggerModule({
					pretty,
					customProps: (req) => {
						const anyReq = req as { headers?: Record<string, unknown> } | null | undefined;
						const headers = anyReq?.headers ?? {};
						const header = (name: string): string | undefined => {
							const v = headers[name];
							if (v === undefined || v === null) return undefined;
							return Array.isArray(v) ? String(v[0] ?? '') : String(v);
						};
						const ctx = getOksaiRequestContextFromCurrent();
						return {
							tenantId: ctx.tenantId ?? header('x-tenant-id'),
							locale: ctx.locale ?? header('x-lang'),
							userId: ctx.userId,
							requestId: ctx.requestId
						};
					}
				}),
				PluginModule.init({ plugins })
			],
			providers: [
				// 使用 ContextAwareEventBus 覆盖事件总线 token：在 publish 时补齐 CLS 元数据
				{
					provide: OKSAI_EVENT_BUS_TOKEN,
					useFactory: (inner: InMemoryEventBus): IEventBus => new ContextAwareEventBus(inner),
					inject: [InMemoryEventBus]
				},
				// Outbox 发布器必须注册在“平台装配层”上下文中，确保拿到被覆盖后的 OKSAI_OUTBOX_TOKEN
				OutboxPublisherService,
				...messagingOverrides
			],
			exports: [PluginModule, OksaiContextModule, OKSAI_EVENT_BUS_TOKEN, OKSAI_INBOX_TOKEN, OKSAI_OUTBOX_TOKEN]
		};
	}
}

function assertPlatformKernelOptions(options: SetupOksaiPlatformModuleOptions): void {
	// messagingPostgres 依赖 database：否则 PgInbox/PgOutbox 无法工作
	if (options.messagingPostgres && !options.database) {
		throw new Error(
			'装配配置错误：启用 messagingPostgres 时必须同时启用 database（MikroORM 连接/迁移）。'
		);
	}
}
