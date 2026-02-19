import type { AggregateRoot } from '@oksai/event-store';
import type { IAggregateMetadataExtractor, AnalyzableExtension } from '@oksai/aggregate-metadata';
import type { TenantAggregate } from '../../domain/aggregates/tenant.aggregate';

/**
 * @description 租户聚合根元数据提取器
 *
 * 实现从 TenantAggregate 提取元数据的逻辑
 */
export class TenantMetadataExtractor implements IAggregateMetadataExtractor<TenantAggregate> {
	/**
	 * @description 获取聚合类型标识
	 */
	getAggregateType(): string {
		return 'Tenant';
	}

	/**
	 * @description 从聚合根提取租户 ID
	 *
	 * 对于 Tenant 聚合，tenantId 就是聚合 ID
	 */
	getTenantId(aggregate: TenantAggregate): string {
		return aggregate.id.toString();
	}

	/**
	 * @description 从聚合根提取聚合 ID
	 */
	getAggregateId(aggregate: TenantAggregate): string {
		return aggregate.id.toString();
	}

	/**
	 * @description 从聚合根提取可分析扩展
	 *
	 * Tenant 聚合可以添加分类和标签以支持分析
	 */
	getAnalyzableExtension(aggregate: TenantAggregate): AnalyzableExtension | undefined {
		// 基础实现：租户默认参与分析
		return {
			tags: [],
			includeInAnalytics: true
		};
	}
}
