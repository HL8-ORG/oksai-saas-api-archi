import { Inject } from '@nestjs/common';
import { OKSAI_EVENT_STORE_TOKEN, type IEventStore } from '@oksai/event-store';
import { OksaiRequestContextService } from '@oksai/context';
import type { ITenantRepository } from '../../application/ports/tenant.repository.port';
import { TenantAggregate as TenantAggregateClass, type TenantAggregate } from '../../domain/aggregates/tenant.aggregate';
import type { DomainEvent } from '../../domain/events/domain-event';
import type { TenantId } from '../../domain/value-objects/tenant-id.value-object';

/**
 * @description
 * 事件溯源版租户仓储（EventStore 驱动）。
 *
 * 说明：
 * - `save` 会把未提交事件追加到 EventStore（expectedVersion）
 * - `findById` 会从 EventStore 回放事件流重建聚合
 */
export class EventSourcedTenantRepository implements ITenantRepository {
	constructor(
		@Inject(OKSAI_EVENT_STORE_TOKEN) private readonly eventStore: IEventStore,
		private readonly ctx: OksaiRequestContextService
	) {}

	async save(tenant: TenantAggregate): Promise<void> {
		const aggId = tenant.id.toString();
		const events = tenant.getUncommittedEvents();
		if (events.length === 0) return;

		const expectedVersion = tenant.getExpectedVersion();

		const requestId = this.ctx.getRequestId();
		const userId = this.ctx.getUserId();

		await this.eventStore.appendToStream({
			tenantId: aggId,
			aggregateType: 'Tenant',
			aggregateId: aggId,
			expectedVersion,
			events,
			userId,
			requestId
		});

		tenant.commitUncommittedEvents();
	}

	async findById(id: TenantId): Promise<TenantAggregate | null> {
		const aggId = id.toString();
		const stream = await this.eventStore.loadStream({ tenantId: aggId, aggregateType: 'Tenant', aggregateId: aggId });
		if (stream.currentVersion === 0 || stream.events.length === 0) return null;

		const domainEvents: DomainEvent[] = stream.events.map((e) => ({
			eventType: e.eventType,
			occurredAt: e.occurredAt,
			aggregateId: e.aggregateId,
			eventData: e.eventData,
			schemaVersion: e.schemaVersion
		}));

		return TenantAggregateClass.rehydrate(id, domainEvents);
	}
}

