import type { IFullAggregateMetadata } from '@oksai/aggregate-metadata';

/**
 * @description 数据质量评分结果
 */
export interface QualityScoreResult {
	/**
	 * 总分（0-100）
	 */
	score: number;

	/**
	 * 评分详情
	 */
	details: QualityScoreDetail[];

	/**
	 * 评分时间
	 */
	evaluatedAt: Date;
}

/**
 * @description 数据质量评分详情
 */
export interface QualityScoreDetail {
	/**
	 * 维度名称
	 */
	dimension: string;

	/**
	 * 维度分数（0-100）
	 */
	score: number;

	/**
	 * 权重
	 */
	weight: number;

	/**
	 * 加权分数
	 */
	weightedScore: number;

	/**
	 * 评分说明
	 */
	description?: string;
}

/**
 * @description 数据质量评分器接口
 *
 * 评估聚合根数据质量，生成 0-100 分的质量评分
 */
export interface IQualityScorer {
	/**
	 * @description 获取评分器名称
	 */
	getName(): string;

	/**
	 * @description 获取适用的聚合类型
	 */
	getSupportedAggregateTypes(): string[];

	/**
	 * @description 计算数据质量分数
	 *
	 * @param metadata - 聚合元数据
	 * @returns 质量评分结果
	 */
	score(metadata: IFullAggregateMetadata): Promise<QualityScoreResult>;
}

/**
 * @description 分析维度值
 */
export type AnalyticsDimensionValue = string | number | boolean | Date | null;

/**
 * @description 分析维度结果
 */
export interface AnalyticsDimensions {
	/**
	 * 维度键值对
	 */
	[key: string]: AnalyticsDimensionValue;
}

/**
 * @description 分析维度计算器接口
 *
 * 从聚合元数据提取分析维度
 */
export interface IDimensionCalculator {
	/**
	 * @description 获取计算器名称
	 */
	getName(): string;

	/**
	 * @description 获取适用的聚合类型
	 */
	getSupportedAggregateTypes(): string[];

	/**
	 * @description 计算分析维度
	 *
	 * @param metadata - 聚合元数据
	 * @returns 分析维度
	 */
	calculate(metadata: IFullAggregateMetadata): AnalyticsDimensions;
}

/**
 * @description 聚合统计查询参数
 */
export interface AggregateStatsQuery {
	/**
	 * 租户 ID（必填）
	 */
	tenantId: string;

	/**
	 * 聚合类型（可选）
	 */
	aggregateType?: string;

	/**
	 * 时间范围起始
	 */
	fromDate?: Date;

	/**
	 * 时间范围结束
	 */
	toDate?: Date;

	/**
	 * 分组维度
	 */
	groupBy?: string[];
}

/**
 * @description 聚合统计结果
 */
export interface AggregateStatsResult {
	/**
	 * 总数
	 */
	total: number;

	/**
	 * 按维度分组的统计
	 */
	groups?: Record<string, AggregateGroupStats>;
}

/**
 * @description 分组统计
 */
export interface AggregateGroupStats {
	/**
	 * 分组键
	 */
	key: string;

	/**
	 * 数量
	 */
	count: number;

	/**
	 * 占比
	 */
	percentage: number;

	/**
	 * 平均质量分数
	 */
	avgQualityScore?: number;
}

/**
 * @description 分析报表接口
 */
export interface IAnalyticsReport {
	/**
	 * 报表 ID
	 */
	id: string;

	/**
	 * 报表名称
	 */
	name: string;

	/**
	 * 报表类型
	 */
	type: ReportType;

	/**
	 * 租户 ID
	 */
	tenantId: string;

	/**
	 * 生成时间
	 */
	generatedAt: Date;

	/**
	 * 数据时间范围
	 */
	dateRange?: {
		from: Date;
		to: Date;
	};

	/**
	 * 报表数据
	 */
	data: Record<string, unknown>;

	/**
	 * 摘要信息
	 */
	summary?: string;
}

/**
 * @description 报表类型枚举
 */
export enum ReportType {
	/**
	 * 汇总报表
	 */
	SUMMARY = 'SUMMARY',

	/**
	 * 趋势报表
	 */
	TREND = 'TREND',

	/**
	 * 分布报表
	 */
	DISTRIBUTION = 'DISTRIBUTION',

	/**
	 * 对比报表
	 */
	COMPARISON = 'COMPARISON'
}

/**
 * @description 分析服务接口
 *
 * 提供数据分析的核心能力
 */
export interface IAnalyticsService {
	/**
	 * @description 计算聚合元数据的质量分数
	 */
	calculateQualityScore(metadata: IFullAggregateMetadata): Promise<QualityScoreResult>;

	/**
	 * @description 计算聚合元数据的分析维度
	 */
	calculateDimensions(metadata: IFullAggregateMetadata): AnalyticsDimensions;

	/**
	 * @description 获取聚合统计
	 */
	getAggregateStats(query: AggregateStatsQuery): Promise<AggregateStatsResult>;

	/**
	 * @description 生成分析报表
	 */
	generateReport(tenantId: string, type: ReportType, params?: Record<string, unknown>): Promise<IAnalyticsReport>;
}
