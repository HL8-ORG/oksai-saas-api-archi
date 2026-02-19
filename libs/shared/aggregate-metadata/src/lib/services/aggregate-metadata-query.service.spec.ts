import { Logger } from '@nestjs/common';
import { MikroORM } from '@mikro-orm/core';
import { AggregateMetadataQueryService } from './aggregate-metadata-query.service';
import type { IFullAggregateMetadata, AggregateMetadataFilter } from '../interfaces/aggregate-metadata.interface';

jest.mock('@nestjs/common', () => {
	const actual = jest.requireActual('@nestjs/common');
	return {
		...actual,
		Logger: jest.fn().mockImplementation(() => ({
			debug: jest.fn(),
			error: jest.fn(),
			warn: jest.fn()
		}))
	};
});

describe('AggregateMetadataQueryService', () => {
	let service: AggregateMetadataQueryService;
	let mockOrm: any;
	let mockConnection: any;
	let mockEm: any;

	beforeEach(() => {
		mockConnection = {
			execute: jest.fn()
		};

		mockEm = {
			getConnection: jest.fn().mockReturnValue(mockConnection)
		};

		mockOrm = {
			em: mockEm
		} as any;

		service = new AggregateMetadataQueryService(mockOrm);
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	describe('query', () => {
		it('当 tenantId 缺失时应该抛出错误', async () => {
			const filter: AggregateMetadataFilter = {
				tenantId: '' as any
			};

			await expect(service.query(filter)).rejects.toThrow('tenantId 是必填参数');
		});

		it('应该执行查询并返回结果', async () => {
			mockConnection.execute
				.mockResolvedValueOnce([{ count: '2' }])
				.mockResolvedValueOnce([createMockRow('agg-1'), createMockRow('agg-2')]);

			const result = await service.query({ tenantId: 'tenant-001' });

			expect(result.total).toBe(2);
			expect(result.items).toHaveLength(2);
			expect(result.hasMore).toBe(false);
		});

		it('应该正确计算 hasMore', async () => {
			mockConnection.execute
				.mockResolvedValueOnce([{ count: '30' }])
				.mockResolvedValueOnce([createMockRow('agg-1')]);

			const result = await service.query({ tenantId: 'tenant-001', limit: 10, offset: 15 });

			expect(result.hasMore).toBe(true);
		});

		it('应该支持 aggregateType 过滤', async () => {
			mockConnection.execute
				.mockResolvedValueOnce([{ count: '1' }])
				.mockResolvedValueOnce([createMockRow('agg-1')]);

			await service.query({ tenantId: 'tenant-001', aggregateType: 'User' });

			const sql = mockConnection.execute.mock.calls[1][0];
			expect(sql).toContain('aggregate_type = ?');
		});

		it('应该支持 aggregateId 过滤', async () => {
			mockConnection.execute
				.mockResolvedValueOnce([{ count: '1' }])
				.mockResolvedValueOnce([createMockRow('agg-1')]);

			await service.query({ tenantId: 'tenant-001', aggregateId: 'user-001' });

			const sql = mockConnection.execute.mock.calls[1][0];
			expect(sql).toContain('aggregate_id = ?');
		});

		it('应该支持 category 过滤', async () => {
			mockConnection.execute
				.mockResolvedValueOnce([{ count: '1' }])
				.mockResolvedValueOnce([createMockRow('agg-1')]);

			await service.query({ tenantId: 'tenant-001', category: 'premium' });

			const sql = mockConnection.execute.mock.calls[1][0];
			expect(sql).toContain('category = ?');
		});

		it('默认应该排除已删除记录', async () => {
			mockConnection.execute.mockResolvedValueOnce([{ count: '0' }]).mockResolvedValueOnce([]);

			await service.query({ tenantId: 'tenant-001' });

			const sql = mockConnection.execute.mock.calls[0][0];
			expect(sql).toContain('is_deleted = false');
		});

		it('应该支持 includeDeleted=false', async () => {
			mockConnection.execute.mockResolvedValueOnce([{ count: '0' }]).mockResolvedValueOnce([]);

			await service.query({ tenantId: 'tenant-001', excludeDeleted: false });

			const sql = mockConnection.execute.mock.calls[0][0];
			expect(sql).not.toContain('is_deleted = false');
		});

		it('应该支持时间范围过滤', async () => {
			mockConnection.execute
				.mockResolvedValueOnce([{ count: '1' }])
				.mockResolvedValueOnce([createMockRow('agg-1')]);

			await service.query({
				tenantId: 'tenant-001',
				createdAtFrom: new Date('2024-01-01'),
				createdAtTo: new Date('2024-12-31')
			});

			const sql = mockConnection.execute.mock.calls[0][0];
			expect(sql).toContain('created_at >=');
			expect(sql).toContain('created_at <=');
		});

		it('应该支持标签过滤', async () => {
			mockConnection.execute
				.mockResolvedValueOnce([{ count: '1' }])
				.mockResolvedValueOnce([createMockRow('agg-1')]);

			await service.query({ tenantId: 'tenant-001', tags: ['tag1', 'tag2'] });

			const sql = mockConnection.execute.mock.calls[0][0];
			expect(sql).toContain('tags ?|');
		});

		it('应该使用默认分页参数', async () => {
			mockConnection.execute.mockResolvedValueOnce([{ count: '0' }]).mockResolvedValueOnce([]);

			await service.query({ tenantId: 'tenant-001' });

			const params = mockConnection.execute.mock.calls[1][1];
			expect(params[params.length - 2]).toBe(20);
			expect(params[params.length - 1]).toBe(0);
		});

		it('应该使用自定义分页参数', async () => {
			mockConnection.execute.mockResolvedValueOnce([{ count: '0' }]).mockResolvedValueOnce([]);

			await service.query({ tenantId: 'tenant-001', limit: 50, offset: 100 });

			const params = mockConnection.execute.mock.calls[1][1];
			expect(params[params.length - 2]).toBe(50);
			expect(params[params.length - 1]).toBe(100);
		});
	});

	describe('getById', () => {
		it('应该返回单个元数据记录', async () => {
			mockConnection.execute.mockResolvedValueOnce([createMockRow('agg-001')]);

			const result = await service.getById('tenant-001', 'User', 'agg-001');

			expect(result).not.toBeNull();
			expect(result?.aggregateId).toBe('agg-001');
		});

		it('当记录不存在时应该返回 null', async () => {
			mockConnection.execute.mockResolvedValueOnce([]);

			const result = await service.getById('tenant-001', 'User', 'non-existent');

			expect(result).toBeNull();
		});

		it('应该使用正确的查询参数', async () => {
			mockConnection.execute.mockResolvedValueOnce([]);

			await service.getById('tenant-001', 'User', 'agg-001');

			const params = mockConnection.execute.mock.calls[0][1];
			expect(params).toEqual(['tenant-001', 'User', 'agg-001']);
		});
	});

	describe('getAggregateTypes', () => {
		it('应该返回聚合类型列表', async () => {
			mockConnection.execute.mockResolvedValueOnce([
				{ aggregate_type: 'User' },
				{ aggregate_type: 'Order' },
				{ aggregate_type: 'Product' }
			]);

			const result = await service.getAggregateTypes('tenant-001');

			expect(result).toEqual(['User', 'Order', 'Product']);
		});

		it('应该返回空数组当没有记录时', async () => {
			mockConnection.execute.mockResolvedValueOnce([]);

			const result = await service.getAggregateTypes('tenant-001');

			expect(result).toEqual([]);
		});
	});

	describe('getCategories', () => {
		it('应该返回分类列表', async () => {
			mockConnection.execute.mockResolvedValueOnce([{ category: 'premium' }, { category: 'standard' }]);

			const result = await service.getCategories('tenant-001');

			expect(result).toEqual(['premium', 'standard']);
		});

		it('应该支持按聚合类型过滤', async () => {
			mockConnection.execute.mockResolvedValueOnce([{ category: 'premium' }]);

			await service.getCategories('tenant-001', 'User');

			const sql = mockConnection.execute.mock.calls[0][0];
			expect(sql).toContain('aggregate_type = ?');
		});

		it('应该排除 null 分类', async () => {
			mockConnection.execute.mockResolvedValueOnce([{ category: 'premium' }, { category: null }]);

			const result = await service.getCategories('tenant-001');

			expect(result).toContain('premium');
		});
	});

	describe('getTags', () => {
		it('应该返回标签列表', async () => {
			mockConnection.execute.mockResolvedValueOnce([{ tag: 'important' }, { tag: 'reviewed' }]);

			const result = await service.getTags('tenant-001');

			expect(result).toEqual(['important', 'reviewed']);
		});

		it('应该支持按聚合类型过滤', async () => {
			mockConnection.execute.mockResolvedValueOnce([{ tag: 'tag1' }]);

			await service.getTags('tenant-001', 'User');

			const sql = mockConnection.execute.mock.calls[0][0];
			expect(sql).toContain('aggregate_type = ?');
		});

		it('应该过滤掉空标签', async () => {
			mockConnection.execute.mockResolvedValueOnce([{ tag: 'valid' }, { tag: null }, { tag: '' }]);

			const result = await service.getTags('tenant-001');

			expect(result).toEqual(['valid']);
		});
	});

	describe('mapRowToMetadata', () => {
		it('应该正确映射基础字段', async () => {
			const row = createMockRow('agg-001');
			mockConnection.execute.mockResolvedValueOnce([row]);

			const result = await service.getById('t1', 'User', 'agg-001');

			expect(result?.aggregateType).toBe('User');
			expect(result?.aggregateId).toBe('agg-001');
			expect(result?.tenantId).toBe('tenant-001');
			expect(result?.isDeleted).toBe(false);
		});

		it('应该映射可分析扩展', async () => {
			const row = {
				...createMockRow('agg-001'),
				tags: ['tag1'],
				category: 'premium',
				quality_score: 85,
				include_in_analytics: true
			};
			mockConnection.execute.mockResolvedValueOnce([row]);

			const result = await service.getById('t1', 'User', 'agg-001');

			expect(result?.analyzable).toBeDefined();
			expect(result?.analyzable?.tags).toEqual(['tag1']);
			expect(result?.analyzable?.category).toBe('premium');
			expect(result?.analyzable?.qualityScore).toBe(85);
		});

		it('应该映射 AI 能力扩展', async () => {
			const row = {
				...createMockRow('agg-001'),
				embedding_status: 'COMPLETED',
				embedding_version: 'v1',
				embedding_id: 'emb-001'
			};
			mockConnection.execute.mockResolvedValueOnce([row]);

			const result = await service.getById('t1', 'User', 'agg-001');

			expect(result?.aiEnabled).toBeDefined();
			expect(result?.aiEnabled?.embeddingStatus).toBe('COMPLETED');
			expect(result?.aiEnabled?.needsReembedding).toBe(false);
		});

		it('应该映射可同步扩展', async () => {
			const row = {
				...createMockRow('agg-001'),
				sync_status: 'SYNCED',
				external_ids: { external: 'ext-001' },
				sync_version: 2
			};
			mockConnection.execute.mockResolvedValueOnce([row]);

			const result = await service.getById('t1', 'User', 'agg-001');

			expect(result?.syncable).toBeDefined();
			expect(result?.syncable?.syncStatus).toBe('SYNCED');
			expect(result?.syncable?.needsSync).toBe(false);
		});
	});
});

function createMockRow(aggregateId: string): any {
	return {
		aggregate_type: 'User',
		aggregate_id: aggregateId,
		tenant_id: 'tenant-001',
		created_at: new Date('2024-01-01'),
		updated_at: new Date('2024-01-02'),
		created_by: 'creator-001',
		updated_by: 'updater-001',
		deleted_at: null,
		deleted_by: null,
		is_deleted: false,
		tags: null,
		category: null,
		analytics_dimensions: null,
		quality_score: null,
		include_in_analytics: true,
		embedding_status: null,
		embedding_version: null,
		embedding_id: null,
		ai_metadata: null,
		external_ids: null,
		data_source: null,
		sync_status: null,
		last_synced_at: null,
		sync_version: 1,
		etl_metadata: null
	};
}
