import { ValueObjectBase, Either, ok, fail, ValidationError } from '@oksai/kernel';
import { DomainException } from '../exceptions/domain.exception';

/**
 * @description
 * TenantId 值对象（不可变，按值比较）。
 *
 * 业务规则：
 * - 非空
 * - 允许字母/数字/短横线/下划线
 * - 长度 3-64 个字符
 *
 * @example
 * ```ts
 * // 使用 Either 模式创建（推荐）
 * const result = TenantId.create('t-001');
 * if (result.isOk()) {
 *   console.log(result.value.value); // 't-001'
 * }
 *
 * // 生成新的租户 ID
 * const newId = TenantId.generate();
 *
 * // 使用 of 方法创建（兼容旧代码，失败时抛出异常）
 * const id = TenantId.of('t-001');
 * id.getValue(); // 't-001'
 * id.equals(otherId); // boolean
 * ```
 */
export class TenantId extends ValueObjectBase<{ value: string }> {
	/**
	 * 私有构造函数，通过 create、generate 或 fromPersistence 创建实例
	 */
	private constructor(props: { value: string }) {
		super(props);
	}

	/**
	 * @description 创建租户 ID 值对象
	 *
	 * 使用 Either 模式，不抛出异常，返回成功或失败结果
	 *
	 * @param value - 租户 ID 字符串
	 * @returns Either<ValidationError, TenantId> - 失败在左，成功在右
	 *
	 * @example
	 * ```typescript
	 * const result = TenantId.create('t-001');
	 * if (result.isOk()) {
	 *   console.log(result.value.value); // 't-001'
	 * } else {
	 *   console.log(result.value.message); // 错误信息
	 * }
	 * ```
	 */
	public static create(value: string): Either<ValidationError, TenantId> {
		const v = String(value ?? '').trim();

		// 验证规则 1：非空检查
		if (!v) {
			return fail(new ValidationError('租户 ID 不能为空', 'tenantId', value, 'TENANT_ID_EMPTY'));
		}

		// 验证规则 2：格式检查（字母/数字/短横线/下划线，长度 3-64）
		if (!/^[a-zA-Z0-9_-]{3,64}$/.test(v)) {
			return fail(new ValidationError(
				'租户 ID 格式非法（允许 a-zA-Z0-9_-，长度 3-64）',
				'tenantId',
				value,
				'TENANT_ID_FORMAT_INVALID'
			));
		}

		return ok(new TenantId({ value: v }));
	}

	/**
	 * @description 生成新的租户 ID
	 *
	 * @returns TenantId 实例
	 */
	public static generate(): TenantId {
		const id = crypto.randomUUID().replace(/-/g, '').substring(0, 16);
		return new TenantId({ value: `t-${id}` });
	}

	/**
	 * @description 从持久化数据重建值对象（跳过验证）
	 *
	 * 仅用于从数据库加载已知合法数据
	 *
	 * @param value - 租户 ID 字符串
	 * @returns TenantId 实例
	 */
	public static fromPersistence(value: string): TenantId {
		return new TenantId({ value });
	}

	/**
	 * @description 从字符串创建租户 ID（兼容旧代码）
	 *
	 * @param value - tenantId
	 * @returns TenantId 实例
	 * @throws {DomainException} 当 tenantId 非法时抛出
	 *
	 * @deprecated 推荐使用 create() 方法，返回 Either 结果
	 */
	static of(value: string): TenantId {
		const result = this.create(value);
		if (result.isFail()) {
			throw new DomainException(result.value.message);
		}
		return result.value;
	}

	/**
	 * @description 获取租户 ID 值
	 */
	getValue(): string {
		return this.props.value;
	}

	/**
	 * @description 获取租户 ID 值的快捷访问器
	 */
	get id(): string {
		return this.props.value;
	}

	/**
	 * @description 比较两个租户 ID 是否相等
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
