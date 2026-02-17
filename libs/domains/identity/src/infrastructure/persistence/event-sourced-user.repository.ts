import { Inject } from '@nestjs/common';
import { OKSAI_EVENT_STORE_TOKEN, type IEventStore } from '@oksai/event-store';
import { OksaiRequestContextService } from '@oksai/context';
import type { IUserRepository } from '../../application/ports/user.repository.port';
import { UserAggregate } from '../../domain/aggregates/user.aggregate';
import type { DomainEvent } from '../../domain/events/domain-event';

/**
 * @description 用户事件溯源仓储（EventStore 驱动）
 */
export class EventSourcedUserRepository implements IUserRepository {
	constructor(
		@Inject(OKSAI_EVENT_STORE_TOKEN) private readonly eventStore: IEventStore,
		private readonly ctx: OksaiRequestContextService
	) {}

	async save(aggregate: UserAggregate): Promise<void> {
		const events = aggregate.getUncommittedEvents();
		if (events.length === 0) return;

		const tenantId = this.ctx.getTenantId();
		if (!tenantId) {
			throw new Error('无法保存用户事件：缺少 tenantId（必须来自 CLS）。');
		}

		await this.eventStore.appendToStream({
			tenantId,
			aggregateType: 'User',
			aggregateId: aggregate.id,
			expectedVersion: aggregate.getExpectedVersion(),
			events,
			userId: this.ctx.getUserId() ?? undefined,
			requestId: this.ctx.getRequestId() ?? undefined
		});

		aggregate.commitUncommittedEvents();
	}

	async findById(id: string): Promise<UserAggregate | null> {
		const tenantId = this.ctx.getTenantId();
		if (!tenantId) {
			throw new Error('无法读取用户事件流：缺少 tenantId（必须来自 CLS）。');
		}

		const stream = await this.eventStore.loadStream({ tenantId, aggregateType: 'User', aggregateId: id });
		if (stream.currentVersion === 0 || stream.events.length === 0) return null;

		const domainEvents: DomainEvent[] = stream.events.map((e) => ({
			eventType: e.eventType,
			occurredAt: e.occurredAt,
			aggregateId: e.aggregateId,
			eventData: e.eventData,
			schemaVersion: e.schemaVersion
		}));

		return UserAggregate.rehydrate(id, domainEvents);
	}
}

