import { UserRegisteredEvent, type UserRegisteredEventData } from './user-registered.event';
import type { DomainEvent } from './domain-event';

describe('UserRegisteredEvent', () => {
	describe('创建', () => {
		it('应成功创建事件', () => {
			const aggregateId = 'user-123';
			const eventData: UserRegisteredEventData = {
				email: 'user@example.com'
			};

			const event = new UserRegisteredEvent(aggregateId, eventData);

			expect(event.aggregateId).toBe(aggregateId);
			expect(event.eventData).toEqual(eventData);
		});

		it('应设置正确的事件类型', () => {
			const event = new UserRegisteredEvent('user-123', { email: 'user@example.com' });

			expect(event.eventType).toBe('UserRegistered');
		});

		it('应设置正确的 schema 版本', () => {
			const event = new UserRegisteredEvent('user-123', { email: 'user@example.com' });

			expect(event.schemaVersion).toBe(1);
		});

		it('应设置发生时间', () => {
			const beforeCreate = new Date();
			const event = new UserRegisteredEvent('user-123', { email: 'user@example.com' });
			const afterCreate = new Date();

			expect(event.occurredAt).toBeInstanceOf(Date);
			expect(event.occurredAt.getTime()).toBeGreaterThanOrEqual(beforeCreate.getTime());
			expect(event.occurredAt.getTime()).toBeLessThanOrEqual(afterCreate.getTime());
		});
	});

	describe('事件数据', () => {
		it('应包含邮箱信息', () => {
			const event = new UserRegisteredEvent('user-123', {
				email: 'user@example.com'
			});

			expect(event.eventData.email).toBe('user@example.com');
		});

		it('应支持不同的邮箱格式', () => {
			const event = new UserRegisteredEvent('user-123', {
				email: 'USER@EXAMPLE.COM'
			});

			expect(event.eventData.email).toBe('USER@EXAMPLE.COM');
		});
	});

	describe('接口实现', () => {
		it('应实现 DomainEvent 接口', () => {
			const event = new UserRegisteredEvent('user-123', { email: 'user@example.com' });

			const domainEvent: DomainEvent<UserRegisteredEventData> = event;

			expect(domainEvent.eventType).toBeDefined();
			expect(domainEvent.occurredAt).toBeDefined();
			expect(domainEvent.aggregateId).toBeDefined();
			expect(domainEvent.eventData).toBeDefined();
			expect(domainEvent.schemaVersion).toBeDefined();
		});
	});

	describe('属性', () => {
		it('eventType 应为 UserRegistered', () => {
			const event = new UserRegisteredEvent('user-123', { email: 'user@example.com' });

			expect(event.eventType).toBe('UserRegistered');
		});

		it('aggregateId 应为传入的值', () => {
			const event = new UserRegisteredEvent('user-123', { email: 'user@example.com' });

			expect(event.aggregateId).toBe('user-123');
		});

		it('schemaVersion 应为 1', () => {
			const event = new UserRegisteredEvent('user-123', { email: 'user@example.com' });

			expect(event.schemaVersion).toBe(1);
		});
	});

	describe('序列化', () => {
		it('应正确序列化为 JSON', () => {
			const event = new UserRegisteredEvent('user-123', { email: 'user@example.com' });

			const json = JSON.stringify(event);
			const parsed = JSON.parse(json);

			expect(parsed.eventType).toBe('UserRegistered');
			expect(parsed.aggregateId).toBe('user-123');
			expect(parsed.eventData.email).toBe('user@example.com');
			expect(parsed.schemaVersion).toBe(1);
		});
	});
});
