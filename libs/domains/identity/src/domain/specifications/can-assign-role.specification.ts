import { Specification } from './specification';
import type { UserAggregate } from '../aggregates/user.aggregate';
import type { RoleKey } from '../value-objects/role-key';

/**
 * @description 可以分配角色规格
 *
 * 业务规则：
 * - 用户必须处于活跃状态
 * - 用户不能已有该角色
 * - 分配管理员角色需要特殊条件
 *
 * @example
 * ```typescript
 * const canAssignRole = new CanAssignRoleSpecification(roleKey);
 * if (!canAssignRole.isSatisfiedBy(user)) {
 *   throw new UserNotEligibleForRoleException(userId, roleKey);
 * }
 * user.grantRole(roleKey);
 * ```
 */
export class CanAssignRoleSpecification extends Specification<UserAggregate> {
	constructor(private readonly roleKey: RoleKey) {
		super();
	}

	/**
	 * @description 检查用户是否可以被分配指定角色
	 */
	isSatisfiedBy(user: UserAggregate): boolean {
		// 用户必须活跃
		if (user.disabled) return false;

		// 不能重复分配
		if (user.hasRole(this.roleKey)) return false;

		// 管理员角色需要特殊条件
		if (this.roleKey.isAdminLevel()) {
			return this.canAssignAdminRole(user);
		}

		return true;
	}

	/**
	 * @description 检查是否可以分配管理员角色
	 *
	 * 业务规则：
	 * - 用户必须有至少一个角色
	 * - 只有现有管理员才能分配管理员角色
	 */
	private canAssignAdminRole(user: UserAggregate): boolean {
		// 用户必须有至少一个角色
		if (user.roles.length === 0) return false;

		// 只有现有管理员才能分配管理员角色
		return user.isAdminLevel();
	}
}
