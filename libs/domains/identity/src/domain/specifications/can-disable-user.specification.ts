import { Specification } from './specification';
import type { UserAggregate } from '../aggregates/user.aggregate';

/**
 * @description 可以禁用用户规格
 *
 * 业务规则：
 * - 用户当前必须是活跃状态
 * - 用户不能是租户所有者
 *
 * @example
 * ```typescript
 * const canDisable = new CanDisableUserSpecification();
 * if (!canDisable.isSatisfiedBy(user)) {
 *   throw new UserCannotBeDisabledException(userId, '不满足禁用条件');
 * }
 * user.disable('违规操作');
 * ```
 */
export class CanDisableUserSpecification extends Specification<UserAggregate> {
	/**
	 * @description 检查用户是否可以被禁用
	 */
	isSatisfiedBy(user: UserAggregate): boolean {
		// 必须是活跃用户
		if (user.disabled) return false;

		// 不能是租户所有者
		if (user.isTenantOwner()) return false;

		return true;
	}
}
