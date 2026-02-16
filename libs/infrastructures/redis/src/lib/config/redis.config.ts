import { registerAppConfig, env } from '@oksai/config';

export interface OksaiRedisConfig {
	url: string;
	keyPrefix?: string;
}

/**
 * @description 注册 Redis 配置
 *
 * 环境变量：
 * - `REDIS_URL`（必填）：如 `redis://localhost:6379/0`
 * - `REDIS_KEY_PREFIX`（可选）：统一 key 前缀
 *
 * @returns registerAs 工厂（命名空间：redis）
 */
export function registerRedisConfig() {
	return registerAppConfig(
		'redis',
		(): OksaiRedisConfig => ({
			url: env.url('REDIS_URL', { allowedProtocols: ['redis:', 'rediss:'] }),
			keyPrefix: process.env.REDIS_KEY_PREFIX?.trim() || undefined
		})
	);
}
