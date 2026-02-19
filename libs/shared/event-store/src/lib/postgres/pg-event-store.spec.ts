import { PgEventStore } from './pg-event-store';
import type { MikroORM } from '@mikro-orm/core';
import type { DatabaseTransactionHost } from '@oksai/database';
import type { EventStoreDomainEvent } from '../event-store.interface';

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
 * @description 创建模拟的 MikroORM
 */
function createMockOrm(em: ReturnType<typeof createMockEntityManager>) {
	return {
		em
	} as unknown as MikroORM;
}

/**
 * @description 创建模拟的 DatabaseTransactionHost
 */
function createMockTxHost(em: ReturnType<typeof createMockEntityManager> | null) {
	return {
		getCurrentEntityManager: () => em
	} as unknown as DatabaseTransactionHost;
}

describe('PgEventStore', () => {
	let pgEventStore: PgEventStore;
	let mockConnection: ReturnType<typeof createMockConnection>;
	let mockEm: ReturnType<typeof createMockEntityManager>;
	let mockOrm: MikroORM;
	let mockTxHost: DatabaseTransactionHost;

	beforeEach(() => {
		mockConnection = createMockConnection();
		mockEm = createMockEntityManager(mockConnection);
		mockOrm = createMockOrm(mockEm);
		mockTxHost = createMockTxHost(mockEm);
		pgEventStore = new PgEventStore(mockOrm, mockTxHost);
	});

	describe('appendToStream', () => {
		it('应成功追加单个事件到空流', async () => {
			// Arrange
			mockConnection.execute
				.mockResolvedValueOnce([{ v: 0 }]) // 当前版本查询
				.mockResolvedValueOnce(undefined); // 插入操作

			const events: EventStoreDomainEvent[] = [
				{
					eventType: 'TestCreated',
					aggregateId: 'agg-1',
					eventData: { name: 'test' },
					occurredAt: new Date('2024-01-01T00:00:00Z'),
					schemaVersion: 1
				}
			];

			// Act
			const result = await pgEventStore.appendToStream({
				tenantId: 'tenant-1',
				aggregateType: 'TestAggregate',
				aggregateId: 'agg-1',
				expectedVersion: 0,
				events
			});

			// Assert
			expect(result.newVersion).toBe(1);
			expect(mockConnection.execute).toHaveBeenCalledTimes(2);
		});

		it('应成功追加多个事件', async () => {
			// Arrange
			mockConnection.execute
				.mockResolvedValueOnce([{ v: 2 }]) // 当前版本查询
				.mockResolvedValueOnce(undefined) // 插入 1
				.mockResolvedValueOnce(undefined); // 插入 2

			const events: EventStoreDomainEvent[] = [
				{
					eventType: 'TestUpdated',
					aggregateId: 'agg-1',
					eventData: { field: 'value1' },
					occurredAt: new Date(),
					schemaVersion: 1
				},
				{
					eventType: 'TestUpdated',
					aggregateId: 'agg-1',
					eventData: { field: 'value2' },
					occurredAt: new Date(),
					schemaVersion: 1
				}
			];

			// Act
			const result = await pgEventStore.appendToStream({
				tenantId: 'tenant-1',
				aggregateType: 'TestAggregate',
				aggregateId: 'agg-1',
				expectedVersion: 2,
				events
			});

			// Assert
			expect(result.newVersion).toBe(4);
			expect(mockConnection.execute).toHaveBeenCalledTimes(3);
		});

		it('应在版本冲突时抛出错误', async () => {
			// Arrange
			mockConnection.execute.mockResolvedValueOnce([{ v: 5 }]); // 当前版本是 5

			const events: EventStoreDomainEvent[] = [
				{
					eventType: 'TestCreated',
					aggregateId: 'agg-1',
					eventData: {},
					occurredAt: new Date(),
					schemaVersion: 1
				}
			];

			// Act & Assert
			await expect(
				pgEventStore.appendToStream({
					tenantId: 'tenant-1',
					aggregateType: 'TestAggregate',
					aggregateId: 'agg-1',
					expectedVersion: 3, // 期望版本是 3，但实际是 5
					events
				})
			).rejects.toThrow('事件写入并发冲突');
		});

		it('应正确传递 userId 和 requestId', async () => {
			// Arrange
			mockConnection.execute.mockResolvedValueOnce([{ v: 0 }]).mockResolvedValueOnce(undefined);

			const events: EventStoreDomainEvent[] = [
				{
					eventType: 'TestCreated',
					aggregateId: 'agg-1',
					eventData: {},
					occurredAt: new Date(),
					schemaVersion: 1
				}
			];

			// Act
			await pgEventStore.appendToStream({
				tenantId: 'tenant-1',
				aggregateType: 'TestAggregate',
				aggregateId: 'agg-1',
				expectedVersion: 0,
				events,
				userId: 'user-123',
				requestId: 'req-456'
			});

			// Assert
			const insertCall = mockConnection.execute.mock.calls[1];
			expect(insertCall[1]).toContain('user-123');
			expect(insertCall[1]).toContain('req-456');
		});

		it('应使用默认 schemaVersion 当未提供时', async () => {
			// Arrange
			mockConnection.execute.mockResolvedValueOnce([{ v: 0 }]).mockResolvedValueOnce(undefined);

			const events: EventStoreDomainEvent[] = [
				{
					eventType: 'TestCreated',
					aggregateId: 'agg-1',
					eventData: {},
					occurredAt: new Date()
					// schemaVersion 未提供
				}
			];

			// Act
			await pgEventStore.appendToStream({
				tenantId: 'tenant-1',
				aggregateType: 'TestAggregate',
				aggregateId: 'agg-1',
				expectedVersion: 0,
				events
			});

			// Assert
			const insertCall = mockConnection.execute.mock.calls[1];
			const schemaVersionIndex = insertCall[1].length - 5; // schemaVersion 位置
			expect(insertCall[1][schemaVersionIndex]).toBe(1);
		});
	});

	describe('loadStream', () => {
		it('应成功加载空事件流', async () => {
			// Arrange
			mockConnection.execute
				.mockResolvedValueOnce([]) // 查询事件
				.mockResolvedValueOnce([{ v: 0 }]); // 查询最大版本

			// Act
			const result = await pgEventStore.loadStream({
				tenantId: 'tenant-1',
				aggregateType: 'TestAggregate',
				aggregateId: 'agg-1'
			});

			// Assert
			expect(result.currentVersion).toBe(0);
			expect(result.events).toHaveLength(0);
		});

		it('应成功加载事件流并正确映射字段', async () => {
			// Arrange
			const mockRows = [
				{
					tenant_id: 'tenant-1',
					aggregate_type: 'TestAggregate',
					aggregate_id: 'agg-1',
					version: 1,
					event_type: 'TestCreated',
					occurred_at: new Date('2024-01-01T00:00:00Z'),
					schema_version: 1,
					event_data: { name: 'test' },
					user_id: 'user-123',
					request_id: 'req-456'
				},
				{
					tenant_id: 'tenant-1',
					aggregate_type: 'TestAggregate',
					aggregate_id: 'agg-1',
					version: 2,
					event_type: 'TestUpdated',
					occurred_at: new Date('2024-01-02T00:00:00Z'),
					schema_version: 1,
					event_data: { name: 'updated' },
					user_id: null,
					request_id: null
				}
			];

			mockConnection.execute.mockResolvedValueOnce(mockRows).mockResolvedValueOnce([{ v: 2 }]);

			// Act
			const result = await pgEventStore.loadStream({
				tenantId: 'tenant-1',
				aggregateType: 'TestAggregate',
				aggregateId: 'agg-1'
			});

			// Assert
			expect(result.currentVersion).toBe(2);
			expect(result.events).toHaveLength(2);
			expect(result.events[0]).toEqual({
				tenantId: 'tenant-1',
				aggregateType: 'TestAggregate',
				aggregateId: 'agg-1',
				version: 1,
				eventType: 'TestCreated',
				occurredAt: new Date('2024-01-01T00:00:00Z'),
				schemaVersion: 1,
				eventData: { name: 'test' },
				userId: 'user-123',
				requestId: 'req-456'
			});
			expect(result.events[1].userId).toBeUndefined();
			expect(result.events[1].requestId).toBeUndefined();
		});

		it('应支持从指定版本开始加载', async () => {
			// Arrange
			mockConnection.execute
				.mockResolvedValueOnce([]) // 查询事件
				.mockResolvedValueOnce([{ v: 5 }]); // 查询最大版本

			// Act
			await pgEventStore.loadStream({
				tenantId: 'tenant-1',
				aggregateType: 'TestAggregate',
				aggregateId: 'agg-1',
				fromVersion: 3
			});

			// Assert
			const queryCall = mockConnection.execute.mock.calls[0];
			expect(queryCall[1]).toContain(3); // fromVersion 应作为查询参数
		});

		it('应使用事务 EntityManager 当可用时', async () => {
			// Arrange
			const txConnection = createMockConnection();
			const txEm = createMockEntityManager(txConnection);
			mockTxHost = createMockTxHost(txEm);
			pgEventStore = new PgEventStore(mockOrm, mockTxHost);

			txConnection.execute.mockResolvedValueOnce([]).mockResolvedValueOnce([{ v: 0 }]);

			// Act
			await pgEventStore.loadStream({
				tenantId: 'tenant-1',
				aggregateType: 'TestAggregate',
				aggregateId: 'agg-1'
			});

			// Assert - 应使用事务连接而非 ORM 连接
			expect(txConnection.execute).toHaveBeenCalled();
			expect(mockConnection.execute).not.toHaveBeenCalled();
		});

		it('应回退到 ORM EntityManager 当事务不可用时', async () => {
			// Arrange
			mockTxHost = createMockTxHost(null);
			pgEventStore = new PgEventStore(mockOrm, mockTxHost);

			mockConnection.execute.mockResolvedValueOnce([]).mockResolvedValueOnce([{ v: 0 }]);

			// Act
			await pgEventStore.loadStream({
				tenantId: 'tenant-1',
				aggregateType: 'TestAggregate',
				aggregateId: 'agg-1'
			});

			// Assert - 应使用 ORM 连接
			expect(mockConnection.execute).toHaveBeenCalled();
		});
	});
});
