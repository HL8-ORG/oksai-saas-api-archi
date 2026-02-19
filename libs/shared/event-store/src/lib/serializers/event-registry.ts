import type { StoredEvent, EventStoreDomainEvent } from '../event-store.interface';

/**
 * @description 事件构造函数类型
 */
export type EventConstructor<T extends EventStoreDomainEvent = EventStoreDomainEvent> = new (
	aggregateId: string,
	payload: any,
	metadata?: any
) => T;

/**
 * @description 事件注册表条目
 */
export interface EventRegistryEntry {
	/**
	 * 事件类型名称
	 */
	eventType: string;

	/**
	 * 事件构造函数
	 */
	constructor: EventConstructor;

	/**
	 * 支持的版本列表
	 */
	supportedVersions: number[];

	/**
	 * 版本升级器（可选）
	 */
	versionUpgraders?: Map<number, (data: any) => any>;
}

/**
 * @description 事件注册表
 *
 * 管理事件类型名称与事件类之间的映射关系，支持：
 * - 事件注册
 * - 事件类型查找
 * - 事件版本升级
 *
 * @example
 * ```typescript
 * const registry = new EventRegistry();
 *
 * // 注册事件
 * registry.register({
 *   eventType: 'TenantCreated',
 *   constructor: TenantCreatedEvent,
 *   supportedVersions: [1, 2]
 * });
 *
 * // 获取事件构造函数
 * const EventClass = registry.get('TenantCreated');
 * ```
 */
export class EventRegistry {
	private readonly entries: Map<string, EventRegistryEntry> = new Map();

	/**
	 * @description 注册事件
	 *
	 * @param entry - 事件注册条目
	 */
	register(entry: EventRegistryEntry): void {
		if (this.entries.has(entry.eventType)) {
			throw new Error(`事件类型 "${entry.eventType}" 已注册`);
		}

		this.entries.set(entry.eventType, entry);
	}

	/**
	 * @description 批量注册事件
	 *
	 * @param entries - 事件注册条目数组
	 */
	registerAll(entries: EventRegistryEntry[]): void {
		for (const entry of entries) {
			this.register(entry);
		}
	}

	/**
	 * @description 获取事件构造函数
	 *
	 * @param eventType - 事件类型名称
	 * @returns 事件构造函数，如果未找到则返回 undefined
	 */
	get(eventType: string): EventConstructor | undefined {
		const entry = this.entries.get(eventType);
		return entry?.constructor;
	}

	/**
	 * @description 获取事件注册条目
	 *
	 * @param eventType - 事件类型名称
	 * @returns 事件注册条目，如果未找到则返回 undefined
	 */
	getEntry(eventType: string): EventRegistryEntry | undefined {
		return this.entries.get(eventType);
	}

	/**
	 * @description 检查事件类型是否已注册
	 *
	 * @param eventType - 事件类型名称
	 */
	has(eventType: string): boolean {
		return this.entries.has(eventType);
	}

	/**
	 * @description 获取所有已注册的事件类型
	 */
	getAllEventTypes(): string[] {
		return Array.from(this.entries.keys());
	}

	/**
	 * @description 升级事件数据到指定版本
	 *
	 * @param eventType - 事件类型名称
	 * @param data - 原始事件数据
	 * @param fromVersion - 原始版本
	 * @param toVersion - 目标版本
	 * @returns 升级后的事件数据
	 */
	upgradeEventData(eventType: string, data: any, fromVersion: number, toVersion: number): any {
		const entry = this.entries.get(eventType);
		if (!entry) {
			return data;
		}

		let currentData = data;
		let currentVersion = fromVersion;

		while (currentVersion < toVersion) {
			const upgrader = entry.versionUpgraders?.get(currentVersion);
			if (upgrader) {
				currentData = upgrader(currentData);
			}
			currentVersion++;
		}

		return currentData;
	}

	/**
	 * @description 清空所有注册
	 */
	clear(): void {
		this.entries.clear();
	}
}

/**
 * @description 全局事件注册表实例
 */
export const globalEventRegistry = new EventRegistry();
