import { InvalidUserIdException } from '../exceptions/domain-exceptions';

/**
 * @description 用户 ID 值对象
 *
 * 业务规则：
 * - 不能为空
 * - 必须是有效的 UUID 格式（如果提供）
 * - 不可变
 *
 * @example
 * ```typescript
 * const userId = UserId.of('123e4567-e89b-12d3-a456-426614174000');
 * const newUserId = UserId.create(); // 生成新 UUID
 * userId.equals(otherId); // boolean
 * ```
 */
export class UserId {
	private readonly _value: string;

	private constructor(value: string) {
		this._value = value;
		Object.freeze(this);
	}

	/**
	 * @description 从字符串创建用户 ID
	 *
	 * @param value - 用户 ID 字符串
	 * @returns UserId 实例
	 * @throws InvalidUserIdException 为空时
	 */
	static of(value: string): UserId {
		const normalized = this.normalize(value);
		this.validate(normalized);
		return new UserId(normalized);
	}

	/**
	 * @description 生成新的用户 ID（UUID）
	 */
	static create(): UserId {
		return new UserId(crypto.randomUUID());
	}

	/**
	 * @description 获取用户 ID 值
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
	 * @description 比较两个用户 ID 是否相等
	 */
	equals(other: UserId): boolean {
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
			throw new InvalidUserIdException('用户 ID 不能为空');
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
