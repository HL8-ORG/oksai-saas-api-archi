import type { ICommand } from '@oksai/cqrs';

/**
 * @description 创建租户命令类型（稳定字符串，用于 handler 绑定）
 */
export const CREATE_TENANT_COMMAND_TYPE = 'CreateTenant' as const;

/**
 * @description 创建租户命令（写模型）
 *
 * 强约束：
 * - `type` 必须是稳定字符串（用于 CommandBus 路由与可观测性）
 */
export interface CreateTenantCommand extends ICommand<typeof CREATE_TENANT_COMMAND_TYPE> {
	/**
	 * @description 租户名称
	 */
	name: string;

	/**
	 * @description 最大成员数（示例字段）
	 */
	maxMembers?: number;
}
