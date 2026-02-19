import { ValueObjectBase, Either, ok, fail, ValidationError } from '@oksai/kernel';
import { DomainException } from '../exceptions/domain.exception';

/**
 * @description
 * TenantName 值对象（不可变，按值比较）。
 *
 * 业务规则：
 * - 长度在 2-100 个字符之间
 * - 仅允许中文、英文、数字和连字符
 * - 不能以连字符开头或结尾
 * - 不能为空
 *
 * @example
 * ```ts
 * // 使用 Either 模式创建（推荐）
 * const result = TenantName.create('Oksai');
 * if (result.isOk()) {
 *   console.log(result.value.value); // 'Oksai'
 * }
 *
 * // 使用 of 方法创建（兼容旧代码，失败时抛出异常）
 * const name = TenantName.of('Oksai');
 * name.getValue(); // 'Oksai'
 * name.equals(otherName); // boolean
 * ```
 */
export class TenantName extends ValueObjectBase<{ value: string }> {
	/**
	 * 私有构造函数，通过 create 或 fromPersistence 创建实例
	 */
	private constructor(props: { value: string }) {
		super(props);
	}

	/**
	 * @description 创建租户名称值对象
	 *
	 * 使用 Either 模式，不抛出异常，返回成功或失败结果
	 *
	 * @param value - 租户名称字符串
	 * @returns Either<ValidationError, TenantName> - 失败在左，成功在右
	 *
	 * @example
	 * ```typescript
	 * const result = TenantName.create('测试租户');
	 * if (result.isOk()) {
	 *   console.log(result.value.value); // '测试租户'
	 * } else {
	 *   console.log(result.value.message); // 错误信息
	 * }
	 * ```
	 */
	public static create(value: string): Either<ValidationError, TenantName> {
		const v = String(value ?? '').trim();

		// 验证规则 1：非空检查
		if (!v) {
			return fail(new ValidationError('租户名称不能为空', 'name', value));
		}

		// 验证规则 2：长度检查（2-100 个字符）
		if (v.length < 2 || v.length > 100) {
			return fail(new ValidationError(
				`租户名称长度必须在 2-100 个字符之间，当前长度：${v.length}`,
				'name',
				value,
				'TENANT_NAME_LENGTH_INVALID'
			));
		}

		// 验证规则 3：字符格式检查（中文、英文、数字、连字符）
		if (!/^[\u4e00-\u9fa5a-zA-Z0-9-]+$/.test(v)) {
			return fail(new ValidationError(
				'租户名称只能包含中文、英文、数字和连字符',
				'name',
				value,
				'TENANT_NAME_FORMAT_INVALID'
			));
		}

		// 验证规则 4：连字符位置检查
		if (v.startsWith('-') || v.endsWith('-')) {
			return fail(new ValidationError(
				'租户名称不能以连字符开头或结尾',
				'name',
				value,
				'TENANT_NAME_HYPHEN_INVALID'
			));
		}

		return ok(new TenantName({ value: v }));
	}

	/**
	 * @description 从持久化数据重建值对象（跳过验证）
	 *
	 * 仅用于从数据库加载已知合法数据
	 *
	 * @param value - 租户名称字符串
	 * @returns TenantName 实例
	 */
	public static fromPersistence(value: string): TenantName {
		return new TenantName({ value });
	}

	/**
	 * @description 从字符串创建租户名称（兼容旧代码）
	 *
	 * @param value - 租户名称
	 * @returns TenantName 实例
	 * @throws {DomainException} 当名称不合法时抛出
	 *
	 * @deprecated 推荐使用 create() 方法，返回 Either 结果
	 */
	static of(value: string): TenantName {
		const result = this.create(value);
		if (result.isFail()) {
			throw new DomainException(result.value.message);
		}
		return result.value;
	}

	/**
	 * @description 获取租户名称值
	 */
	getValue(): string {
		return this.props.value;
	}

	/**
	 * @description 获取租户名称值的快捷访问器
	 */
	get name(): string {
		return this.props.value;
	}

	/**
	 * @description 比较两个租户名称是否相等
	 */
	equals(other: ValueObjectBase<{ value: string }>): boolean {
		return super.equals(other);
	}

	/**
	 * @description 字符串化
	 */
	override toString(): string {
		return this.props.value;
	}

	/**
	 * @description 序列化为 JSON
	 */
	override toJSON(): Record<string, unknown> {
		return { value: this.props.value };
	}
}
