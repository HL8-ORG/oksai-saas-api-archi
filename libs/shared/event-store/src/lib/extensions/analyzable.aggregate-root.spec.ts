import { AnalyzableAggregateRoot, AnalyticsDimensions, AnalyticsDimensionValue } from './analyzable.aggregate-root';
import type { EventStoreDomainEvent } from '../event-store.interface';

/**
 * @description 测试用的具体分析聚合根实现
 */
class TestAnalyzableAggregate extends AnalyzableAggregateRoot<TestDomainEvent> {
	constructor() {
		super();
		// 初始化审计时间戳
		this['initAuditTimestamps']();
	}

	protected apply(_event: TestDomainEvent): void {
		// 测试用空实现
	}
}

/**
 * @description 测试用领域事件类型
 */
interface TestDomainEvent extends EventStoreDomainEvent {
	eventType: string;
}

describe('AnalyzableAggregateRoot', () => {
	let aggregate: TestAnalyzableAggregate;

	beforeEach(() => {
		aggregate = new TestAnalyzableAggregate();
	});

	describe('标签管理', () => {
		describe('addTag', () => {
			it('应正确添加标签', () => {
				// Arrange & Act
				aggregate.addTag('important');

				// Assert
				expect(aggregate.hasTag('important')).toBe(true);
			});

			it('添加标签后应标记为已更新', () => {
				// Arrange
				const beforeUpdatedAt = aggregate.updatedAt;

				// Act
				aggregate.addTag('test');

				// Assert
				expect(aggregate.updatedAt.getTime()).toBeGreaterThanOrEqual(beforeUpdatedAt.getTime());
			});

			it('重复添加相同标签应忽略', () => {
				// Arrange
				aggregate.addTag('duplicate');

				// Act
				aggregate.addTag('duplicate');

				// Assert
				expect(aggregate.tags).toHaveLength(1);
			});

			it('空字符串标签应被忽略', () => {
				// Act
				aggregate.addTag('');

				// Assert
				expect(aggregate.tags).toHaveLength(0);
			});

			it('应支持添加多个不同标签', () => {
				// Arrange & Act
				aggregate.addTag('tag1');
				aggregate.addTag('tag2');
				aggregate.addTag('tag3');

				// Assert
				expect(aggregate.tags).toEqual(['tag1', 'tag2', 'tag3']);
			});
		});

		describe('removeTag', () => {
			it('应正确移除已存在的标签', () => {
				// Arrange
				aggregate.addTag('remove-me');

				// Act
				aggregate.removeTag('remove-me');

				// Assert
				expect(aggregate.hasTag('remove-me')).toBe(false);
			});

			it('移除标签后应标记为已更新', () => {
				// Arrange
				aggregate.addTag('test');
				const beforeUpdatedAt = aggregate.updatedAt;

				// Act
				aggregate.removeTag('test');

				// Assert
				expect(aggregate.updatedAt.getTime()).toBeGreaterThanOrEqual(beforeUpdatedAt.getTime());
			});

			it('移除不存在的标签不应抛出错误', () => {
				// Act & Assert
				expect(() => aggregate.removeTag('non-existent')).not.toThrow();
			});

			it('移除中间标签后其他标签应保持正确', () => {
				// Arrange
				aggregate.addTag('tag1');
				aggregate.addTag('tag2');
				aggregate.addTag('tag3');

				// Act
				aggregate.removeTag('tag2');

				// Assert
				expect(aggregate.tags).toEqual(['tag1', 'tag3']);
			});
		});

		describe('hasTag', () => {
			it('存在标签时应返回true', () => {
				// Arrange
				aggregate.addTag('existing');

				// Act & Assert
				expect(aggregate.hasTag('existing')).toBe(true);
			});

			it('不存在标签时应返回false', () => {
				// Act & Assert
				expect(aggregate.hasTag('non-existent')).toBe(false);
			});
		});

		describe('setTags', () => {
			it('应替换现有标签', () => {
				// Arrange
				aggregate.addTag('old');

				// Act
				aggregate.setTags(['new1', 'new2']);

				// Assert
				expect(aggregate.tags).toEqual(['new1', 'new2']);
			});

			it('设置标签后应标记为已更新', () => {
				// Arrange
				const beforeUpdatedAt = aggregate.updatedAt;

				// Act
				aggregate.setTags(['tag1', 'tag2']);

				// Assert
				expect(aggregate.updatedAt.getTime()).toBeGreaterThanOrEqual(beforeUpdatedAt.getTime());
			});

			it('应支持设置空数组', () => {
				// Arrange
				aggregate.addTag('existing');

				// Act
				aggregate.setTags([]);

				// Assert
				expect(aggregate.tags).toHaveLength(0);
			});
		});

		describe('clearTags', () => {
			it('应清空所有标签', () => {
				// Arrange
				aggregate.addTag('tag1');
				aggregate.addTag('tag2');

				// Act
				aggregate.clearTags();

				// Assert
				expect(aggregate.tags).toHaveLength(0);
			});

			it('清空后应标记为已更新', () => {
				// Arrange
				aggregate.addTag('test');
				const beforeUpdatedAt = aggregate.updatedAt;

				// Act
				aggregate.clearTags();

				// Assert
				expect(aggregate.updatedAt.getTime()).toBeGreaterThanOrEqual(beforeUpdatedAt.getTime());
			});
		});

		describe('tags getter', () => {
			it('应返回标签数组的副本', () => {
				// Arrange
				aggregate.addTag('original');

				// Act
				const tags = aggregate.tags;
				tags.push('modified');

				// Assert
				expect(aggregate.tags).toHaveLength(1);
				expect(aggregate.tags).not.toContain('modified');
			});
		});
	});

	describe('分类管理', () => {
		describe('setCategory', () => {
			it('应正确设置分类', () => {
				// Arrange & Act
				aggregate.setCategory('finance');

				// Assert
				expect(aggregate.category).toBe('finance');
			});

			it('设置分类后应标记为已更新', () => {
				// Arrange
				const beforeUpdatedAt = aggregate.updatedAt;

				// Act
				aggregate.setCategory('marketing');

				// Assert
				expect(aggregate.updatedAt.getTime()).toBeGreaterThanOrEqual(beforeUpdatedAt.getTime());
			});

			it('设置相同分类不应标记为已更新', () => {
				// Arrange
				aggregate.setCategory('finance');
				const afterFirstSet = aggregate.updatedAt;

				// Act
				aggregate.setCategory('finance');

				// Assert
				expect(aggregate.updatedAt).toEqual(afterFirstSet);
			});

			it('应支持更改分类', () => {
				// Arrange
				aggregate.setCategory('old');

				// Act
				aggregate.setCategory('new');

				// Assert
				expect(aggregate.category).toBe('new');
			});
		});

		describe('clearCategory', () => {
			it('应清除已设置的分类', () => {
				// Arrange
				aggregate.setCategory('finance');

				// Act
				aggregate.clearCategory();

				// Assert
				expect(aggregate.category).toBeUndefined();
			});

			it('清除分类后应标记为已更新', () => {
				// Arrange
				aggregate.setCategory('finance');
				const beforeUpdatedAt = aggregate.updatedAt;

				// Act
				aggregate.clearCategory();

				// Assert
				expect(aggregate.updatedAt.getTime()).toBeGreaterThanOrEqual(beforeUpdatedAt.getTime());
			});
		});

		describe('category getter', () => {
			it('未设置时应返回undefined', () => {
				// Act & Assert
				expect(aggregate.category).toBeUndefined();
			});

			it('设置后应返回正确的分类', () => {
				// Arrange
				aggregate.setCategory('hr');

				// Act & Assert
				expect(aggregate.category).toBe('hr');
			});
		});
	});

	describe('分析维度管理', () => {
		describe('setAnalyticsDimension', () => {
			it('应正确设置字符串类型的维度', () => {
				// Arrange & Act
				aggregate.setAnalyticsDimension('region', 'asia');

				// Assert
				expect(aggregate.analyticsDimensions?.region).toBe('asia');
			});

			it('应正确设置数字类型的维度', () => {
				// Arrange & Act
				aggregate.setAnalyticsDimension('amount', 1000);

				// Assert
				expect(aggregate.analyticsDimensions?.amount).toBe(1000);
			});

			it('应正确设置布尔类型的维度', () => {
				// Arrange & Act
				aggregate.setAnalyticsDimension('isActive', true);

				// Assert
				expect(aggregate.analyticsDimensions?.isActive).toBe(true);
			});

			it('设置维度后应标记为已更新', () => {
				// Arrange
				const beforeUpdatedAt = aggregate.updatedAt;

				// Act
				aggregate.setAnalyticsDimension('key', 'value');

				// Assert
				expect(aggregate.updatedAt.getTime()).toBeGreaterThanOrEqual(beforeUpdatedAt.getTime());
			});

			it('应支持覆盖现有维度', () => {
				// Arrange
				aggregate.setAnalyticsDimension('key', 'old');

				// Act
				aggregate.setAnalyticsDimension('key', 'new');

				// Assert
				expect(aggregate.analyticsDimensions?.key).toBe('new');
			});
		});

		describe('setAnalyticsDimensions', () => {
			it('应批量设置多个维度', () => {
				// Arrange
				const dimensions: AnalyticsDimensions = {
					region: 'asia',
					amount: 1000,
					isActive: true
				};

				// Act
				aggregate.setAnalyticsDimensions(dimensions);

				// Assert
				expect(aggregate.analyticsDimensions).toEqual(dimensions);
			});

			it('批量设置应合并现有维度', () => {
				// Arrange
				aggregate.setAnalyticsDimension('existing', 'value');
				const newDimensions: AnalyticsDimensions = { new: 'dimension' };

				// Act
				aggregate.setAnalyticsDimensions(newDimensions);

				// Assert
				expect(aggregate.analyticsDimensions?.existing).toBe('value');
				expect(aggregate.analyticsDimensions?.new).toBe('dimension');
			});

			it('批量设置后应标记为已更新', () => {
				// Arrange
				const beforeUpdatedAt = aggregate.updatedAt;

				// Act
				aggregate.setAnalyticsDimensions({ key: 'value' });

				// Assert
				expect(aggregate.updatedAt.getTime()).toBeGreaterThanOrEqual(beforeUpdatedAt.getTime());
			});
		});

		describe('removeAnalyticsDimension', () => {
			it('应正确移除已存在的维度', () => {
				// Arrange
				aggregate.setAnalyticsDimension('remove-me', 'value');

				// Act
				aggregate.removeAnalyticsDimension('remove-me');

				// Assert
				expect(aggregate.analyticsDimensions?.['remove-me']).toBeUndefined();
			});

			it('移除维度后应标记为已更新', () => {
				// Arrange
				aggregate.setAnalyticsDimension('test', 'value');
				const beforeUpdatedAt = aggregate.updatedAt;

				// Act
				aggregate.removeAnalyticsDimension('test');

				// Assert
				expect(aggregate.updatedAt.getTime()).toBeGreaterThanOrEqual(beforeUpdatedAt.getTime());
			});

			it('移除不存在的维度不应抛出错误', () => {
				// Act & Assert
				expect(() => aggregate.removeAnalyticsDimension('non-existent')).not.toThrow();
			});

			it('维度不存在时不应标记为已更新', () => {
				// Arrange
				const beforeUpdatedAt = aggregate.updatedAt;

				// Act
				aggregate.removeAnalyticsDimension('non-existent');

				// Assert
				expect(aggregate.updatedAt).toEqual(beforeUpdatedAt);
			});
		});

		describe('clearAnalyticsDimensions', () => {
			it('应清空所有维度', () => {
				// Arrange
				aggregate.setAnalyticsDimension('key1', 'value1');
				aggregate.setAnalyticsDimension('key2', 'value2');

				// Act
				aggregate.clearAnalyticsDimensions();

				// Assert
				expect(aggregate.analyticsDimensions).toBeUndefined();
			});

			it('清空后应标记为已更新', () => {
				// Arrange
				aggregate.setAnalyticsDimension('test', 'value');
				const beforeUpdatedAt = aggregate.updatedAt;

				// Act
				aggregate.clearAnalyticsDimensions();

				// Assert
				expect(aggregate.updatedAt.getTime()).toBeGreaterThanOrEqual(beforeUpdatedAt.getTime());
			});
		});

		describe('analyticsDimensions getter', () => {
			it('未设置时应返回undefined', () => {
				// Act & Assert
				expect(aggregate.analyticsDimensions).toBeUndefined();
			});

			it('应返回维度的副本', () => {
				// Arrange
				aggregate.setAnalyticsDimension('original', 'value');

				// Act
				const dims = aggregate.analyticsDimensions;
				dims!['modified'] = 'new';

				// Assert
				expect(aggregate.analyticsDimensions?.modified).toBeUndefined();
			});
		});
	});

	describe('数据质量管理', () => {
		describe('setQualityScore', () => {
			it('应正确设置有效范围内的分数', () => {
				// Arrange & Act
				aggregate.setQualityScore(85);

				// Assert
				expect(aggregate.qualityScore).toBe(85);
			});

			it('应支持设置边界值0', () => {
				// Arrange & Act
				aggregate.setQualityScore(0);

				// Assert
				expect(aggregate.qualityScore).toBe(0);
			});

			it('应支持设置边界值100', () => {
				// Arrange & Act
				aggregate.setQualityScore(100);

				// Assert
				expect(aggregate.qualityScore).toBe(100);
			});

			it('小于0的分数应抛出错误', () => {
				// Act & Assert
				expect(() => aggregate.setQualityScore(-1)).toThrow('质量分数必须在 0-100 范围内');
			});

			it('大于100的分数应抛出错误', () => {
				// Act & Assert
				expect(() => aggregate.setQualityScore(101)).toThrow('质量分数必须在 0-100 范围内');
			});

			it('设置分数后应标记为已更新', () => {
				// Arrange
				const beforeUpdatedAt = aggregate.updatedAt;

				// Act
				aggregate.setQualityScore(90);

				// Assert
				expect(aggregate.updatedAt.getTime()).toBeGreaterThanOrEqual(beforeUpdatedAt.getTime());
			});
		});

		describe('qualityScore getter', () => {
			it('未设置时应返回undefined', () => {
				// Act & Assert
				expect(aggregate.qualityScore).toBeUndefined();
			});

			it('设置后应返回正确的分数', () => {
				// Arrange
				aggregate.setQualityScore(75);

				// Act & Assert
				expect(aggregate.qualityScore).toBe(75);
			});
		});
	});

	describe('分析开关管理', () => {
		describe('初始状态', () => {
			it('初始状态应参与统计分析', () => {
				// Act & Assert
				expect(aggregate.includeInAnalytics).toBe(true);
			});
		});

		describe('setIncludeInAnalytics', () => {
			it('应正确设置为不参与统计', () => {
				// Arrange & Act
				aggregate.setIncludeInAnalytics(false);

				// Assert
				expect(aggregate.includeInAnalytics).toBe(false);
			});

			it('应正确设置为参与统计', () => {
				// Arrange
				aggregate.setIncludeInAnalytics(false);

				// Act
				aggregate.setIncludeInAnalytics(true);

				// Assert
				expect(aggregate.includeInAnalytics).toBe(true);
			});

			it('设置后应标记为已更新', () => {
				// Arrange
				const beforeUpdatedAt = aggregate.updatedAt;

				// Act
				aggregate.setIncludeInAnalytics(false);

				// Assert
				expect(aggregate.updatedAt.getTime()).toBeGreaterThanOrEqual(beforeUpdatedAt.getTime());
			});
		});

		describe('includeInAnalytics getter', () => {
			it('应返回当前设置', () => {
				// Arrange
				aggregate.setIncludeInAnalytics(false);

				// Act & Assert
				expect(aggregate.includeInAnalytics).toBe(false);
			});
		});
	});

	describe('信息获取', () => {
		describe('getAnalyticsInfo', () => {
			it('应返回完整的分析信息', () => {
				// Arrange
				aggregate.addTag('tag1');
				aggregate.setCategory('finance');
				aggregate.setAnalyticsDimension('amount', 1000);
				aggregate.setQualityScore(85);
				aggregate.setIncludeInAnalytics(true);

				// Act
				const info = aggregate.getAnalyticsInfo();

				// Assert
				expect(info.tags).toEqual(['tag1']);
				expect(info.category).toBe('finance');
				expect(info.analyticsDimensions).toEqual({ amount: 1000 });
				expect(info.qualityScore).toBe(85);
				expect(info.includeInAnalytics).toBe(true);
			});

			it('应返回标签的副本', () => {
				// Arrange
				aggregate.addTag('original');

				// Act
				const info = aggregate.getAnalyticsInfo();
				info.tags.push('modified');

				// Assert
				expect(aggregate.tags).toHaveLength(1);
			});

			it('应返回维度的副本', () => {
				// Arrange
				aggregate.setAnalyticsDimension('original', 'value');

				// Act
				const info = aggregate.getAnalyticsInfo();
				info.analyticsDimensions!['modified'] = 'new';

				// Assert
				expect(aggregate.analyticsDimensions?.modified).toBeUndefined();
			});

			it('默认状态应返回正确的初始值', () => {
				// Act
				const info = aggregate.getAnalyticsInfo();

				// Assert
				expect(info.tags).toHaveLength(0);
				expect(info.category).toBeUndefined();
				expect(info.analyticsDimensions).toBeUndefined();
				expect(info.qualityScore).toBeUndefined();
				expect(info.includeInAnalytics).toBe(true);
			});
		});
	});
});
