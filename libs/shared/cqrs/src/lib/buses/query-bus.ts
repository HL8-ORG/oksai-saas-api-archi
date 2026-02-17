import { Injectable } from '@nestjs/common';
import type { IQuery, IQueryHandler } from '../interfaces';

/**
 * @description 查询总线（QueryBus）
 *
 * 说明：
 * - 只负责“用例调度”（Query -> Handler），不包含事件投递能力
 * - 查询侧可保持纯读（不产生副作用）
 */
@Injectable()
export class QueryBus {
	private readonly handlers = new Map<string, IQueryHandler>();

	/**
	 * @description 注册查询处理器（由 ExplorerService 在启动时自动调用）
	 *
	 * @param queryType - 查询类型（稳定字符串）
	 * @param handler - 处理器实例
	 * @throws Error 当重复注册同一 queryType 时
	 */
	register(queryType: string, handler: IQueryHandler): void {
		if (this.handlers.has(queryType)) {
			throw new Error(`查询处理器重复注册：queryType=${queryType}。`);
		}
		this.handlers.set(queryType, handler);
	}

	/**
	 * @description 执行查询（读用例入口）
	 *
	 * @param query - 查询对象（必须包含 type）
	 * @returns 查询结果
	 * @throws Error 当未找到匹配 handler 时
	 */
	async execute<TResult = unknown>(query: IQuery): Promise<TResult> {
		const handler = this.handlers.get(query.type);
		if (!handler) {
			throw new Error(`未找到查询处理器：queryType=${query.type}。`);
		}
		return (await handler.execute(query as any)) as TResult;
	}
}

