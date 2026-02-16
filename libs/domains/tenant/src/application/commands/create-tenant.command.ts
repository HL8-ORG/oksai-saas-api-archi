/**
 * @description 创建租户命令（写模型）
 */
export interface CreateTenantCommand {
	/**
	 * @description 租户名称
	 */
	name: string;

	/**
	 * @description 最大成员数（示例字段）
	 */
	maxMembers?: number;
}

