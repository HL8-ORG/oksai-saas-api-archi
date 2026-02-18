import { InvalidTenantIdException } from '../exceptions/domain-exceptions';

/**
 * @description 租户 ID 值对象
 *
 * 业务规则：
 * - 不能为空
 * - 必须是有效的 UUID 格式（如果提供）
 * - 不可变
 *
 * @example
 * ```typescript
 * const tenantId = TenantId.of('123e4567-e89b-12d3-a456-426614174000');
 * const newTenantId = TenantId.create(); // 生成新 UUID
 * tenantId.equals(otherId); // boolean
 * ```
 */
export class TenantId {
	private readonly _value: string;

	private constructor(value: string) {
		this._value = value;
		Object.freeze(this);
	}

	/**
	 * @description 从字符串创建租户 ID
	 *
	 * @param value - 租户 ID 字符串
	 * @returns TenantId 实例
	 * @throws InvalidTenantIdException 为空时
	 */
	static of(value: string): TenantId {
		const normalized = this.normalize(value);
		this.validate(normalized);
		return new TenantId(normalized);
	}

	/**
	 * @description 生成新的租户 ID（UUID）
	 */
	static create(): TenantId {
		return new TenantId(crypto.randomUUID());
	}

	/**
	 * @description 获取租户 ID 值
	 */
	getValue(): string {
		return this._value;
	}

	/**
	 * @description 兼容旧 API（value 属性）
	 * @deprecated 请使用 getValue() 方法
	 */
	get value(): string {
		return this._value;
	}

	/**
	 * @description 比较两个租户 ID 是否相等
	 */
	equals(other: TenantId): boolean {
		if (!other) return false;
		return this._value === other._value;
	}

	/**
	 * @description 转换为字符串
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

	/**
	 * @description 标准化
	 */
	private static normalize(value: string): string {
		return String(value ?? '').trim();
	}

	/**
	 * @description 验证
	 */
	private static validate(value: string): void {
		if (!value) {
			throw new InvalidTenantIdException('租户 ID 不能为空');
		}
	}

	/**
	 * @description 验证是否为有效的 UUID 格式
	 */
	static isValidUUID(value: string): boolean {
		const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
		return uuidRegex.test(value);
	}
}
