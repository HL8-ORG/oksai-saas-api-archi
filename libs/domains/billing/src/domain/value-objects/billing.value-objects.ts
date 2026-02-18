/**
 * @description 账单 ID 值对象
 */
export class BillingId {
	private readonly _value: string;

	private constructor(value: string) {
		if (!value || value.trim().length === 0) {
			throw new Error('账单ID不能为空。');
		}
		this._value = value;
		Object.freeze(this);
	}

	/**
	 * @description 从字符串创建账单 ID
	 */
	static fromString(value: string): BillingId {
		return new BillingId(value);
	}

	/**
	 * @description 生成新的账单 ID
	 */
	static generate(): BillingId {
		const rand = Math.random().toString(36).slice(2, 10);
		return new BillingId(`bill_${Date.now()}_${rand}`);
	}

	/**
	 * @description 获取账单 ID 值
	 */
	getValue(): string {
		return this._value;
	}

	/**
	 * @description 比较两个账单 ID 是否相等
	 */
	equals(other: BillingId): boolean {
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
}

/**
 * @description 金额值对象
 */
export class Money {
	private readonly _amount: number;
	private readonly _currency: string;

	private constructor(amount: number, currency: string) {
		if (amount < 0) {
			throw new Error('金额不能为负数。');
		}
		if (!currency || currency.length !== 3) {
			throw new Error('货币代码必须是3位字符。');
		}
		this._amount = amount;
		this._currency = currency;
		Object.freeze(this);
	}

	/**
	 * @description 创建金额
	 */
	static from(amount: number, currency: string): Money {
		return new Money(amount, currency);
	}

	/**
	 * @description 获取金额
	 */
	getAmount(): number {
		return this._amount;
	}

	/**
	 * @description 获取货币代码
	 */
	getCurrency(): string {
		return this._currency;
	}

	/**
	 * @description 加法运算
	 */
	add(other: Money): Money {
		if (this._currency !== other._currency) {
			throw new Error('不能对不同货币的金额进行加法运算。');
		}
		return new Money(this._amount + other._amount, this._currency);
	}

	/**
	 * @description 减法运算
	 */
	subtract(other: Money): Money {
		if (this._currency !== other._currency) {
			throw new Error('不能对不同货币的金额进行减法运算。');
		}
		return new Money(this._amount - other._amount, this._currency);
	}

	/**
	 * @description 比较两个金额是否相等
	 */
	equals(other: Money): boolean {
		if (!other) return false;
		return this._amount === other._amount && this._currency === other._currency;
	}

	/**
	 * @description 序列化为 JSON
	 */
	toJSON(): { amount: number; currency: string } {
		return { amount: this._amount, currency: this._currency };
	}
}

/**
 * @description 账单状态枚举
 */
export enum BillingStatus {
	PENDING = 'pending',
	PAID = 'paid',
	FAILED = 'failed',
	REFUNDED = 'refunded',
	CANCELLED = 'cancelled'
}

/**
 * @description 账单类型枚举
 */
export enum BillingType {
	SUBSCRIPTION = 'subscription',
	USAGE = 'usage',
	ONE_TIME = 'one_time'
}
