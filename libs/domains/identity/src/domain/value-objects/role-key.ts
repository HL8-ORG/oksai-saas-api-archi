import { InvalidRoleKeyException } from '../exceptions/domain-exceptions';

/**
 * @description 预定义角色键
 *
 * 约定：
 * - 平台角色：PlatformAdmin
 * - 租户角色：TenantOwner/TenantAdmin/TenantMember
 */
export const PREDEFINED_ROLE_KEYS = {
	// 平台角色
	PLATFORM_ADMIN: 'PlatformAdmin',
	// 租户角色
	TENANT_OWNER: 'TenantOwner',
	TENANT_ADMIN: 'TenantAdmin',
	TENANT_MEMBER: 'TenantMember'
} as const;

export type PredefinedRoleKey = (typeof PREDEFINED_ROLE_KEYS)[keyof typeof PREDEFINED_ROLE_KEYS];

/**
 * @description 角色 Key 值对象
 *
 * 业务规则：
 * - 不能为空
 * - 格式必须符合约定（PascalCase）
 * - 不可变
 *
 * @example
 * ```typescript
 * const roleKey = RoleKey.of('TenantAdmin');
 * roleKey.getValue(); // 'TenantAdmin'
 * roleKey.isPlatformRole(); // false
 * roleKey.isTenantRole(); // true
 * ```
 */
export class RoleKey {
	private readonly _value: string;

	private constructor(value: string) {
		this._value = value;
		Object.freeze(this);
	}

	/**
	 * @description 从字符串创建角色键
	 *
	 * @param value - 角色键字符串
	 * @returns RoleKey 实例
	 * @throws InvalidRoleKeyException 为空或格式不正确时
	 */
	static of(value: string): RoleKey {
		const normalized = this.normalize(value);
		this.validate(normalized);
		return new RoleKey(normalized);
	}

	/**
	 * @description 获取角色键值
	 */
	getValue(): string {
		return this._value;
	}

	/**
	 * @description 兼容旧 API（value 属性）
	 * @deprecated 请使用 getValue() 方法
	 */
	get value(): string {
		return this._value;
	}

	/**
	 * @description 比较两个角色键是否相等
	 */
	equals(other: RoleKey): boolean {
		if (!other) return false;
		return this._value === other._value;
	}

	/**
	 * @description 转换为字符串
	 */
	toString(): string {
		return this._value;
	}

	/**
	 * @description 序列化为 JSON
	 */
	toJSON(): string {
		return this._value;
	}

	/**
	 * @description 是否为平台角色
	 */
	isPlatformRole(): boolean {
		return this._value === PREDEFINED_ROLE_KEYS.PLATFORM_ADMIN;
	}

	/**
	 * @description 是否为租户角色
	 */
	isTenantRole(): boolean {
		return (
			this._value === PREDEFINED_ROLE_KEYS.TENANT_OWNER ||
			this._value === PREDEFINED_ROLE_KEYS.TENANT_ADMIN ||
			this._value === PREDEFINED_ROLE_KEYS.TENANT_MEMBER
		);
	}

	/**
	 * @description 是否为租户所有者角色
	 */
	isTenantOwner(): boolean {
		return this._value === PREDEFINED_ROLE_KEYS.TENANT_OWNER;
	}

	/**
	 * @description 是否为租户管理员角色
	 */
	isTenantAdmin(): boolean {
		return this._value === PREDEFINED_ROLE_KEYS.TENANT_ADMIN;
	}

	/**
	 * @description 是否为管理员级别角色（平台管理员、租户所有者、租户管理员）
	 */
	isAdminLevel(): boolean {
		return (
			this._value === PREDEFINED_ROLE_KEYS.PLATFORM_ADMIN ||
			this._value === PREDEFINED_ROLE_KEYS.TENANT_OWNER ||
			this._value === PREDEFINED_ROLE_KEYS.TENANT_ADMIN
		);
	}

	/**
	 * @description 标准化
	 */
	private static normalize(value: string): string {
		return String(value ?? '').trim();
	}

	/**
	 * @description 验证
	 */
	private static validate(value: string): void {
		if (!value) {
			throw new InvalidRoleKeyException('角色键不能为空');
		}

		// 验证 PascalCase 格式（首字母大写，后续字母可以是字母或数字）
		const pascalCaseRegex = /^[A-Z][a-zA-Z0-9]*$/;
		if (!pascalCaseRegex.test(value)) {
			throw new InvalidRoleKeyException(`角色键格式不正确（需要 PascalCase）: ${value}`);
		}
	}
}
