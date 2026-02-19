import { UserEnabledEvent, type UserEnabledEventData } from './user-enabled.event';
import type { DomainEvent } from './domain-event';

describe('UserEnabledEvent', () => {
	describe('创建', () => {
		it('应成功创建事件', () => {
			const aggregateId = 'user-123';
			const eventData: UserEnabledEventData = {};

			const event = new UserEnabledEvent(aggregateId, eventData);

			expect(event.aggregateId).toBe(aggregateId);
			expect(event.eventData).toEqual(eventData);
		});

		it('应设置正确的事件类型', () => {
			const event = new UserEnabledEvent('user-123', {});

			expect(event.eventType).toBe('UserEnabled');
		});

		it('应设置正确的 schema 版本', () => {
			const event = new UserEnabledEvent('user-123', {});

			expect(event.schemaVersion).toBe(1);
		});

		it('应设置发生时间', () => {
			const beforeCreate = new Date();
			const event = new UserEnabledEvent('user-123', {});
			const afterCreate = new Date();

			expect(event.occurredAt).toBeInstanceOf(Date);
			expect(event.occurredAt.getTime()).toBeGreaterThanOrEqual(beforeCreate.getTime());
			expect(event.occurredAt.getTime()).toBeLessThanOrEqual(afterCreate.getTime());
		});
	});

	describe('事件数据', () => {
		it('eventData 应为空对象', () => {
			const event = new UserEnabledEvent('user-123', {});

			expect(event.eventData).toEqual({});
			expect(Object.keys(event.eventData)).toHaveLength(0);
		});
	});

	describe('接口实现', () => {
		it('应实现 DomainEvent 接口', () => {
			const event = new UserEnabledEvent('user-123', {});

			const domainEvent: DomainEvent<UserEnabledEventData> = event;

			expect(domainEvent.eventType).toBeDefined();
			expect(domainEvent.occurredAt).toBeDefined();
			expect(domainEvent.aggregateId).toBeDefined();
			expect(domainEvent.eventData).toBeDefined();
			expect(domainEvent.schemaVersion).toBeDefined();
		});
	});

	describe('属性', () => {
		it('eventType 应为 UserEnabled', () => {
			const event = new UserEnabledEvent('user-123', {});

			expect(event.eventType).toBe('UserEnabled');
		});

		it('aggregateId 应为传入的值', () => {
			const event = new UserEnabledEvent('user-123', {});

			expect(event.aggregateId).toBe('user-123');
		});

		it('schemaVersion 应为 1', () => {
			const event = new UserEnabledEvent('user-123', {});

			expect(event.schemaVersion).toBe(1);
		});
	});

	describe('序列化', () => {
		it('应正确序列化为 JSON', () => {
			const event = new UserEnabledEvent('user-123', {});

			const json = JSON.stringify(event);
			const parsed = JSON.parse(json);

			expect(parsed.eventType).toBe('UserEnabled');
			expect(parsed.aggregateId).toBe('user-123');
			expect(parsed.eventData).toEqual({});
			expect(parsed.schemaVersion).toBe(1);
		});
	});

	describe('与其他事件的区别', () => {
		it('应与 UserDisabledEvent 有不同的 eventType', () => {
			const enabledEvent = new UserEnabledEvent('user-123', {});

			expect(enabledEvent.eventType).toBe('UserEnabled');
			expect(enabledEvent.eventType).not.toBe('UserDisabled');
		});

		it('应与 UserRegisteredEvent 有不同的 eventType', () => {
			const enabledEvent = new UserEnabledEvent('user-123', {});

			expect(enabledEvent.eventType).toBe('UserEnabled');
			expect(enabledEvent.eventType).not.toBe('UserRegistered');
		});
	});
});
