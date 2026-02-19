import { DynamicModule } from '@nestjs/common';
import { MikroOrmModule, MikroOrmModuleOptions } from '@mikro-orm/nestjs';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PostgreSqlDriver } from '@mikro-orm/postgresql';
import { Migrator } from '@mikro-orm/migrations';
import { databaseConfig, type DatabaseConfig } from './database.config';
import { DatabaseTransactionHost } from '../transaction/database-transaction-host';
import { DatabaseUnitOfWork } from '../transaction/unit-of-work';
import { DatabaseMigratorService } from './database-migrator.service';
import { join } from 'node:path';

export interface SetupDatabaseModuleOptions {
	/**
	 * @description 是否注册为全局模块（默认 false）
	 *
	 * 说明：平台装配层（app-kit）通常会以 global 方式统一导出。
	 */
	isGlobal?: boolean;

	/**
	 * @description 是否开启 MikroORM debug（默认 development=true）
	 */
	debug?: boolean;

	/**
	 * @description 迁移表名（默认 oksai_migrations）
	 */
	migrationsTableName?: string;
}

/**
 * @description
 * 装配数据库模块（MikroORM + PostgreSQL）。
 *
 * 注意事项：
 * - 配置来自 `databaseConfig`（@oksai/config + env）
 * - 仅负责“基础设施装配”，不承载业务实体
 */
export function setupDatabaseModule(options: SetupDatabaseModuleOptions = {}): DynamicModule {
	const debug = options.debug ?? (process.env.NODE_ENV ?? 'development') === 'development';
	const migrationsTableName = options.migrationsTableName ?? 'oksai_migrations';
	// 运行时 __dirname 位于 dist/src/lib/nest；迁移文件位于 dist/src/migrations
	const migrationsPathTs = join(__dirname, '..', '..', 'migrations');
	const migrationsPath = join(__dirname, '..', '..', 'migrations');

	return {
		module: class OksaiDatabaseModule {},
		global: options.isGlobal ?? false,
		imports: [
			// 允许独立使用：如果上层已装配 ConfigModule，则不会重复注册
			ConfigModule.forFeature(databaseConfig),
			MikroOrmModule.forRootAsync({
				imports: [ConfigModule],
				inject: [ConfigService],
				useFactory: (config: ConfigService): MikroOrmModuleOptions => {
					const db = config.get<DatabaseConfig>('database');
					if (!db) throw new Error('数据库配置未加载：缺少 database 命名空间。');

					return {
						// 注意：此处只装配连接与迁移；业务实体由各 bounded context 自己注册
						// 明确指定 driver，避免 mikro-orm/nestjs 在 useFactory+inject 模式下给出告警
						driver: PostgreSqlDriver,
						host: db.host,
						port: db.port,
						user: db.user,
						password: db.password,
						dbName: db.dbName,
						debug,
						allowGlobalContext: true,
						autoLoadEntities: true,
						extensions: [Migrator],
						migrations: {
							tableName: migrationsTableName,
							disableForeignKeys: false,
							allOrNothing: true,
							emit: 'ts',
							// 迁移文件随 @oksai/database 一起发布，避免依赖应用工作目录
							pathTs: migrationsPathTs,
							path: migrationsPath
						}
					};
				}
			})
		],
		providers: [DatabaseTransactionHost, DatabaseUnitOfWork, DatabaseMigratorService],
		exports: [DatabaseTransactionHost, DatabaseUnitOfWork, DatabaseMigratorService]
	};
}
