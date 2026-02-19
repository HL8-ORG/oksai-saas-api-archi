import type { EventStoreDomainEvent } from '../event-store.interface';
import {
	AIEnabledAggregateRoot,
	AnalyzableAggregateRoot,
	SyncableAggregateRoot,
	EmbeddingStatus,
	SyncStatus
} from './index';

/**
 * @description 测试用领域事件类型
 */
type TestEvent = EventStoreDomainEvent;

// ==================== AIEnabledAggregateRoot 测试 ====================

class TestAIAggregate extends AIEnabledAggregateRoot<TestEvent> {
	private _id: string;
	private _content: string = '';

	constructor(id: string) {
		super();
		this._id = id;
	}

	static create(id: string, content: string): TestAIAggregate {
		const agg = new TestAIAggregate(id);
		agg.initAuditTimestamps();
		agg._content = content;
		return agg;
	}

	updateContent(newContent: string): void {
		this._content = newContent;
		this.markUpdated();
		this.markEmbeddingStale();
	}

	protected apply(_event: TestEvent): void {}
}

describe('AIEnabledAggregateRoot', () => {
	describe('初始状态', () => {
		it('初始嵌入状态应为 PENDING', () => {
			const agg = TestAIAggregate.create('test-1', 'content');
			expect(agg.embeddingStatus).toBe(EmbeddingStatus.PENDING);
		});

		it('初始嵌入 ID 和版本应为 undefined', () => {
			const agg = TestAIAggregate.create('test-1', 'content');
			expect(agg.embeddingId).toBeUndefined();
			expect(agg.embeddingVersion).toBeUndefined();
		});

		it('needsReembedding 应返回 true（PENDING 状态）', () => {
			const agg = TestAIAggregate.create('test-1', 'content');
			expect(agg.needsReembedding()).toBe(true);
		});
	});

	describe('markEmbeddingStale', () => {
		it('应将状态设置为 STALE', () => {
			const agg = TestAIAggregate.create('test-1', 'content');
			agg.updateContent('new content');

			expect(agg.embeddingStatus).toBe(EmbeddingStatus.STALE);
			expect(agg.needsReembedding()).toBe(true);
		});

		it('应为幂等操作', () => {
			const agg = TestAIAggregate.create('test-1', 'content');
			agg.updateContent('new content');
			const originalUpdatedAt = agg.updatedAt;

			agg.markEmbeddingStale();

			expect(agg.embeddingStatus).toBe(EmbeddingStatus.STALE);
		});
	});

	describe('updateEmbedding', () => {
		it('应更新嵌入信息并设置状态为 SYNCED', () => {
			const agg = TestAIAggregate.create('test-1', 'content');
			agg.updateEmbedding('emb-123', 'v1.0');

			expect(agg.embeddingStatus).toBe(EmbeddingStatus.SYNCED);
			expect(agg.embeddingId).toBe('emb-123');
			expect(agg.embeddingVersion).toBe('v1.0');
			expect(agg.needsReembedding()).toBe(false);
		});

		it('应记录 AI 元数据', () => {
			const agg = TestAIAggregate.create('test-1', 'content');
			agg.updateEmbedding('emb-123', 'v1.0', { modelName: 'text-embedding-3-small', tokenCount: 100 });

			expect(agg.aiMetadata?.modelName).toBe('text-embedding-3-small');
			expect(agg.aiMetadata?.tokenCount).toBe(100);
		});
	});

	describe('markEmbeddingFailed', () => {
		it('应将状态设置为 FAILED', () => {
			const agg = TestAIAggregate.create('test-1', 'content');
			agg.markEmbeddingFailed('API timeout');

			expect(agg.embeddingStatus).toBe(EmbeddingStatus.FAILED);
			expect(agg.aiMetadata?.errorMessage).toBe('API timeout');
			expect(agg.needsReembedding()).toBe(true);
		});
	});

	describe('getAIInfo', () => {
		it('应返回完整的 AI 信息', () => {
			const agg = TestAIAggregate.create('test-1', 'content');
			agg.updateEmbedding('emb-123', 'v1.0');

			const info = agg.getAIInfo();

			expect(info.embeddingStatus).toBe(EmbeddingStatus.SYNCED);
			expect(info.embeddingId).toBe('emb-123');
			expect(info.embeddingVersion).toBe('v1.0');
			expect(info.needsReembedding).toBe(false);
		});
	});
});

// ==================== AnalyzableAggregateRoot 测试 ====================

class TestAnalyzableAggregate extends AnalyzableAggregateRoot<TestEvent> {
	private _id: string;

