import { type DynamicModule } from '@nestjs/common';
import type { IEventBus } from '@oksai/messaging';
import {
	InMemoryEventBus,
	InMemoryInbox,
	InMemoryOutbox,
	OKSAI_EVENT_BUS_TOKEN,
	OKSAI_INBOX_TOKEN,
	OKSAI_OUTBOX_TOKEN,
	OutboxPublisherService,
	setupMessagingModule,
	type SetupMessagingModuleOptions
} from '@oksai/messaging';
import {
	PgInbox,
	PgOutbox,
	setupMessagingPostgresModule,
	type SetupMessagingPostgresModuleOptions
} from '@oksai/messaging-postgres';
import { ContextAwareEventBus } from '../messaging/context-aware-event-bus';
import { ContextAwareOutbox } from '../messaging/context-aware-outbox';

export type EdaPersistence = 'inMemory' | 'postgres';

export interface SetupEdaModuleOptions {
	/**
	 * @description 是否注册为全局模块（默认 false）
	 *
	 * 说明：通常由 app-kit 以 global 方式统一装配并导出。
	 */
	isGlobal?: boolean;

	/**
	 * @description 持久化模式（默认 inMemory）
	 *
	 * - inMemory：InMemoryInbox/InMemoryOutbox（仅用于 demo/开发验证）
	 * - postgres：PgInbox/PgOutbox（可靠投递边界）
	 *
	 * 强约束：
	 * - 选择 postgres 时，必须先装配 `@oksai/database`（MikroORM 已连接）
	 */
	persistence?: EdaPersistence;

	/**
	 * @description InProc Messaging 装配选项（目前仅 transport=inproc）
	 */
	messaging?: SetupMessagingModuleOptions;

	/**
	 * @description PostgreSQL Inbox/Outbox 适配器装配选项
	 */
	messagingPostgres?: SetupMessagingPostgresModuleOptions;
}

/**
 * @description 装配 EDA 能力（集成事件 Envelope + Outbox/Inbox + Publisher + InProc Bus）
 *
 * 设计目标：
 * - 统一装配入口：减少应用侧理解 token/override 的负担
 * - 强约束内建：Outbox tenantId 来自 CLS；publisher 必须注入“被包装后的 outbox token”
 *
 * 注意事项：
 * - 当前 transport 仅支持同进程（InProc）EventBus
 * - 跨进程 MQ 未来以 adapter 形式接入（不改变业务用例）
 */
export function setupEdaModule(options: SetupEdaModuleOptions = {}): DynamicModule {
	const persistence: EdaPersistence = options.persistence ?? 'inMemory';

	const imports: DynamicModule[] = [
		// messaging 作为底层 transport（InProc）
		setupMessagingModule({ ...(options.messaging ?? {}), isGlobal: false })
	];

	if (persistence === 'postgres') {
		imports.push(setupMessagingPostgresModule({ ...(options.messagingPostgres ?? {}), isGlobal: false }));
	}

	const overrides =
		persistence === 'postgres'
			? [
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
		module: class OksaiEdaModule {},
		global: options.isGlobal ?? false,
		imports,
		providers: [
			// event bus 仅补齐 CLS 元数据，不改变投递语义
			{
				provide: OKSAI_EVENT_BUS_TOKEN,
				useFactory: (inner: InMemoryEventBus): IEventBus => new ContextAwareEventBus(inner),
				inject: [InMemoryEventBus]
			},
			// Publisher 必须注册在 EDA 装配层上下文中，确保注入的是被覆盖后的 OKSAI_OUTBOX_TOKEN
			OutboxPublisherService,
			...overrides
		],
		exports: [OKSAI_EVENT_BUS_TOKEN, OKSAI_INBOX_TOKEN, OKSAI_OUTBOX_TOKEN, OutboxPublisherService]
	};
}
