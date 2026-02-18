import { Specification } from './specification';
import type { TenantAggregate } from '../aggregates/tenant.aggregate';

/**
 * @description 可以添加成员规格
 *
 * 业务规则：
 * - 成员数不能超过配置上限
 *
 * @example
 * ```typescript
 * const canAddMember = new CanAddMemberSpecification();
 * if (!canAddMember.isSatisfiedBy(tenant)) {
 *   throw new DomainException('超过租户成员上限');
 * }
 * tenant.addMember(userId);
 * ```
 */
export class CanAddMemberSpecification extends Specification<TenantAggregate> {
	/**
	 * @description 检查租户是否可以添加成员
	 */
	isSatisfiedBy(tenant: TenantAggregate): boolean {
		return tenant.getMemberCount() < tenant.settings.getMaxMembers();
	}
}
