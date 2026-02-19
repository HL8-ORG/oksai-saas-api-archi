import { Injectable, Logger } from '@nestjs/common';
import type { IFullAggregateMetadata } from '@oksai/aggregate-metadata';
import type { IQualityScorer, QualityScoreResult, QualityScoreDetail } from '../interfaces/analytics.interfaces';

/**
 * @description 数据质量评分维度
 */
export interface QualityDimension {
	/**
	 * 维度名称
	 */
	name: string;

	/**
	 * 权重（0-1）
	 */
	weight: number;

	/**
	 * 评分函数
	 */
	evaluate: (metadata: IFullAggregateMetadata) => number;
}

/**
 * @description 通用数据质量评分器
 *
 * 评估聚合数据的质量，支持自定义维度
 */
@Injectable()
export class QualityScorer implements IQualityScorer {
	private readonly logger = new Logger(QualityScorer.name);
	private readonly dimensions: QualityDimension[] = [];

	constructor() {
		this.registerDefaultDimensions();
	}

	/**
	 * @description 注册默认评分维度
	 */
	private registerDefaultDimensions(): void {
		this.dimensions.push(
			{
				name: '完整性',
				weight: 0.25,
				evaluate: (metadata) => this.evaluateCompleteness(metadata)
			},
			{
				name: '时效性',
				weight: 0.2,
				evaluate: (metadata) => this.evaluateTimeliness(metadata)
			},
			name: '一致性',
				weight: 0.2,
				evaluate: (metadata) => this.evaluateConsistency(metadata)
			},
			{
				name: '有效性',
				weight: 0.2,
				evaluate: (metadata) => this.evaluateValidity(metadata)
			},
			{
				name: '可访问性',
				weight: 0.15,
				evaluate: (metadata) => this.evaluateAccessibility(metadata)
			}
		);
	}

	/**
	 * @description 注册自定义维度
	 */
	registerDimension(dimension: QualityDimension): void {
		this.dimensions.push(dimension);
		this.logger.log(`已注册质量维度: ${dimension.name} (权重: ${dimension.weight})`);
	}

	getName(): string {
		return 'DefaultQualityScorer';
	}

	getSupportedAggregateTypes(): string[] {
		return ['*'];
	}

	async score(metadata: IFullAggregateMetadata): Promise<QualityScoreResult> {
		const details: QualityScoreDetail[] = [];
		let totalScore = 0;
		let totalWeight = 0;

		for (const dimension of this.dimensions) {
			const score = dimension.evaluate(metadata);
			const weightedScore = score * dimension.weight;

			details.push({
				dimension: dimension.name,
				score,
				weight: dimension.weight,
				weightedScore,
				description: this.getDimensionDescription(dimension.name, score)
			});

			totalScore += weightedScore;
			totalWeight += dimension.weight;
		}

		// 归一化分数
		const normalizedScore = totalWeight > 0 ? Math.round((totalScore / totalWeight) * 100) / 100 : 0;

		return {
			score: Math.min(100, Math.max(0, Math.round(normalizedScore))),
			details,
			evaluatedAt: new Date()
		};
	}

	/**
	 * @description 评估完整性
	 *
	 * 检查必要字段是否填写
	 */
	private evaluateCompleteness(metadata: IFullAggregateMetadata): number {
		let score = 100;

		// 检查基本字段
		if (!metadata.createdAt) score -= 20;
		if (!metadata.updatedAt) score -= 10;

		// 检查扩展信息
		if (metadata.analyzable) {
			if (!metadata.analyzable.category) score -= 10;
			if (!metadata.analyzable.tags || metadata.analyzable.tags.length === 0) score -= 10;
		}

		return Math.max(0, score);
	}

	/**
	 * @description 评估时效性
	 *
	 * 检查数据是否及时更新
	 */
	private evaluateTimeliness(metadata: IFullAggregateMetadata): number {
		const now = new Date();
		const updatedAt = metadata.updatedAt || metadata.createdAt;

		if (!updatedAt) return 50;

		const hoursSinceUpdate = (now.getTime() - updatedAt.getTime()) / (1000 * 60 * 60);

		if (hoursSinceUpdate < 24) return 100;
		if (hoursSinceUpdate < 72) return 80;
		if (hoursSinceUpdate < 168) return 60; // 1 week
		if (hoursSinceUpdate < 720) return 40; // 1 month
		return 20;
	}

	/**
	 * @description 评估一致性
	 *
	 * 检查数据格式和逻辑一致性
	 */
	private evaluateConsistency(metadata: IFullAggregateMetadata): number {
		let score = 100;

		// 检查时间逻辑
		if (metadata.createdAt && metadata.updatedAt) {
			if (metadata.updatedAt < metadata.createdAt) {
				score -= 30;
			}
		}

		// 检查删除状态一致性
		if (metadata.isDeleted && !metadata.deletedAt) {
			score -= 20;
		}

		return Math.max(0, score);
	}

	/**
	 * @description 评估有效性
	 *
	 * 检查数据值是否有效
	 */
	private evaluateValidity(metadata: IFullAggregateMetadata): number {
		let score = 100;

		// 检查 ID 格式
		if (!metadata.aggregateId || metadata.aggregateId.trim().length === 0) {
			score -= 30;
		}

		// 检查租户 ID
		if (!metadata.tenantId || metadata.tenantId.trim().length === 0) {
			score -= 30;
		}

		// 检查质量分数范围
		if (metadata.analyzable?.qualityScore !== undefined) {
			if (metadata.analyzable.qualityScore < 0 || metadata.analyzable.qualityScore > 100) {
				score -= 20;
			}
		}

		return Math.max(0, score);
	}

	/**
	 * @description 评估可访问性
	 *
	 * 检查数据是否可访问
	 */
	private evaluateAccessibility(metadata: IFullAggregateMetadata): number {
		// 已删除的数据可访问性降低
		if (metadata.isDeleted) return 30;

		// 未包含在分析中的数据可访问性降低
		if (metadata.analyzable && !metadata.analyzable.includeInAnalytics) return 50;

		return 100;
	}

	/**
	 * @description 获取维度评分说明
	 */
	private getDimensionDescription(dimension: string, score: number): string {
		if (score >= 90) return `${dimension}优秀`;
		if (score >= 70) return `${dimension}良好`;
		if (score >= 50) return `${dimension}一般`;
		if (score >= 30) return `${dimension}较差`;
		return `${dimension}需改进`;
	}
}

