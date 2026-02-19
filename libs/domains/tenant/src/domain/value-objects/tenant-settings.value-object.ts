import { ValueObjectBase, Either, ok, fail, ValidationError } from '@oksai/kernel';
import { DomainException } from '../exceptions/domain.exception';

/**
 * @description
 * TenantSettings 值对象：租户配置。
 *
 * 业务规则：
 * - maxMembers 必须在 1-10000 之间
 *
 * 注意事项：
 * - 这里仅提供最小字段用于演示聚合不变性约束
 * - 后续可扩展为更完整的订阅/配额模型
 *
 * @example
 * ```ts
 * // 使用 Either 模式创建（推荐）
 * const result = TenantSettings.create({ maxMembers: 50 });
 * if (result.isOk()) {
 *   console.log(result.value.maxMembers); // 50
 * }
 *
 * // 使用 of 方法创建（兼容旧代码）
 * const settings = TenantSettings.of({ maxMembers: 50 });
 * settings.getMaxMembers(); // 50
 * ```
 */
export class TenantSettings extends ValueObjectBase<{ maxMembers: number }> {
	/**
	 * 私有构造函数，通过 create、default 或 fromPersistence 创建实例
	 */
	private constructor(props: { maxMembers: number }) {
		super(props);
	}

	/**
	 * @description 创建租户配置值对象
	 *
	 * 使用 Either 模式，不抛出异常，返回成功或失败结果
	 *
	 * @param options - 配置选项
	 * @returns Either<ValidationError, TenantSettings> - 失败在左，成功在右
	 *
	 * @example
	 * ```typescript
	 * const result = TenantSettings.create({ maxMembers: 50 });
	 * if (result.isOk()) {
	 *   console.log(result.value.maxMembers); // 50
	 * }
	 * ```
	 */
	public static create(options: { maxMembers: number }): Either<ValidationError, TenantSettings> {
		const v = Number(options.maxMembers);

		// 验证规则：maxMembers 必须在 1-10000 之间
		if (!Number.isFinite(v) || v < 1 || v > 10000) {
			return fail(new ValidationError(
				'maxMembers 必须在 1-10000 之间',
				'maxMembers',
				options.maxMembers,
				'TENANT_SETTINGS_MAX_MEMBERS_INVALID'
			));
		}

		return ok(new TenantSettings({ maxMembers: v }));
	}

	/**
	 * @description 创建默认配置
	 *
	 * @returns TenantSettings 实例（maxMembers = 50）
	 */
	public static default(): TenantSettings {
		return new TenantSettings({ maxMembers: 50 });
	}

	/**
	 * @description 从持久化数据重建值对象（跳过验证）
	 *
	 * 仅用于从数据库加载已知合法数据
	 *
	 * @param data - 配置数据
	 * @returns TenantSettings 实例
	 */
	public static fromPersistence(data: { maxMembers: number }): TenantSettings {
		return new TenantSettings({ maxMembers: data.maxMembers });
	}

	/**
	 * @description 创建租户配置（兼容旧代码）
	 *
	 * @param options - 配置选项
	 * @returns TenantSettings 实例
	 * @throws {DomainException} 当参数非法时抛出
	 *
	 * @deprecated 推荐使用 create() 方法，返回 Either 结果
	 */
	static of(options: { maxMembers: number }): TenantSettings {
		const result = this.create(options);
		if (result.isFail()) {
			throw new DomainException(result.value.message);
		}
		return result.value;
	}

	/**
	 * @description 获取最大成员数
	 */
	getMaxMembers(): number {
		return this.props.maxMembers;
	}

	/**
	 * @description 获取最大成员数的快捷访问器
	 */
	get maxMembers(): number {
		return this.props.maxMembers;
	}

	/**
	 * @description 比较两个配置是否相等
	 */
	equals(other: ValueObjectBase<{ maxMembers: number }>): boolean {
		return super.equals(other);
	}

	/**
	 * @description 序列化为 JSON
	 */
	override toJSON(): Record<string, unknown> {
		return { maxMembers: this.props.maxMembers };
	}
}
