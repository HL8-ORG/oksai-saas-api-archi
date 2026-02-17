/**
 * @description 角色 Key 值对象（最小实现）
 *
 * 约定：
 * - 平台角色：PlatformAdmin
 * - 租户角色：TenantOwner/TenantAdmin/TenantMember
 */
export class RoleKey {
	private constructor(readonly value: string) {}

	static of(value: string): RoleKey {
		const v = String(value ?? '').trim();
		if (!v) throw new Error('角色不能为空。');
		return new RoleKey(v);
	}
}

