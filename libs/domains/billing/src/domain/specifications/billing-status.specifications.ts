import { Specification } from './specification';
import type { BillingAggregate } from '../aggregates/billing.aggregate';
import { BillingStatus } from '../value-objects';

/**
 * @description 账单可支付规格
 *
 * 业务规则：
 * - 只有待支付状态的账单才能支付
 *
 * @example
 * ```typescript
 * const canPay = new BillingCanBePaidSpecification();
 * if (!canPay.isSatisfiedBy(billing)) {
 *   throw new BillingException('只有待支付状态的账单才能标记为已支付');
 * }
 * billing.markAsPaid(paymentMethod, transactionId);
 * ```
 */
export class BillingCanBePaidSpecification extends Specification<BillingAggregate> {
	isSatisfiedBy(billing: BillingAggregate): boolean {
		return billing.status === BillingStatus.PENDING;
	}
}

/**
 * @description 账单可退款规格
 *
 * 业务规则：
 * - 只有已支付状态的账单才能退款
 */
export class BillingCanBeRefundedSpecification extends Specification<BillingAggregate> {
	isSatisfiedBy(billing: BillingAggregate): boolean {
		return billing.status === BillingStatus.PAID;
	}
}

/**
 * @description 账单可取消规格
 *
 * 业务规则：
 * - 只有待支付状态的账单才能取消
 */
export class BillingCanBeCancelledSpecification extends Specification<BillingAggregate> {
	isSatisfiedBy(billing: BillingAggregate): boolean {
		return billing.status === BillingStatus.PENDING;
	}
}

/**
 * @description 账单为最终状态规格
 *
 * 业务规则：
 * - 已支付、已退款、已取消的账单为最终状态
 */
export class BillingIsFinalStatusSpecification extends Specification<BillingAggregate> {
	isSatisfiedBy(billing: BillingAggregate): boolean {
		return (
			billing.status === BillingStatus.PAID ||
			billing.status === BillingStatus.REFUNDED ||
			billing.status === BillingStatus.CANCELLED
		);
	}
}
