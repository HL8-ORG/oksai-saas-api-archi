import { BillingAggregate, BillingException } from './billing.aggregate';
import { BillingId, Money, BillingStatus, BillingType } from '../value-objects';
import type { EventStoreDomainEvent } from '@oksai/event-store';

// ==================== 辅助函数 ====================

function createBillingId(): BillingId {
	return BillingId.generate();
}

function createMoney(amount: number = 100, currency: string = 'CNY'): Money {
	return Money.from(amount, currency);
}

function createBilling(amount: number = 100, billingType: BillingType = BillingType.ONE_TIME): BillingAggregate {
	return BillingAggregate.create(createBillingId(), 'tenant-123', createMoney(amount), billingType, '测试账单');
}

// ==================== BillingException 测试 ====================

describe('BillingException', () => {
	it('应正确创建异常实例', () => {
		// Arrange & Act
		const exception = new BillingException('测试异常消息');

		// Assert
		expect(exception).toBeInstanceOf(Error);
		expect(exception.name).toBe('BillingException');
		expect(exception.message).toBe('测试异常消息');
	});
});

// ==================== BillingAggregate.create 测试 ====================

describe('BillingAggregate.create', () => {
	it('应创建待支付状态的账单', () => {
		// Arrange
		const id = createBillingId();
		const amount = createMoney(100);
		const tenantId = 'tenant-123';
		const billingType = BillingType.ONE_TIME;
		const description = '测试账单';

		// Act
		const billing = BillingAggregate.create(id, tenantId, amount, billingType, description);

		// Assert
		expect(billing.id.equals(id)).toBe(true);
		expect(billing.tenantId).toBe(tenantId);
		expect(billing.amount.equals(amount)).toBe(true);
		expect(billing.status).toBe(BillingStatus.PENDING);
		expect(billing.billingType).toBe(billingType);
		expect(billing.description).toBe(description);
	});

	it('创建账单时应发出 BillingCreated 事件', () => {
		// Arrange & Act
		const billing = createBilling();

		// Assert
		const events = billing.getUncommittedEvents();
		expect(events).toHaveLength(1);
		expect(events[0].eventType).toBe('BillingCreated');
	});

	it('高价值账单（>=1000）应自动添加 high-value 标签', () => {
		// Arrange & Act
		const billing = createBilling(1000);

		// Assert
		expect(billing.hasTag('high-value')).toBe(true);
	});

	it('低价值账单（<100）应自动添加 low-value 标签', () => {
		// Arrange & Act
		const billing = createBilling(50);

		// Assert
		expect(billing.hasTag('low-value')).toBe(true);
	});

	it('订阅类型账单应自动设置 subscription 分类', () => {
		// Arrange & Act
		const billing = createBilling(100, BillingType.SUBSCRIPTION);

		// Assert
		expect(billing.category).toBe('subscription');
	});

	it('一次性账单应自动设置 one-time 分类', () => {
		// Arrange & Act
		const billing = createBilling(100, BillingType.ONE_TIME);

		// Assert
		expect(billing.category).toBe('one-time');
	});
});

// ==================== BillingAggregate.rehydrate 测试 ====================

describe('BillingAggregate.rehydrate', () => {
	it('应从 BillingCreated 事件重建账单', () => {
		// Arrange
		const id = createBillingId();
		const createdAt = new Date();
		const events: EventStoreDomainEvent[] = [
			{
				eventType: 'BillingCreated',
				aggregateId: id.toString(),
				occurredAt: createdAt,
				eventData: {
					tenantId: 'tenant-123',
					amount: 100,
					currency: 'CNY',
					billingType: BillingType.ONE_TIME,
					description: '测试账单'
				},
				schemaVersion: 1
			}
		];

		// Act
		const billing = BillingAggregate.rehydrate(id, events);

		// Assert
		expect(billing.id.equals(id)).toBe(true);
		expect(billing.tenantId).toBe('tenant-123');
		expect(billing.amount.getAmount()).toBe(100);
		expect(billing.amount.getCurrency()).toBe('CNY');
		expect(billing.billingType).toBe(BillingType.ONE_TIME);
		expect(billing.description).toBe('测试账单');
		expect(billing.status).toBe(BillingStatus.PENDING);
	});

	it('缺少 BillingCreated 事件应抛出异常', () => {
		// Arrange
		const id = createBillingId();
		const events: EventStoreDomainEvent[] = [];

		// Act & Assert
		expect(() => BillingAggregate.rehydrate(id, events)).toThrow(BillingException);
		expect(() => BillingAggregate.rehydrate(id, events)).toThrow(
			`账单事件流非法：缺少创建事件（billingId=${id.toString()}）。`
		);
	});

	it('应从事件流重建已支付状态的账单', () => {
		// Arrange
		const id = createBillingId();
		const createdAt = new Date();
		const paidAt = new Date();
		const events: EventStoreDomainEvent[] = [
			{
				eventType: 'BillingCreated',
				aggregateId: id.toString(),
				occurredAt: createdAt,
				eventData: {
					tenantId: 'tenant-123',
					amount: 100,
					currency: 'CNY',
					billingType: BillingType.ONE_TIME,
					description: '测试账单'
				},
				schemaVersion: 1
			},
			{
				eventType: 'BillingPaid',
				aggregateId: id.toString(),
				occurredAt: paidAt,
				eventData: {
					paidAt,
					paymentMethod: 'alipay',
					transactionId: 'tx-123'
				},
				schemaVersion: 1
			}
		];

		// Act
		const billing = BillingAggregate.rehydrate(id, events);

		// Assert
		expect(billing.status).toBe(BillingStatus.PAID);
		expect(billing.paidAt).toEqual(paidAt);
	});
});

