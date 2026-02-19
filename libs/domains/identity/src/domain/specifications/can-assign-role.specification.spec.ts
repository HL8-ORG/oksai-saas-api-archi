import { CanAssignRoleSpecification } from './can-assign-role.specification';
import { Specification } from './specification';
import { RoleKey, PREDEFINED_ROLE_KEYS } from '../value-objects/role-key';
import type { UserAggregate } from '../aggregates/user.aggregate';

describe('CanAssignRoleSpecification', () => {
	/**
	 * @description 创建模拟用户聚合根
	 */
	function createMockUser(overrides: {
		disabled?: boolean;
		roles?: RoleKey[];
		isAdminLevel?: boolean;
		isTenantOwner?: boolean;
	}): UserAggregate {
		return {
			disabled: overrides.disabled ?? false,
			roles: overrides.roles ?? [],
			isAdminLevel: () => overrides.isAdminLevel ?? false,
			isTenantOwner: () => overrides.isTenantOwner ?? false,
			hasRole: (roleKey: RoleKey) => overrides.roles?.some((r) => r.equals(roleKey)) ?? false
		} as unknown as UserAggregate;
	}

	describe('isSatisfiedBy', () => {
		describe('活跃用户', () => {
			it('活跃用户可以分配普通角色', () => {
				const spec = new CanAssignRoleSpecification(RoleKey.of('CustomRole'));
				const user = createMockUser({ disabled: false, roles: [] });

				expect(spec.isSatisfiedBy(user)).toBe(true);
			});

			it('活跃用户可以分配租户成员角色', () => {
				const roleKey = RoleKey.of(PREDEFINED_ROLE_KEYS.TENANT_MEMBER);
				const spec = new CanAssignRoleSpecification(roleKey);
				const user = createMockUser({ disabled: false, roles: [] });

				expect(spec.isSatisfiedBy(user)).toBe(true);
			});
		});

		describe('已禁用用户', () => {
			it('已禁用用户不能分配角色', () => {
				const spec = new CanAssignRoleSpecification(RoleKey.of('CustomRole'));
				const user = createMockUser({ disabled: true, roles: [] });

				expect(spec.isSatisfiedBy(user)).toBe(false);
			});

			it('已禁用的管理员不能分配角色', () => {
				const roleKey = RoleKey.of(PREDEFINED_ROLE_KEYS.TENANT_MEMBER);
				const spec = new CanAssignRoleSpecification(roleKey);
				const user = createMockUser({ disabled: true, roles: [roleKey], isAdminLevel: true });

				expect(spec.isSatisfiedBy(user)).toBe(false);
			});
		});

		describe('重复分配', () => {
			it('用户已有该角色时不能重复分配', () => {
				const roleKey = RoleKey.of('CustomRole');
				const spec = new CanAssignRoleSpecification(roleKey);
				const user = createMockUser({ disabled: false, roles: [roleKey] });

				expect(spec.isSatisfiedBy(user)).toBe(false);
			});

			it('用户已有租户成员角色时不能再次分配', () => {
				const roleKey = RoleKey.of(PREDEFINED_ROLE_KEYS.TENANT_MEMBER);
				const spec = new CanAssignRoleSpecification(roleKey);
				const user = createMockUser({ disabled: false, roles: [roleKey] });

				expect(spec.isSatisfiedBy(user)).toBe(false);
			});
		});

		describe('管理员角色分配', () => {
			it('无角色的用户不能被分配管理员角色', () => {
				const roleKey = RoleKey.of(PREDEFINED_ROLE_KEYS.TENANT_ADMIN);
				const spec = new CanAssignRoleSpecification(roleKey);
				const user = createMockUser({ disabled: false, roles: [], isAdminLevel: false });

				expect(spec.isSatisfiedBy(user)).toBe(false);
			});

			it('普通成员不能被分配管理员角色', () => {
				const memberRole = RoleKey.of(PREDEFINED_ROLE_KEYS.TENANT_MEMBER);
				const adminRole = RoleKey.of(PREDEFINED_ROLE_KEYS.TENANT_ADMIN);
				const spec = new CanAssignRoleSpecification(adminRole);
				const user = createMockUser({
					disabled: false,
					roles: [memberRole],
					isAdminLevel: false
				});

				expect(spec.isSatisfiedBy(user)).toBe(false);
			});

			it('管理员可以被分配其他管理员角色', () => {
				const adminRole = RoleKey.of(PREDEFINED_ROLE_KEYS.TENANT_ADMIN);
				const ownerRole = RoleKey.of(PREDEFINED_ROLE_KEYS.TENANT_OWNER);
				const spec = new CanAssignRoleSpecification(ownerRole);
				const user = createMockUser({
					disabled: false,
					roles: [adminRole],
					isAdminLevel: true
				});

				expect(spec.isSatisfiedBy(user)).toBe(true);
			});

			it('平台管理员角色需要管理员权限', () => {
				const platformAdmin = RoleKey.of(PREDEFINED_ROLE_KEYS.PLATFORM_ADMIN);
				const spec = new CanAssignRoleSpecification(platformAdmin);
				const normalUser = createMockUser({
					disabled: false,
					roles: [RoleKey.of(PREDEFINED_ROLE_KEYS.TENANT_MEMBER)],
					isAdminLevel: false
				});

				expect(spec.isSatisfiedBy(normalUser)).toBe(false);
			});

			it('租户所有者角色需要管理员权限', () => {
				const ownerRole = RoleKey.of(PREDEFINED_ROLE_KEYS.TENANT_OWNER);
				const spec = new CanAssignRoleSpecification(ownerRole);
				const normalUser = createMockUser({
					disabled: false,
					roles: [RoleKey.of(PREDEFINED_ROLE_KEYS.TENANT_MEMBER)],
					isAdminLevel: false
				});

				expect(spec.isSatisfiedBy(normalUser)).toBe(false);
			});

			it('租户管理员角色需要管理员权限', () => {
				const adminRole = RoleKey.of(PREDEFINED_ROLE_KEYS.TENANT_ADMIN);
				const spec = new CanAssignRoleSpecification(adminRole);
				const normalUser = createMockUser({
					disabled: false,
					roles: [RoleKey.of(PREDEFINED_ROLE_KEYS.TENANT_MEMBER)],
					isAdminLevel: false
				});

				expect(spec.isSatisfiedBy(normalUser)).toBe(false);
			});
		});
	});

	describe('规格组合', () => {
		it('应继承自 Specification 基类', () => {
			const spec = new CanAssignRoleSpecification(RoleKey.of('CustomRole'));

			expect(spec).toBeInstanceOf(Specification);
		});

		it('应支持 and 组合', () => {
			const spec = new CanAssignRoleSpecification(RoleKey.of('CustomRole'));
			const otherSpec = {
				isSatisfiedBy: () => true
			};

			const combined = spec.and(otherSpec as unknown as Specification<UserAggregate>);

			expect(combined.isSatisfiedBy).toBeDefined();
		});

		it('应支持 or 组合', () => {
			const spec = new CanAssignRoleSpecification(RoleKey.of('CustomRole'));
			const otherSpec = {
				isSatisfiedBy: () => true
			};

			const combined = spec.or(otherSpec as unknown as Specification<UserAggregate>);

			expect(combined.isSatisfiedBy).toBeDefined();
		});

		it('应支持 not 取反', () => {
			const spec = new CanAssignRoleSpecification(RoleKey.of('CustomRole'));

			const negated = spec.not();

			expect(negated.isSatisfiedBy).toBeDefined();
		});
	});
});
