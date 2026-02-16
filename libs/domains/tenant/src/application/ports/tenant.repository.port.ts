import type { TenantAggregate } from '../../domain/aggregates/tenant.aggregate';
import type { TenantId } from '../../domain/value-objects/tenant-id.value-object';

/**
 * @description
 * 租户仓储端口（定义在应用层/领域边界，实现在基础设施层）。
 *
 * 注意事项：
 * - 在真实实现中必须强制 tenant 隔离（若该上下文本身就是 tenant，则按业务定义处理）
 * - 本接口不暴露 ORM Entity，返回领域对象/聚合根
 */
export interface ITenantRepository {
	/**
	 * @description 保存聚合
	 * @param tenant - 租户聚合
	 */
	save(tenant: TenantAggregate): Promise<void>;

	/**
	 * @description 按 ID 查询
	 * @param id - tenantId
	 */
	findById(id: TenantId): Promise<TenantAggregate | null>;
}