// ==================== markAsPaid 测试 ====================

describe('BillingAggregate.markAsPaid', () => {
	it('待支付状态的账单应能标记为已支付', () => {
		// Arrange
		const billing = createBilling();

		// Act
		billing.markAsPaid('alipay', 'tx-123');

		// Assert
		expect(billing.status).toBe(BillingStatus.PAID);
		expect(billing.paidAt).toBeDefined();
	});

	it('标记已支付应发出 BillingPaid 事件', () => {
		// Arrange
		const billing = createBilling();
		billing.commitUncommittedEvents();

		// Act
		billing.markAsPaid('alipay', 'tx-123');

		// Assert
		const events = billing.getUncommittedEvents();
		expect(events).toHaveLength(1);
		expect(events[0].eventType).toBe('BillingPaid');
		expect((events[0].eventData as any).paymentMethod).toBe('alipay');
		expect((events[0].eventData as any).transactionId).toBe('tx-123');
	});

	it('非待支付状态的账单标记已支付应抛出异常', () => {
		// Arrange
		const billing = createBilling();
		billing.markAsPaid('alipay', 'tx-123');

		// Act & Assert
		expect(() => billing.markAsPaid('wechat', 'tx-456')).toThrow(BillingException);
		expect(() => billing.markAsPaid('wechat', 'tx-456')).toThrow(
			`只有待支付状态的账单才能标记为已支付，当前状态：${BillingStatus.PAID}。`
		);
	});

	it('已支付账单应添加 paid 标签', () => {
		// Arrange
		const billing = createBilling();

		// Act
		billing.markAsPaid('alipay', 'tx-123');

		// Assert
		expect(billing.hasTag('paid')).toBe(true);
	});
});

// ==================== markAsFailed 测试 ====================

describe('BillingAggregate.markAsFailed', () => {
	it('待支付状态的账单应能标记为支付失败', () => {
		// Arrange
		const billing = createBilling();

		// Act
		billing.markAsFailed('余额不足');

		// Assert
		expect(billing.status).toBe(BillingStatus.FAILED);
		expect(billing.failedAt).toBeDefined();
		expect(billing.retryCount).toBe(1);
	});

	it('标记支付失败应发出 BillingFailed 事件', () => {
		// Arrange
		const billing = createBilling();
		billing.commitUncommittedEvents();

		// Act
		billing.markAsFailed('余额不足');

		// Assert
		const events = billing.getUncommittedEvents();
		expect(events).toHaveLength(1);
		expect(events[0].eventType).toBe('BillingFailed');
		expect((events[0].eventData as any).reason).toBe('余额不足');
		expect((events[0].eventData as any).retryCount).toBe(1);
	});

	it('非待支付状态的账单标记失败应抛出异常', () => {
		// Arrange
		const billing = createBilling();
		billing.markAsPaid('alipay', 'tx-123');

		// Act & Assert
		expect(() => billing.markAsFailed('测试失败')).toThrow(BillingException);
	});
});

// ==================== refund 测试 ====================

describe('BillingAggregate.refund', () => {
	it('已支付状态的账单应能退款', () => {
		// Arrange
		const billing = createBilling();
		billing.markAsPaid('alipay', 'tx-123');

		// Act
		billing.refund('用户申请退款');

		// Assert
		expect(billing.status).toBe(BillingStatus.REFUNDED);
		expect(billing.refundAmount).toBe(100);
	});

	it('退款应发出 BillingRefunded 事件', () => {
		// Arrange
		const billing = createBilling();
		billing.markAsPaid('alipay', 'tx-123');
		billing.commitUncommittedEvents();

		// Act
		billing.refund('用户申请退款');

		// Assert
		const events = billing.getUncommittedEvents();
		expect(events).toHaveLength(1);
		expect(events[0].eventType).toBe('BillingRefunded');
		expect((events[0].eventData as any).reason).toBe('用户申请退款');
		expect((events[0].eventData as any).refundAmount).toBe(100);
	});

	it('非已支付状态的账单退款应抛出异常', () => {
		// Arrange
		const billing = createBilling();

		// Act & Assert
		expect(() => billing.refund('用户申请退款')).toThrow(BillingException);
		expect(() => billing.refund('用户申请退款')).toThrow(
			`只有已支付状态的账单才能退款，当前状态：${BillingStatus.PENDING}。`
		);
	});
});

