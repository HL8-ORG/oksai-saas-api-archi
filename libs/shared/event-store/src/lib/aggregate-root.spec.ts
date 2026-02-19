import { AggregateRoot } from './aggregate-root';
import type { EventStoreDomainEvent } from './event-store.interface';
import type { AuditInfo } from './audit-info.interface';

/**
 * @description 测试用领域事件类型
 */
interface TestEventData {
	value: string;
}

type TestEvent = EventStoreDomainEvent<TestEventData>;

/**
 * @description 测试用聚合根
 */
class TestAggregate extends AggregateRoot<TestEvent> {
	private _value: string = '';
	private _id: string;

	constructor(id: string) {
		super();
		this._id = id;
	}

	static create(id: string, value: string): TestAggregate {
		const agg = new TestAggregate(id);
		agg.initAuditTimestamps();
		agg._value = value;
		agg.addDomainEvent({
			eventType: 'TestCreated',
			aggregateId: id,
			occurredAt: new Date(),
			eventData: { value },
			schemaVersion: 1
		});
		return agg;
	}

	static rehydrate(id: string, events: TestEvent[]): TestAggregate {
		const agg = new TestAggregate(id);
		for (const e of events) {
			agg.apply(e);
			agg.version += 1;
		}
		agg.resetEventStateAfterRehydrate();
		return agg;
	}

	changeValue(newValue: string, updatedBy?: string): void {
		this._value = newValue;
		this.markUpdated(updatedBy);
		this.addDomainEvent({
			eventType: 'TestValueChanged',
			aggregateId: this._id,
			occurredAt: new Date(),
			eventData: { value: newValue },
			schemaVersion: 1
		});
	}

	protected apply(event: TestEvent): void {
		switch (event.eventType) {
			case 'TestCreated':
				this._value = event.eventData.value;
				this._createdAt = event.occurredAt;
				this._updatedAt = event.occurredAt;
				break;
			case 'TestValueChanged':
				this._value = event.eventData.value;
				this._updatedAt = event.occurredAt;
				break;
		}
	}

	get id(): string {
		return this._id;
	}

	get value(): string {
		return this._value;
	}
}

