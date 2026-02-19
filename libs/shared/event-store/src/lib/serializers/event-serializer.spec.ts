import { EventSerializer, EventDeserializer, EventCodec } from './event-serializer';
import { EventRegistry } from './event-registry';
import type { EventStoreDomainEvent, StoredEvent } from '../event-store.interface';

/**
 * @description 测试用事件类
 */
class TestEvent implements EventStoreDomainEvent {
	readonly eventType = 'TestEvent';
	readonly occurredAt: Date;
	readonly schemaVersion = 1;

	constructor(
		public readonly aggregateId: string,
		public readonly eventData: any,
		metadata?: any
	) {
		this.occurredAt = new Date('2024-01-01T10:00:00Z');
	}
}

describe('EventSerializer', () => {
	describe('serialize', () => {
		it('应正确序列化事件', () => {
			const event = new TestEvent('agg-1', { name: '测试', count: 42 });

			const serialized = EventSerializer.serialize(event);

			expect(serialized.eventType).toBe('TestEvent');
			expect(serialized.aggregateId).toBe('agg-1');
			expect(serialized.schemaVersion).toBe(1);
			expect(serialized.occurredAt).toBe('2024-01-01T10:00:00.000Z');
		});

		it('应正确序列化包含 Date 的事件数据', () => {
			const date = new Date('2024-01-15T08:30:00Z');
			const event = new TestEvent('agg-1', { createdAt: date });

			const serialized = EventSerializer.serialize(event);
			const eventData = serialized.eventData as any;

			expect(eventData.createdAt.__type).toBe('Date');
			expect(eventData.createdAt.value).toBe('2024-01-15T08:30:00.000Z');
		});

		it('应正确序列化包含 Buffer 的事件数据', () => {
			const buffer = Buffer.from('hello', 'utf-8');
			const event = new TestEvent('agg-1', { data: buffer });

			const serialized = EventSerializer.serialize(event);
			const eventData = serialized.eventData as any;

			expect(eventData.data.__type).toBe('Buffer');
			expect(eventData.data.value).toBe(buffer.toString('base64'));
		});

		it('应正确序列化嵌套对象', () => {
			const event = new TestEvent('agg-1', {
				user: {
					name: '张三',
					age: 30
				},
				items: [1, 2, 3]
			});

			const serialized = EventSerializer.serialize(event);
			const eventData = serialized.eventData as any;

			expect(eventData.user.name).toBe('张三');
			expect(eventData.items).toEqual([1, 2, 3]);
		});
	});

	describe('serializeAll', () => {
		it('应批量序列化多个事件', () => {
			const events = [new TestEvent('agg-1', { name: '事件1' }), new TestEvent('agg-2', { name: '事件2' })];

			const serialized = EventSerializer.serializeAll(events);

			expect(serialized).toHaveLength(2);
			expect(serialized[0].aggregateId).toBe('agg-1');
			expect(serialized[1].aggregateId).toBe('agg-2');
		});
	});
});

