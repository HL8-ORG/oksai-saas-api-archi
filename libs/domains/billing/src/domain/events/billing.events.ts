import type { EventStoreDomainEvent } from '@oksai/event-store';
import type { BillingId } from '../value-objects';

/**
 * @description 账单创建事件
 */
export interface BillingCreatedEvent extends EventStoreDomainEvent {
	eventType: 'BillingCreated';
	aggregateId: string;
	occurredAt: Date;
	eventData: {
		tenantId: string;
		amount: number;
		currency: string;
		billingType: string;
		description: string;
	};
	schemaVersion: 1;
}

/**
 * @description 账单支付成功事件
 */
export interface BillingPaidEvent extends EventStoreDomainEvent {
	eventType: 'BillingPaid';
	aggregateId: string;
	occurredAt: Date;
	eventData: {
		paidAt: Date;
		paymentMethod: string;
		transactionId: string;
	};
	schemaVersion: 1;
}

/**
 * @description 账单支付失败事件
 */
export interface BillingFailedEvent extends EventStoreDomainEvent {
	eventType: 'BillingFailed';
	aggregateId: string;
	occurredAt: Date;
	eventData: {
		failedAt: Date;
		reason: string;
		retryCount: number;
	};
	schemaVersion: 1;
}

/**
 * @description 账单退款事件
 */
export interface BillingRefundedEvent extends EventStoreDomainEvent {
	eventType: 'BillingRefunded';
	aggregateId: string;
	occurredAt: Date;
	eventData: {
		refundedAt: Date;
		refundAmount: number;
		reason: string;
	};
	schemaVersion: 1;
}
