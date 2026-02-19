import type { EventStoreDomainEvent } from '../event-store.interface';
import { AggregateRoot } from '../aggregate-root';

/**
 * @description 分析维度值类型
 */
export type AnalyticsDimensionValue = string | number | boolean;

/**
 * @description 分析维度集合
 */
export type AnalyticsDimensions = Record<string, AnalyticsDimensionValue>;

/**
 * @description 数据分析能力扩展聚合根基类
 *
 * 适用于需要数据分析、报表聚合的聚合根。
 * 继承此类的聚合根将获得标签管理、分类、分析维度和数据质量评分能力。
 *
 * @template TEvent - 领域事件类型
 *
 * @example
 * ```typescript
 * // 账单聚合根（需要统计分析）
 * class BillingAggregate extends AnalyzableAggregateRoot<BillingEvent> {
 *   completePayment(amount: number, category: string): void {
 *     // 业务逻辑...
 *     this.setCategory(category);
 *     this.setAnalyticsDimension('amount', amount);
 *     this.setAnalyticsDimension('currency', 'CNY');
 *     this.addTag('paid');
 *   }
 * }
 * ```
 *
 * 使用场景：
 * - 业务实体（需要统计分析）
 * - 报表数据（需要维度分类）
 * - 指标数据（需要聚合计算）
 */
export abstract class AnalyzableAggregateRoot<
	TEvent extends EventStoreDomainEvent = EventStoreDomainEvent
> extends AggregateRoot<TEvent> {
	// ==================== 分析元数据 ====================

	/**
	 * 数据分类标签
	 */
	protected _tags: string[] = [];

	/**
	 * 业务分类
	 */
	protected _category?: string;

	/**
	 * 分析维度
	 */
	protected _analyticsDimensions?: AnalyticsDimensions;

	/**
	 * 数据质量分数（0-100）
	 */
	protected _qualityScore?: number;

	/**
	 * 是否参与统计分析
	 */
	protected _includeInAnalytics: boolean = true;

	// ==================== 标签管理 ====================

	/**
	 * @description 添加标签
	 *
	 * @param tag - 标签名称
	 */
	addTag(tag: string): void {
		if (tag && !this._tags.includes(tag)) {
			this._tags.push(tag);
			this.markUpdated();
		}
	}

	/**
	 * @description 移除标签
	 *
	 * @param tag - 标签名称
	 */
	removeTag(tag: string): void {
		const index = this._tags.indexOf(tag);
		if (index >= 0) {
			this._tags.splice(index, 1);
			this.markUpdated();
		}
	}

	/**
	 * @description 检查是否拥有标签
	 *
	 * @param tag - 标签名称
	 * @returns 是否拥有该标签
	 */
	hasTag(tag: string): boolean {
		return this._tags.includes(tag);
	}

	/**
	 * @description 设置多个标签（替换现有标签）
	 *
	 * @param tags - 标签数组
	 */
	setTags(tags: string[]): void {
		this._tags = [...tags];
		this.markUpdated();
	}

	/**
	 * @description 清空所有标签
	 */
	clearTags(): void {
		this._tags = [];
		this.markUpdated();
	}

	// ==================== 分类管理 ====================

	/**
	 * @description 设置业务分类
	 *
	 * @param category - 分类名称
	 */
	setCategory(category: string): void {
		if (this._category !== category) {
			this._category = category;
			this.markUpdated();
		}
	}

	/**
	 * @description 清除分类
	 */
	clearCategory(): void {
		this._category = undefined;
		this.markUpdated();
	}

	// ==================== 分析维度管理 ====================

	/**
	 * @description 设置单个分析维度
	 *
	 * @param key - 维度键名
	 * @param value - 维度值
	 */
	setAnalyticsDimension(key: string, value: AnalyticsDimensionValue): void {
		if (!this._analyticsDimensions) {
			this._analyticsDimensions = {};
		}
		this._analyticsDimensions[key] = value;
		this.markUpdated();
	}

	/**
	 * @description 批量设置分析维度
	 *
	 * @param dimensions - 维度键值对
	 */
	setAnalyticsDimensions(dimensions: AnalyticsDimensions): void {
		this._analyticsDimensions = {
			...this._analyticsDimensions,
			...dimensions
		};
		this.markUpdated();
	}

	/**
	 * @description 移除单个分析维度
	 *
	 * @param key - 维度键名
	 */
	removeAnalyticsDimension(key: string): void {
		if (this._analyticsDimensions && key in this._analyticsDimensions) {
			delete this._analyticsDimensions[key];
			this.markUpdated();
		}
	}

	/**
	 * @description 清空所有分析维度
	 */
	clearAnalyticsDimensions(): void {
		this._analyticsDimensions = undefined;
		this.markUpdated();
	}

	// ==================== 数据质量管理 ====================

	/**
	 * @description 设置数据质量分数
	 *
	 * @param score - 质量分数（0-100）
	 * @throws Error 当分数不在 0-100 范围内时抛出
	 */
	setQualityScore(score: number): void {
		if (score < 0 || score > 100) {
			throw new Error('质量分数必须在 0-100 范围内');
		}
		this._qualityScore = score;
		this.markUpdated();
	}

	/**
	 * @description 设置是否参与统计分析
	 *
	 * @param include - 是否参与
	 */
	setIncludeInAnalytics(include: boolean): void {
		this._includeInAnalytics = include;
		this.markUpdated();
	}

	// ==================== 信息获取 ====================

	/**
	 * @description 获取分析元数据信息
	 *
	 * @returns 分析元数据信息对象
	 */
	getAnalyticsInfo(): {
		tags: string[];
		category?: string;
		analyticsDimensions?: AnalyticsDimensions;
		qualityScore?: number;
		includeInAnalytics: boolean;
	} {
		return {
			tags: [...this._tags],
			category: this._category,
			analyticsDimensions: this._analyticsDimensions ? { ...this._analyticsDimensions } : undefined,
			qualityScore: this._qualityScore,
			includeInAnalytics: this._includeInAnalytics
		};
	}

	// ==================== Getters ====================

	/**
	 * 获取标签列表
	 */
	get tags(): string[] {
		return [...this._tags];
	}

	/**
	 * 获取分类
	 */
	get category(): string | undefined {
		return this._category;
	}

	/**
	 * 获取分析维度
	 */
	get analyticsDimensions(): AnalyticsDimensions | undefined {
		return this._analyticsDimensions ? { ...this._analyticsDimensions } : undefined;
	}

	/**
	 * 获取质量分数
	 */
	get qualityScore(): number | undefined {
		return this._qualityScore;
	}

	/**
	 * 获取是否参与统计分析
	 */
	get includeInAnalytics(): boolean {
		return this._includeInAnalytics;
	}
}
