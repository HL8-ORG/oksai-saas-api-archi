import { RoleKey, PREDEFINED_ROLE_KEYS } from './role-key';
import { InvalidRoleKeyException } from '../exceptions/domain-exceptions';

describe('RoleKey', () => {
	describe('创建', () => {
		it('应成功创建有效的角色键', () => {
			const roleKey = RoleKey.of('TenantAdmin');

			expect(roleKey.getValue()).toBe('TenantAdmin');
		});

		it('应自动去除前后空格', () => {
			const roleKey = RoleKey.of('  TenantAdmin  ');

			expect(roleKey.getValue()).toBe('TenantAdmin');
		});

		it('应支持带数字的角色键', () => {
			const roleKey = RoleKey.of('Role123');

			expect(roleKey.getValue()).toBe('Role123');
		});

		it('应支持预定义的租户角色', () => {
			const owner = RoleKey.of(PREDEFINED_ROLE_KEYS.TENANT_OWNER);
			const admin = RoleKey.of(PREDEFINED_ROLE_KEYS.TENANT_ADMIN);
			const member = RoleKey.of(PREDEFINED_ROLE_KEYS.TENANT_MEMBER);

			expect(owner.getValue()).toBe('TenantOwner');
			expect(admin.getValue()).toBe('TenantAdmin');
			expect(member.getValue()).toBe('TenantMember');
		});

		it('应支持预定义的平台角色', () => {
			const platformAdmin = RoleKey.of(PREDEFINED_ROLE_KEYS.PLATFORM_ADMIN);

			expect(platformAdmin.getValue()).toBe('PlatformAdmin');
		});
	});

	describe('验证失败', () => {
		it('空字符串应抛出 InvalidRoleKeyException', () => {
			expect(() => RoleKey.of('')).toThrow(InvalidRoleKeyException);
			expect(() => RoleKey.of('')).toThrow('角色键不能为空');
		});

		it('只有空格应抛出 InvalidRoleKeyException', () => {
			expect(() => RoleKey.of('   ')).toThrow(InvalidRoleKeyException);
		});

		it('null/undefined 应抛出 InvalidRoleKeyException', () => {
			expect(() => RoleKey.of(null as unknown as string)).toThrow(InvalidRoleKeyException);
			expect(() => RoleKey.of(undefined as unknown as string)).toThrow(InvalidRoleKeyException);
		});

		it('小写开头应抛出 InvalidRoleKeyException', () => {
			expect(() => RoleKey.of('tenantAdmin')).toThrow(InvalidRoleKeyException);
			expect(() => RoleKey.of('tenantAdmin')).toThrow('PascalCase');
		});

		it('全小写应抛出 InvalidRoleKeyException', () => {
			expect(() => RoleKey.of('admin')).toThrow(InvalidRoleKeyException);
		});

		it('包含特殊字符应抛出 InvalidRoleKeyException', () => {
			expect(() => RoleKey.of('Admin-Role')).toThrow(InvalidRoleKeyException);
			expect(() => RoleKey.of('Admin_Role')).toThrow(InvalidRoleKeyException);
			expect(() => RoleKey.of('Admin.Role')).toThrow(InvalidRoleKeyException);
		});

		it('包含空格应抛出 InvalidRoleKeyException', () => {
			expect(() => RoleKey.of('Admin Role')).toThrow(InvalidRoleKeyException);
		});

		it('以数字开头应抛出 InvalidRoleKeyException', () => {
			expect(() => RoleKey.of('1Admin')).toThrow(InvalidRoleKeyException);
		});
	});

	describe('相等性比较', () => {
		it('相同角色键应相等', () => {
			const roleKey1 = RoleKey.of('TenantAdmin');
			const roleKey2 = RoleKey.of('TenantAdmin');

			expect(roleKey1.equals(roleKey2)).toBe(true);
		});

		it('不同角色键应不相等', () => {
			const roleKey1 = RoleKey.of('TenantAdmin');
			const roleKey2 = RoleKey.of('TenantMember');

			expect(roleKey1.equals(roleKey2)).toBe(false);
		});

		it('与 null 比较应返回 false', () => {
			const roleKey = RoleKey.of('TenantAdmin');

			expect(roleKey.equals(null as unknown as RoleKey)).toBe(false);
		});

		it('与 undefined 比较应返回 false', () => {
			const roleKey = RoleKey.of('TenantAdmin');

			expect(roleKey.equals(undefined as unknown as RoleKey)).toBe(false);
		});
	});

	describe('角色类型检查', () => {
		describe('isPlatformRole', () => {
			it('PlatformAdmin 应返回 true', () => {
				const roleKey = RoleKey.of(PREDEFINED_ROLE_KEYS.PLATFORM_ADMIN);

				expect(roleKey.isPlatformRole()).toBe(true);
			});

			it('租户角色应返回 false', () => {
				const roleKey = RoleKey.of(PREDEFINED_ROLE_KEYS.TENANT_ADMIN);

				expect(roleKey.isPlatformRole()).toBe(false);
			});
		});

		describe('isTenantRole', () => {
			it('TenantOwner 应返回 true', () => {
				const roleKey = RoleKey.of(PREDEFINED_ROLE_KEYS.TENANT_OWNER);

				expect(roleKey.isTenantRole()).toBe(true);
			});

			it('TenantAdmin 应返回 true', () => {
				const roleKey = RoleKey.of(PREDEFINED_ROLE_KEYS.TENANT_ADMIN);

				expect(roleKey.isTenantRole()).toBe(true);
			});

			it('TenantMember 应返回 true', () => {
				const roleKey = RoleKey.of(PREDEFINED_ROLE_KEYS.TENANT_MEMBER);

				expect(roleKey.isTenantRole()).toBe(true);
			});

			it('PlatformAdmin 应返回 false', () => {
				const roleKey = RoleKey.of(PREDEFINED_ROLE_KEYS.PLATFORM_ADMIN);

				expect(roleKey.isTenantRole()).toBe(false);
			});
		});

		describe('isTenantOwner', () => {
			it('TenantOwner 应返回 true', () => {
				const roleKey = RoleKey.of(PREDEFINED_ROLE_KEYS.TENANT_OWNER);

				expect(roleKey.isTenantOwner()).toBe(true);
			});

			it('TenantAdmin 应返回 false', () => {
				const roleKey = RoleKey.of(PREDEFINED_ROLE_KEYS.TENANT_ADMIN);

				expect(roleKey.isTenantOwner()).toBe(false);
			});
		});

		describe('isTenantAdmin', () => {
			it('TenantAdmin 应返回 true', () => {
				const roleKey = RoleKey.of(PREDEFINED_ROLE_KEYS.TENANT_ADMIN);

				expect(roleKey.isTenantAdmin()).toBe(true);
			});

			it('TenantMember 应返回 false', () => {
				const roleKey = RoleKey.of(PREDEFINED_ROLE_KEYS.TENANT_MEMBER);

				expect(roleKey.isTenantAdmin()).toBe(false);
			});
		});

		describe('isAdminLevel', () => {
			it('PlatformAdmin 应返回 true', () => {
				const roleKey = RoleKey.of(PREDEFINED_ROLE_KEYS.PLATFORM_ADMIN);

				expect(roleKey.isAdminLevel()).toBe(true);
			});

			it('TenantOwner 应返回 true', () => {
				const roleKey = RoleKey.of(PREDEFINED_ROLE_KEYS.TENANT_OWNER);

				expect(roleKey.isAdminLevel()).toBe(true);
			});

			it('TenantAdmin 应返回 true', () => {
				const roleKey = RoleKey.of(PREDEFINED_ROLE_KEYS.TENANT_ADMIN);

				expect(roleKey.isAdminLevel()).toBe(true);
			});

			it('TenantMember 应返回 false', () => {
				const roleKey = RoleKey.of(PREDEFINED_ROLE_KEYS.TENANT_MEMBER);

				expect(roleKey.isAdminLevel()).toBe(false);
			});
		});
	});

	describe('序列化', () => {
		it('toString 应返回角色键字符串', () => {
			const roleKey = RoleKey.of('TenantAdmin');

			expect(roleKey.toString()).toBe('TenantAdmin');
		});

		it('toJSON 应返回角色键字符串', () => {
			const roleKey = RoleKey.of('TenantAdmin');

			expect(roleKey.toJSON()).toBe('TenantAdmin');
		});

		it('JSON.stringify 应正确序列化', () => {
			const roleKey = RoleKey.of('TenantAdmin');

			expect(JSON.stringify(roleKey)).toBe('"TenantAdmin"');
		});
	});

	describe('value 属性（兼容旧 API）', () => {
		it('value 属性应返回角色键值', () => {
			const roleKey = RoleKey.of('TenantAdmin');

			expect(roleKey.value).toBe('TenantAdmin');
		});
	});

	describe('不可变性', () => {
		it('对象应被冻结', () => {
			const roleKey = RoleKey.of('TenantAdmin');

			expect(Object.isFrozen(roleKey)).toBe(true);
		});
	});
});
