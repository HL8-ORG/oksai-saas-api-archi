/**
 * @description 角色解析端口（Authorization -> Identity ReadModel）
 *
 * 说明：
 * - Authorization 作为 shared 能力，不直接依赖具体 domains 的实现
 * - 由应用侧/Identity 侧提供具体实现（例如查询 identity read model）
 */
export interface IRoleResolver {
	/**
	 * @description 获取平台角色（例如 PlatformAdmin）
	 */
	getPlatformRoles(params: { userId: string }): Promise<string[]>;

	/**
	 * @description 获取用户在租户下的角色（例如 TenantOwner/TenantAdmin/TenantMember）
	 */
	getTenantRoles(params: { tenantId: string; userId: string }): Promise<string[]>;
}

export const OKSAI_ROLE_RESOLVER_TOKEN = Symbol.for('oksai:authorization:roleResolver');
