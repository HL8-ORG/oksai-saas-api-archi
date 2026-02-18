import type { ICommand } from '@oksai/cqrs';

/**
 * @description 创建 __CONTEXT__ 命令类型（稳定字符串，用于 handler 绑定）
 */
export const CREATE___CONTEXT___COMMAND_TYPE = 'Create__CONTEXT__' as const;

/**
 * @description 创建 __CONTEXT__ 命令（模板）
 *
 * 强约束：
 * - `type` 必须是稳定字符串（用于 CommandBus 路由与可观测性）
 */
export interface Create__CONTEXT__Command extends ICommand<typeof CREATE___CONTEXT___COMMAND_TYPE> {
	/**
	 * @description __CONTEXT__ 名称
	 */
	name: string;
}
