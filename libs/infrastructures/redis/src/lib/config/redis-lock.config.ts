import { registerAppConfig, env } from '@oksai/config';

export interface OksaiRedisLockConfig {
	/**
	 * @description 默认锁时长（毫秒）
	 */
	defaultTtlMs: number;

	/**
	 * @description 获取锁重试次数
	 */
	retryCount: number;

	/**
	 * @description 重试延迟（毫秒）
	 */
	retryDelayMs: number;
}

/**
 * @description 注册 Redlock 配置（命名空间：redisLock）
 *
 * 环境变量（可选）：
 * - `REDIS_LOCK_TTL_MS`：默认 30000
 * - `REDIS_LOCK_RETRY_COUNT`：默认 3
 * - `REDIS_LOCK_RETRY_DELAY_MS`：默认 200
 */
export function registerRedisLockConfig() {
	return registerAppConfig(
		'redisLock',
		(): OksaiRedisLockConfig => ({
			defaultTtlMs: env.int('REDIS_LOCK_TTL_MS', { defaultValue: 30_000, min: 100 }),
			retryCount: env.int('REDIS_LOCK_RETRY_COUNT', { defaultValue: 3, min: 0, max: 50 }),
			retryDelayMs: env.int('REDIS_LOCK_RETRY_DELAY_MS', { defaultValue: 200, min: 0, max: 10_000 })
		})
	);
}
