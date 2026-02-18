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
 * const id = TenantId.of('t-001');
 * id.getValue(); // 't-001'
 * id.equals(otherId); // boolean
 * ```
 */
export class TenantId {
	private readonly _value: string;

	/**
	 * @param value - tenantId
	 * @throws {DomainException} 当 tenantId 非法时抛出
	 */
	private constructor(value: string) {
		this._value = value;
		Object.freeze(this);
	}

	/**
	 * @description 从字符串创建租户 ID
	 */
	static of(value: string): TenantId {
		const v = String(value ?? '').trim();
		if (!v) throw new DomainException('tenantId 不能为空');
		if (!/^[a-zA-Z0-9_-]{3,64}$/.test(v)) {
			throw new DomainException('tenantId 格式非法（允许 a-zA-Z0-9_-，长度 3-64）');
		}
		return new TenantId(v);
	}

	/**
	 * @description 生成新的租户 ID
	 */
	static create(): TenantId {
		const id = crypto.randomUUID().replace(/-/g, '').substring(0, 16);
		return new TenantId(`t-${id}`);
	}

	/**
	 * @description 获取租户 ID 值
	 */
	getValue(): string {
		return this._value;
	}

	/**
	 * @description 按值比较
	 */
	equals(other: TenantId): boolean {
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
