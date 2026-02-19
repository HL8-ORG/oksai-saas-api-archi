import { PgEventStoreEnhanced, ConcurrencyError } from './pg-event-store-enhanced';
import type { MikroORM } from '@mikro-orm/core';
import type { DatabaseTransactionHost } from '@oksai/database';
import type { StoredEvent, EventFilter, EventLoadOptions } from '../event-store.interface';
import type { AggregateSnapshot } from '../projections/interfaces/snapshot.interface';

/**
 * @description 创建模拟的数据库连接
 */
function createMockConnection() {
	const executeMock = jest.fn();
	return {
		execute: executeMock
	};
}

/**
 * @description 创建模拟的 EntityManager
 */
function createMockEntityManager(connection: ReturnType<typeof createMockConnection>) {
	return {
		getConnection: () => connection
	};
}

/**
 * @description 创建模拟的 ORM
 */
function createMockOrm(em: ReturnType<typeof createMockEntityManager>) {
	return { em } as unknown as MikroORM;
}

/**
 * @description 创建模拟的事务宿主
 */
function createMockTxHost() {
	return {
		getCurrentEntityManager: jest.fn(() => null)
	} as unknown as DatabaseTransactionHost;
}

describe('PgEventStoreEnhanced', () => {
	let eventStore: PgEventStoreEnhanced;
	let mockConnection: ReturnType<typeof createMockConnection>;
	let mockOrm: MikroORM;
	let mockTxHost: DatabaseTransactionHost;

	beforeEach(() => {
		mockConnection = createMockConnection();
		const mockEm = createMockEntityManager(mockConnection);
		mockOrm = createMockOrm(mockEm);
		mockTxHost = createMockTxHost();
		eventStore = new PgEventStoreEnhanced(mockOrm, mockTxHost);
	});

	describe('appendToStream', () => {
		it('当 expectedVersion 匹配时应成功追加事件', async () => {
			mockConnection.execute.mockResolvedValueOnce([{ v: 0 }]).mockResolvedValueOnce(undefined);

			const result = await eventStore.appendToStream({
				tenantId: 'tenant-1',
				aggregateType: 'Tenant',
				aggregateId: 'agg-1',
				expectedVersion: 0,
				events: [
					{
						eventType: 'TenantCreated',
						occurredAt: new Date(),
						aggregateId: 'agg-1',
						eventData: { name: '测试租户' }
					}
				]
			});

			expect(result.newVersion).toBe(1);
		});

		it('当 expectedVersion 不匹配时应抛出 ConcurrencyError', async () => {
			mockConnection.execute.mockResolvedValueOnce([{ v: 5 }]);

			await expect(
				eventStore.appendToStream({
					tenantId: 'tenant-1',
					aggregateType: 'Tenant',
					aggregateId: 'agg-1',
					expectedVersion: 0,
					events: []
				})
			).rejects.toThrow(ConcurrencyError);
		});
	});

	describe('loadStream', () => {
		it('应正确加载事件流', async () => {
			const mockRows = [
				{
					id: 'event-1',
					tenant_id: 'tenant-1',
					aggregate_type: 'Tenant',
					aggregate_id: 'agg-1',
					version: 1,
					event_type: 'TenantCreated',
					occurred_at: new Date(),
					schema_version: 1,
					event_data: { name: '测试租户' },
					user_id: null,
					request_id: null
				}
			];

			mockConnection.execute.mockResolvedValueOnce(mockRows).mockResolvedValueOnce([{ v: 1 }]);

			const result = await eventStore.loadStream({
				tenantId: 'tenant-1',
				aggregateType: 'Tenant',
				aggregateId: 'agg-1'
			});

			expect(result.currentVersion).toBe(1);
			expect(result.events).toHaveLength(1);
			expect(result.events[0].eventType).toBe('TenantCreated');
		});

		it('当 fromVersion 指定时应只返回后续事件', async () => {
			mockConnection.execute.mockResolvedValueOnce([]).mockResolvedValueOnce([{ v: 5 }]);

			await eventStore.loadStream({
				tenantId: 'tenant-1',
				aggregateType: 'Tenant',
				aggregateId: 'agg-1',
				fromVersion: 3
			});

			expect(mockConnection.execute).toHaveBeenCalledTimes(2);
		});
	});

	describe('loadAllEvents', () => {
		it('应正确加载所有事件', async () => {
			const mockRows = [
				{
					id: 'event-1',
					tenant_id: 'tenant-1',
					aggregate_type: 'Tenant',
					aggregate_id: 'agg-1',
					version: 1,
					event_type: 'TenantCreated',
					occurred_at: new Date('2024-01-01'),
					schema_version: 1,
					event_data: { name: '测试租户' },
					user_id: null,
					request_id: null
				},
				{
					id: 'event-2',
					tenant_id: 'tenant-1',
					aggregate_type: 'Tenant',
					aggregate_id: 'agg-1',
					version: 2,
					event_type: 'TenantActivated',
					occurred_at: new Date('2024-01-02'),
					schema_version: 1,
					event_data: {},
					user_id: null,
					request_id: null
				}
			];

			mockConnection.execute.mockResolvedValueOnce(mockRows);

			const events = await eventStore.loadAllEvents();

			expect(events).toHaveLength(2);
			expect(events[0].eventType).toBe('TenantCreated');
		});

		it('应正确应用过滤器', async () => {
			mockConnection.execute.mockResolvedValueOnce([]);

			const filter: EventFilter = {
				tenantId: 'tenant-1',
				aggregateType: 'Tenant',
				eventTypes: ['TenantCreated', 'TenantActivated'],
				from: new Date('2024-01-01'),
				to: new Date('2024-12-31')
			};

			await eventStore.loadAllEvents(filter);

			expect(mockConnection.execute).toHaveBeenCalledWith(
				expect.stringContaining('tenant_id = ?'),
				expect.arrayContaining(['tenant-1', 'Tenant', 'TenantCreated', 'TenantActivated'])
			);
		});

		it('应正确应用分页选项', async () => {
			mockConnection.execute.mockResolvedValueOnce([]);

			const options: EventLoadOptions = {
				limit: 10,
				offset: 20,
				ascending: false
			};

			await eventStore.loadAllEvents(undefined, options);

			expect(mockConnection.execute).toHaveBeenCalledWith(
				expect.stringContaining('limit ?'),
				expect.arrayContaining([10, 20])
			);
		});
	});

	describe('streamAllEvents', () => {
		it('应以流式方式返回事件', async () => {
			const batch1 = [
				{
					id: 'event-1',
					tenant_id: 'tenant-1',
					aggregate_type: 'Tenant',
					aggregate_id: 'agg-1',
					version: 1,
					event_type: 'TenantCreated',
					occurred_at: new Date(),
					schema_version: 1,
					event_data: {},
					user_id: null,
					request_id: null
				}
			];

			mockConnection.execute.mockResolvedValueOnce(batch1).mockResolvedValueOnce([]);

			const events: StoredEvent[] = [];
			for await (const event of eventStore.streamAllEvents({ batchSize: 1 })) {
				events.push(event);
			}

			expect(events).toHaveLength(1);
		});

		it('应正确处理 limit 限制', async () => {
			const createBatch = (count: number) =>
				Array(count)
					.fill(null)
					.map((_, i) => ({
						id: `event-${i}`,
						tenant_id: 'tenant-1',
						aggregate_type: 'Tenant',
						aggregate_id: 'agg-1',
						version: i + 1,
						event_type: 'TestEvent',
						occurred_at: new Date(),
						schema_version: 1,
						event_data: {},
						user_id: null,
						request_id: null
					}));

			// 第一次返回 5 个事件（受 limit 限制），第二次返回空
			mockConnection.execute.mockImplementation(async (sql: string, params: unknown[]) => {
				// 检查 limit 参数
				const limitIndex = sql.indexOf('limit ?');
				if (limitIndex !== -1 && params) {
					const limit = params[params.length - 1] as number;
					return createBatch(Math.min(limit, 10));
				}
				return createBatch(10);
			});

			const events: StoredEvent[] = [];
			for await (const event of eventStore.streamAllEvents(undefined, { limit: 5 })) {
				events.push(event);
			}

			expect(events).toHaveLength(5);
		});
	});

	describe('saveSnapshot', () => {
		it('应成功保存快照', async () => {
			mockConnection.execute.mockResolvedValueOnce(undefined);

			const snapshot: AggregateSnapshot = {
				id: 'snapshot-1',
				tenantId: 'tenant-1',
				aggregateType: 'Tenant',
				aggregateId: 'agg-1',
				version: 10,
				state: { name: '测试租户', status: 'ACTIVE' },
				createdAt: new Date()
			};

			await eventStore.saveSnapshot(snapshot);

			expect(mockConnection.execute).toHaveBeenCalledWith(
				expect.stringContaining('insert into event_store_snapshots'),
				expect.arrayContaining(['snapshot-1', 'tenant-1', 'Tenant', 'agg-1', 10])
			);
		});
	});

	describe('loadLatestSnapshot', () => {
		it('应返回最新快照', async () => {
			const mockRow = {
				id: 'snapshot-1',
				tenant_id: 'tenant-1',
				aggregate_type: 'Tenant',
				aggregate_id: 'agg-1',
				version: 10,
				state: JSON.stringify({ name: '测试租户' }),
				metadata: {},
				created_at: new Date()
			};

			mockConnection.execute.mockResolvedValueOnce([mockRow]);

			const snapshot = await eventStore.loadLatestSnapshot('tenant-1', 'Tenant', 'agg-1');

			expect(snapshot).not.toBeNull();
			expect(snapshot?.version).toBe(10);
			expect(snapshot?.state).toEqual({ name: '测试租户' });
		});

		it('当快照不存在时应返回 null', async () => {
			mockConnection.execute.mockResolvedValueOnce([]);

			const snapshot = await eventStore.loadLatestSnapshot('tenant-1', 'Tenant', 'agg-1');

			expect(snapshot).toBeNull();
		});
	});

	describe('loadSnapshotAtVersion', () => {
		it('应返回指定版本或之前的最新快照', async () => {
			const mockRow = {
				id: 'snapshot-1',
				tenant_id: 'tenant-1',
				aggregate_type: 'Tenant',
				aggregate_id: 'agg-1',
				version: 5,
				state: JSON.stringify({ name: '测试租户' }),
				metadata: {},
				created_at: new Date()
			};

			mockConnection.execute.mockResolvedValueOnce([mockRow]);

			const snapshot = await eventStore.loadSnapshotAtVersion('tenant-1', 'Tenant', 'agg-1', 10);

			expect(snapshot?.version).toBe(5);
		});
	});

	describe('deleteSnapshots', () => {
		it('应删除指定聚合的所有快照', async () => {
			mockConnection.execute.mockResolvedValueOnce(undefined);

			await eventStore.deleteSnapshots('tenant-1', 'Tenant', 'agg-1');

			expect(mockConnection.execute).toHaveBeenCalledWith(
				expect.stringContaining('delete from event_store_snapshots'),
				['tenant-1', 'Tenant', 'agg-1']
			);
		});
	});
});

describe('ConcurrencyError', () => {
	it('应包含完整的错误信息', () => {
		const error = new ConcurrencyError('tenant-1', 'Tenant', 'agg-1', 0, 5);

		expect(error.name).toBe('ConcurrencyError');
		expect(error.tenantId).toBe('tenant-1');
		expect(error.aggregateType).toBe('Tenant');
		expect(error.aggregateId).toBe('agg-1');
		expect(error.expectedVersion).toBe(0);
		expect(error.currentVersion).toBe(5);
		expect(error.message).toContain('expectedVersion=0');
		expect(error.message).toContain('currentVersion=5');
	});
});
