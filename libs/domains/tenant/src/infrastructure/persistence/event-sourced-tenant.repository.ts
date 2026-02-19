import { Inject, Injectable } from '@nestjs/common';
import { MikroORM } from '@mikro-orm/core';
import { OKSAI_EVENT_STORE_TOKEN, type IEventStore } from '@oksai/event-store';
import { OksaiRequestContextService } from '@oksai/context';
import { AggregateMetadataProjector } from '@oksai/aggregate-metadata';
import type { ITenantRepository } from '../../application/ports/tenant.repository.port';
import {
	TenantAggregate as TenantAggregateClass,
	type TenantAggregate
} from '../../domain/aggregates/tenant.aggregate';
import type { DomainEvent } from '../../domain/events/domain-event';
import type { TenantId } from '../../domain/value-objects/tenant-id.value-object';
import { TenantMetadataExtractor } from '../metadata/tenant-metadata.extractor';

/**
 * @description
 * 事件溯源版租户仓储（EventStore 驱动）。
 *
 * 说明：
 * - `save` 会把未提交事件追加到 EventStore（expectedVersion）
 * - `findById` 会从 EventStore 回放事件流重建聚合
 * - 每次保存后会同步更新聚合元数据表（aggregate_metadata）
 */
@Injectable()
export class EventSourcedTenantRepository implements ITenantRepository {
	private readonly metadataProjector: AggregateMetadataProjector;
	private readonly metadataExtractor = new TenantMetadataExtractor();

	constructor(
		@Inject(OKSAI_EVENT_STORE_TOKEN) private readonly eventStore: IEventStore,
		private readonly ctx: OksaiRequestContextService,
		private readonly orm: MikroORM
	) {
		this.metadataProjector = new AggregateMetadataProjector(orm);
	}

	async save(tenant: TenantAggregate): Promise<void> {
		const aggId = tenant.id.toString();
		const events = tenant.getUncommittedEvents();
		if (events.length === 0) return;

		const expectedVersion = tenant.getExpectedVersion();

		const requestId = this.ctx.getRequestId();
		const userId = this.ctx.getUserId();

		// 1. 追加事件到 EventStore
		await this.eventStore.appendToStream({
			tenantId: aggId,
			aggregateType: 'Tenant',
			aggregateId: aggId,
			expectedVersion,
			events,
			userId,
			requestId
		});

		// 2. 提交事件
		tenant.commitUncommittedEvents();

		// 3. 同步更新元数据表
		await this.metadataProjector.project(tenant, this.metadataExtractor);
	}

	async findById(id: TenantId): Promise<TenantAggregate | null> {
		const aggId = id.toString();
		const stream = await this.eventStore.loadStream({
			tenantId: aggId,
			aggregateType: 'Tenant',
			aggregateId: aggId
		});
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
