import { BillingId, Money, BillingStatus, BillingType } from './billing.value-objects';

// ==================== BillingId 测试 ====================

describe('BillingId', () => {
	describe('fromString', () => {
		it('应从有效字符串创建 BillingId', () => {
			// Arrange
			const value = 'bill_123456';

			// Act
			const billingId = BillingId.fromString(value);

			// Assert
			expect(billingId.getValue()).toBe(value);
			expect(billingId.toString()).toBe(value);
		});

		it('空字符串应抛出错误', () => {
			// Arrange & Act & Assert
			expect(() => BillingId.fromString('')).toThrow('账单ID不能为空。');
		});

		it('纯空白字符串应抛出错误', () => {
			// Arrange & Act & Assert
			expect(() => BillingId.fromString('   ')).toThrow('账单ID不能为空。');
		});
	});

	describe('generate', () => {
		it('应生成格式为 bill_<timestamp>_<random> 的 ID', () => {
			// Act
			const billingId = BillingId.generate();

			// Assert
			expect(billingId.getValue()).toMatch(/^bill_\d+_[a-z0-9]+$/);
		});

		it('多次调用应生成不同的 ID', () => {
			// Act
			const id1 = BillingId.generate();
			const id2 = BillingId.generate();

			// Assert
			expect(id1.equals(id2)).toBe(false);
		});
	});

	describe('equals', () => {
		it('相同值的 BillingId 应相等', () => {
			// Arrange
			const value = 'bill_123456';
			const id1 = BillingId.fromString(value);
			const id2 = BillingId.fromString(value);

			// Act & Assert
			expect(id1.equals(id2)).toBe(true);
		});

		it('不同值的 BillingId 应不相等', () => {
			// Arrange
			const id1 = BillingId.fromString('bill_111');
			const id2 = BillingId.fromString('bill_222');

			// Act & Assert
			expect(id1.equals(id2)).toBe(false);
		});

		it('与 null 比较应返回 false', () => {
			// Arrange
			const id = BillingId.fromString('bill_123');

			// Act & Assert
			expect(id.equals(null as any)).toBe(false);
		});

		it('与 undefined 比较应返回 false', () => {
			// Arrange
			const id = BillingId.fromString('bill_123');

			// Act & Assert
			expect(id.equals(undefined as any)).toBe(false);
		});
	});

	describe('toJSON', () => {
		it('应返回 ID 的字符串值', () => {
			// Arrange
			const value = 'bill_123456';
			const billingId = BillingId.fromString(value);

			// Act
			const json = billingId.toJSON();

			// Assert
			expect(json).toBe(value);
		});
	});

	describe('不可变性', () => {
		it('BillingId 应被冻结，无法修改', () => {
			// Arrange
			const billingId = BillingId.fromString('bill_123');

			// Act & Assert
			expect(Object.isFrozen(billingId)).toBe(true);
		});
	});
});

// ==================== Money 测试 ====================

