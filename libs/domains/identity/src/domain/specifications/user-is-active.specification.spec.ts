import { UserIsActiveSpecification } from './user-is-active.specification';
import { Specification } from './specification';
import type { UserAggregate } from '../aggregates/user.aggregate';

describe('UserIsActiveSpecification', () => {
	/**
	 * @description 创建模拟用户聚合根
	 */
	function createMockUser(disabled: boolean): UserAggregate {
		return {
			disabled
		} as unknown as UserAggregate;
	}

	describe('isSatisfiedBy', () => {
		it('活跃用户应返回 true', () => {
			const spec = new UserIsActiveSpecification();
			const user = createMockUser(false);

			expect(spec.isSatisfiedBy(user)).toBe(true);
		});

		it('已禁用用户应返回 false', () => {
			const spec = new UserIsActiveSpecification();
			const user = createMockUser(true);

			expect(spec.isSatisfiedBy(user)).toBe(false);
		});
	});

	describe('规格组合', () => {
		it('应继承自 Specification 基类', () => {
			const spec = new UserIsActiveSpecification();

			expect(spec).toBeInstanceOf(Specification);
		});

		it('应支持 and 组合', () => {
			const spec = new UserIsActiveSpecification();
			const otherSpec = {
				isSatisfiedBy: () => true
			};

			const combined = spec.and(otherSpec as unknown as Specification<UserAggregate>);

			expect(combined.isSatisfiedBy).toBeDefined();
		});

		it('应支持 or 组合', () => {
			const spec = new UserIsActiveSpecification();
			const otherSpec = {
				isSatisfiedBy: () => true
			};

			const combined = spec.or(otherSpec as unknown as Specification<UserAggregate>);

			expect(combined.isSatisfiedBy).toBeDefined();
		});

		it('应支持 not 取反', () => {
			const spec = new UserIsActiveSpecification();

			const negated = spec.not();

			expect(negated.isSatisfiedBy).toBeDefined();
		});

		it('not 取反应反转结果', () => {
			const spec = new UserIsActiveSpecification();
			const activeUser = createMockUser(false);
			const disabledUser = createMockUser(true);

			const negated = spec.not();

			expect(spec.isSatisfiedBy(activeUser)).toBe(true);
			expect(negated.isSatisfiedBy(activeUser)).toBe(false);

			expect(spec.isSatisfiedBy(disabledUser)).toBe(false);
			expect(negated.isSatisfiedBy(disabledUser)).toBe(true);
		});

		it('and 组合应要求两个条件都满足', () => {
			const spec = new UserIsActiveSpecification();
			const alwaysTrue = { isSatisfiedBy: () => true };
			const alwaysFalse = { isSatisfiedBy: () => false };

			const activeUser = createMockUser(false);

			const combinedTrue = spec.and(alwaysTrue as unknown as Specification<UserAggregate>);
			const combinedFalse = spec.and(alwaysFalse as unknown as Specification<UserAggregate>);

			expect(combinedTrue.isSatisfiedBy(activeUser)).toBe(true);
			expect(combinedFalse.isSatisfiedBy(activeUser)).toBe(false);
		});

		it('or 组合应只要求一个条件满足', () => {
			const spec = new UserIsActiveSpecification();
			const alwaysTrue = { isSatisfiedBy: () => true };
			const alwaysFalse = { isSatisfiedBy: () => false };

			const disabledUser = createMockUser(true);

			const combinedTrue = spec.or(alwaysTrue as unknown as Specification<UserAggregate>);
			const combinedFalse = spec.or(alwaysFalse as unknown as Specification<UserAggregate>);

			expect(combinedTrue.isSatisfiedBy(disabledUser)).toBe(true);
			expect(combinedFalse.isSatisfiedBy(disabledUser)).toBe(false);
		});

		it('复杂组合：活跃用户且不是租户所有者', () => {
			const isActiveSpec = new UserIsActiveSpecification();
			const isNotTenantOwnerSpec = {
				isSatisfiedBy: (user: UserAggregate) => !user.isTenantOwner()
			};

			const combined = isActiveSpec.and(isNotTenantOwnerSpec as unknown as Specification<UserAggregate>);

			const activeOwner = { disabled: false, isTenantOwner: () => true } as unknown as UserAggregate;
			const activeMember = { disabled: false, isTenantOwner: () => false } as unknown as UserAggregate;
			const disabledMember = { disabled: true, isTenantOwner: () => false } as unknown as UserAggregate;

			expect(combined.isSatisfiedBy(activeOwner)).toBe(false);
			expect(combined.isSatisfiedBy(activeMember)).toBe(true);
			expect(combined.isSatisfiedBy(disabledMember)).toBe(false);
		});
	});
});
