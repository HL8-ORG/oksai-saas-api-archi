import { CanDisableUserSpecification } from './can-disable-user.specification';
import { Specification } from './specification';
import type { UserAggregate } from '../aggregates/user.aggregate';

describe('CanDisableUserSpecification', () => {
	/**
	 * @description 创建模拟用户聚合根
	 */
	function createMockUser(overrides: { disabled?: boolean; isTenantOwner?: boolean }): UserAggregate {
		return {
			disabled: overrides.disabled ?? false,
			isTenantOwner: () => overrides.isTenantOwner ?? false
		} as unknown as UserAggregate;
	}

	describe('isSatisfiedBy', () => {
		describe('可以禁用的用户', () => {
			it('活跃的普通用户可以被禁用', () => {
				const spec = new CanDisableUserSpecification();
				const user = createMockUser({ disabled: false, isTenantOwner: false });

				expect(spec.isSatisfiedBy(user)).toBe(true);
			});

			it('活跃的租户管理员可以被禁用', () => {
				const spec = new CanDisableUserSpecification();
				const user = createMockUser({ disabled: false, isTenantOwner: false });

				expect(spec.isSatisfiedBy(user)).toBe(true);
			});

			it('活跃的租户成员可以被禁用', () => {
				const spec = new CanDisableUserSpecification();
				const user = createMockUser({ disabled: false, isTenantOwner: false });

				expect(spec.isSatisfiedBy(user)).toBe(true);
			});
		});

		describe('不能禁用的用户', () => {
			it('已禁用的用户不能再次禁用', () => {
				const spec = new CanDisableUserSpecification();
				const user = createMockUser({ disabled: true, isTenantOwner: false });

				expect(spec.isSatisfiedBy(user)).toBe(false);
			});

			it('租户所有者不能被禁用', () => {
				const spec = new CanDisableUserSpecification();
				const user = createMockUser({ disabled: false, isTenantOwner: true });

				expect(spec.isSatisfiedBy(user)).toBe(false);
			});

			it('已禁用的租户所有者不能被禁用（双重限制）', () => {
				const spec = new CanDisableUserSpecification();
				const user = createMockUser({ disabled: true, isTenantOwner: true });

				expect(spec.isSatisfiedBy(user)).toBe(false);
			});
		});
	});

	describe('规格组合', () => {
		it('应继承自 Specification 基类', () => {
			const spec = new CanDisableUserSpecification();

			expect(spec).toBeInstanceOf(Specification);
		});

		it('应支持 and 组合', () => {
			const spec = new CanDisableUserSpecification();
			const otherSpec = {
				isSatisfiedBy: () => true
			};

			const combined = spec.and(otherSpec as unknown as Specification<UserAggregate>);

			expect(combined.isSatisfiedBy).toBeDefined();
		});

		it('应支持 or 组合', () => {
			const spec = new CanDisableUserSpecification();
			const otherSpec = {
				isSatisfiedBy: () => true
			};

			const combined = spec.or(otherSpec as unknown as Specification<UserAggregate>);

			expect(combined.isSatisfiedBy).toBeDefined();
		});

		it('应支持 not 取反', () => {
			const spec = new CanDisableUserSpecification();

			const negated = spec.not();

			expect(negated.isSatisfiedBy).toBeDefined();
		});

		it('not 取反应反转结果', () => {
			const spec = new CanDisableUserSpecification();
			const user = createMockUser({ disabled: false, isTenantOwner: false });

			const negated = spec.not();

			expect(spec.isSatisfiedBy(user)).toBe(true);
			expect(negated.isSatisfiedBy(user)).toBe(false);
		});

		it('and 组合应要求两个条件都满足', () => {
			const spec = new CanDisableUserSpecification();
			const alwaysTrue = { isSatisfiedBy: () => true };
			const alwaysFalse = { isSatisfiedBy: () => false };

			const user = createMockUser({ disabled: false, isTenantOwner: false });

			const combinedTrue = spec.and(alwaysTrue as unknown as Specification<UserAggregate>);
			const combinedFalse = spec.and(alwaysFalse as unknown as Specification<UserAggregate>);

			expect(combinedTrue.isSatisfiedBy(user)).toBe(true);
			expect(combinedFalse.isSatisfiedBy(user)).toBe(false);
		});

		it('or 组合应只要求一个条件满足', () => {
			const spec = new CanDisableUserSpecification();
			const alwaysTrue = { isSatisfiedBy: () => true };
			const alwaysFalse = { isSatisfiedBy: () => false };

			const user = createMockUser({ disabled: true, isTenantOwner: false });

			const combinedTrue = spec.or(alwaysTrue as unknown as Specification<UserAggregate>);
			const combinedFalse = spec.or(alwaysFalse as unknown as Specification<UserAggregate>);

			expect(combinedTrue.isSatisfiedBy(user)).toBe(true);
			expect(combinedFalse.isSatisfiedBy(user)).toBe(false);
		});
	});
});
