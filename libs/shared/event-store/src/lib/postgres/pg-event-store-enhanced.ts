import { Injectable } from '@nestjs/common';
import { MikroORM } from '@mikro-orm/core';
import { DatabaseTransactionHost } from '@oksai/database';
import type {
	EventStoreDomainEvent,
	IEventStore,
	StoredEvent,
	EventFilter,
	EventLoadOptions
} from '../event-store.interface';
import type {
	ISnapshotStore,
	AggregateSnapshot,
	SnapshotStrategy,
	DEFAULT_SNAPSHOT_STRATEGY
} from '../projections/interfaces/snapshot.interface';
import { randomUUID } from 'node:crypto';

/**
 * @description 并发冲突错误
 */
export class ConcurrencyError extends Error {
	constructor(
		public readonly tenantId: string,
		public readonly aggregateType: string,
		public readonly aggregateId: string,
		public readonly expectedVersion: number,
		public readonly currentVersion: number
	) {
		super(
			`事件写入并发冲突：tenantId=${tenantId} aggregate=${aggregateType}:${aggregateId} expectedVersion=${expectedVersion} currentVersion=${currentVersion}`
		);
		this.name = 'ConcurrencyError';
	}
}

/**
 * @description PostgreSQL EventStore 增强实现
 *
 * 扩展能力：
 * - loadAllEvents：批量加载事件（用于分析和投影重建）
 * - streamAllEvents：流式加载事件（大数据量处理）
 * - 快照支持：加速聚合重建
 *
 * 强约束（对齐 ARCHITECTURE.md 6.5.2）：
 * - 单聚合事件流
 * - 乐观并发（expectedVersion）
 * - 严格顺序（version 单调递增）
 */
@Injectable()
export class PgEventStoreEnhanced implements IEventStore, ISnapshotStore {
	constructor(
		private readonly orm: MikroORM,
		private readonly txHost: DatabaseTransactionHost
	) {}

	// ==================== IEventStore 实现 ====================

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
			throw new ConcurrencyError(
				params.tenantId,
				params.aggregateType,
				params.aggregateId,
				params.expectedVersion,
				currentVersion
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
			`select id, tenant_id, aggregate_type, aggregate_id, version, event_type, occurred_at, schema_version, event_data, user_id, request_id
       from event_store_events
       where tenant_id = ? and aggregate_type = ? and aggregate_id = ? and version > ?
       order by version asc`,
			[params.tenantId, params.aggregateType, params.aggregateId, from]
		);

		const events: StoredEvent[] = rows.map((r) => this.mapRowToStoredEvent(r));

