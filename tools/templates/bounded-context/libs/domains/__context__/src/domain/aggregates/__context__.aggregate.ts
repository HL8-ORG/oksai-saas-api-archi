import type { DomainEvent } from '../events/domain-event';
import { __CONTEXT__CreatedEvent } from '../events/__context__-created.event';

/**
 * @description __CONTEXT__ 聚合根（模板）
 *
 * 说明：
 * - 领域层禁止依赖 Nest/ORM
 * - 使用“记录领域事件”的方式表达状态变更
 */
export class __CONTEXT__Aggregate {
	private readonly uncommitted: DomainEvent[] = [];
	private committedVersion = 0;
	private version = 0;

	private constructor(
		readonly id: string,
		private name: string
	) {}

	/**
	 * @description 创建聚合（工厂方法）
	 */
	static create(id: string, name: string): __CONTEXT__Aggregate {
		const agg = new __CONTEXT__Aggregate(id, name);
		agg.record(new __CONTEXT__CreatedEvent(id, { name }));
		return agg;
	}

	/**
	 * @description 从历史事件重建聚合（事件溯源）
	 */
	static rehydrate(id: string, events: DomainEvent[]): __CONTEXT__Aggregate {
		const agg = new __CONTEXT__Aggregate(id, '__rehydrate__');
		for (const e of events) {
			agg.apply(e);
			agg.version += 1;
		}
		agg.committedVersion = agg.version;
		agg.uncommitted.splice(0, agg.uncommitted.length);
		return agg;
	}

	getExpectedVersion(): number {
		return this.committedVersion;
	}

	getUncommittedEvents(): DomainEvent[] {
		return [...this.uncommitted];
	}

	commitUncommittedEvents(): void {
		this.uncommitted.splice(0, this.uncommitted.length);
		this.committedVersion = this.version;
	}

	private record(event: DomainEvent): void {
		this.apply(event);
		this.version += 1;
		this.uncommitted.push(event);
	}

	private apply(event: DomainEvent): void {
		switch (event.eventType) {
			case '__CONTEXT__Created': {
				const data = event.eventData as { name?: string };
				this.name = String(data?.name ?? '').trim();
				return;
			}
			default:
				return;
		}
	}
}

