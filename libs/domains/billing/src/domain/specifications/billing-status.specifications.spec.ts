import {
	BillingCanBePaidSpecification,
	BillingCanBeRefundedSpecification,
	BillingCanBeCancelledSpecification,
	BillingIsFinalStatusSpecification
} from './billing-status.specifications';
import { BillingAggregate } from '../aggregates/billing.aggregate';
import { BillingId, Money, BillingStatus, BillingType } from '../value-objects';

// ==================== 辅助函数：创建账单 ====================

function createBilling(status: BillingStatus = BillingStatus.PENDING): BillingAggregate {
	const id = BillingId.generate();
	const amount = Money.from(100, 'CNY');
	return BillingAggregate.create(id, 'tenant-123', amount, BillingType.ONE_TIME, '测试账单');
}

function createBillingWithStatus(status: BillingStatus): BillingAggregate {
	const billing = createBilling();

	// 根据目标状态执行状态转换
	if (status === BillingStatus.PAID) {
		billing.markAsPaid('alipay', 'tx-123');
	} else if (status === BillingStatus.FAILED) {
		billing.markAsFailed('支付超时');
	} else if (status === BillingStatus.REFUNDED) {
		billing.markAsPaid('alipay', 'tx-123');
		billing.refund('用户申请退款');
	} else if (status === BillingStatus.CANCELLED) {
		billing.cancel();
	}

	return billing;
}

// ==================== BillingCanBePaidSpecification 测试 ====================

describe('BillingCanBePaidSpecification', () => {
	describe('isSatisfiedBy', () => {
		it('待支付状态的账单应满足可支付条件', () => {
			// Arrange
			const spec = new BillingCanBePaidSpecification();
			const billing = createBillingWithStatus(BillingStatus.PENDING);

			// Act
			const result = spec.isSatisfiedBy(billing);

			// Assert
			expect(result).toBe(true);
		});

		it('已支付状态的账单不应满足可支付条件', () => {
			// Arrange
			const spec = new BillingCanBePaidSpecification();
			const billing = createBillingWithStatus(BillingStatus.PAID);

			// Act
			const result = spec.isSatisfiedBy(billing);

			// Assert
			expect(result).toBe(false);
		});

		it('支付失败状态的账单不应满足可支付条件', () => {
			// Arrange
			const spec = new BillingCanBePaidSpecification();
			const billing = createBillingWithStatus(BillingStatus.FAILED);

			// Act
			const result = spec.isSatisfiedBy(billing);

			// Assert
			expect(result).toBe(false);
		});

		it('已退款状态的账单不应满足可支付条件', () => {
			// Arrange
			const spec = new BillingCanBePaidSpecification();
			const billing = createBillingWithStatus(BillingStatus.REFUNDED);

			// Act
			const result = spec.isSatisfiedBy(billing);

			// Assert
			expect(result).toBe(false);
		});

		it('已取消状态的账单不应满足可支付条件', () => {
			// Arrange
			const spec = new BillingCanBePaidSpecification();
			const billing = createBillingWithStatus(BillingStatus.CANCELLED);

			// Act
			const result = spec.isSatisfiedBy(billing);

			// Assert
			expect(result).toBe(false);
		});
	});
});

// ==================== BillingCanBeRefundedSpecification 测试 ====================

describe('BillingCanBeRefundedSpecification', () => {
	describe('isSatisfiedBy', () => {
		it('已支付状态的账单应满足可退款条件', () => {
			// Arrange
			const spec = new BillingCanBeRefundedSpecification();
			const billing = createBillingWithStatus(BillingStatus.PAID);

			// Act
			const result = spec.isSatisfiedBy(billing);

			// Assert
			expect(result).toBe(true);
		});

		it('待支付状态的账单不应满足可退款条件', () => {
			// Arrange
			const spec = new BillingCanBeRefundedSpecification();
			const billing = createBillingWithStatus(BillingStatus.PENDING);

			// Act
			const result = spec.isSatisfiedBy(billing);

			// Assert
			expect(result).toBe(false);
		});

		it('已退款状态的账单不应满足可退款条件', () => {
			// Arrange
			const spec = new BillingCanBeRefundedSpecification();
			const billing = createBillingWithStatus(BillingStatus.REFUNDED);

			// Act
			const result = spec.isSatisfiedBy(billing);

			// Assert
			expect(result).toBe(false);
		});
	});
});

// ==================== BillingCanBeCancelledSpecification 测试 ====================

describe('BillingCanBeCancelledSpecification', () => {
	describe('isSatisfiedBy', () => {
		it('待支付状态的账单应满足可取消条件', () => {
			// Arrange
			const spec = new BillingCanBeCancelledSpecification();
			const billing = createBillingWithStatus(BillingStatus.PENDING);

			// Act
			const result = spec.isSatisfiedBy(billing);

			// Assert
			expect(result).toBe(true);
		});

		it('已支付状态的账单不应满足可取消条件', () => {
			// Arrange
			const spec = new BillingCanBeCancelledSpecification();
			const billing = createBillingWithStatus(BillingStatus.PAID);

			// Act
			const result = spec.isSatisfiedBy(billing);

			// Assert
			expect(result).toBe(false);
		});

		it('已取消状态的账单不应满足可取消条件', () => {
			// Arrange
			const spec = new BillingCanBeCancelledSpecification();
			const billing = createBillingWithStatus(BillingStatus.CANCELLED);

			// Act
			const result = spec.isSatisfiedBy(billing);

			// Assert
			expect(result).toBe(false);
		});
	});
});

// ==================== BillingIsFinalStatusSpecification 测试 ====================

describe('BillingIsFinalStatusSpecification', () => {
	describe('isSatisfiedBy', () => {
		it('已支付状态应为最终状态', () => {
			// Arrange
			const spec = new BillingIsFinalStatusSpecification();
			const billing = createBillingWithStatus(BillingStatus.PAID);

			// Act
			const result = spec.isSatisfiedBy(billing);

			// Assert
			expect(result).toBe(true);
		});

		it('已退款状态应为最终状态', () => {
			// Arrange
			const spec = new BillingIsFinalStatusSpecification();
			const billing = createBillingWithStatus(BillingStatus.REFUNDED);

			// Act
			const result = spec.isSatisfiedBy(billing);

			// Assert
			expect(result).toBe(true);
		});

		it('已取消状态应为最终状态', () => {
			// Arrange
			const spec = new BillingIsFinalStatusSpecification();
			const billing = createBillingWithStatus(BillingStatus.CANCELLED);

			// Act
			const result = spec.isSatisfiedBy(billing);

			// Assert
			expect(result).toBe(true);
		});

		it('待支付状态不应为最终状态', () => {
			// Arrange
			const spec = new BillingIsFinalStatusSpecification();
			const billing = createBillingWithStatus(BillingStatus.PENDING);

			// Act
			const result = spec.isSatisfiedBy(billing);

			// Assert
			expect(result).toBe(false);
		});

		it('支付失败状态不应为最终状态', () => {
			// Arrange
			const spec = new BillingIsFinalStatusSpecification();
			const billing = createBillingWithStatus(BillingStatus.FAILED);

			// Act
			const result = spec.isSatisfiedBy(billing);

			// Assert
			expect(result).toBe(false);
		});
	});
});