		const maxRow = await conn.execute<{ v: number }[]>(
			`select coalesce(max(version), 0) as v
       from event_store_events
       where tenant_id = ? and aggregate_type = ? and aggregate_id = ?`,
			[params.tenantId, params.aggregateType, params.aggregateId]
		);
		const currentVersion = Number(maxRow[0]?.v ?? 0);
		return { currentVersion, events };
	}

	/**
	 * @description 批量加载事件（用于分析和投影重建）
	 *
	 * ⚠️ 此方法用于分析场景，不用于业务逻辑
	 */
	async loadAllEvents(filter?: EventFilter, options?: EventLoadOptions): Promise<StoredEvent[]> {
		const em = this.txHost.getCurrentEntityManager() ?? this.orm.em;
		const conn = em.getConnection();

		const { sql, params } = this.buildFilterQuery(filter, options);
		const rows = await conn.execute<any[]>(sql, params);

		return rows.map((r) => this.mapRowToStoredEvent(r));
	}

	/**
	 * @description 流式加载事件（用于大数据量处理）
	 *
	 * 使用 AsyncIterable 支持处理大量事件而不占用过多内存
	 */
	async *streamAllEvents(filter?: EventFilter, options?: EventLoadOptions): AsyncIterable<StoredEvent> {
		const em = this.txHost.getCurrentEntityManager() ?? this.orm.em;
		const conn = em.getConnection();

		const batchSize = filter?.batchSize ?? 1000;
		let offset = options?.offset ?? 0;
		const limit = options?.limit ?? Number.MAX_SAFE_INTEGER;
		let totalYielded = 0;

		while (totalYielded < limit) {
			const batchOptions: EventLoadOptions = {
				...options,
				limit: Math.min(batchSize, limit - totalYielded),
				offset
			};

			const { sql, params } = this.buildFilterQuery(filter, batchOptions);
			const rows = await conn.execute<any[]>(sql, params);

			if (rows.length === 0) {
				break;
			}

			for (const row of rows) {
				yield this.mapRowToStoredEvent(row);
				totalYielded++;
			}

			offset += rows.length;

			if (rows.length < batchSize) {
				break;
			}
		}
	}

	// ==================== ISnapshotStore 实现 ====================

	async saveSnapshot<TState = unknown>(snapshot: AggregateSnapshot<TState>): Promise<void> {
		const em = this.txHost.getCurrentEntityManager() ?? this.orm.em;
		const conn = em.getConnection();

		const stateJson = JSON.stringify(snapshot.state);

		await conn.execute(
			`insert into event_store_snapshots
       (id, tenant_id, aggregate_type, aggregate_id, version, state, metadata, created_at)
       values (?, ?, ?, ?, ?, ?, ?, ?)
       on conflict (tenant_id, aggregate_type, aggregate_id, version)
       do update set state = excluded.state, metadata = excluded.metadata, created_at = excluded.created_at`,
			[
				snapshot.id,
				snapshot.tenantId,
				snapshot.aggregateType,
				snapshot.aggregateId,
				snapshot.version,
				stateJson,
				snapshot.metadata ?? {},
				snapshot.createdAt
			]
		);
	}

	async loadLatestSnapshot<TState = unknown>(
		tenantId: string,
		aggregateType: string,
		aggregateId: string
	): Promise<AggregateSnapshot<TState> | null> {
		const em = this.txHost.getCurrentEntityManager() ?? this.orm.em;
		const conn = em.getConnection();

		const rows = await conn.execute<any[]>(
			`select id, tenant_id, aggregate_type, aggregate_id, version, state, metadata, created_at
       from event_store_snapshots
       where tenant_id = ? and aggregate_type = ? and aggregate_id = ?
       order by version desc
       limit 1`,
			[tenantId, aggregateType, aggregateId]
		);

		if (rows.length === 0) {
			return null;
		}

		return this.mapRowToSnapshot<TState>(rows[0]);
	}

	async loadSnapshotAtVersion<TState = unknown>(
		tenantId: string,
		aggregateType: string,
		aggregateId: string,
		maxVersion: number
	): Promise<AggregateSnapshot<TState> | null> {
		const em = this.txHost.getCurrentEntityManager() ?? this.orm.em;
		const conn = em.getConnection();

		const rows = await conn.execute<any[]>(
			`select id, tenant_id, aggregate_type, aggregate_id, version, state, metadata, created_at
       from event_store_snapshots
       where tenant_id = ? and aggregate_type = ? and aggregate_id = ? and version <= ?
       order by version desc
       limit 1`,
			[tenantId, aggregateType, aggregateId, maxVersion]
		);

		if (rows.length === 0) {
			return null;
		}

		return this.mapRowToSnapshot<TState>(rows[0]);
	}

	async deleteSnapshots(tenantId: string, aggregateType: string, aggregateId: string): Promise<void> {
		const em = this.txHost.getCurrentEntityManager() ?? this.orm.em;
		const conn = em.getConnection();

		await conn.execute(
			`delete from event_store_snapshots
       where tenant_id = ? and aggregate_type = ? and aggregate_id = ?`,
			[tenantId, aggregateType, aggregateId]
		);
	}

	// ==================== 私有方法 ====================

	/**
	 * @description 构建过滤查询 SQL
	 */
	private buildFilterQuery(filter?: EventFilter, options?: EventLoadOptions): { sql: string; params: unknown[] } {
		const conditions: string[] = [];
		const params: unknown[] = [];

		if (filter?.tenantId) {
			conditions.push('tenant_id = ?');
			params.push(filter.tenantId);
		}

		if (filter?.aggregateType) {
			conditions.push('aggregate_type = ?');
			params.push(filter.aggregateType);
		}

		if (filter?.aggregateId) {
			conditions.push('aggregate_id = ?');
			params.push(filter.aggregateId);
		}

		if (filter?.eventType) {
			conditions.push('event_type = ?');
			params.push(filter.eventType);
		}

		if (filter?.eventTypes && filter.eventTypes.length > 0) {
			const placeholders = filter.eventTypes.map(() => '?').join(', ');
			conditions.push(`event_type in (${placeholders})`);
			params.push(...filter.eventTypes);
		}

		if (filter?.from) {
			conditions.push('occurred_at >= ?');
			params.push(filter.from);
		}

		if (filter?.to) {
			conditions.push('occurred_at <= ?');
			params.push(filter.to);
		}

		if (filter?.fromVersion !== undefined) {
			conditions.push('version > ?');
			params.push(filter.fromVersion);
		}

		const whereClause = conditions.length > 0 ? `where ${conditions.join(' and ')}` : '';
		const orderDirection = options?.ascending === false ? 'desc' : 'asc';

		let sql = `select id, tenant_id, aggregate_type, aggregate_id, version, event_type, occurred_at, schema_version, event_data, user_id, request_id
                   from event_store_events ${whereClause} order by occurred_at ${orderDirection}, version ${orderDirection}`;

		if (options?.limit) {
			sql += ' limit ?';
			params.push(options.limit);
		}

		if (options?.offset) {
			sql += ' offset ?';
			params.push(options.offset);
		}

		return { sql, params };
	}

	/**
	 * @description 将数据库行映射为 StoredEvent
	 */
	private mapRowToStoredEvent(r: any): StoredEvent {
		return {
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
		};
	}

	/**
	 * @description 将数据库行映射为 AggregateSnapshot
	 */
	private mapRowToSnapshot<TState>(r: any): AggregateSnapshot<TState> {
		return {
			id: String(r.id),
			tenantId: String(r.tenant_id),
			aggregateType: String(r.aggregate_type),
			aggregateId: String(r.aggregate_id),
			version: Number(r.version),
			state: JSON.parse(r.state) as TState,
			metadata: r.metadata ?? {},
			createdAt: new Date(r.created_at)
		};
	}
}
