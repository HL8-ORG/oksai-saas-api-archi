import { TenantAnalyticsProjection } from './tenant-analytics.projection';
import type { ITenantAnalyticsRepository, TenantAnalyticsReadModel } from '../read-model/tenant-analytics.read-model';
import type { StoredEvent, IEventStore } from '@oksai/event-store';

/**
 * @description 创建模拟事件
 */
function createMockEvent(overrides: Partial<StoredEvent> = {}): StoredEvent {
	return {
		tenantId: 'tenant-1',
		aggregateType: 'Tenant',
		aggregateId: 'tenant-1',
		version: 1,
		eventType: 'TenantCreated',
		occurredAt: new Date('2024-01-01T10:00:00Z'),
		schemaVersion: 1,
		eventData: {},
		...overrides
	};
}

/**
 * @description 创建模拟分析仓库
 */
function createMockAnalyticsRepo(): jest.Mocked<ITenantAnalyticsRepository> {
	return {
		upsert: jest.fn(),
		findById: jest.fn(),
		findAll: jest.fn(),
		incrementMemberCount: jest.fn(),
		incrementDataImportCount: jest.fn(),
		incrementAnalysisCount: jest.fn(),
		updateStatus: jest.fn(),
		updateLastActiveAt: jest.fn(),
		clear: jest.fn()
	};
}

describe('TenantAnalyticsProjection', () => {
	let projection: TenantAnalyticsProjection;
	let mockRepo: jest.Mocked<ITenantAnalyticsRepository>;

	beforeEach(() => {
		mockRepo = createMockAnalyticsRepo();
		projection = new TenantAnalyticsProjection(mockRepo);
	});

	describe('metadata', () => {
		it('应正确定义投影名称', () => {
			expect(projection.name).toBe('TenantAnalyticsProjection');
		});

		it('应订阅正确的事件类型', () => {
			expect(projection.subscribedEvents).toEqual([
				'TenantCreated',
				'TenantActivated',
				'TenantSuspended',
				'MemberAdded',
				'MemberRemoved'
			]);
		});
	});

	describe('handleEvent', () => {
		describe('TenantCreated', () => {
			it('应创建新的租户分析记录', async () => {
				const event = createMockEvent({
					eventType: 'TenantCreated',
					eventData: { name: '测试租户' }
				});

				await projection.handle(event);

				expect(mockRepo.upsert).toHaveBeenCalledWith({
					tenantId: 'tenant-1',
					name: '测试租户',
					status: 'active',
					memberCount: 0,
					activeUserCount: 0,
					dataImportCount: 0,
					analysisCount: 0,
					createdAt: event.occurredAt,
					updatedAt: event.occurredAt,
					lastActiveAt: event.occurredAt
				});
			});

			it('应处理空的名称', async () => {
				const event = createMockEvent({
					eventType: 'TenantCreated',
					eventData: {}
				});

				await projection.handle(event);

				expect(mockRepo.upsert).toHaveBeenCalledWith(
					expect.objectContaining({
						name: ''
					})
				);
			});

			it('应修剪名称空格', async () => {
				const event = createMockEvent({
					eventType: 'TenantCreated',
					eventData: { name: '  测试租户  ' }
				});

				await projection.handle(event);

				expect(mockRepo.upsert).toHaveBeenCalledWith(
					expect.objectContaining({
						name: '测试租户'
					})
				);
			});
		});

		describe('TenantActivated', () => {
			it('应更新状态为 active', async () => {
				const event = createMockEvent({
					eventType: 'TenantActivated',
					eventData: {}
				});

				await projection.handle(event);

				expect(mockRepo.updateStatus).toHaveBeenCalledWith('tenant-1', 'active');
				expect(mockRepo.updateLastActiveAt).toHaveBeenCalledWith('tenant-1', event.occurredAt);
			});
		});

		describe('TenantSuspended', () => {
			it('应更新状态为 suspended', async () => {
				const event = createMockEvent({
					eventType: 'TenantSuspended',
					eventData: { reason: '测试暂停' }
				});

				await projection.handle(event);

				expect(mockRepo.updateStatus).toHaveBeenCalledWith('tenant-1', 'suspended');
			});
		});

		describe('MemberAdded', () => {
			it('应增加成员计数', async () => {
				const event = createMockEvent({
					eventType: 'MemberAdded',
					eventData: { userId: 'user-1', role: 'member' }
				});

				await projection.handle(event);

				expect(mockRepo.incrementMemberCount).toHaveBeenCalledWith('tenant-1', 1);
				expect(mockRepo.updateLastActiveAt).toHaveBeenCalledWith('tenant-1', event.occurredAt);
			});
		});

		describe('MemberRemoved', () => {
			it('应减少成员计数', async () => {
				const event = createMockEvent({
					eventType: 'MemberRemoved',
					eventData: { userId: 'user-1' }
				});

				await projection.handle(event);

				expect(mockRepo.incrementMemberCount).toHaveBeenCalledWith('tenant-1', -1);
			});
		});

		it('应忽略未订阅的事件类型', async () => {
			const event = createMockEvent({
				eventType: 'UnknownEvent'
			});

			// handle 内部会过滤，但这里测试直接调用
			// 实际上 handle 方法会先检查 subscribedEvents
			await projection.handle(event);

			// 由于 handle 内部会先检查 subscribedEvents，所以不会调用任何 repo 方法
			expect(mockRepo.upsert).not.toHaveBeenCalled();
		});
	});

	describe('getReadModels', () => {
		it('应返回所有租户分析读模型', async () => {
			const mockModels: TenantAnalyticsReadModel[] = [
				{
					tenantId: 'tenant-1',
					name: '租户1',
					status: 'active',
					memberCount: 10,
					activeUserCount: 5,
					dataImportCount: 100,
					analysisCount: 50,
					createdAt: new Date(),
					updatedAt: new Date()
				}
			];
			mockRepo.findAll.mockResolvedValue(mockModels);

			const result = await projection.getReadModels();

			expect(result).toEqual(mockModels);
		});
	});

	describe('clearReadModels', () => {
		it('应清空所有读模型', async () => {
			await projection['clearReadModels']();

			expect(mockRepo.clear).toHaveBeenCalled();
		});
	});
});