describe('Money', () => {
	describe('from', () => {
		it('应创建有效的金额对象', () => {
			// Arrange
			const amount = 100;
			const currency = 'CNY';

			// Act
			const money = Money.from(amount, currency);

			// Assert
			expect(money.getAmount()).toBe(amount);
			expect(money.getCurrency()).toBe(currency);
		});

		it('金额为零应允许', () => {
			// Arrange & Act
			const money = Money.from(0, 'CNY');

			// Assert
			expect(money.getAmount()).toBe(0);
		});

		it('负金额应抛出错误', () => {
			// Arrange & Act & Assert
			expect(() => Money.from(-1, 'CNY')).toThrow('金额不能为负数。');
		});

		it('空货币代码应抛出错误', () => {
			// Arrange & Act & Assert
			expect(() => Money.from(100, '')).toThrow('货币代码必须是3位字符。');
		});

		it('非3位货币代码应抛出错误', () => {
			// Arrange & Act & Assert
			expect(() => Money.from(100, 'CN')).toThrow('货币代码必须是3位字符。');
			expect(() => Money.from(100, 'CNYU')).toThrow('货币代码必须是3位字符。');
		});
	});

	describe('add', () => {
		it('相同货币相加应返回正确结果', () => {
			// Arrange
			const money1 = Money.from(100, 'CNY');
			const money2 = Money.from(50, 'CNY');

			// Act
			const result = money1.add(money2);

			// Assert
			expect(result.getAmount()).toBe(150);
			expect(result.getCurrency()).toBe('CNY');
		});

		it('不同货币相加应抛出错误', () => {
			// Arrange
			const money1 = Money.from(100, 'CNY');
			const money2 = Money.from(50, 'USD');

			// Act & Assert
			expect(() => money1.add(money2)).toThrow('不能对不同货币的金额进行加法运算。');
		});
	});

	describe('subtract', () => {
		it('相同货币相减应返回正确结果', () => {
			// Arrange
			const money1 = Money.from(100, 'CNY');
			const money2 = Money.from(30, 'CNY');

			// Act
			const result = money1.subtract(money2);

			// Assert
			expect(result.getAmount()).toBe(70);
			expect(result.getCurrency()).toBe('CNY');
		});

		it('相减结果为负数应抛出错误（因为不允许负金额）', () => {
			// Arrange
			const money1 = Money.from(50, 'CNY');
			const money2 = Money.from(100, 'CNY');

			// Act & Assert
			expect(() => money1.subtract(money2)).toThrow('金额不能为负数。');
		});

		it('不同货币相减应抛出错误', () => {
			// Arrange
			const money1 = Money.from(100, 'CNY');
			const money2 = Money.from(50, 'USD');

			// Act & Assert
			expect(() => money1.subtract(money2)).toThrow('不能对不同货币的金额进行减法运算。');
		});
	});

	describe('equals', () => {
		it('相同金额和货币应相等', () => {
			// Arrange
			const money1 = Money.from(100, 'CNY');
			const money2 = Money.from(100, 'CNY');

			// Act & Assert
			expect(money1.equals(money2)).toBe(true);
		});

		it('不同金额应不相等', () => {
			// Arrange
			const money1 = Money.from(100, 'CNY');
			const money2 = Money.from(200, 'CNY');

			// Act & Assert
			expect(money1.equals(money2)).toBe(false);
		});

		it('不同货币应不相等', () => {
			// Arrange
			const money1 = Money.from(100, 'CNY');
			const money2 = Money.from(100, 'USD');

			// Act & Assert
			expect(money1.equals(money2)).toBe(false);
		});

		it('与 null 比较应返回 false', () => {
			// Arrange
			const money = Money.from(100, 'CNY');

			// Act & Assert
			expect(money.equals(null as any)).toBe(false);
		});
	});

	describe('toJSON', () => {
		it('应返回包含金额和货币的对象', () => {
			// Arrange
			const money = Money.from(100, 'CNY');

			// Act
			const json = money.toJSON();

			// Assert
			expect(json).toEqual({ amount: 100, currency: 'CNY' });
		});
	});

	describe('不可变性', () => {
		it('Money 应被冻结，无法修改', () => {
			// Arrange
			const money = Money.from(100, 'CNY');

			// Act & Assert
			expect(Object.isFrozen(money)).toBe(true);
		});
	});
});

// ==================== BillingStatus 枚举测试 ====================

describe('BillingStatus', () => {
	it('应包含所有定义的状态', () => {
		// Assert
		expect(BillingStatus.PENDING).toBe('pending');
		expect(BillingStatus.PAID).toBe('paid');
		expect(BillingStatus.FAILED).toBe('failed');
		expect(BillingStatus.REFUNDED).toBe('refunded');
		expect(BillingStatus.CANCELLED).toBe('cancelled');
	});
});

// ==================== BillingType 枚举测试 ====================

describe('BillingType', () => {
	it('应包含所有定义的类型', () => {
		// Assert
		expect(BillingType.SUBSCRIPTION).toBe('subscription');
		expect(BillingType.USAGE).toBe('usage');
		expect(BillingType.ONE_TIME).toBe('one_time');
	});
});
