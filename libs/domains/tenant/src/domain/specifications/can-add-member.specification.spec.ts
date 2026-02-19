import { CanAddMemberSpecification } from './can-add-member.specification';
import { TenantAggregate } from '../aggregates/tenant.aggregate';
import { TenantId } from '../value-objects/tenant-id.value-object';
import { TenantName } from '../value-objects/tenant-name.value-object';
import { TenantSettings } from '../value-objects/tenant-settings.value-object';

describe('CanAddMemberSpecification 规格', () => {
	describe('isSatisfiedBy 方法', () => {
		it('当成员数小于上限时应该返回 true', () => {
			// Arrange
			const tenantId = TenantId.of('t-001');
			const tenantName = TenantName.of('测试租户');
			const settings = TenantSettings.of({ maxMembers: 10 });
			const tenant = TenantAggregate.create(tenantId, tenantName, settings);

			// Act
			const spec = new CanAddMemberSpecification();
			const result = spec.isSatisfiedBy(tenant);

			// Assert
			expect(result).toBe(true);
		});

		it('当成员数为上限减 1 时应该返回 true', () => {
			// Arrange
			const tenantId = TenantId.of('t-001');
			const tenantName = TenantName.of('测试租户');
			const settings = TenantSettings.of({ maxMembers: 3 });
			const tenant = TenantAggregate.create(tenantId, tenantName, settings);
			tenant.addMember('user-001');
			tenant.addMember('user-002');

			// Act
			const spec = new CanAddMemberSpecification();
			const result = spec.isSatisfiedBy(tenant);

			// Assert
			expect(result).toBe(true);
		});

		it('当成员数等于上限时应该返回 false', () => {
			// Arrange
			const tenantId = TenantId.of('t-001');
			const tenantName = TenantName.of('测试租户');
			const settings = TenantSettings.of({ maxMembers: 2 });
			const tenant = TenantAggregate.create(tenantId, tenantName, settings);
			tenant.addMember('user-001');
			tenant.addMember('user-002');

			// Act
			const spec = new CanAddMemberSpecification();
			const result = spec.isSatisfiedBy(tenant);

			// Assert
			expect(result).toBe(false);
		});

		it('当成员数超过上限时应该返回 false（边界条件测试）', () => {
			// Arrange - 通过设置较小的上限来模拟这种情况
			const tenantId = TenantId.of('t-001');
			const tenantName = TenantName.of('测试租户');
			const settings = TenantSettings.of({ maxMembers: 2 });
			const tenant = TenantAggregate.create(tenantId, tenantName, settings);
			tenant.addMember('user-001');
			tenant.addMember('user-002');

			// 此时成员数已达到上限，再添加成员会被阻止
			// Act
			const spec = new CanAddMemberSpecification();
			const result = spec.isSatisfiedBy(tenant);

			// Assert
			expect(result).toBe(false);
		});

		it('新创建的租户（无成员）应该可以添加成员', () => {
			// Arrange
			const tenantId = TenantId.of('t-001');
			const tenantName = TenantName.of('测试租户');
			const settings = TenantSettings.of({ maxMembers: 1 });
			const tenant = TenantAggregate.create(tenantId, tenantName, settings);

			// Act
			const spec = new CanAddMemberSpecification();
			const result = spec.isSatisfiedBy(tenant);

			// Assert
			expect(result).toBe(true);
		});
	});

	describe('规格组合', () => {
		it('应该支持 and 组合', () => {
			// Arrange
			const tenantId = TenantId.of('t-001');
			const tenantName = TenantName.of('测试租户');
			const settings = TenantSettings.of({ maxMembers: 10 });
			const tenant = TenantAggregate.create(tenantId, tenantName, settings);

			// Act
			const spec1 = new CanAddMemberSpecification();
			const spec2 = new CanAddMemberSpecification();
			const andSpec = spec1.and(spec2);

			// Assert
			expect(andSpec.isSatisfiedBy(tenant)).toBe(true);
		});

		it('应该支持 or 组合', () => {
			// Arrange
			const tenantId = TenantId.of('t-001');
			const tenantName = TenantName.of('测试租户');
			const settings = TenantSettings.of({ maxMembers: 10 });
			const tenant = TenantAggregate.create(tenantId, tenantName, settings);

			// Act
			const spec1 = new CanAddMemberSpecification();
			const spec2 = new CanAddMemberSpecification();
			const orSpec = spec1.or(spec2);

			// Assert
			expect(orSpec.isSatisfiedBy(tenant)).toBe(true);
		});

		it('应该支持 not 组合', () => {
			// Arrange
			const tenantId = TenantId.of('t-001');
			const tenantName = TenantName.of('测试租户');
			const settings = TenantSettings.of({ maxMembers: 2 });
			const tenant = TenantAggregate.create(tenantId, tenantName, settings);
			tenant.addMember('user-001');
			tenant.addMember('user-002');

			// Act
			const spec = new CanAddMemberSpecification();
			const notSpec = spec.not();

			// Assert - 当不能添加成员时，not 应该返回 true
			expect(notSpec.isSatisfiedBy(tenant)).toBe(true);
		});
	});
});
