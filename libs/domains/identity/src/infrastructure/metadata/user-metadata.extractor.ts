import type { IAggregateMetadataExtractor, AnalyzableExtension } from '@oksai/aggregate-metadata';
import type { UserAggregate } from '../../domain/aggregates/user.aggregate';

/**
 * @description 用户聚合根元数据提取器
 *
 * 实现从 UserAggregate 提取元数据的逻辑
 */
export class UserMetadataExtractor implements IAggregateMetadataExtractor<UserAggregate> {
	private readonly _tenantId: string;

	constructor(tenantId: string) {
		this._tenantId = tenantId;
	}

	/**
	 * @description 获取聚合类型标识
	 */
	getAggregateType(): string {
		return 'User';
	}

	/**
	 * @description 从聚合根提取租户 ID
	 *
	 * User 聚合跨租户，tenantId 需要从外部上下文获取
	 */
	getTenantId(_aggregate: UserAggregate): string {
		return this._tenantId;
	}

	/**
	 * @description 从聚合根提取聚合 ID
	 */
	getAggregateId(aggregate: UserAggregate): string {
		return aggregate.id.getValue();
	}

	/**
	 * @description 从聚合根提取可分析扩展
	 */
	getAnalyzableExtension(aggregate: UserAggregate): AnalyzableExtension | undefined {
		const roles = aggregate.roles;
		const tags: string[] = [];

		// 根据角色添加标签
		if (aggregate.isTenantOwner()) {
			tags.push('tenant-owner');
		}
		if (aggregate.isAdminLevel()) {
			tags.push('admin');
		}
		if (aggregate.disabled) {
			tags.push('disabled');
		}

		return {
			tags,
			category: roles.length > 0 ? roles[0]?.getValue() : undefined,
			includeInAnalytics: true
		};
	}
}
