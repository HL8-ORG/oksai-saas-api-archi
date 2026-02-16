import { DynamicModule, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import Redlock from 'redlock';
import { OKSAI_REDLOCK, OKSAI_REDIS } from '../tokens';

export interface SetupRedisLockModuleOptions {
	/**
	 * @description 默认锁时长（毫秒），若不传则读取 `redisLock.defaultTtlMs`
	 */
	defaultTtlMs?: number;
}

@Module({})
class OksaiRedisLockRuntimeModule {}

/**
 * @description 装配 Redlock（分布式锁）
 *
 * @param options - 选项
 * @returns 动态模块
 */
export function setupRedisLockModule(options: SetupRedisLockModuleOptions = {}): DynamicModule {
	const redlockProvider = {
		provide: OKSAI_REDLOCK,
		useFactory: (redis: Redis, config: ConfigService) => {
			const retryCount = Number(config.get('redisLock.retryCount', 3));
			const retryDelay = Number(config.get('redisLock.retryDelayMs', 200));
			const defaultTtlMs = options.defaultTtlMs ?? Number(config.get('redisLock.defaultTtlMs', 30_000));

			const redlock = new Redlock([redis], {
				retryCount,
				retryDelay
			});

			// 这里不强行写入实例字段，默认 TTL 由业务层显式传入（或通过 ConfigService 读取）
			void defaultTtlMs;
			return redlock;
		},
		inject: [OKSAI_REDIS, ConfigService]
	};

	return {
		module: OksaiRedisLockRuntimeModule,
		providers: [redlockProvider],
		exports: [OKSAI_REDLOCK]
	};
}
