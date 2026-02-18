import type { ICommand } from '@oksai/cqrs';

/**
 * @description 创建账单命令类型
 */
export const CREATE_BILLING_COMMAND_TYPE = 'CreateBilling' as const;

/**
 * @description 创建账单命令
 */
export interface CreateBillingCommand extends ICommand<typeof CREATE_BILLING_COMMAND_TYPE> {
	/**
	 * @description 租户 ID
	 */
	tenantId: string;

	/**
	 * @description 金额
	 */
	amount: number;

	/**
	 * @description 货币（如 CNY、USD）
	 */
	currency: string;

	/**
	 * @description 账单类型
	 */
	billingType: 'subscription' | 'usage' | 'one_time';

	/**
	 * @description 描述
	 */
	description: string;
}

/**
 * @description 标记账单支付命令类型
 */
export const MARK_BILLING_PAID_COMMAND_TYPE = 'MarkBillingPaid' as const;

/**
 * @description 标记账单支付命令
 */
export interface MarkBillingPaidCommand extends ICommand<typeof MARK_BILLING_PAID_COMMAND_TYPE> {
	/**
	 * @description 账单 ID
	 */
	billingId: string;

	/**
	 * @description 支付方式
	 */
	paymentMethod: string;

	/**
	 * @description 交易 ID
	 */
	transactionId: string;
}
