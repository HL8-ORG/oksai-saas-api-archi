import { DomainException } from '../exceptions/domain.exception';

/**
 * @description
 * TenantName 值对象（不可变，按值比较）。
 *
 * @example
 * ```ts
 * const name = new TenantName('Oksai');
 * ```
 */
export class TenantName {
	private readonly value: string;

	/**
	 * @param value - 租户名称
	 * @throws {DomainException} 当名称不合法时抛出
	 */
	constructor(value: string) {
		const v = String(value ?? '').trim();
		if (!v) throw new DomainException('租户名称不能为空');
		if (v.length < 2 || v.length > 50) throw new DomainException('租户名称长度必须在 2-50 之间');
		this.value = v;
	}

	equals(other: TenantName): boolean {
		return this.value === other.value;
	}

	toString(): string {
		return this.value;
	}
}

