import { DomainException } from '../exceptions/domain.exception';

/**
 * @description
 * TenantId 值对象（不可变，按值比较）。
 *
 * 约束：
 * - 非空
 * - 允许字母/数字/短横线/下划线
 *
 * @example
 * ```ts
 * const id = new TenantId('t-001');
 * id.toString(); // 't-001'
 * ```
 */
export class TenantId {
	private readonly value: string;

	/**
	 * @param value - tenantId
	 * @throws {DomainException} 当 tenantId 非法时抛出
	 */
	constructor(value: string) {
		const v = String(value ?? '').trim();
		if (!v) throw new DomainException('tenantId 不能为空');
		if (!/^[a-zA-Z0-9_-]{3,64}$/.test(v)) {
			throw new DomainException('tenantId 格式非法（允许 a-zA-Z0-9_-，长度 3-64）');
		}
		this.value = v;
	}

	/**
	 * @description 按值比较
	 */
	equals(other: TenantId): boolean {
		return this.value === other.value;
	}

	/**
	 * @description 字符串化
	 */
	toString(): string {
		return this.value;
	}
}

