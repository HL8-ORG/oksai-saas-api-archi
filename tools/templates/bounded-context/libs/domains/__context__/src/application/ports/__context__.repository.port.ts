import type { __CONTEXT__Aggregate } from '../../domain/aggregates/__context__.aggregate';

/**
 * @description __CONTEXT__ 仓储端口（模板）
 *
 * 注意事项：
 * - 端口定义在应用层/领域边界，实现在基础设施层
 */
export interface I__CONTEXT__Repository {
	save(aggregate: __CONTEXT__Aggregate): Promise<void>;
	findById(id: string): Promise<__CONTEXT__Aggregate | null>;
}

