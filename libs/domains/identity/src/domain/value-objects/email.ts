import { InvalidEmailException } from '../exceptions/domain-exceptions';

/**
 * @description 邮箱值对象
 *
 * 业务规则：
 * - 必须符合邮箱格式
 * - 存储时统一小写
 * - 不可变
 *
 * @example
 * ```typescript
 * const email = Email.of('user@example.com');
 * email.getValue(); // 'user@example.com'
 * email.getDomain(); // 'example.com'
 * email.equals(otherEmail); // boolean
 * ```
 */
export class Email {
	private readonly _value: string;

	private constructor(email: string) {
		this._value = email;
		Object.freeze(this);
	}

	/**
	 * @description 从字符串创建邮箱
	 *
	 * @param value - 邮箱字符串
	 * @returns Email 实例
	 * @throws InvalidEmailException 格式不正确时
	 */
	static of(value: string): Email {
		const normalized = this.normalize(value);
		this.validate(normalized);
		return new Email(normalized);
	}

	/**
	 * @description 获取邮箱值（原始字符串）
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
	 * @description 比较两个邮箱是否相等
	 */
	equals(other: Email): boolean {
		if (!other) return false;
		return this._value === other._value;
	}

	/**
	 * @description 获取邮箱域名部分
	 *
	 * @example
	 * ```typescript
	 * Email.of('user@example.com').getDomain(); // 'example.com'
	 * ```
	 */
	getDomain(): string {
		const parts = this._value.split('@');
		return parts[1] ?? '';
	}

	/**
	 * @description 获取邮箱本地部分（@ 前）
	 *
	 * @example
	 * ```typescript
	 * Email.of('user@example.com').getLocalPart(); // 'user'
	 * ```
	 */
	getLocalPart(): string {
		const parts = this._value.split('@');
		return parts[0] ?? '';
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
	 * @description 标准化邮箱
	 */
	private static normalize(value: string): string {
		return String(value ?? '')
			.trim()
			.toLowerCase();
	}

	/**
	 * @description 验证邮箱格式
	 */
	private static validate(email: string): void {
		if (!email) {
			throw new InvalidEmailException('邮箱不能为空');
		}

		// 基础格式验证
		if (!email.includes('@')) {
			throw new InvalidEmailException('邮箱格式不正确，缺少 @ 符号');
		}

		const parts = email.split('@');
		if (parts.length !== 2) {
			throw new InvalidEmailException('邮箱格式不正确');
		}

		const [localPart, domain] = parts;
		if (!localPart || !domain) {
			throw new InvalidEmailException('邮箱格式不正确');
		}

		// 更严格的邮箱正则验证
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		if (!emailRegex.test(email)) {
			throw new InvalidEmailException(`邮箱格式不正确: ${email}`);
		}
	}
}
