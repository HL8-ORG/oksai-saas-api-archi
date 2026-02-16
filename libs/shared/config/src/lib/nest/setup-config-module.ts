import { ConfigModule, ConfigModuleOptions } from '@nestjs/config';

export interface SetupConfigModuleOptions {
	/**
	 * 是否设置为全局模块（默认 true）
	 */
	isGlobal?: boolean;

	/**
	 * 是否启用缓存（默认 true）
	 */
	cache?: boolean;

	/**
	 * 允许从 `.env` 文件加载（默认 true）
	 */
	ignoreEnvFile?: boolean;

	/**
	 * env 文件路径（支持数组）
	 *
	 * 默认会按常见优先级加载：
	 * - `.env`
	 * - `.env.<NODE_ENV>`
	 * - `.env.local`
	 * - `.env.<NODE_ENV>.local`
	 */
	envFilePath?: string | string[];

	/**
	 * 配置工厂列表（来自 registerAs）
	 */
	load?: NonNullable<ConfigModuleOptions['load']>;
}

/**
 * 统一装配 ConfigModule（@nestjs/config）
 *
 * @param options - 装配选项
 * @returns 动态模块
 */
export function setupConfigModule(options: SetupConfigModuleOptions = {}) {
	const nodeEnv = process.env.NODE_ENV?.trim() || 'development';
	const envFilePath = options.envFilePath ?? ['.env', `.env.${nodeEnv}`, '.env.local', `.env.${nodeEnv}.local`];

	return ConfigModule.forRoot({
		isGlobal: options.isGlobal ?? true,
		cache: options.cache ?? true,
		ignoreEnvFile: options.ignoreEnvFile ?? false,
		expandVariables: true,
		envFilePath,
		load: options.load ?? []
	});
}
