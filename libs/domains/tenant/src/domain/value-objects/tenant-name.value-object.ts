import { DomainException } from '../exceptions/domain.exception';

/**
 * @description
 * TenantName 值对象（不可变，按值比较）。
 *
 * @example
 * ```ts
 * const name = TenantName.of('Oksai');
 * name.getValue(); // 'Oksai'
 * name.equals(otherName); // boolean
 * ```
 */
export class TenantName {
	private readonly _value: string;

	/**
	 * @param value - 租户名称
	 * @throws {DomainException} 当名称不合法时抛出
	 */
	private constructor(value: string) {
		this._value = value;
		Object.freeze(this);
	}

	/**
	 * @description 从字符串创建租户名称
	 */
	static of(value: string): TenantName {
		const v = String(value ?? '').trim();
		if (!v) throw new DomainException('租户名称不能为空');
		if (v.length < 2 || v.length > 50) throw new DomainException('租户名称长度必须在 2-50 之间');
		return new TenantName(v);
	}

	/**
	 * @description 获取租户名称值
	 */
	getValue(): string {
		return this._value;
	}

	/**
	 * @description 比较两个租户名称是否相等
	 */
	equals(other: TenantName): boolean {
		if (!other) return false;
		return this._value === other._value;
	}

	/**
	 * @description 字符串化
	 */
	toString(): string {
		return this._value;
	}

	/**
	 * @description 序列化为 JSON
	 */
	toJSON(): string {
		return this._value;
	}
}
