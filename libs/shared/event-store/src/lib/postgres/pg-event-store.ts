import { Injectable } from '@nestjs/common';
import { MikroORM } from '@mikro-orm/core';
import { DatabaseTransactionHost } from '@oksai/database';
import type { EventStoreDomainEvent, IEventStore, StoredEvent } from '../event-store.interface';
import { randomUUID } from 'node:crypto';

/**
 * @description
 * PostgreSQL EventStore 实现（最小可用）。
 *
 * 说明：
 * - 使用乐观并发（expectedVersion）保证同聚合事件流不被覆盖
 * - 使用 SQL 获取当前版本与追加写入（避免 ORM hydration 开销）
 */
@Injectable()
export class PgEventStore implements IEventStore {
	constructor(
		private readonly orm: MikroORM,
		private readonly txHost: DatabaseTransactionHost
	) {}

	async appendToStream(params: {
		tenantId: string;
		aggregateType: string;
		aggregateId: string;
		expectedVersion: number;
		events: EventStoreDomainEvent[];
		userId?: string;
		requestId?: string;
	}): Promise<{ newVersion: number }> {
		const em = this.txHost.getCurrentEntityManager() ?? this.orm.em;
		const conn = em.getConnection();

		const current = await conn.execute<{ v: number }[]>(
			`select coalesce(max(version), 0) as v
       from event_store_events
       where tenant_id = ? and aggregate_type = ? and aggregate_id = ?`,
			[params.tenantId, params.aggregateType, params.aggregateId]
		);
		const currentVersion = Number(current[0]?.v ?? 0);
		if (currentVersion !== params.expectedVersion) {
			throw new Error(
				`事件写入并发冲突：tenantId=${params.tenantId} aggregate=${params.aggregateType}:${params.aggregateId} expectedVersion=${params.expectedVersion} currentVersion=${currentVersion}。`
			);
		}

		let version = currentVersion;
		for (const e of params.events) {
			version += 1;
			await conn.execute(
				`insert into event_store_events
         (id, tenant_id, aggregate_type, aggregate_id, version, event_type, occurred_at, schema_version, event_data, user_id, request_id, created_at)
         values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
				[
					randomUUID(),
					params.tenantId,
					params.aggregateType,
					params.aggregateId,
					version,
					e.eventType,
					e.occurredAt,
					e.schemaVersion ?? 1,
					e.eventData,
					params.userId ?? null,
					params.requestId ?? null,
					new Date()
				]
			);
		}

		return { newVersion: version };
	}

	async loadStream(params: {
		tenantId: string;
		aggregateType: string;
		aggregateId: string;
		fromVersion?: number;
	}): Promise<{ currentVersion: number; events: StoredEvent[] }> {
		const em = this.txHost.getCurrentEntityManager() ?? this.orm.em;
		const conn = em.getConnection();

		const from = params.fromVersion ?? 0;
		const rows = await conn.execute<any[]>(
			`select tenant_id, aggregate_type, aggregate_id, version, event_type, occurred_at, schema_version, event_data, user_id, request_id
       from event_store_events
       where tenant_id = ? and aggregate_type = ? and aggregate_id = ? and version > ?
       order by version asc`,
			[params.tenantId, params.aggregateType, params.aggregateId, from]
		);

		const events: StoredEvent[] = rows.map((r) => ({
			tenantId: String(r.tenant_id),
			aggregateType: String(r.aggregate_type),
			aggregateId: String(r.aggregate_id),
			version: Number(r.version),
			eventType: String(r.event_type),
			occurredAt: new Date(r.occurred_at),
			schemaVersion: Number(r.schema_version),
			eventData: (r.event_data ?? {}) as object,
			userId: r.user_id ? String(r.user_id) : undefined,
			requestId: r.request_id ? String(r.request_id) : undefined
		}));

		const maxRow = await conn.execute<{ v: number }[]>(
			`select coalesce(max(version), 0) as v
       from event_store_events
       where tenant_id = ? and aggregate_type = ? and aggregate_id = ?`,
			[params.tenantId, params.aggregateType, params.aggregateId]
		);
		const currentVersion = Number(maxRow[0]?.v ?? 0);
		return { currentVersion, events };
	}
}

