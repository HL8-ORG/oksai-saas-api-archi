import type { ICommand } from '@oksai/cqrs';

/**
 * @description 注册用户命令类型（稳定字符串，用于 handler 绑定）
 */
export const REGISTER_USER_COMMAND_TYPE = 'RegisterUser' as const;

/**
 * @description 注册用户命令
 *
 * 强约束：
 * - `type` 必须是稳定字符串（用于 CommandBus 路由与可观测性）
 * - userId 必须来自可信上下文（后续由 Better Auth 统一生成/管理）
 *
 * 权限说明：
 * - 用户注册是公开操作，不需要权限检查
 * - 如需限制注册，可在 Handler 中使用 @RequirePermission 装饰器
 */
export interface RegisterUserCommand extends ICommand<typeof REGISTER_USER_COMMAND_TYPE> {
	/**
	 * @description 用户 ID（由 Better Auth 生成）
	 */
	userId: string;

	/**
	 * @description 用户邮箱
	 */
	email: string;
}

/**
 * @description 分配角色命令类型
 */
export const ASSIGN_ROLE_COMMAND_TYPE = 'AssignRole' as const;

/**
 * @description 分配角色命令
 *
 * 权限说明：
 * - 需要租户管理权限才能为用户分配角色
 * - 使用时在 Handler 上添加 @RequirePermission('tenant:manage') 装饰器
 */
export interface AssignRoleCommand extends ICommand<typeof ASSIGN_ROLE_COMMAND_TYPE> {
	/**
	 * @description 目标用户 ID
	 */
	userId: string;

	/**
	 * @description 租户 ID
	 */
	tenantId: string;

	/**
	 * @description 要分配的角色
	 */
	role: string;
}