describe('EventDeserializer', () => {
	let registry: EventRegistry;

	beforeEach(() => {
		registry = new EventRegistry();
		registry.register({
			eventType: 'TestEvent',
			constructor: TestEvent as any,
			supportedVersions: [1]
		});
	});

	/**
	 * @description 创建模拟的存储事件
	 */
	function createStoredEvent(overrides: Partial<StoredEvent> = {}): StoredEvent {
		return {
			tenantId: 'tenant-1',
			aggregateType: 'Test',
			aggregateId: 'agg-1',
			version: 1,
			eventType: 'TestEvent',
			occurredAt: new Date('2024-01-01T10:00:00Z'),
			schemaVersion: 1,
			eventData: { name: '测试' },
			...overrides
		};
	}

	describe('deserialize', () => {
		it('应正确反序列化存储的事件', () => {
			const storedEvent = createStoredEvent();

			const event = EventDeserializer.deserialize(storedEvent, registry);

			expect(event).not.toBeNull();
			expect(event?.eventType).toBe('TestEvent');
			expect(event?.aggregateId).toBe('agg-1');
			expect(event?.eventData).toEqual({ name: '测试' });
		});

		it('未注册的事件类型应返回 null', () => {
			const storedEvent = createStoredEvent({ eventType: 'UnknownEvent' });

			const event = EventDeserializer.deserialize(storedEvent, registry);

			expect(event).toBeNull();
		});

		it('应正确反序列化包含 Date 的数据', () => {
			const storedEvent = createStoredEvent({
				eventData: {
					createdAt: {
						__type: 'Date',
						value: '2024-01-15T08:30:00.000Z'
					}
				}
			});

			const event = EventDeserializer.deserialize(storedEvent, registry);
			const eventData = event?.eventData as any;

			expect(eventData.createdAt).toBeInstanceOf(Date);
			expect(eventData.createdAt.toISOString()).toBe('2024-01-15T08:30:00.000Z');
		});

		it('应正确反序列化包含 Buffer 的数据', () => {
			const buffer = Buffer.from('hello', 'utf-8');
			const storedEvent = createStoredEvent({
				eventData: {
					data: {
						__type: 'Buffer',
						value: buffer.toString('base64')
					}
				}
			});

			const event = EventDeserializer.deserialize(storedEvent, registry);
			const eventData = event?.eventData as any;

			expect(Buffer.isBuffer(eventData.data)).toBe(true);
			expect(eventData.data.toString()).toBe('hello');
		});

		it('应正确反序列化嵌套对象', () => {
			const storedEvent = createStoredEvent({
				eventData: {
					user: {
						name: '张三',
						age: 30
					},
					items: [1, 2, 3]
				}
			});

			const event = EventDeserializer.deserialize(storedEvent, registry);
			const eventData = event?.eventData as any;

			expect(eventData.user.name).toBe('张三');
			expect(eventData.items).toEqual([1, 2, 3]);
		});
	});

	describe('deserializeAll', () => {
		it('应批量反序列化多个事件', () => {
			const storedEvents = [
				createStoredEvent({ aggregateId: 'agg-1', eventData: { name: '事件1' } }),
				createStoredEvent({ aggregateId: 'agg-2', eventData: { name: '事件2' } })
			];

			const events = EventDeserializer.deserializeAll(storedEvents, registry);

			expect(events).toHaveLength(2);
			expect(events[0].aggregateId).toBe('agg-1');
			expect(events[1].aggregateId).toBe('agg-2');
		});

		it('应跳过无法反序列化的事件', () => {
			const storedEvents = [
				createStoredEvent({ eventType: 'UnknownEvent' }),
				createStoredEvent({ aggregateId: 'agg-1' })
			];

			const events = EventDeserializer.deserializeAll(storedEvents, registry);

			expect(events).toHaveLength(1);
			expect(events[0].aggregateId).toBe('agg-1');
		});
	});
});

describe('EventCodec', () => {
	let registry: EventRegistry;
	let codec: EventCodec;

	beforeEach(() => {
		registry = new EventRegistry();
		registry.register({
			eventType: 'TestEvent',
			constructor: TestEvent as any,
			supportedVersions: [1]
		});
		codec = new EventCodec(registry);
	});

	function createStoredEvent(overrides: Partial<StoredEvent> = {}): StoredEvent {
		return {
			tenantId: 'tenant-1',
			aggregateType: 'Test',
			aggregateId: 'agg-1',
			version: 1,
			eventType: 'TestEvent',
			occurredAt: new Date('2024-01-01T10:00:00Z'),
			schemaVersion: 1,
			eventData: { name: '测试' },
			...overrides
		};
	}

	describe('encode', () => {
		it('应正确编码事件', () => {
			const event = new TestEvent('agg-1', { name: '测试' });

			const encoded = codec.encode(event);

			expect(encoded.eventType).toBe('TestEvent');
			expect(encoded.aggregateId).toBe('agg-1');
		});
	});

	describe('decode', () => {
		it('应正确解码事件', () => {
			const storedEvent = createStoredEvent();

			const event = codec.decode(storedEvent);

			expect(event).not.toBeNull();
			expect(event?.eventType).toBe('TestEvent');
		});
	});

	describe('encodeAll', () => {
		it('应批量编码事件', () => {
			const events = [new TestEvent('agg-1', { name: '事件1' }), new TestEvent('agg-2', { name: '事件2' })];

			const encoded = codec.encodeAll(events);

			expect(encoded).toHaveLength(2);
		});
	});

	describe('decodeAll', () => {
		it('应批量解码事件', () => {
			const storedEvents = [
				createStoredEvent({ aggregateId: 'agg-1' }),
				createStoredEvent({ aggregateId: 'agg-2' })
			];

			const events = codec.decodeAll(storedEvents);

			expect(events).toHaveLength(2);
		});
	});
});
