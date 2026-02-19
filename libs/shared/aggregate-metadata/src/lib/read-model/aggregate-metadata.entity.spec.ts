import { AggregateMetadataEntity } from './aggregate-metadata.entity';

/**
 * @description AggregateMetadataEntity 单元测试
 *
 * 测试覆盖：
 * - 实体创建与属性赋值
 * - 复合主键支持
 * - 审计字段默认值
 * - 可选属性处理
 * - JSON 字段类型支持
 */

describe('AggregateMetadataEntity', () => {
	describe('实体创建', () => {
		it('应正确创建实体实例', () => {
			// Arrange & Act
			const entity = new AggregateMetadataEntity();

			// Assert
			expect(entity).toBeDefined();
			expect(entity).toBeInstanceOf(AggregateMetadataEntity);
		});

		it('应自动设置 createdAt 为当前时间', () => {
			// Arrange
			const beforeCreate = new Date();

			// Act
			const entity = new AggregateMetadataEntity();

			// Assert
			const afterCreate = new Date();
			expect(entity.createdAt).toBeInstanceOf(Date);
			expect(entity.createdAt.getTime()).toBeGreaterThanOrEqual(beforeCreate.getTime());
			expect(entity.createdAt.getTime()).toBeLessThanOrEqual(afterCreate.getTime());
		});

		it('应自动设置 updatedAt 为当前时间', () => {
			// Arrange
			const beforeCreate = new Date();

			// Act
			const entity = new AggregateMetadataEntity();

			// Assert
			const afterCreate = new Date();
			expect(entity.updatedAt).toBeInstanceOf(Date);
			expect(entity.updatedAt.getTime()).toBeGreaterThanOrEqual(beforeCreate.getTime());
			expect(entity.updatedAt.getTime()).toBeLessThanOrEqual(afterCreate.getTime());
		});

		it('应默认 isDeleted 为 false', () => {
			// Arrange & Act
			const entity = new AggregateMetadataEntity();

			// Assert
			expect(entity.isDeleted).toBe(false);
		});
	});

	describe('复合主键', () => {
		it('应正确设置 tenantId', () => {
			// Arrange & Act
			const entity = new AggregateMetadataEntity();
			entity.tenantId = 'tenant-123';

			// Assert
			expect(entity.tenantId).toBe('tenant-123');
		});

		it('应正确设置 aggregateType', () => {
			// Arrange & Act
			const entity = new AggregateMetadataEntity();
			entity.aggregateType = 'UserAggregate';

			// Assert
			expect(entity.aggregateType).toBe('UserAggregate');
		});

		it('应正确设置 aggregateId', () => {
			// Arrange & Act
			const entity = new AggregateMetadataEntity();
			entity.aggregateId = 'agg-456';

			// Assert
			expect(entity.aggregateId).toBe('agg-456');
		});

		it('应支持复合主键（tenantId + aggregateType + aggregateId）', () => {
			// Arrange & Act
			const entity = new AggregateMetadataEntity();
			entity.tenantId = 'tenant-789';
			entity.aggregateType = 'TenantAggregate';
			entity.aggregateId = 'agg-012';

			// Assert
			expect(entity.tenantId).toBe('tenant-789');
			expect(entity.aggregateType).toBe('TenantAggregate');
			expect(entity.aggregateId).toBe('agg-012');
		});
	});

	describe('基础审计字段', () => {
		it('应正确设置自定义 createdAt', () => {
			// Arrange
			const customDate = new Date('2024-01-15T10:30:00Z');

			// Act
			const entity = new AggregateMetadataEntity();
			entity.createdAt = customDate;

			// Assert
			expect(entity.createdAt).toEqual(customDate);
		});

		it('应正确设置 updatedAt', () => {
			// Arrange
			const updateDate = new Date('2024-06-20T14:45:00Z');

			// Act
			const entity = new AggregateMetadataEntity();
			entity.updatedAt = updateDate;

			// Assert
			expect(entity.updatedAt).toEqual(updateDate);
		});

		it('应正确设置 createdBy', () => {
			// Arrange & Act
			const entity = new AggregateMetadataEntity();
			entity.createdBy = 'user-123';

			// Assert
			expect(entity.createdBy).toBe('user-123');
		});

		it('createdBy 应为可选', () => {
			// Arrange & Act
			const entity = new AggregateMetadataEntity();

			// Assert
			expect(entity.createdBy).toBeUndefined();
		});

		it('应正确设置 updatedBy', () => {
			// Arrange & Act
			const entity = new AggregateMetadataEntity();
			entity.updatedBy = 'user-456';

			// Assert
			expect(entity.updatedBy).toBe('user-456');
		});

		it('updatedBy 应为可选', () => {
			// Arrange & Act
			const entity = new AggregateMetadataEntity();

			// Assert
			expect(entity.updatedBy).toBeUndefined();
		});

		it('应正确设置 deletedAt', () => {
			// Arrange
			const deleteDate = new Date('2024-12-31T00:00:00Z');

			// Act
			const entity = new AggregateMetadataEntity();
			entity.deletedAt = deleteDate;

			// Assert
			expect(entity.deletedAt).toEqual(deleteDate);
		});

		it('deletedAt 应为可选', () => {
			// Arrange & Act
			const entity = new AggregateMetadataEntity();

			// Assert
			expect(entity.deletedAt).toBeUndefined();
		});

		it('应正确设置 deletedBy', () => {
			// Arrange & Act
			const entity = new AggregateMetadataEntity();
			entity.deletedBy = 'admin-789';

			// Assert
			expect(entity.deletedBy).toBe('admin-789');
		});

		it('deletedBy 应为可选', () => {
			// Arrange & Act
			const entity = new AggregateMetadataEntity();

			// Assert
			expect(entity.deletedBy).toBeUndefined();
		});

		it('应正确设置 isDeleted 为 true', () => {
			// Arrange & Act
			const entity = new AggregateMetadataEntity();
			entity.isDeleted = true;

			// Assert
			expect(entity.isDeleted).toBe(true);
		});
	});

	describe('分析扩展字段', () => {
		it('应正确设置 tags 数组', () => {
			// Arrange
			const tags = ['重要', '已验证', 'VIP客户'];

			// Act
			const entity = new AggregateMetadataEntity();
			entity.tags = tags;

			// Assert
			expect(entity.tags).toEqual(tags);
		});

		it('tags 应为可选', () => {
			// Arrange & Act
			const entity = new AggregateMetadataEntity();

			// Assert
			expect(entity.tags).toBeUndefined();
		});

		it('应正确设置 category', () => {
			// Arrange & Act
			const entity = new AggregateMetadataEntity();
			entity.category = '用户管理';

			// Assert
			expect(entity.category).toBe('用户管理');
		});

		it('category 应为可选', () => {
			// Arrange & Act
			const entity = new AggregateMetadataEntity();

			// Assert
			expect(entity.category).toBeUndefined();
		});

		it('应正确设置 analyticsDimensions', () => {
			// Arrange
			const dimensions = {
				region: '华东',
				department: '技术部',
				level: 3,
				isActive: true
			};

			// Act
			const entity = new AggregateMetadataEntity();
			entity.analyticsDimensions = dimensions;

			// Assert
			expect(entity.analyticsDimensions).toEqual(dimensions);
		});

		it('analyticsDimensions 应为可选', () => {
			// Arrange & Act
			const entity = new AggregateMetadataEntity();

			// Assert
			expect(entity.analyticsDimensions).toBeUndefined();
		});

		it('应正确设置 qualityScore', () => {
			// Arrange & Act
			const entity = new AggregateMetadataEntity();
			entity.qualityScore = 85;

			// Assert
			expect(entity.qualityScore).toBe(85);
		});

		it('qualityScore 应为可选', () => {
			// Arrange & Act
			const entity = new AggregateMetadataEntity();

			// Assert
			expect(entity.qualityScore).toBeUndefined();
		});

		it('应正确设置 includeInAnalytics 为 true', () => {
			// Arrange & Act
			const entity = new AggregateMetadataEntity();
			entity.includeInAnalytics = true;

			// Assert
			expect(entity.includeInAnalytics).toBe(true);
		});

		it('includeInAnalytics 应为可选', () => {
			// Arrange & Act
			const entity = new AggregateMetadataEntity();

			// Assert
			expect(entity.includeInAnalytics).toBeUndefined();
		});
	});

	describe('AI 能力扩展字段', () => {
		it('应正确设置 embeddingStatus', () => {
			// Arrange & Act
			const entity = new AggregateMetadataEntity();
			entity.embeddingStatus = 'completed';

			// Assert
			expect(entity.embeddingStatus).toBe('completed');
		});

		it('embeddingStatus 应为可选', () => {
			// Arrange & Act
			const entity = new AggregateMetadataEntity();

			// Assert
			expect(entity.embeddingStatus).toBeUndefined();
		});

		it('应正确设置 embeddingVersion', () => {
			// Arrange & Act
			const entity = new AggregateMetadataEntity();
			entity.embeddingVersion = 'v2.0';

			// Assert
			expect(entity.embeddingVersion).toBe('v2.0');
		});

		it('embeddingVersion 应为可选', () => {
			// Arrange & Act
			const entity = new AggregateMetadataEntity();

			// Assert
			expect(entity.embeddingVersion).toBeUndefined();
		});

		it('应正确设置 embeddingId', () => {
			// Arrange & Act
			const entity = new AggregateMetadataEntity();
			entity.embeddingId = 'emb-123456';

			// Assert
			expect(entity.embeddingId).toBe('emb-123456');
		});

		it('embeddingId 应为可选', () => {
			// Arrange & Act
			const entity = new AggregateMetadataEntity();

			// Assert
			expect(entity.embeddingId).toBeUndefined();
		});

		it('应正确设置 aiMetadata', () => {
			// Arrange
			const aiMeta = {
				model: 'gpt-4',
				tokens: 1500,
				confidence: 0.95
			};

			// Act
			const entity = new AggregateMetadataEntity();
			entity.aiMetadata = aiMeta;

			// Assert
			expect(entity.aiMetadata).toEqual(aiMeta);
		});

		it('aiMetadata 应为可选', () => {
			// Arrange & Act
			const entity = new AggregateMetadataEntity();

			// Assert
			expect(entity.aiMetadata).toBeUndefined();
		});
	});

	describe('同步扩展字段', () => {
		it('应正确设置 externalIds', () => {
			// Arrange
			const externalIds = {
				salesforce: 'sf-001',
				hubspot: 'hs-002',
				sap: 'sap-003'
			};

			// Act
			const entity = new AggregateMetadataEntity();
			entity.externalIds = externalIds;

			// Assert
			expect(entity.externalIds).toEqual(externalIds);
		});

		it('externalIds 应为可选', () => {
			// Arrange & Act
			const entity = new AggregateMetadataEntity();

			// Assert
			expect(entity.externalIds).toBeUndefined();
		});

		it('应正确设置 dataSource', () => {
			// Arrange & Act
			const entity = new AggregateMetadataEntity();
			entity.dataSource = 'CRM';

			// Assert
			expect(entity.dataSource).toBe('CRM');
		});

		it('dataSource 应为可选', () => {
			// Arrange & Act
			const entity = new AggregateMetadataEntity();

			// Assert
			expect(entity.dataSource).toBeUndefined();
		});

		it('应正确设置 syncStatus', () => {
			// Arrange & Act
			const entity = new AggregateMetadataEntity();
			entity.syncStatus = 'synced';

			// Assert
			expect(entity.syncStatus).toBe('synced');
		});

		it('syncStatus 应为可选', () => {
			// Arrange & Act
			const entity = new AggregateMetadataEntity();

			// Assert
			expect(entity.syncStatus).toBeUndefined();
		});

		it('应正确设置 lastSyncedAt', () => {
			// Arrange
			const syncDate = new Date('2024-06-15T08:00:00Z');

			// Act
			const entity = new AggregateMetadataEntity();
			entity.lastSyncedAt = syncDate;

			// Assert
			expect(entity.lastSyncedAt).toEqual(syncDate);
		});

		it('lastSyncedAt 应为可选', () => {
			// Arrange & Act
			const entity = new AggregateMetadataEntity();

			// Assert
			expect(entity.lastSyncedAt).toBeUndefined();
		});

		it('应正确设置 syncVersion', () => {
			// Arrange & Act
			const entity = new AggregateMetadataEntity();
			entity.syncVersion = 5;

			// Assert
			expect(entity.syncVersion).toBe(5);
		});

		it('syncVersion 应为可选', () => {
			// Arrange & Act
			const entity = new AggregateMetadataEntity();

			// Assert
			expect(entity.syncVersion).toBeUndefined();
		});

		it('应正确设置 etlMetadata', () => {
			// Arrange
			const etlMeta = {
				extractedAt: '2024-06-15',
				transformVersion: '1.2',
				loadBatch: 'batch-001'
			};

			// Act
			const entity = new AggregateMetadataEntity();
			entity.etlMetadata = etlMeta;

			// Assert
			expect(entity.etlMetadata).toEqual(etlMeta);
		});

		it('etlMetadata 应为可选', () => {
			// Arrange & Act
			const entity = new AggregateMetadataEntity();

			// Assert
			expect(entity.etlMetadata).toBeUndefined();
		});
	});

	describe('完整实体构建', () => {
		it('应正确构建完整的元数据实体', () => {
			// Arrange
			const now = new Date();

			// Act
			const entity = new AggregateMetadataEntity();
			entity.tenantId = 'tenant-001';
			entity.aggregateType = 'BillingAggregate';
			entity.aggregateId = 'bill-123';
			entity.createdBy = 'system';
			entity.updatedBy = 'admin';
			entity.tags = ['财务', '已审核'];
			entity.category = '账单';
			entity.analyticsDimensions = { region: '华东', year: 2024 };
			entity.qualityScore = 95;
			entity.includeInAnalytics = true;
			entity.embeddingStatus = 'pending';
			entity.externalIds = { erp: 'erp-001' };
			entity.dataSource = 'ERP';
			entity.syncStatus = 'synced';
			entity.syncVersion = 3;

			// Assert
			expect(entity.tenantId).toBe('tenant-001');
			expect(entity.aggregateType).toBe('BillingAggregate');
			expect(entity.aggregateId).toBe('bill-123');
			expect(entity.createdAt).toBeInstanceOf(Date);
			expect(entity.updatedAt).toBeInstanceOf(Date);
			expect(entity.createdBy).toBe('system');
			expect(entity.updatedBy).toBe('admin');
			expect(entity.isDeleted).toBe(false);
			expect(entity.tags).toEqual(['财务', '已审核']);
			expect(entity.category).toBe('账单');
			expect(entity.analyticsDimensions).toEqual({ region: '华东', year: 2024 });
			expect(entity.qualityScore).toBe(95);
			expect(entity.includeInAnalytics).toBe(true);
			expect(entity.embeddingStatus).toBe('pending');
			expect(entity.externalIds).toEqual({ erp: 'erp-001' });
			expect(entity.dataSource).toBe('ERP');
			expect(entity.syncStatus).toBe('synced');
			expect(entity.syncVersion).toBe(3);
		});

		it('应正确构建最小化的元数据实体（仅主键）', () => {
			// Act
			const entity = new AggregateMetadataEntity();
			entity.tenantId = 'tenant-min';
			entity.aggregateType = 'MinimalAggregate';
			entity.aggregateId = 'min-001';

			// Assert
			expect(entity.tenantId).toBe('tenant-min');
			expect(entity.aggregateType).toBe('MinimalAggregate');
			expect(entity.aggregateId).toBe('min-001');
			expect(entity.createdAt).toBeInstanceOf(Date);
			expect(entity.updatedAt).toBeInstanceOf(Date);
			expect(entity.isDeleted).toBe(false);
		});
	});
});
