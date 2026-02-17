import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { MikroORM } from '@mikro-orm/core';

/**
 * @description
 * 数据库迁移执行器（启动期可选）。
 *
 * 规则：
 * - `DB_MIGRATIONS_RUN=true`：强制执行迁移
 * - `DB_MIGRATIONS_RUN=false`：禁用迁移
 * - 未设置：development 默认执行，其他环境默认不执行
 *
 * 注意事项：
 * - 迁移脚本禁止包含业务敏感数据
 * - 生产环境建议由 CI/CD 或运维流程显式执行迁移
 */
@Injectable()
export class DatabaseMigratorService implements OnModuleInit {
	private readonly logger = new Logger(DatabaseMigratorService.name);

	constructor(private readonly orm: MikroORM) {}

	async onModuleInit(): Promise<void> {
		if (!this.isEnabled()) return;
		this.logger.log('开始执行数据库迁移...');
		await this.orm.getMigrator().up();
		this.logger.log('数据库迁移执行完成。');
	}

	private isEnabled(): boolean {
		const v = String(process.env.DB_MIGRATIONS_RUN ?? '').trim().toLowerCase();
		if (v === 'true') return true;
		if (v === 'false') return false;
		return (process.env.NODE_ENV ?? 'development') === 'development';
	}
}

