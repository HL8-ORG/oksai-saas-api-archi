import { AsyncLocalStorage } from 'node:async_hooks';
import { Injectable } from '@nestjs/common';
import type { EntityManager } from '@mikro-orm/core';

/**
 * @description
 * 数据库事务上下文（AsyncLocalStorage）。
 *
 * 设计目标：
 * - 为 EventStore/Outbox/Inbox 等基础设施提供“同事务共享 EntityManager”的能力
 * - 避免在应用层到处显式透传 `EntityManager`
 *
 * 注意事项：
 * - 该上下文仅用于数据库事务；与 `@oksai/context` 的请求上下文（tenantId/requestId/userId）相互独立
 */
@Injectable()
export class DatabaseTransactionHost {
	private readonly als = new AsyncLocalStorage<EntityManager>();

	/**
	 * @description 获取当前事务 EntityManager（若存在）
	 */
	getCurrentEntityManager(): EntityManager | null {
		return this.als.getStore() ?? null;
	}

	/**
	 * @description 在给定 EntityManager 上下文中运行函数
	 * @param em - 事务 EntityManager
	 * @param fn - 业务函数
	 */
	runWithEntityManager<T>(em: EntityManager, fn: () => Promise<T>): Promise<T> {
		return this.als.run(em, fn);
	}
}

