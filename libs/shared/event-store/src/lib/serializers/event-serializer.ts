import type { StoredEvent, EventStoreDomainEvent } from '../event-store.interface';
import type { EventRegistry } from './event-registry';

/**
 * @description 事件序列化器
 *
 * 将领域事件序列化为可存储的格式
 */
export class EventSerializer {
	/**
	 * @description 序列化单个事件
	 *
	 * @param event - 领域事件
	 * @returns 序列化后的事件数据
	 */
	static serialize(event: EventStoreDomainEvent): Record<string, unknown> {
		return {
			eventType: event.eventType,
			aggregateId: event.aggregateId,
			occurredAt: event.occurredAt instanceof Date ? event.occurredAt.toISOString() : event.occurredAt,
			schemaVersion: event.schemaVersion ?? 1,
			eventData: this.serializeEventData(event.eventData)
		};
	}

	/**
	 * @description 批量序列化事件
	 *
	 * @param events - 领域事件数组
	 * @returns 序列化后的事件数据数组
	 */
	static serializeAll(events: EventStoreDomainEvent[]): Record<string, unknown>[] {
		return events.map((event) => this.serialize(event));
	}

	/**
	 * @description 序列化事件数据
	 *
	 * 处理特殊类型（Date、Buffer 等）
	 *
	 * @param data - 事件数据
	 * @returns 序列化后的数据
	 */
	private static serializeEventData(data: unknown): unknown {
		if (data === null || data === undefined) {
			return data;
		}

		if (data instanceof Date) {
			return {
				__type: 'Date',
				value: data.toISOString()
			};
		}

		if (Buffer.isBuffer(data)) {
			return {
				__type: 'Buffer',
				value: data.toString('base64')
			};
		}

		if (Array.isArray(data)) {
			return data.map((item) => this.serializeEventData(item));
		}

		if (typeof data === 'object') {
			const result: Record<string, unknown> = {};
			for (const [key, value] of Object.entries(data)) {
				result[key] = this.serializeEventData(value);
			}
			return result;
		}

		return data;
	}
}

/**
 * @description 事件反序列化器
 *
 * 将存储的事件数据反序列化为领域事件对象
 */
export class EventDeserializer {
	/**
	 * @description 反序列化存储的事件
	 *
	 * @param storedEvent - 存储的事件
	 * @param registry - 事件注册表
	 * @returns 领域事件对象
	 */
	static deserialize<T extends EventStoreDomainEvent = EventStoreDomainEvent>(
		storedEvent: StoredEvent,
		registry: EventRegistry
	): T | null {
		const EventConstructor = registry.get(storedEvent.eventType);
		if (!EventConstructor) {
			console.warn(`未找到事件类型 "${storedEvent.eventType}" 的构造函数`);
			return null;
		}

		// 反序列化事件数据
		const eventData = this.deserializeEventData(storedEvent.eventData);

		// 创建事件实例
		try {
			const event = new EventConstructor(storedEvent.aggregateId, eventData, {
				tenantId: storedEvent.tenantId,
				userId: storedEvent.userId,
				correlationId: storedEvent.requestId
			}) as T;

			return event;
		} catch (error) {
			console.error(`反序列化事件 "${storedEvent.eventType}" 失败:`, error);
			return null;
		}
	}

	/**
	 * @description 批量反序列化事件
	 *
	 * @param storedEvents - 存储的事件数组
	 * @param registry - 事件注册表
	 * @returns 领域事件对象数组
	 */
	static deserializeAll<T extends EventStoreDomainEvent = EventStoreDomainEvent>(
		storedEvents: StoredEvent[],
		registry: EventRegistry
	): T[] {
		const events: T[] = [];

		for (const storedEvent of storedEvents) {
			const event = this.deserialize<T>(storedEvent, registry);
			if (event) {
				events.push(event);
			}
		}

		return events;
	}

	/**
	 * @description 反序列化事件数据
	 *
	 * 处理特殊类型（Date、Buffer 等）
	 *
	 * @param data - 序列化的事件数据
	 * @returns 反序列化后的数据
	 */
	private static deserializeEventData(data: unknown): unknown {
		if (data === null || data === undefined) {
			return data;
		}

		if (Array.isArray(data)) {
			return data.map((item) => this.deserializeEventData(item));
		}

		if (typeof data === 'object' && data !== null) {
			const obj = data as Record<string, unknown>;

			// 处理特殊类型
			if (obj.__type === 'Date' && typeof obj.value === 'string') {
				return new Date(obj.value);
			}

			if (obj.__type === 'Buffer' && typeof obj.value === 'string') {
				return Buffer.from(obj.value, 'base64');
			}

			// 递归处理对象属性
			const result: Record<string, unknown> = {};
			for (const [key, value] of Object.entries(obj)) {
				result[key] = this.deserializeEventData(value);
			}
			return result;
		}

		return data;
	}
}

/**
 * @description 事件编解码器
 *
 * 提供统一的事件序列化和反序列化接口
 */
export class EventCodec {
	constructor(private readonly registry: EventRegistry) {}

	/**
	 * @description 编码事件（序列化）
	 */
	encode(event: EventStoreDomainEvent): Record<string, unknown> {
		return EventSerializer.serialize(event);
	}

	/**
	 * @description 解码事件（反序列化）
	 */
	decode<T extends EventStoreDomainEvent = EventStoreDomainEvent>(storedEvent: StoredEvent): T | null {
		return EventDeserializer.deserialize<T>(storedEvent, this.registry);
	}

	/**
	 * @description 批量编码
	 */
	encodeAll(events: EventStoreDomainEvent[]): Record<string, unknown>[] {
		return EventSerializer.serializeAll(events);
	}

	/**
	 * @description 批量解码
	 */
	decodeAll<T extends EventStoreDomainEvent = EventStoreDomainEvent>(storedEvents: StoredEvent[]): T[] {
		return EventDeserializer.deserializeAll<T>(storedEvents, this.registry);
	}
}