// ==================== cancel 测试 ====================

describe('BillingAggregate.cancel', () => {
	it('待支付状态的账单应能取消', () => {
		// Arrange
		const billing = createBilling();

		// Act
		billing.cancel();

		// Assert
		expect(billing.status).toBe(BillingStatus.CANCELLED);
	});

	it('取消应发出 BillingCancelled 事件', () => {
		// Arrange
		const billing = createBilling();
		billing.commitUncommittedEvents();

		// Act
		billing.cancel();

		// Assert
		const events = billing.getUncommittedEvents();
		expect(events).toHaveLength(1);
		expect(events[0].eventType).toBe('BillingCancelled');
	});

	it('非待支付状态的账单取消应抛出异常', () => {
		// Arrange
		const billing = createBilling();
		billing.markAsPaid('alipay', 'tx-123');

		// Act & Assert
		expect(() => billing.cancel()).toThrow(BillingException);
	});
});

// ==================== 查询方法测试 ====================

describe('BillingAggregate 查询方法', () => {
	describe('canPay', () => {
		it('待支付状态应返回 true', () => {
			// Arrange
			const billing = createBilling();

			// Act & Assert
			expect(billing.canPay()).toBe(true);
		});

		it('已支付状态应返回 false', () => {
			// Arrange
			const billing = createBilling();
			billing.markAsPaid('alipay', 'tx-123');

			// Act & Assert
			expect(billing.canPay()).toBe(false);
		});
	});

	describe('canRefund', () => {
		it('已支付状态应返回 true', () => {
			// Arrange
			const billing = createBilling();
			billing.markAsPaid('alipay', 'tx-123');

			// Act & Assert
			expect(billing.canRefund()).toBe(true);
		});

		it('待支付状态应返回 false', () => {
			// Arrange
			const billing = createBilling();

			// Act & Assert
			expect(billing.canRefund()).toBe(false);
		});
	});

	describe('canCancel', () => {
		it('待支付状态应返回 true', () => {
			// Arrange
			const billing = createBilling();

			// Act & Assert
			expect(billing.canCancel()).toBe(true);
		});

		it('已支付状态应返回 false', () => {
			// Arrange
			const billing = createBilling();
			billing.markAsPaid('alipay', 'tx-123');

			// Act & Assert
			expect(billing.canCancel()).toBe(false);
		});
	});

	describe('isFinalStatus', () => {
		it('已支付状态应为最终状态', () => {
			// Arrange
			const billing = createBilling();
			billing.markAsPaid('alipay', 'tx-123');

			// Act & Assert
			expect(billing.isFinalStatus()).toBe(true);
		});

		it('已退款状态应为最终状态', () => {
			// Arrange
			const billing = createBilling();
			billing.markAsPaid('alipay', 'tx-123');
			billing.refund('用户申请');

			// Act & Assert
			expect(billing.isFinalStatus()).toBe(true);
		});

		it('已取消状态应为最终状态', () => {
			// Arrange
			const billing = createBilling();
			billing.cancel();

			// Act & Assert
			expect(billing.isFinalStatus()).toBe(true);
		});

		it('待支付状态不应为最终状态', () => {
			// Arrange
			const billing = createBilling();

			// Act & Assert
			expect(billing.isFinalStatus()).toBe(false);
		});

		it('支付失败状态不应为最终状态', () => {
			// Arrange
			const billing = createBilling();
			billing.markAsFailed('测试');

			// Act & Assert
			expect(billing.isFinalStatus()).toBe(false);
		});
	});
});

// ==================== Getter 方法测试 ====================

describe('BillingAggregate Getters', () => {
	it('应正确返回所有属性值', () => {
		// Arrange
		const id = createBillingId();
		const amount = createMoney(500);
		const billing = BillingAggregate.create(id, 'tenant-456', amount, BillingType.SUBSCRIPTION, '订阅账单');

		// Act & Assert
		expect(billing.id.equals(id)).toBe(true);
		expect(billing.tenantId).toBe('tenant-456');
		expect(billing.amount.equals(amount)).toBe(true);
		expect(billing.status).toBe(BillingStatus.PENDING);
		expect(billing.billingType).toBe(BillingType.SUBSCRIPTION);
		expect(billing.description).toBe('订阅账单');
		expect(billing.retryCount).toBe(0);
		expect(billing.paidAt).toBeUndefined();
		expect(billing.failedAt).toBeUndefined();
		expect(billing.refundAmount).toBeUndefined();
	});

	it('兼容旧 API 方法应正常工作', () => {
		// Arrange
		const billing = createBilling();

		// Act & Assert
		expect(billing.getId()).toBe(billing.id);
		expect(billing.getTenantId()).toBe(billing.tenantId);
		expect(billing.getAmount()).toBe(billing.amount);
		expect(billing.getStatus()).toBe(billing.status);
		expect(billing.getBillingType()).toBe(billing.billingType);
		expect(billing.getDescription()).toBe(billing.description);
		expect(billing.getRetryCount()).toBe(billing.retryCount);
	});
});
