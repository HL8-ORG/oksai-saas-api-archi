import { type DynamicModule } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { PgEventStore } from '../postgres/pg-event-store';
import { EventStoreEventEntity } from '../postgres/event-store-event.entity';
import { OKSAI_EVENT_STORE_TOKEN } from '../tokens';

export interface SetupEventStoreModuleOptions {
	/**
	 * @description 是否注册为全局模块（默认 false）
	 */
	isGlobal?: boolean;
}

/**
 * @description
 * 装配 EventStore 模块（当前提供 PostgreSQL 实现）。
 *
 * 注意事项：
 * - 需要上层先装配 `@oksai/database`（MikroORM forRoot）
 */
export function setupEventStoreModule(options: SetupEventStoreModuleOptions = {}): DynamicModule {
	return {
		module: class OksaiEventStoreModule {},
		global: options.isGlobal ?? false,
		imports: [MikroOrmModule.forFeature([EventStoreEventEntity])],
		providers: [
			PgEventStore,
			{
				provide: OKSAI_EVENT_STORE_TOKEN,
				useExisting: PgEventStore
			}
		],
		exports: [OKSAI_EVENT_STORE_TOKEN, PgEventStore]
	};
}

