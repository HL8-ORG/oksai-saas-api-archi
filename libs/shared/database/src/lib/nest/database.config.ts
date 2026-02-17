import { registerAppConfig } from '@oksai/config';

export interface DatabaseConfig {
	/**
	 * @description 数据库主机
	 */
	host: string;

	/**
	 * @description 数据库端口
	 */
	port: number;

	/**
	 * @description 数据库用户名
	 */
	user: string;

	/**
	 * @description 数据库密码（禁止输出到日志）
	 */
	password: string;

	/**
	 * @description 数据库名称
	 */
	dbName: string;
}

/**
 * @description
 * 数据库配置注册（基于 @nestjs/config）。
 *
 * 环境变量：
 * - DB_HOST / DB_PORT / DB_USER / DB_PASSWORD / DB_NAME
 *
 * 默认值（便于本地/E2E 测试）：
 * - host=127.0.0.1
 * - port=5432（如果检测到 `DB_USE_TEST_PORT=true`，则默认 5433）
 * - user=postgres
 * - password=test_password
 * - dbName=test_oksai
 */
export const databaseConfig: ReturnType<typeof registerAppConfig<DatabaseConfig>> = registerAppConfig<DatabaseConfig>('database', () => {
	const useTestPort = String(process.env.DB_USE_TEST_PORT ?? '').trim().toLowerCase() === 'true';
	const portDefault = useTestPort ? 5433 : 5432;

	const host = String(process.env.DB_HOST ?? '127.0.0.1').trim();
	const port = Number(String(process.env.DB_PORT ?? portDefault).trim());
	const user = String(process.env.DB_USER ?? 'postgres').trim();
	const password = String(process.env.DB_PASSWORD ?? 'test_password');
	const dbName = String(process.env.DB_NAME ?? 'test_oksai').trim();

	if (!Number.isFinite(port) || port <= 0) {
		throw new Error(`数据库配置错误：DB_PORT 非法（收到 ${String(process.env.DB_PORT)}）。`);
	}

	return {
		host,
		port,
		user,
		password,
		dbName
	} satisfies DatabaseConfig;
});