	constructor(id: string) {
		super();
		this._id = id;
	}

	static create(id: string): TestAnalyzableAggregate {
		const agg = new TestAnalyzableAggregate(id);
		agg.initAuditTimestamps();
		return agg;
	}

	protected apply(_event: TestEvent): void {}
}

describe('AnalyzableAggregateRoot', () => {
	describe('标签管理', () => {
		it('addTag 应添加标签', () => {
			const agg = TestAnalyzableAggregate.create('test-1');
			agg.addTag('important');

			expect(agg.hasTag('important')).toBe(true);
			expect(agg.tags).toContain('important');
		});

		it('addTag 不应添加重复标签', () => {
			const agg = TestAnalyzableAggregate.create('test-1');
			agg.addTag('important');
			agg.addTag('important');

			expect(agg.tags).toHaveLength(1);
		});

		it('removeTag 应移除标签', () => {
			const agg = TestAnalyzableAggregate.create('test-1');
			agg.addTag('important');
			agg.removeTag('important');

			expect(agg.hasTag('important')).toBe(false);
		});

		it('setTags 应替换所有标签', () => {
			const agg = TestAnalyzableAggregate.create('test-1');
			agg.addTag('old');
			agg.setTags(['new1', 'new2']);

			expect(agg.tags).toEqual(['new1', 'new2']);
		});

		it('clearTags 应清空所有标签', () => {
			const agg = TestAnalyzableAggregate.create('test-1');
			agg.addTag('tag1');
			agg.addTag('tag2');
			agg.clearTags();

			expect(agg.tags).toHaveLength(0);
		});
	});

	describe('分类管理', () => {
		it('setCategory 应设置分类', () => {
			const agg = TestAnalyzableAggregate.create('test-1');
			agg.setCategory('finance');

			expect(agg.category).toBe('finance');
		});

		it('clearCategory 应清除分类', () => {
			const agg = TestAnalyzableAggregate.create('test-1');
			agg.setCategory('finance');
			agg.clearCategory();

			expect(agg.category).toBeUndefined();
		});
	});

	describe('分析维度管理', () => {
		it('setAnalyticsDimension 应设置单个维度', () => {
			const agg = TestAnalyzableAggregate.create('test-1');
			agg.setAnalyticsDimension('region', 'CN');
			agg.setAnalyticsDimension('amount', 1000);

			expect(agg.analyticsDimensions?.region).toBe('CN');
			expect(agg.analyticsDimensions?.amount).toBe(1000);
		});

		it('removeAnalyticsDimension 应移除维度', () => {
			const agg = TestAnalyzableAggregate.create('test-1');
			agg.setAnalyticsDimension('region', 'CN');
			agg.removeAnalyticsDimension('region');

			expect(agg.analyticsDimensions?.region).toBeUndefined();
		});

		it('clearAnalyticsDimensions 应清空所有维度', () => {
			const agg = TestAnalyzableAggregate.create('test-1');
			agg.setAnalyticsDimension('region', 'CN');
			agg.setAnalyticsDimension('amount', 1000);
			agg.clearAnalyticsDimensions();

			expect(agg.analyticsDimensions).toBeUndefined();
		});
	});

	describe('数据质量管理', () => {
		it('setQualityScore 应设置质量分数', () => {
			const agg = TestAnalyzableAggregate.create('test-1');
			agg.setQualityScore(85);

			expect(agg.qualityScore).toBe(85);
		});

		it('setQualityScore 应拒绝无效分数', () => {
			const agg = TestAnalyzableAggregate.create('test-1');

			expect(() => agg.setQualityScore(-1)).toThrow();
			expect(() => agg.setQualityScore(101)).toThrow();
		});

		it('setIncludeInAnalytics 应设置是否参与分析', () => {
			const agg = TestAnalyzableAggregate.create('test-1');
			agg.setIncludeInAnalytics(false);

			expect(agg.includeInAnalytics).toBe(false);
		});
	});

	describe('getAnalyticsInfo', () => {
		it('应返回完整的分析信息', () => {
			const agg = TestAnalyzableAggregate.create('test-1');
			agg.addTag('important');
			agg.setCategory('finance');
			agg.setAnalyticsDimension('region', 'CN');
			agg.setQualityScore(90);

			const info = agg.getAnalyticsInfo();

			expect(info.tags).toContain('important');
			expect(info.category).toBe('finance');
			expect(info.analyticsDimensions?.region).toBe('CN');
			expect(info.qualityScore).toBe(90);
			expect(info.includeInAnalytics).toBe(true);
		});
	});
});

