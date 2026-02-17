import { Injectable } from '@nestjs/common';
import { MikroORM } from '@mikro-orm/core';
import { DatabaseTransactionHost } from './database-transaction-host';

/**
 * @description
 * 数据库工作单元（Unit of Work）。
 *
 * 说明：
 * - 用于在同一个数据库事务中执行多个基础设施操作（EventStore + Outbox 等）
 * - 通过 `DatabaseTransactionHost` 将事务 EntityManager 注入到异步上下文
 */
@Injectable()
export class DatabaseUnitOfWork {
	constructor(
		private readonly orm: MikroORM,
		private readonly txHost: DatabaseTransactionHost
	) {}

	/**
	 * @description 在数据库事务中执行
	 * @param fn - 事务函数
	 */
	async transactional<T>(fn: () => Promise<T>): Promise<T> {
		return await this.orm.em.transactional(async (em) => {
			return await this.txHost.runWithEntityManager(em, fn);
		});
	}
}

