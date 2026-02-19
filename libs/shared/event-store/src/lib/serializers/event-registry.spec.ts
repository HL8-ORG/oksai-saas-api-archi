import { EventRegistry, globalEventRegistry } from './event-registry';
import type { EventStoreDomainEvent } from '../event-store.interface';

/**
 * @description 测试用事件类
 */
class TestEvent implements EventStoreDomainEvent {
	readonly eventType = 'TestEvent';
	readonly occurredAt: Date;
	readonly schemaVersion = 1;

	constructor(
		public readonly aggregateId: string,
		public readonly eventData: any
	) {
		this.occurredAt = new Date();
	}
}

class AnotherEvent implements EventStoreDomainEvent {
	readonly eventType = 'AnotherEvent';
	readonly occurredAt: Date;
	readonly schemaVersion = 1;

	constructor(
		public readonly aggregateId: string,
		public readonly eventData: any
	) {
		this.occurredAt = new Date();
	}
}

describe('EventRegistry', () => {
	let registry: EventRegistry;

	beforeEach(() => {
		registry = new EventRegistry();
	});

	describe('register', () => {
		it('应正确注册事件', () => {
			registry.register({
				eventType: 'TestEvent',
				constructor: TestEvent as any,
				supportedVersions: [1]
			});

			expect(registry.has('TestEvent')).toBe(true);
			expect(registry.get('TestEvent')).toBe(TestEvent);
		});

		it('重复注册相同事件类型应抛出错误', () => {
			registry.register({
				eventType: 'TestEvent',
				constructor: TestEvent as any,
				supportedVersions: [1]
			});

			expect(() => {
				registry.register({
					eventType: 'TestEvent',
					constructor: AnotherEvent as any,
					supportedVersions: [1]
				});
			}).toThrow('事件类型 "TestEvent" 已注册');
		});
	});

	describe('registerAll', () => {
		it('应批量注册多个事件', () => {
			registry.registerAll([
				{ eventType: 'TestEvent', constructor: TestEvent as any, supportedVersions: [1] },
				{ eventType: 'AnotherEvent', constructor: AnotherEvent as any, supportedVersions: [1, 2] }
			]);

			expect(registry.has('TestEvent')).toBe(true);
			expect(registry.has('AnotherEvent')).toBe(true);
		});
	});

	describe('get', () => {
		it('应返回已注册的事件构造函数', () => {
			registry.register({
				eventType: 'TestEvent',
				constructor: TestEvent as any,
				supportedVersions: [1]
			});

			expect(registry.get('TestEvent')).toBe(TestEvent);
		});

		it('未注册的事件类型应返回 undefined', () => {
			expect(registry.get('UnknownEvent')).toBeUndefined();
		});
	});

	describe('getEntry', () => {
		it('应返回完整的事件注册条目', () => {
			registry.register({
				eventType: 'TestEvent',
				constructor: TestEvent as any,
				supportedVersions: [1, 2]
			});

			const entry = registry.getEntry('TestEvent');
			expect(entry?.eventType).toBe('TestEvent');
			expect(entry?.constructor).toBe(TestEvent);
			expect(entry?.supportedVersions).toEqual([1, 2]);
		});
	});

	describe('has', () => {
		it('已注册的事件类型应返回 true', () => {
			registry.register({
				eventType: 'TestEvent',
				constructor: TestEvent as any,
				supportedVersions: [1]
			});

			expect(registry.has('TestEvent')).toBe(true);
		});

		it('未注册的事件类型应返回 false', () => {
			expect(registry.has('UnknownEvent')).toBe(false);
		});
	});

	describe('getAllEventTypes', () => {
		it('应返回所有已注册的事件类型', () => {
			registry.registerAll([
				{ eventType: 'TestEvent', constructor: TestEvent as any, supportedVersions: [1] },
				{ eventType: 'AnotherEvent', constructor: AnotherEvent as any, supportedVersions: [1] }
			]);

			const eventTypes = registry.getAllEventTypes();
			expect(eventTypes).toContain('TestEvent');
			expect(eventTypes).toContain('AnotherEvent');
			expect(eventTypes).toHaveLength(2);
		});

		it('空注册表应返回空数组', () => {
			expect(registry.getAllEventTypes()).toEqual([]);
		});
	});

	describe('upgradeEventData', () => {
		it('应正确升级事件数据', () => {
			registry.register({
				eventType: 'TestEvent',
				constructor: TestEvent as any,
				supportedVersions: [1, 2],
				versionUpgraders: new Map([[1, (data: any) => ({ ...data, newField: 'upgraded' })]])
			});

			const originalData = { field: 'value' };
			const upgradedData = registry.upgradeEventData('TestEvent', originalData, 1, 2);

			expect(upgradedData).toEqual({
				field: 'value',
				newField: 'upgraded'
			});
		});

		it('未注册的事件类型应返回原始数据', () => {
			const data = { field: 'value' };
			const result = registry.upgradeEventData('UnknownEvent', data, 1, 2);

			expect(result).toEqual(data);
		});

		it('没有升级器时应返回原始数据', () => {
			registry.register({
				eventType: 'TestEvent',
				constructor: TestEvent as any,
				supportedVersions: [1, 2]
			});

			const data = { field: 'value' };
			const result = registry.upgradeEventData('TestEvent', data, 1, 2);

			expect(result).toEqual(data);
		});
	});

	describe('clear', () => {
		it('应清空所有注册', () => {
			registry.register({
				eventType: 'TestEvent',
				constructor: TestEvent as any,
				supportedVersions: [1]
			});

			registry.clear();

			expect(registry.has('TestEvent')).toBe(false);
			expect(registry.getAllEventTypes()).toEqual([]);
		});
	});
});

describe('globalEventRegistry', () => {
	it('应为 EventRegistry 实例', () => {
		expect(globalEventRegistry).toBeInstanceOf(EventRegistry);
	});
});