// ==================== SyncableAggregateRoot 测试 ====================

class TestSyncableAggregate extends SyncableAggregateRoot<TestEvent> {
	private _id: string;

	constructor(id: string) {
		super();
		this._id = id;
	}

	static create(id: string): TestSyncableAggregate {
		const agg = new TestSyncableAggregate(id);
		agg.initAuditTimestamps();
		return agg;
	}

	protected apply(_event: TestEvent): void {}
}

describe('SyncableAggregateRoot', () => {
	describe('外部标识管理', () => {
		it('setExternalId 应设置外部系统 ID', () => {
			const agg = TestSyncableAggregate.create('test-1');
			agg.setExternalId('erp', 'ERP-001');

			expect(agg.getExternalId('erp')).toBe('ERP-001');
			expect(agg.hasExternalId('erp')).toBe(true);
		});

		it('removeExternalId 应移除外部系统 ID', () => {
			const agg = TestSyncableAggregate.create('test-1');
			agg.setExternalId('erp', 'ERP-001');
			agg.removeExternalId('erp');

			expect(agg.hasExternalId('erp')).toBe(false);
		});

		it('setExternalIds 应批量设置外部 ID', () => {
			const agg = TestSyncableAggregate.create('test-1');
			agg.setExternalIds({ erp: 'ERP-001', crm: 'CRM-001' });

			expect(agg.getExternalId('erp')).toBe('ERP-001');
			expect(agg.getExternalId('crm')).toBe('CRM-001');
		});
	});

	describe('数据源管理', () => {
		it('setDataSource 应设置数据来源', () => {
			const agg = TestSyncableAggregate.create('test-1');
			agg.setDataSource('external-api');

			expect(agg.dataSource).toBe('external-api');
		});
	});

	describe('同步状态管理', () => {
		it('初始同步状态应为 SYNCED', () => {
			const agg = TestSyncableAggregate.create('test-1');
			expect(agg.syncStatus).toBe(SyncStatus.SYNCED);
			expect(agg.needsSync()).toBe(false);
		});

		it('markSyncRequired 应标记需要同步', () => {
			const agg = TestSyncableAggregate.create('test-1');
			agg.markSyncRequired();

			expect(agg.syncStatus).toBe(SyncStatus.PENDING);
			expect(agg.needsSync()).toBe(true);
			expect(agg.syncVersion).toBe(2);
		});

		it('markSynced 应标记同步成功', () => {
			const agg = TestSyncableAggregate.create('test-1');
			agg.markSyncRequired();
			agg.markSynced();

			expect(agg.syncStatus).toBe(SyncStatus.SYNCED);
			expect(agg.lastSyncedAt).toBeDefined();
			expect(agg.needsSync()).toBe(false);
		});

		it('markSyncFailed 应标记同步失败', () => {
			const agg = TestSyncableAggregate.create('test-1');
			agg.markSyncRequired();
			agg.markSyncFailed('Connection timeout');

			expect(agg.syncStatus).toBe(SyncStatus.FAILED);
			expect(agg.etlMetadata?.errorMessage).toBe('Connection timeout');
			expect(agg.needsSync()).toBe(true);
		});

		it('markSyncRequired 应为幂等操作', () => {
			const agg = TestSyncableAggregate.create('test-1');
			agg.markSyncRequired();
			const version = agg.syncVersion;

			agg.markSyncRequired();

			expect(agg.syncVersion).toBe(version);
		});
	});

	describe('ETL 元数据管理', () => {
		it('setETLMetadata 应设置 ETL 元数据', () => {
			const agg = TestSyncableAggregate.create('test-1');
			agg.setETLMetadata({ jobId: 'job-123', version: '1.0' });

			expect(agg.etlMetadata?.jobId).toBe('job-123');
			expect(agg.etlMetadata?.version).toBe('1.0');
		});
	});

	describe('getSyncInfo', () => {
		it('应返回完整的同步信息', () => {
			const agg = TestSyncableAggregate.create('test-1');
			agg.setExternalId('erp', 'ERP-001');
			agg.setDataSource('external-api');
			agg.markSynced();

			const info = agg.getSyncInfo();

			expect(info.externalIds.erp).toBe('ERP-001');
			expect(info.dataSource).toBe('external-api');
			expect(info.syncStatus).toBe(SyncStatus.SYNCED);
			expect(info.lastSyncedAt).toBeDefined();
			expect(info.syncVersion).toBe(1);
			expect(info.needsSync).toBe(false);
		});
	});
});
