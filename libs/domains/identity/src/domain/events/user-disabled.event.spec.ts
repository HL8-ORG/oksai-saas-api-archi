import { UserDisabledEvent, type UserDisabledEventData } from './user-disabled.event';
import type { DomainEvent } from './domain-event';

describe('UserDisabledEvent', () => {
	describe('创建', () => {
		it('应成功创建事件', () => {
			const aggregateId = 'user-123';
			const eventData: UserDisabledEventData = {
				reason: '违规操作'
			};

			const event = new UserDisabledEvent(aggregateId, eventData);

			expect(event.aggregateId).toBe(aggregateId);
			expect(event.eventData).toEqual(eventData);
		});

		it('应支持不提供原因', () => {
			const event = new UserDisabledEvent('user-123', {});

			expect(event.eventData.reason).toBeUndefined();
		});

		it('应设置正确的事件类型', () => {
			const event = new UserDisabledEvent('user-123', { reason: '测试' });

			expect(event.eventType).toBe('UserDisabled');
		});

		it('应设置正确的 schema 版本', () => {
			const event = new UserDisabledEvent('user-123', { reason: '测试' });

			expect(event.schemaVersion).toBe(1);
		});

		it('应设置发生时间', () => {
			const beforeCreate = new Date();
			const event = new UserDisabledEvent('user-123', { reason: '测试' });
			const afterCreate = new Date();

			expect(event.occurredAt).toBeInstanceOf(Date);
			expect(event.occurredAt.getTime()).toBeGreaterThanOrEqual(beforeCreate.getTime());
			expect(event.occurredAt.getTime()).toBeLessThanOrEqual(afterCreate.getTime());
		});
	});

	describe('事件数据', () => {
		it('应包含禁用原因', () => {
			const event = new UserDisabledEvent('user-123', {
				reason: '多次违规'
			});

			expect(event.eventData.reason).toBe('多次违规');
		});

		it('应支持可选的禁用原因', () => {
			const event = new UserDisabledEvent('user-123', {});

			expect(event.eventData.reason).toBeUndefined();
		});

		it('应支持长文本原因', () => {
			const longReason = '这是一段很长的禁用原因说明，包含了详细的违规描述和处理措施';
			const event = new UserDisabledEvent('user-123', {
				reason: longReason
			});

			expect(event.eventData.reason).toBe(longReason);
		});
	});

	describe('接口实现', () => {
		it('应实现 DomainEvent 接口', () => {
			const event = new UserDisabledEvent('user-123', { reason: '测试' });

			const domainEvent: DomainEvent<UserDisabledEventData> = event;

			expect(domainEvent.eventType).toBeDefined();
			expect(domainEvent.occurredAt).toBeDefined();
			expect(domainEvent.aggregateId).toBeDefined();
			expect(domainEvent.eventData).toBeDefined();
			expect(domainEvent.schemaVersion).toBeDefined();
		});
	});

	describe('属性', () => {
		it('eventType 应为 UserDisabled', () => {
			const event = new UserDisabledEvent('user-123', { reason: '测试' });

			expect(event.eventType).toBe('UserDisabled');
		});

		it('aggregateId 应为传入的值', () => {
			const event = new UserDisabledEvent('user-123', { reason: '测试' });

			expect(event.aggregateId).toBe('user-123');
		});

		it('schemaVersion 应为 1', () => {
			const event = new UserDisabledEvent('user-123', { reason: '测试' });

			expect(event.schemaVersion).toBe(1);
		});
	});

	describe('序列化', () => {
		it('应正确序列化为 JSON', () => {
			const event = new UserDisabledEvent('user-123', { reason: '违规操作' });

			const json = JSON.stringify(event);
			const parsed = JSON.parse(json);

			expect(parsed.eventType).toBe('UserDisabled');
			expect(parsed.aggregateId).toBe('user-123');
			expect(parsed.eventData.reason).toBe('违规操作');
			expect(parsed.schemaVersion).toBe(1);
		});

		it('序列化时可选字段应正确处理', () => {
			const event = new UserDisabledEvent('user-123', {});

			const json = JSON.stringify(event);
			const parsed = JSON.parse(json);

			expect(parsed.eventData.reason).toBeUndefined();
		});
	});
});
