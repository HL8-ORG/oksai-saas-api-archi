import { Logger } from '@nestjs/common';
import { MikroORM } from '@mikro-orm/core';
import { AggregateMetadataProjector, IAggregateMetadataExtractor } from './aggregate-metadata-projector';
import type { AggregateRoot, AuditInfo } from '@oksai/event-store';
import type {
	IFullAggregateMetadata,
	AnalyzableExtension,
	AIEnabledExtension,
	SyncableExtension
} from '../interfaces/aggregate-metadata.interface';
import { EmbeddingStatus, SyncStatus } from '@oksai/event-store';

jest.mock('@nestjs/common', () => ({
	...jest.requireActual('@nestjs/common'),
	Logger: jest.fn().mockImplementation(() => ({
		debug: jest.fn(),
		error: jest.fn(),
		warn: jest.fn()
	}))
}));

describe('AggregateMetadataProjector', () => {
	let projector: AggregateMetadataProjector;
	let mockOrm: any;
	let mockConnection: any;
	let mockEm: any;

	beforeEach(() => {
		mockConnection = {
			execute: jest.fn().mockResolvedValue([])
		};

		mockEm = {
			getConnection: jest.fn().mockReturnValue(mockConnection)
		};

		mockOrm = {
			em: mockEm
		} as any;

		projector = new AggregateMetadataProjector(mockOrm);
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	describe('project', () => {
		it('应该从聚合根提取元数据并执行 upsert', async () => {
			const mockAggregate = createMockAggregate();
			const mockExtractor = createMockExtractor();

			await projector.project(mockAggregate, mockExtractor);

			expect(mockConnection.execute).toHaveBeenCalledTimes(1);
			const sql = mockConnection.execute.mock.calls[0][0];
			expect(sql).toContain('INSERT INTO aggregate_metadata');
			expect(sql).toContain('ON CONFLICT');
		});

		it('应该使用 extractor 提取的基础元数据', async () => {
			const mockAggregate = createMockAggregate({
				tenantId: 'tenant-001',
				aggregateId: 'agg-001'
			});
			const mockExtractor = createMockExtractor({
				aggregateType: 'User',
				tenantId: 'tenant-001',
				aggregateId: 'agg-001'
			});

			await projector.project(mockAggregate, mockExtractor);

			const params = mockConnection.execute.mock.calls[0][1];
			expect(params[params.length - 4]).toBe('tenant-001');
			expect(params[params.length - 3]).toBe('User');
			expect(params[params.length - 2]).toBe('agg-001');
		});

		it('应该提取可分析扩展', async () => {
			const mockAggregate = createMockAggregate();
			const mockExtractor = createMockExtractor({
				analyzable: {
					tags: ['tag1', 'tag2'],
					category: 'category1',
					includeInAnalytics: true
				}
			});

			await projector.project(mockAggregate, mockExtractor);

			expect(mockConnection.execute).toHaveBeenCalled();
		});

		it('应该提取 AI 能力扩展', async () => {
			const mockAggregate = createMockAggregate();
			const mockExtractor = createMockExtractor({
				aiEnabled: {
					embeddingStatus: EmbeddingStatus.SYNCED,
					needsReembedding: false
				} as AIEnabledExtension
			});

			await projector.project(mockAggregate, mockExtractor);

			expect(mockConnection.execute).toHaveBeenCalled();
		});

		it('应该提取可同步扩展', async () => {
			const mockAggregate = createMockAggregate();
			const mockExtractor = createMockExtractor({
				syncable: {
					externalIds: { external: 'ext-001' },
					syncStatus: SyncStatus.SYNCED,
					syncVersion: 1,
					needsSync: false
				} as SyncableExtension
			});

			await projector.project(mockAggregate, mockExtractor);

			expect(mockConnection.execute).toHaveBeenCalled();
		});
	});

	describe('projectBatch', () => {
		it('应该批量处理多个聚合根', async () => {
			const aggregates = [createMockAggregate(), createMockAggregate()];
			const extractor = createMockExtractor();

			await projector.projectBatch(aggregates, extractor);

			expect(mockConnection.execute).toHaveBeenCalledTimes(2);
		});

		it('应该顺序处理每个聚合根', async () => {
			const executionOrder: number[] = [];
			mockConnection.execute.mockImplementation(async () => {
				executionOrder.push(executionOrder.length);
			});

			const aggregates = [createMockAggregate(), createMockAggregate(), createMockAggregate()];
			const extractor = createMockExtractor();

			await projector.projectBatch(aggregates, extractor);

			expect(executionOrder).toEqual([0, 1, 2]);
		});

		it('应该处理空数组', async () => {
			await projector.projectBatch([], createMockExtractor());

			expect(mockConnection.execute).not.toHaveBeenCalled();
		});
	});

	describe('softDelete', () => {
		it('应该执行软删除 SQL', async () => {
			await projector.softDelete('tenant-001', 'User', 'user-001', 'admin');

			expect(mockConnection.execute).toHaveBeenCalledTimes(1);
			const sql = mockConnection.execute.mock.calls[0][0];
			expect(sql).toContain('UPDATE aggregate_metadata');
			expect(sql).toContain('is_deleted = true');
		});

		it('应该传递正确的参数', async () => {
			await projector.softDelete('tenant-001', 'User', 'user-001', 'admin');

			const params = mockConnection.execute.mock.calls[0][1];
			expect(params[0]).toBe('tenant-001');
			expect(params[1]).toBe('User');
			expect(params[2]).toBe('user-001');
			expect(params[3]).toBe('admin');
		});

		it('deletedBy 应该可选', async () => {
			await projector.softDelete('tenant-001', 'User', 'user-001');

			const params = mockConnection.execute.mock.calls[0][1];
			expect(params[3]).toBeNull();
		});
	});

	describe('restore', () => {
		it('应该执行恢复 SQL', async () => {
			await projector.restore('tenant-001', 'User', 'user-001');

			expect(mockConnection.execute).toHaveBeenCalledTimes(1);
			const sql = mockConnection.execute.mock.calls[0][0];
			expect(sql).toContain('UPDATE aggregate_metadata');
			expect(sql).toContain('is_deleted = false');
		});

		it('应该清除删除相关字段', async () => {
			await projector.restore('tenant-001', 'User', 'user-001');

			const sql = mockConnection.execute.mock.calls[0][0];
			expect(sql).toContain('deleted_at = null');
			expect(sql).toContain('deleted_by = null');
		});

		it('应该传递正确的参数', async () => {
			await projector.restore('tenant-001', 'User', 'user-001');

			const params = mockConnection.execute.mock.calls[0][1];
			expect(params).toEqual(['tenant-001', 'User', 'user-001']);
		});
	});
});

function createMockAggregate(overrides: Partial<any> = {}): AggregateRoot {
	const auditInfo: AuditInfo = {
		createdAt: new Date('2024-01-01'),
		updatedAt: new Date('2024-01-02'),
		createdBy: 'creator-001',
		updatedBy: 'updater-001',
		deletedAt: undefined,
		deletedBy: undefined,
		isDeleted: false
	};

	return {
		getAuditInfo: jest.fn().mockReturnValue(auditInfo),
		...overrides
	} as any;
}

function createMockExtractor(overrides: Partial<any> = {}): IAggregateMetadataExtractor<any> {
	const defaultExtractor: IAggregateMetadataExtractor<any> = {
		getAggregateType: () => overrides.aggregateType || 'TestAggregate',
		getTenantId: () => overrides.tenantId || 'tenant-001',
		getAggregateId: () => overrides.aggregateId || 'aggregate-001'
	};

	if (overrides.analyzable) {
		defaultExtractor.getAnalyzableExtension = () => overrides.analyzable;
	}

	if (overrides.aiEnabled) {
		defaultExtractor.getAIEnabledExtension = () => overrides.aiEnabled;
	}

	if (overrides.syncable) {
		defaultExtractor.getSyncableExtension = () => overrides.syncable;
	}

	return defaultExtractor;
}