/**
 * @description Billing 专用质量评分器
 */
@Injectable()
export class BillingQualityScorer implements IQualityScorer {
	private readonly logger = new Logger(BillingQualityScorer.name);

	getName(): string {
		return 'BillingQualityScorer';
	}

	getSupportedAggregateTypes(): string[] {
		return ['Billing'];
	}

	async score(metadata: IFullAggregateMetadata): Promise<QualityScoreResult> {
		const details: QualityScoreDetail[] = [];

		// 状态有效性
		const statusScore = this.evaluateStatus(metadata);
		details.push({
			dimension: '状态有效性',
			score: statusScore,
			weight: 0.3,
			weightedScore: statusScore * 0.3
		});

		// 金额完整性
		const amountScore = this.evaluateAmount(metadata);
		details.push({
			dimension: '金额完整性',
			score: amountScore,
			weight: 0.3,
			weightedScore: amountScore * 0.3
		});

		// 处理时效
		const timelinessScore = this.evaluateTimeliness(metadata);
		details.push({
			dimension: '处理时效',
			score: timelinessScore,
			weight: 0.25,
			weightedScore: timelinessScore * 0.25
		});

		// 重试次数影响
		const retryScore = this.evaluateRetryCount(metadata);
		details.push({
			dimension: '处理稳定性',
			score: retryScore,
			weight: 0.15,
			weightedScore: retryScore * 0.15
		});

		const totalScore = Math.round(details.reduce((sum, d) => sum + d.weightedScore, 0));

		return {
			score: totalScore,
			details,
			evaluatedAt: new Date()
		};
	}

	private evaluateStatus(metadata: IFullAggregateMetadata): number {
		const dimensions = metadata.analyzable?.analyticsDimensions;
		if (!dimensions) return 70;

		const status = dimensions['status'] as string;
		if (status === 'PAID') return 100;
		if (status === 'PENDING') return 80;
		if (status === 'FAILED') return 40;
		if (status === 'REFUNDED') return 60;
		if (status === 'CANCELLED') return 50;
		return 70;
	}

	private evaluateAmount(metadata: IFullAggregateMetadata): number {
		const dimensions = metadata.analyzable?.analyticsDimensions;
		if (!dimensions) return 60;

		const amount = dimensions['amount'] as number;
		const currency = dimensions['currency'] as string;

		let score = 100;
		if (amount === undefined || amount === null) score -= 50;
		if (!currency) score -= 30;
		if (amount !== undefined && amount < 0) score -= 40;

		return Math.max(0, score);
	}

	private evaluateTimeliness(metadata: IFullAggregateMetadata): number {
		const now = new Date();
		const updatedAt = metadata.updatedAt || metadata.createdAt;

		if (!updatedAt) return 50;

		const hoursSinceUpdate = (now.getTime() - updatedAt.getTime()) / (1000 * 60 * 60);

		if (hoursSinceUpdate < 1) return 100;
		if (hoursSinceUpdate < 24) return 90;
		if (hoursSinceUpdate < 72) return 70;
		return 50;
	}

	private evaluateRetryCount(metadata: IFullAggregateMetadata): number {
		const dimensions = metadata.analyzable?.analyticsDimensions;
		if (!dimensions) return 80;

		const retryCount = (dimensions['retryCount'] as number) || 0;

		if (retryCount === 0) return 100;
		if (retryCount === 1) return 80;
		if (retryCount === 2) return 60;
		if (retryCount <= 5) return 40;
		return 20;
	}
}
