import type { BillingCreatedEvent, BillingPaidEvent, BillingFailedEvent, BillingRefundedEvent } from './billing.events';

// ==================== BillingCreatedEvent 类型测试 ====================

describe('BillingCreatedEvent', () => {
	it('应符合 BillingCreatedEvent 接口结构', () => {
		// Arrange
		const event: BillingCreatedEvent = {
			eventType: 'BillingCreated',
			aggregateId: 'bill-123',
			occurredAt: new Date(),
			eventData: {
				tenantId: 'tenant-123',
				amount: 100,
				currency: 'CNY',
				billingType: 'one_time',
				description: '测试账单'
			},
			schemaVersion: 1
		};

		// Assert
		expect(event.eventType).toBe('BillingCreated');
		expect(event.aggregateId).toBe('bill-123');
		expect(event.eventData.tenantId).toBe('tenant-123');
		expect(event.eventData.amount).toBe(100);
		expect(event.eventData.currency).toBe('CNY');
		expect(event.eventData.billingType).toBe('one_time');
		expect(event.eventData.description).toBe('测试账单');
		expect(event.schemaVersion).toBe(1);
	});
});

// ==================== BillingPaidEvent 类型测试 ====================

describe('BillingPaidEvent', () => {
	it('应符合 BillingPaidEvent 接口结构', () => {
		// Arrange
		const paidAt = new Date();
		const event: BillingPaidEvent = {
			eventType: 'BillingPaid',
			aggregateId: 'bill-123',
			occurredAt: paidAt,
			eventData: {
				paidAt,
				paymentMethod: 'alipay',
				transactionId: 'tx-123456'
			},
			schemaVersion: 1
		};

		// Assert
		expect(event.eventType).toBe('BillingPaid');
		expect(event.aggregateId).toBe('bill-123');
		expect(event.eventData.paidAt).toBe(paidAt);
		expect(event.eventData.paymentMethod).toBe('alipay');
		expect(event.eventData.transactionId).toBe('tx-123456');
		expect(event.schemaVersion).toBe(1);
	});
});

// ==================== BillingFailedEvent 类型测试 ====================

describe('BillingFailedEvent', () => {
	it('应符合 BillingFailedEvent 接口结构', () => {
		// Arrange
		const failedAt = new Date();
		const event: BillingFailedEvent = {
			eventType: 'BillingFailed',
			aggregateId: 'bill-123',
			occurredAt: failedAt,
			eventData: {
				failedAt,
				reason: '余额不足',
				retryCount: 3
			},
			schemaVersion: 1
		};

		// Assert
		expect(event.eventType).toBe('BillingFailed');
		expect(event.aggregateId).toBe('bill-123');
		expect(event.eventData.failedAt).toBe(failedAt);
		expect(event.eventData.reason).toBe('余额不足');
		expect(event.eventData.retryCount).toBe(3);
		expect(event.schemaVersion).toBe(1);
	});
});

// ==================== BillingRefundedEvent 类型测试 ====================

describe('BillingRefundedEvent', () => {
	it('应符合 BillingRefundedEvent 接口结构', () => {
		// Arrange
		const refundedAt = new Date();
		const event: BillingRefundedEvent = {
			eventType: 'BillingRefunded',
			aggregateId: 'bill-123',
			occurredAt: refundedAt,
			eventData: {
				refundedAt,
				refundAmount: 100,
				reason: '用户申请退款'
			},
			schemaVersion: 1
		};

		// Assert
		expect(event.eventType).toBe('BillingRefunded');
		expect(event.aggregateId).toBe('bill-123');
		expect(event.eventData.refundedAt).toBe(refundedAt);
		expect(event.eventData.refundAmount).toBe(100);
		expect(event.eventData.reason).toBe('用户申请退款');
		expect(event.schemaVersion).toBe(1);
	});
});
