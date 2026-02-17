import { Entity, Index, PrimaryKey, Property, Unique, types } from '@mikro-orm/core';
import { randomUUID } from 'node:crypto';

/**
 * @description
 * 事件存储表实体（PostgreSQL）。
 *
 * 强约束：
 * - (tenantId, aggregateType, aggregateId, version) 必须唯一
 * - append-only：禁止更新/删除（通过权限与代码约束共同保证）
 */
@Entity({ tableName: 'event_store_events' })
@Unique({ properties: ['tenantId', 'aggregateType', 'aggregateId', 'version'], name: 'uniq_event_stream' })
@Index({ properties: ['tenantId', 'aggregateType', 'aggregateId', 'version'], name: 'idx_event_stream' })
export class EventStoreEventEntity {
	@PrimaryKey()
	id: string = randomUUID();

	@Property({ fieldName: 'tenant_id', nullable: false })
	tenantId!: string;

	@Property({ fieldName: 'aggregate_type', nullable: false })
	aggregateType!: string;

	@Property({ fieldName: 'aggregate_id', nullable: false })
	aggregateId!: string;

	@Property({ nullable: false })
	version!: number;

	@Property({ fieldName: 'event_type', nullable: false })
	eventType!: string;

	@Property({ fieldName: 'occurred_at', nullable: false })
	occurredAt!: Date;

	@Property({ fieldName: 'schema_version', nullable: false })
	schemaVersion!: number;

	@Property({ fieldName: 'event_data', type: types.json, nullable: false })
	eventData!: object;

	@Property({ fieldName: 'user_id', nullable: true })
	userId?: string;

	@Property({ fieldName: 'request_id', nullable: true })
	requestId?: string;

	@Property({ fieldName: 'created_at', nullable: false })
	createdAt: Date = new Date();
}

