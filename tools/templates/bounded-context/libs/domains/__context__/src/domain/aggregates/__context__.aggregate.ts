import { AggregateRoot, type EventStoreDomainEvent } from '@oksai/event-store';
import { __CONTEXT__CreatedEvent } from '../events/__context__-created.event';

/**
 * @description __CONTEXT__ 领域事件类型
 */
type __CONTEXT__Event = EventStoreDomainEvent;

/**
 * @description __CONTEXT__ 聚合根（模板）
 *
 * 说明：
 * - 领域层禁止依赖 Nest/ORM
 * - 使用"记录领域事件"的方式表达状态变更
 * - 继承 AggregateRoot 基类获得事件管理、审计追踪、软删除能力
 *
 * 基类提供的能力：
 * - 事件版本管理：version、getExpectedVersion()
 * - 领域事件管理：addDomainEvent()、getUncommittedEvents()、pullUncommittedEvents()
 * - 审计时间戳：createdAt、updatedAt、initAuditTimestamps()、markUpdated()
 * - 审计追踪：createdBy、updatedBy、setCreatedBy()、setUpdatedBy()
 * - 软删除：softDelete()、restore()、isDeleted()
 */
export class __CONTEXT__Aggregate extends AggregateRoot<__CONTEXT__Event> {
	private readonly _id: string;
	private _name: string;

	private constructor(id: string, name: string) {
		super();
		this._id = id;
		this._name = name;
	}

	/**
	 * @description 创建聚合（工厂方法）
	 *
	 * @param id - 聚合 ID
	 * @param name - 名称
	 * @returns 聚合根
	 */
	static create(id: string, name: string): __CONTEXT__Aggregate {
		const agg = new __CONTEXT__Aggregate(id, name);

		// 初始化审计时间戳
		agg.initAuditTimestamps();

		// 记录领域事件
		agg.addDomainEvent(new __CONTEXT__CreatedEvent(id, { name }));

		return agg;
	}

	/**
	 * @description 从历史事件重建聚合（事件溯源）
	 *
	 * @param id - 聚合 ID
	 * @param events - 历史事件（按 version 升序）
	 * @returns 聚合根
	 */
	static rehydrate(id: string, events: __CONTEXT__Event[]): __CONTEXT__Aggregate {
		const agg = new __CONTEXT__Aggregate(id, '__rehydrate__');

		for (const e of events) {
			agg.apply(e);
			agg.version += 1;
		}

		// 重置事件状态
		agg.resetEventStateAfterRehydrate();

		return agg;
	}

	/**
	 * @description 更新名称
	 *
	 * @param newName - 新名称
	 */
	updateName(newName: string): void {
		if (this._name === newName) return;

		this._name = newName;
		this.markUpdated();

		// 可选：记录领域事件
		// this.addDomainEvent({
		// 	eventType: '__CONTEXT__NameUpdated',
		// 	aggregateId: this._id,
		// 	occurredAt: this.updatedAt,
		// 	eventData: { name: newName },
		// 	schemaVersion: 1
		// });
	}

	/**
	 * @description 应用事件（用于 rehydrate）
	 *
	 * 子类必须实现此方法以支持事件溯源
	 *
	 * @param event - 领域事件
	 */
	protected apply(event: __CONTEXT__Event): void {
		switch (event.eventType) {
			case '__CONTEXT__Created': {
				const data = event.eventData as { name?: string };
				this._name = String(data?.name ?? '').trim();
				this._createdAt = event.occurredAt;
				this._updatedAt = event.occurredAt;
				return;
			}
			default:
				return;
		}
	}

	// ==================== Getters ====================

	/**
	 * 获取聚合 ID
	 */
	get id(): string {
		return this._id;
	}

	/**
	 * 获取名称
	 */
	get name(): string {
		return this._name;
	}
}
