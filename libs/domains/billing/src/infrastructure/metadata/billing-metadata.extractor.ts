import type { IAggregateMetadataExtractor, AnalyzableExtension } from '@oksai/aggregate-metadata';
import type { BillingAggregate } from '../../domain/aggregates/billing.aggregate';
import { BillingStatus } from '../../domain/value-objects';

/**
 * @description 账单聚合根元数据提取器
 *
 * 实现从 BillingAggregate 提取元数据的逻辑
 */
export class BillingMetadataExtractor implements IAggregateMetadataExtractor<BillingAggregate> {
	/**
	 * @description 获取聚合类型标识
	 */
	getAggregateType(): string {
		return 'Billing';
	}

	/**
	 * @description 从聚合根提取租户 ID
	 */
	getTenantId(aggregate: BillingAggregate): string {
		return aggregate.tenantId;
	}

	/**
	 * @description 从聚合根提取聚合 ID
	 */
	getAggregateId(aggregate: BillingAggregate): string {
		return aggregate.id.toString();
	}

	/**
	 * @description 从聚合根提取可分析扩展
	 *
	 * Billing 聚合是典型的可分析实体，提供完整的分析维度
	 */
	getAnalyzableExtension(aggregate: BillingAggregate): AnalyzableExtension | undefined {
		const tags: string[] = [];
		const analyticsDimensions: Record<string, string | number | boolean> = {};

		// 根据状态添加标签
		tags.push(`status:${aggregate.status}`);
		if (aggregate.billingType) {
			tags.push(`type:${aggregate.billingType}`);
		}

		// 设置分析维度
		analyticsDimensions['status'] = aggregate.status;
		analyticsDimensions['type'] = aggregate.billingType;
		analyticsDimensions['amount'] = aggregate.amount.getAmount();
		analyticsDimensions['currency'] = aggregate.amount.getCurrency();
		analyticsDimensions['retryCount'] = aggregate.retryCount;

		// 设置分类
		const category = this.getCategoryFromStatus(aggregate.status);

		// 计算质量分数
		const qualityScore = this.calculateQualityScore(aggregate);

		return {
			tags,
			category,
			analyticsDimensions,
			qualityScore,
			includeInAnalytics: true
		};
	}

	/**
	 * @description 根据状态获取分类
	 */
	private getCategoryFromStatus(status: BillingStatus): string {
		switch (status) {
			case BillingStatus.PENDING:
				return 'pending';
			case BillingStatus.PAID:
				return 'completed';
			case BillingStatus.FAILED:
				return 'failed';
			case BillingStatus.REFUNDED:
				return 'refunded';
			case BillingStatus.CANCELLED:
				return 'cancelled';
			default:
				return 'unknown';
		}
	}

	/**
	 * @description 计算数据质量分数
	 */
	private calculateQualityScore(aggregate: BillingAggregate): number {
		let score = 100;

		// 重试次数过多降低质量分数
		if (aggregate.retryCount > 0) {
			score -= Math.min(aggregate.retryCount * 10, 30);
		}

		// 失败状态降低质量分数
		if (aggregate.status === BillingStatus.FAILED) {
			score -= 20;
		}

		return Math.max(0, Math.min(100, score));
	}
}
