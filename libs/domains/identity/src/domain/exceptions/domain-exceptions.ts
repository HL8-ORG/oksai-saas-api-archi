/**
 * @description Identity 领域异常
 *
 * 所有异常使用中文消息，遵循项目宪章
 */

/**
 * @description 基础领域异常
 */
export abstract class DomainException extends Error {
	constructor(message: string) {
		super(message);
		this.name = this.constructor.name;
	}
}

/**
 * @description 无效邮箱异常
 */
export class InvalidEmailException extends DomainException {
	constructor(reason: string) {
		super(`邮箱无效：${reason}`);
	}
}

/**
 * @description 无效用户 ID 异常
 */
export class InvalidUserIdException extends DomainException {
	constructor(reason: string) {
		super(`用户 ID 无效：${reason}`);
	}
}

/**
 * @description 无效租户 ID 异常
 */
export class InvalidTenantIdException extends DomainException {
	constructor(reason: string) {
		super(`租户 ID 无效：${reason}`);
	}
}

/**
 * @description 用户无法被禁用异常
 *
 * 业务规则：
 * - 管理员不能被禁用
 * - 租户所有者不能被禁用
 */
export class UserCannotBeDisabledException extends DomainException {
	constructor(
		public readonly userId: string,
		reason: string
	) {
		super(`无法禁用用户 ${userId}：${reason}`);
	}
}

/**
 * @description 用户已拥有该角色异常
 */
export class UserAlreadyHasRoleException extends DomainException {
	constructor(
		public readonly userId: string,
		public readonly roleKey: string
	) {
		super(`用户 ${userId} 已拥有角色 ${roleKey}`);
	}
}

/**
 * @description 用户不满足角色分配条件异常
 */
export class UserNotEligibleForRoleException extends DomainException {
	constructor(
		public readonly userId: string,
		public readonly roleKey: string
	) {
		super(`用户 ${userId} 不满足分配角色 ${roleKey} 的条件`);
	}
}

/**
 * @description 非活跃用户操作异常
 */
export class InactiveUserException extends DomainException {
	constructor(operation: string) {
		super(`已禁用的用户无法执行操作：${operation}`);
	}
}

/**
 * @description 无法禁用租户所有者异常
 */
export class CannotDisableTenantOwnerException extends DomainException {
	constructor(
		public readonly userId: string,
		public readonly tenantId: string
	) {
		super(`无法禁用租户 ${tenantId} 的所有者 ${userId}`);
	}
}

/**
 * @description 无法移除最后一个角色异常
 */
export class CannotRemoveLastRoleException extends DomainException {
	constructor(public readonly userId: string) {
		super(`无法移除用户 ${userId} 的最后一个角色，用户必须至少有一个角色`);
	}
}

/**
 * @description 用户未找到异常
 */
export class UserNotFoundException extends DomainException {
	constructor(public readonly userId: string) {
		super(`未找到用户：${userId}`);
	}
}

/**
 * @description 租户成员已存在异常
 */
export class TenantMemberAlreadyExistsException extends DomainException {
	constructor(
		public readonly tenantId: string,
		public readonly userId: string
	) {
		super(`用户 ${userId} 已是租户 ${tenantId} 的成员`);
	}
}

/**
 * @description 无效角色键异常
 */
export class InvalidRoleKeyException extends DomainException {
	constructor(reason: string) {
		super(`角色键无效：${reason}`);
	}
}
