import type { IEventStore } from '@oksai/event-store';
import { OKSAI_EVENT_STORE_TOKEN } from '@oksai/event-store';
import { Inject, Injectable } from '@nestjs/common';
import type { I__CONTEXT__Repository } from '../../application/ports/__context__.repository.port';
import { __CONTEXT__Aggregate } from '../../domain/aggregates/__context__.aggregate';

/**
 * @description __CONTEXT__ 事件溯源仓储实现（模板）
 *
 * 注意事项：
 * - 该实现属于基础设施层，允许依赖 EventStore/ORM/Nest
 * - 乐观并发控制：appendToStream 必须带 expectedVersion（来自聚合 committedVersion）
 */
@Injectable()
export class EventSourced__CONTEXT__Repository implements I__CONTEXT__Repository {
	constructor(@Inject(OKSAI_EVENT_STORE_TOKEN) private readonly store: IEventStore) {}

	async save(aggregate: __CONTEXT__Aggregate): Promise<void> {
		const events = aggregate.getUncommittedEvents();
		if (events.length === 0) return;

		await this.store.appendToStream({
			aggregateType: '__CONTEXT__',
			aggregateId: aggregate.id,
			expectedVersion: aggregate.getExpectedVersion(),
			events: events.map((e) => ({
				eventType: e.eventType,
				occurredAt: e.occurredAt,
				payload: e.eventData,
				schemaVersion: e.schemaVersion ?? 1
			}))
		});
	}

	async findById(id: string): Promise<__CONTEXT__Aggregate | null> {
		const stream = await this.store.loadStream({ aggregateType: '__CONTEXT__', aggregateId: id });
		if (stream.events.length === 0) return null;
		const domainEvents = stream.events.map((e) => ({
			eventType: e.eventType,
			occurredAt: e.occurredAt,
			aggregateId: e.aggregateId,
			eventData: e.payload,
			schemaVersion: e.schemaVersion
		}));
		return __CONTEXT__Aggregate.rehydrate(id, domainEvents);
	}
}