describe('AggregateRoot', () => {
	describe('事件版本管理', () => {
		it('初始版本应为 0', () => {
			const agg = new TestAggregate('test-1');
			expect(agg.getExpectedVersion()).toBe(0);
		});

		it('添加事件应递增版本号', () => {
			const agg = TestAggregate.create('test-1', 'initial');
			expect(agg.getExpectedVersion()).toBe(0);
			expect(agg.getUncommittedEventCount()).toBe(1);
		});

		it('提交事件后 committedVersion 应更新', () => {
			const agg = TestAggregate.create('test-1', 'initial');
			agg.commitUncommittedEvents();
			expect(agg.getExpectedVersion()).toBe(1);
			expect(agg.hasUncommittedEvents()).toBe(false);
		});

		it('多次添加事件应正确递增版本', () => {
			const agg = TestAggregate.create('test-1', 'initial');
			agg.changeValue('value-2');
			agg.changeValue('value-3');
			expect(agg.getUncommittedEventCount()).toBe(3);
		});
	});

	describe('领域事件管理', () => {
		it('getUncommittedEvents 应返回事件副本', () => {
			const agg = TestAggregate.create('test-1', 'initial');
			const events = agg.getUncommittedEvents();
			expect(events).toHaveLength(1);
			expect(events[0].eventType).toBe('TestCreated');
		});

		it('pullUncommittedEvents 应返回并清空事件', () => {
			const agg = TestAggregate.create('test-1', 'initial');
			const events = agg.pullUncommittedEvents();
			expect(events).toHaveLength(1);
			expect(agg.hasUncommittedEvents()).toBe(false);
			expect(agg.getUncommittedEventCount()).toBe(0);
		});

		it('hasUncommittedEvents 应正确返回状态', () => {
			const agg = new TestAggregate('test-1');
			expect(agg.hasUncommittedEvents()).toBe(false);

			const aggWithEvents = TestAggregate.create('test-1', 'initial');
			expect(aggWithEvents.hasUncommittedEvents()).toBe(true);
		});

		it('getUncommittedEventCount 应返回正确数量', () => {
			const agg = TestAggregate.create('test-1', 'initial');
			expect(agg.getUncommittedEventCount()).toBe(1);

			agg.changeValue('value-2');
			expect(agg.getUncommittedEventCount()).toBe(2);

			agg.commitUncommittedEvents();
			expect(agg.getUncommittedEventCount()).toBe(0);
		});
	});

	describe('审计时间戳', () => {
		it('initAuditTimestamps 应设置 createdAt 和 updatedAt', () => {
			const agg = TestAggregate.create('test-1', 'initial');

			expect(agg.createdAt).toBeDefined();
			expect(agg.updatedAt).toBeDefined();
			expect(agg.createdAt).toEqual(agg.updatedAt);
		});

		it('markUpdated 应更新 updatedAt', async () => {
			const agg = TestAggregate.create('test-1', 'initial');
			const originalUpdatedAt = agg.updatedAt;

			await new Promise((resolve) => setTimeout(resolve, 10));
			agg.changeValue('new-value');

			expect(agg.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
		});
	});

	describe('审计追踪', () => {
		it('setCreatedBy 应设置 createdBy', () => {
			const agg = TestAggregate.create('test-1', 'initial');
			agg.setCreatedBy('user-123');

			expect(agg.createdBy).toBe('user-123');
		});

		it('setUpdatedBy 应设置 updatedBy 并更新时间戳', () => {
			const agg = TestAggregate.create('test-1', 'initial');
			const originalUpdatedAt = agg.updatedAt;

			agg.setUpdatedBy('user-456');

			expect(agg.updatedBy).toBe('user-456');
			expect(agg.updatedAt.getTime()).toBeGreaterThanOrEqual(originalUpdatedAt.getTime());
		});

		it('markUpdated 带 updatedBy 应设置更新者', () => {
			const agg = TestAggregate.create('test-1', 'initial');
			agg.changeValue('new-value', 'user-789');

			expect(agg.updatedBy).toBe('user-789');
		});

		it('getAuditInfo 应返回完整审计信息', () => {
			const agg = TestAggregate.create('test-1', 'initial');
			agg.setCreatedBy('user-123');
			agg.changeValue('new-value', 'user-456');

			const auditInfo: AuditInfo = agg.getAuditInfo();

			expect(auditInfo.createdAt).toBeDefined();
			expect(auditInfo.updatedAt).toBeDefined();
			expect(auditInfo.createdBy).toBe('user-123');
			expect(auditInfo.updatedBy).toBe('user-456');
			expect(auditInfo.isDeleted).toBe(false);
		});
	});

	describe('软删除', () => {
		it('softDelete 应设置 deletedAt', () => {
			const agg = TestAggregate.create('test-1', 'initial');
			agg.softDelete('user-123');

			expect(agg.isDeleted()).toBe(true);
			expect(agg.deletedAt).toBeDefined();
			expect(agg.deletedBy).toBe('user-123');
		});

		it('softDelete 应为幂等操作', () => {
			const agg = TestAggregate.create('test-1', 'initial');
			agg.softDelete('user-123');
			const firstDeletedAt = agg.deletedAt;

			agg.softDelete('user-456');

			expect(agg.deletedAt).toEqual(firstDeletedAt);
			expect(agg.deletedBy).toBe('user-123');
		});

		it('restore 应清空 deletedAt', () => {
			const agg = TestAggregate.create('test-1', 'initial');
			agg.softDelete('user-123');
			agg.restore();

			expect(agg.isDeleted()).toBe(false);
			expect(agg.deletedAt).toBeUndefined();
			expect(agg.deletedBy).toBeUndefined();
		});

		it('restore 应为幂等操作', () => {
			const agg = TestAggregate.create('test-1', 'initial');
			agg.restore();

			expect(agg.isDeleted()).toBe(false);
			expect(agg.deletedAt).toBeUndefined();
		});

		it('getAuditInfo 应包含删除信息', () => {
			const agg = TestAggregate.create('test-1', 'initial');
			agg.softDelete('user-123');

			const auditInfo = agg.getAuditInfo();

			expect(auditInfo.isDeleted).toBe(true);
			expect(auditInfo.deletedAt).toBeDefined();
			expect(auditInfo.deletedBy).toBe('user-123');
		});
	});

	describe('事件溯源（rehydrate）', () => {
		it('rehydrate 应从事件恢复聚合状态', () => {
			const events: TestEvent[] = [
				{
					eventType: 'TestCreated',
					aggregateId: 'test-1',
					occurredAt: new Date('2024-01-01T00:00:00Z'),
					eventData: { value: 'initial' },
					schemaVersion: 1
				},
				{
					eventType: 'TestValueChanged',
					aggregateId: 'test-1',
					occurredAt: new Date('2024-01-02T00:00:00Z'),
					eventData: { value: 'updated' },
					schemaVersion: 1
				}
			];

			const agg = TestAggregate.rehydrate('test-1', events);

			expect(agg.value).toBe('updated');
			expect(agg.getExpectedVersion()).toBe(2);
			expect(agg.hasUncommittedEvents()).toBe(false);
		});

		it('resetEventStateAfterRehydrate 应同步版本并清空事件', () => {
			const events: TestEvent[] = [
				{
					eventType: 'TestCreated',
					aggregateId: 'test-1',
					occurredAt: new Date('2024-01-01T00:00:00Z'),
					eventData: { value: 'initial' },
					schemaVersion: 1
				},
				{
					eventType: 'TestValueChanged',
					aggregateId: 'test-1',
					occurredAt: new Date('2024-01-02T00:00:00Z'),
					eventData: { value: 'updated' },
					schemaVersion: 1
				}
			];

			const agg = TestAggregate.rehydrate('test-1', events);

			expect(agg.getExpectedVersion()).toBe(2);
			expect(agg.getUncommittedEventCount()).toBe(0);
		});
	});

	describe('配置选项', () => {
		it('禁用软删除时 softDelete 应无操作', () => {
			class NoSoftDeleteAggregate extends AggregateRoot<TestEvent> {
				constructor() {
					super({ enableSoftDelete: false });
				}
				protected apply(_event: TestEvent): void {}
			}

			const agg = new NoSoftDeleteAggregate();
			agg.softDelete('user-123');

			expect(agg.isDeleted()).toBe(false);
		});

		it('禁用审计追踪时 setCreatedBy 应无操作', () => {
			class NoAuditAggregate extends AggregateRoot<TestEvent> {
				constructor() {
					super({ enableAuditTracking: false });
				}
				protected apply(_event: TestEvent): void {}
			}

			const agg = new NoAuditAggregate();
			agg.setCreatedBy('user-123');

			expect(agg.createdBy).toBeUndefined();
		});
	});

	describe('Getters', () => {
		it('所有 getters 应返回正确的值', () => {
			const agg = TestAggregate.create('test-1', 'initial');
			agg.setCreatedBy('creator-1');
			agg.changeValue('updated', 'updater-1');
			agg.softDelete('deleter-1');

			expect(agg.createdAt).toBeInstanceOf(Date);
			expect(agg.updatedAt).toBeInstanceOf(Date);
			expect(agg.createdBy).toBe('creator-1');
			expect(agg.updatedBy).toBe('updater-1');
			expect(agg.deletedAt).toBeInstanceOf(Date);
			expect(agg.deletedBy).toBe('deleter-1');
		});
	});
});
