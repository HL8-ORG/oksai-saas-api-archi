/**
 * @description 规格接口
 *
 * 用于封装业务规则，支持组合
 *
 * @template T - 候选对象类型
 */
export interface ISpecification<T> {
	/**
	 * @description 检查候选对象是否满足规格
	 *
	 * @param candidate - 候选对象
	 * @returns 是否满足规格
	 */
	isSatisfiedBy(candidate: T): boolean;

	/**
	 * @description 与另一个规格组合（AND）
	 *
	 * @param other - 另一个规格
	 * @returns 组合后的规格
	 */
	and(other: ISpecification<T>): ISpecification<T>;

	/**
	 * @description 或另一个规格组合（OR）
	 *
	 * @param other - 另一个规格
	 * @returns 组合后的规格
	 */
	or(other: ISpecification<T>): ISpecification<T>;

	/**
	 * @description 取反（NOT）
	 *
	 * @returns 取反后的规格
	 */
	not(): ISpecification<T>;
}
