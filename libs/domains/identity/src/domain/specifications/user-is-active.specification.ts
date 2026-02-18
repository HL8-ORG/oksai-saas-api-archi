import { Specification } from './specification';
import type { UserAggregate } from '../aggregates/user.aggregate';
import type { TenantId } from '../value-objects/tenant-id';

/**
 * @description 用户活跃状态规格
 *
 * 业务规则：
 * - 用户未被禁用
 *
 * @example
 * ```typescript
 * const isActive = new UserIsActiveSpecification();
 * if (isActive.isSatisfiedBy(user)) {
 *   // 用户活跃，可以执行操作
 * }
 * ```
 */
export class UserIsActiveSpecification extends Specification<UserAggregate> {
	/**
	 * @description 检查用户是否活跃
	 */
	isSatisfiedBy(user: UserAggregate): boolean {
		return !user.disabled;
	}
}
