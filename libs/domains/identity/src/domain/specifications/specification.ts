import type { ISpecification } from './specification.interface';

/**
 * @description 规格基类
 *
 * 提供组合操作的默认实现
 *
 * @template T - 候选对象类型
 *
 * @example
 * ```typescript
 * class UserIsActiveSpecification extends Specification<User> {
 *   isSatisfiedBy(user: User): boolean {
 *     return !user.disabled;
 *   }
 * }
 *
 * // 组合使用
 * const spec = new UserIsActiveSpecification()
 *   .and(new UserHasRoleSpecification('admin'))
 *   .not();
 * ```
 */
export abstract class Specification<T> implements ISpecification<T> {
	/**
	 * @description 检查候选对象是否满足规格（由子类实现）
	 */
	abstract isSatisfiedBy(candidate: T): boolean;

	/**
	 * @description 与另一个规格组合
	 */
	and(other: ISpecification<T>): ISpecification<T> {
		return new AndSpecification(this, other);
	}

	/**
	 * @description 或另一个规格组合
	 */
	or(other: ISpecification<T>): ISpecification<T> {
		return new OrSpecification(this, other);
	}

	/**
	 * @description 取反
	 */
	not(): ISpecification<T> {
		return new NotSpecification(this);
	}
}

/**
 * @description AND 组合规格
 *
 * 两个规格都必须满足
 */
class AndSpecification<T> extends Specification<T> {
	constructor(
		private readonly left: ISpecification<T>,
		private readonly right: ISpecification<T>
	) {
		super();
	}

	isSatisfiedBy(candidate: T): boolean {
		return this.left.isSatisfiedBy(candidate) && this.right.isSatisfiedBy(candidate);
	}
}

/**
 * @description OR 组合规格
 *
 * 至少一个规格满足
 */
class OrSpecification<T> extends Specification<T> {
	constructor(
		private readonly left: ISpecification<T>,
		private readonly right: ISpecification<T>
	) {
		super();
	}

	isSatisfiedBy(candidate: T): boolean {
		return this.left.isSatisfiedBy(candidate) || this.right.isSatisfiedBy(candidate);
	}
}

/**
 * @description NOT 组合规格
 *
 * 取反规格
 */
class NotSpecification<T> extends Specification<T> {
	constructor(private readonly spec: ISpecification<T>) {
		super();
	}

	isSatisfiedBy(candidate: T): boolean {
		return !this.spec.isSatisfiedBy(candidate);
	}
}
