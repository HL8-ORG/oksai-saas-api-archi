import type { TenantMembershipAggregate } from '../../domain/aggregates/tenant-membership.aggregate';

/**
 * @description 租户成员关系仓储端口（Identity）
 */
export interface ITenantMembershipRepository {
	save(aggregate: TenantMembershipAggregate): Promise<void>;
	findByTenantAndUser(tenantId: string, userId: string): Promise<TenantMembershipAggregate | null>;
}
