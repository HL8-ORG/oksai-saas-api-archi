import { EventStoreEventEntity } from './event-store-event.entity';

describe('EventStoreEventEntity', () => {
	describe('实体创建', () => {
		it('应自动生成 UUID 作为主键', () => {
			// Arrange & Act
			const entity = new EventStoreEventEntity();

			// Assert
			expect(entity.id).toBeDefined();
			expect(entity.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
		});

		it('每次创建的实体应有不同的 ID', () => {
			// Arrange & Act
			const entity1 = new EventStoreEventEntity();
			const entity2 = new EventStoreEventEntity();

			// Assert
			expect(entity1.id).not.toBe(entity2.id);
		});

		it('应自动设置 createdAt 为当前时间', () => {
			// Arrange
			const beforeCreate = new Date();

			// Act
			const entity = new EventStoreEventEntity();

			// Assert
			const afterCreate = new Date();
			expect(entity.createdAt.getTime()).toBeGreaterThanOrEqual(beforeCreate.getTime());
			expect(entity.createdAt.getTime()).toBeLessThanOrEqual(afterCreate.getTime());
		});
	});

	describe('必填属性', () => {
		it('应正确设置 tenantId', () => {
			// Arrange & Act
			const entity = new EventStoreEventEntity();
			entity.tenantId = 'tenant-123';

			// Assert
			expect(entity.tenantId).toBe('tenant-123');
		});

		it('应正确设置 aggregateType', () => {
			// Arrange & Act
			const entity = new EventStoreEventEntity();
			entity.aggregateType = 'UserAggregate';

			// Assert
			expect(entity.aggregateType).toBe('UserAggregate');
		});

		it('应正确设置 aggregateId', () => {
			// Arrange & Act
			const entity = new EventStoreEventEntity();
			entity.aggregateId = 'agg-456';

			// Assert
			expect(entity.aggregateId).toBe('agg-456');
		});

		it('应正确设置 version', () => {
			// Arrange & Act
			const entity = new EventStoreEventEntity();
			entity.version = 5;

			// Assert
			expect(entity.version).toBe(5);
		});

		it('应正确设置 eventType', () => {
			// Arrange & Act
			const entity = new EventStoreEventEntity();
			entity.eventType = 'UserCreated';

			// Assert
			expect(entity.eventType).toBe('UserCreated');
		});

		it('应正确设置 occurredAt', () => {
			// Arrange
			const occurredAt = new Date('2024-01-15T10:30:00Z');

			// Act
			const entity = new EventStoreEventEntity();
			entity.occurredAt = occurredAt;

			// Assert
			expect(entity.occurredAt).toEqual(occurredAt);
		});

		it('应正确设置 schemaVersion', () => {
			// Arrange & Act
			const entity = new EventStoreEventEntity();
			entity.schemaVersion = 2;

			// Assert
			expect(entity.schemaVersion).toBe(2);
		});

		it('应正确设置 eventData', () => {
			// Arrange
			const eventData = { name: 'John', email: 'john@example.com' };

			// Act
			const entity = new EventStoreEventEntity();
			entity.eventData = eventData;

			// Assert
			expect(entity.eventData).toEqual(eventData);
		});
	});

	describe('可选属性', () => {
		it('userId 应为可选', () => {
			// Arrange & Act
			const entity = new EventStoreEventEntity();
			entity.tenantId = 'tenant-1';
			entity.aggregateType = 'TestAggregate';
			entity.aggregateId = 'agg-1';
			entity.version = 1;
			entity.eventType = 'TestEvent';
			entity.occurredAt = new Date();
			entity.schemaVersion = 1;
			entity.eventData = {};

			// Assert
			expect(entity.userId).toBeUndefined();
		});

		it('应正确设置 userId', () => {
			// Arrange & Act
			const entity = new EventStoreEventEntity();
			entity.userId = 'user-789';

			// Assert
			expect(entity.userId).toBe('user-789');
		});

		it('requestId 应为可选', () => {
			// Arrange & Act
			const entity = new EventStoreEventEntity();
			entity.tenantId = 'tenant-1';
			entity.aggregateType = 'TestAggregate';
			entity.aggregateId = 'agg-1';
			entity.version = 1;
			entity.eventType = 'TestEvent';
			entity.occurredAt = new Date();
			entity.schemaVersion = 1;
			entity.eventData = {};

			// Assert
			expect(entity.requestId).toBeUndefined();
		});

		it('应正确设置 requestId', () => {
			// Arrange & Act
			const entity = new EventStoreEventEntity();
			entity.requestId = 'req-abc123';

			// Assert
			expect(entity.requestId).toBe('req-abc123');
		});
	});

	describe('完整实体构建', () => {
		it('应正确构建完整的实体', () => {
			// Arrange
			const now = new Date();
			const eventData = { action: 'login', ip: '192.168.1.1' };

			// Act
			const entity = new EventStoreEventEntity();
			entity.tenantId = 'tenant-1';
			entity.aggregateType = 'UserSession';
			entity.aggregateId = 'session-123';
			entity.version = 1;
			entity.eventType = 'SessionStarted';
			entity.occurredAt = now;
			entity.schemaVersion = 1;
			entity.eventData = eventData;
			entity.userId = 'user-456';
			entity.requestId = 'req-789';

			// Assert
			expect(entity.id).toBeDefined();
			expect(entity.tenantId).toBe('tenant-1');
			expect(entity.aggregateType).toBe('UserSession');
			expect(entity.aggregateId).toBe('session-123');
			expect(entity.version).toBe(1);
			expect(entity.eventType).toBe('SessionStarted');
			expect(entity.occurredAt).toBe(now);
			expect(entity.schemaVersion).toBe(1);
			expect(entity.eventData).toEqual(eventData);
			expect(entity.userId).toBe('user-456');
			expect(entity.requestId).toBe('req-789');
			expect(entity.createdAt).toBeInstanceOf(Date);
		});
	});

	describe('eventData 类型', () => {
		it('应支持复杂嵌套对象', () => {
			// Arrange
			const complexData = {
				user: {
					name: 'John',
					roles: ['admin', 'user']
				},
				metadata: {
					source: 'web',
					version: 1.0
				},
				tags: ['important', 'verified']
			};

			// Act
			const entity = new EventStoreEventEntity();
			entity.eventData = complexData;

			// Assert
			expect(entity.eventData).toEqual(complexData);
		});

		it('应支持空对象', () => {
			// Arrange & Act
			const entity = new EventStoreEventEntity();
			entity.eventData = {};

			// Assert
			expect(entity.eventData).toEqual({});
		});

		it('应支持数组数据', () => {
			// Arrange
			const arrayData = ['item1', 'item2', 'item3'];

			// Act
			const entity = new EventStoreEventEntity();
			entity.eventData = arrayData;

			// Assert
			expect(entity.eventData).toEqual(arrayData);
		});
	});
});
