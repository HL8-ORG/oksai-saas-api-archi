import { DomainException } from '../exceptions/domain.exception';

/**
 * @description
 * TenantSettings 值对象：租户配置。
 *
 * 注意事项：
 * - 这里仅提供最小字段用于演示聚合不变性约束
 * - 后续可扩展为更完整的订阅/配额模型
 *
 * @example
 * ```ts
 * const settings = TenantSettings.of({ maxMembers: 50 });
 * settings.getMaxMembers(); // 50
 * ```
 */
export class TenantSettings {
	private readonly _maxMembers: number;

	/**
	 * @param maxMembers - 最大成员数（1-10000）
	 * @throws {DomainException} 当参数非法时抛出
	 */
	private constructor(maxMembers: number) {
		this._maxMembers = maxMembers;
		Object.freeze(this);
	}

	/**
	 * @description 创建租户配置
	 */
	static of(options: { maxMembers: number }): TenantSettings {
		const v = Number(options.maxMembers);
		if (!Number.isFinite(v) || v < 1 || v > 10000) {
			throw new DomainException('maxMembers 必须在 1-10000 之间');
		}
		return new TenantSettings(v);
	}

	/**
	 * @description 创建默认配置
	 */
	static default(): TenantSettings {
		return new TenantSettings(50);
	}

	/**
	 * @description 获取最大成员数
	 */
	getMaxMembers(): number {
		return this._maxMembers;
	}

	/**
	 * @description 兼容旧 API（maxMembers 属性）
	 */
	get maxMembers(): number {
		return this._maxMembers;
	}

	/**
	 * @description 比较两个配置是否相等
	 */
	equals(other: TenantSettings): boolean {
		if (!other) return false;
		return this._maxMembers === other._maxMembers;
	}

	/**
	 * @description 序列化为 JSON
	 */
	toJSON(): { maxMembers: number } {
		return { maxMembers: this._maxMembers };
	}
}
