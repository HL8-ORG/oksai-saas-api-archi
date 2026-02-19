import { Either, fail } from '../result/either';
import { ValidationError } from './validation.error';

/**
 * @description 值对象基类
 *
 * 所有值对象都应继承此类，提供统一的验证和创建机制。
 * 值对象是不可变的、按值比较的对象。
 *
 * 特性：
 * - 不可变性：所有属性只读
 * - 按值比较：通过属性值判断相等性
 * - 自验证：在创建时进行完整性验证
 *
 * @template T - 值对象内部属性类型
 *
 * @example
 * ```typescript
 * // 定义值对象
 * export class TenantName extends ValueObjectBase<{ value: string }> {
 *   private constructor(props: { value: string }) {
 *     super(props);
 *   }
 *
 *   public static create(value: string): Either<TenantName, ValidationError> {
 *     if (value.length < 2 || value.length > 100) {
 *       return fail(new ValidationError('租户名称长度必须在 2-100 个字符之间', 'name', value));
 *     }
 *     return ok(new TenantName({ value }));
 *   }
 *
 *   get value(): string {
 *     return this.props.value;
 *   }
 * }
 *
 * // 使用值对象
 * const result = TenantName.create('测试租户');
 * if (result.isOk()) {
 *   console.log(result.value.value); // '测试租户'
 * }
 * ```
 */
export abstract class ValueObjectBase<T> {
	/**
	 * 值对象内部属性
	 *
	 * @internal
	 */
	protected readonly props: T;

	/**
	 * @param props - 值对象属性
	 */
	protected constructor(props: T) {
		this.props = Object.freeze({ ...props }) as T;
	}

	/**
	 * @description 值对象相等性比较
	 *
	 * 比较规则：
	 * - 类型必须相同
	 * - 属性值必须完全相等（深度比较）
	 *
	 * @param other - 要比较的另一个值对象
	 * @returns 是否相等
	 */
	equals(other: ValueObjectBase<T>): boolean {
		if (!other) {
			return false;
		}

		if (other.constructor !== this.constructor) {
			return false;
		}

		return this.shallowEquals(this.props, other.props);
	}

	/**
	 * @description 获取值对象属性的只读副本
	 *
	 * @returns 属性对象的只读副本
	 */
	get value(): Readonly<T> {
		return this.props;
	}

	/**
	 * @description 浅比较两个对象
	 *
	 * @param a - 第一个对象
	 * @param b - 第二个对象
	 * @returns 是否相等
	 */
	private shallowEquals(a: T, b: T): boolean {
		if (a === b) {
			return true;
		}

		if (typeof a !== 'object' || a === null || typeof b !== 'object' || b === null) {
			return false;
		}

		const keysA = Object.keys(a as object);
		const keysB = Object.keys(b as object);

		if (keysA.length !== keysB.length) {
			return false;
		}

		for (const key of keysA) {
			const valueA = (a as Record<string, unknown>)[key];
			const valueB = (b as Record<string, unknown>)[key];

			if (valueA !== valueB) {
				// 递归比较嵌套对象
				if (typeof valueA === 'object' && valueA !== null && typeof valueB === 'object' && valueB !== null) {
					if (!this.shallowEquals(valueA as T, valueB as T)) {
						return false;
					}
				} else {
					return false;
				}
			}
		}

		return true;
	}

	/**
	 * @description 转换为字符串
	 *
	 * 子类应该重写此方法以提供更有意义的字符串表示
	 */
	toString(): string {
		return JSON.stringify(this.props);
	}

	/**
	 * @description 转换为 JSON
	 */
	toJSON(): Record<string, unknown> {
		return { ...this.props } as Record<string, unknown>;
	}
}

/**
 * @description 值对象创建结果类型
 *
 * 用于值对象 create 方法的返回类型
 *
 * @template T - 值对象类型
 * @template E - 错误类型，默认为 ValidationError
 */
export type ValueObjectResult<T, E = ValidationError> = Either<T, E>;
