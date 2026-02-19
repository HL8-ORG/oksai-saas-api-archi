import { TenantCreatedEvent } from './tenant-created.event';

describe('TenantCreatedEvent 领域事件', () => {
	describe('构造函数', () => {
		it('应该使用 aggregateId 和 payload 创建事件', () => {
			// Arrange
			const aggregateId = 't-001';
			const payload = { name: '测试租户' };

			// Act
			const event = new TenantCreatedEvent(aggregateId, payload);

			// Assert
			expect(event.aggregateId).toBe(aggregateId);
			expect(event.eventData.name).toBe('测试租户');
		});

		it('应该自动设置 eventType', () => {
			// Arrange & Act
			const event = new TenantCreatedEvent('t-001', { name: '测试租户' });

			// Assert
			expect(event.eventType).toBe('TenantCreated');
		});

		it('应该自动设置 occurredAt 为当前时间', () => {
			// Arrange
			const beforeCreate = new Date();

			// Act
			const event = new TenantCreatedEvent('t-001', { name: '测试租户' });

			// Assert
			const afterCreate = new Date();
			expect(event.occurredAt.getTime()).toBeGreaterThanOrEqual(beforeCreate.getTime());
			expect(event.occurredAt.getTime()).toBeLessThanOrEqual(afterCreate.getTime());
		});

		it('应该设置 schemaVersion 为 1', () => {
			// Arrange & Act
			const event = new TenantCreatedEvent('t-001', { name: '测试租户' });

			// Assert
			expect(event.schemaVersion).toBe(1);
		});
	});

	describe('事件属性', () => {
		it('eventData 应该包含 name 属性', () => {
			// Arrange & Act
			const event = new TenantCreatedEvent('t-001', { name: '测试租户' });

			// Assert
			expect(event.eventData).toEqual({ name: '测试租户' });
		});

		it('应该支持中文名称', () => {
			// Arrange & Act
			const event = new TenantCreatedEvent('t-001', { name: '奥赛科技' });

			// Assert
			expect(event.eventData.name).toBe('奥赛科技');
		});
	});

	describe('DomainEvent 接口实现', () => {
		it('应该实现 DomainEvent 接口的所有必需属性', () => {
			// Arrange & Act
			const event = new TenantCreatedEvent('t-001', { name: '测试租户' });

			// Assert
			expect(event.eventType).toBeDefined();
			expect(event.occurredAt).toBeDefined();
			expect(event.aggregateId).toBeDefined();
			expect(event.eventData).toBeDefined();
			expect(event.schemaVersion).toBeDefined();
		});

		it('occurredAt 应该是 Date 类型', () => {
			// Arrange & Act
			const event = new TenantCreatedEvent('t-001', { name: '测试租户' });

			// Assert
			expect(event.occurredAt).toBeInstanceOf(Date);
		});

		it('metadata.correlationId 应该自动生成 UUID', () => {
			// Arrange & Act
			const event = new TenantCreatedEvent('t-001', { name: '测试租户' });

			// Assert
			expect(event.metadata.correlationId).toMatch(
				/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
			);
		});
	});

	describe('fromLegacy 静态方法', () => {
		it('应该从旧的参数格式创建事件', () => {
			// Arrange & Act
			const event = TenantCreatedEvent.fromLegacy('t-001', '测试租户');

			// Assert
			expect(event.aggregateId).toBe('t-001');
			expect(event.eventData.name).toBe('测试租户');
		});
	});
});
