import { type DynamicModule } from '@nestjs/common';
import { InMemoryEventBus } from '../in-memory-event-bus';
import { InMemoryInbox } from '../in-memory-inbox';
import { InMemoryOutbox } from '../in-memory-outbox';
import {
	OKSAI_EVENT_BUS_TOKEN,
	OKSAI_INBOX_TOKEN,
	OKSAI_OUTBOX_TOKEN
} from '../tokens';

export interface SetupMessagingModuleOptions {
	/**
	 * @description 是否注册为全局模块（默认 true）
	 *
	 * 说明：全局模块可确保各 bounded context 共享同一个事件总线实例。
	 */
	isGlobal?: boolean;
}

/**
 * @description 装配消息/事件总线模块（当前默认 InMemory 实现）
 *
 * 注意事项：
 * - 该实现只用于“跑通架构闭环”（发布→订阅→投影等）
 * - 不保证可靠投递，不提供持久化
 *
 * @param options - 装配选项
 * @returns DynamicModule
 */
export function setupMessagingModule(options: SetupMessagingModuleOptions = {}): DynamicModule {
	return {
		module: class OksaiMessagingModule {},
		global: options.isGlobal ?? true,
		providers: [
			InMemoryEventBus,
			InMemoryInbox,
			InMemoryOutbox,
			{
				provide: OKSAI_EVENT_BUS_TOKEN,
				useExisting: InMemoryEventBus
			},
			{
				provide: OKSAI_INBOX_TOKEN,
				useExisting: InMemoryInbox
			},
			{
				provide: OKSAI_OUTBOX_TOKEN,
				useExisting: InMemoryOutbox
			}
		],
		exports: [
			OKSAI_EVENT_BUS_TOKEN,
			OKSAI_INBOX_TOKEN,
			OKSAI_OUTBOX_TOKEN,
			InMemoryEventBus,
			InMemoryInbox,
			InMemoryOutbox,
		]
	};
}

