import { Migration } from '@mikro-orm/migrations';

/**
 * @description
 * 初始化事件溯源/消息/投影相关表结构（最小闭环）。
 */
export class Migration202602170001 extends Migration {
	async up(): Promise<void> {
		// 事件存储表
		this.addSql(`
      create table if not exists event_store_events (
        id uuid primary key,
        tenant_id text not null,
        aggregate_type text not null,
        aggregate_id text not null,
        version int not null,
        event_type text not null,
        occurred_at timestamptz not null,
        schema_version int not null,
        event_data jsonb not null,
        user_id text null,
        request_id text null,
        created_at timestamptz not null
      );
    `);
		this.addSql(`
      create unique index if not exists uniq_event_stream
      on event_store_events (tenant_id, aggregate_type, aggregate_id, version);
    `);

		// Outbox
		this.addSql(`
      create table if not exists messaging_outbox (
        id uuid primary key,
        message_id text not null,
        event_type text not null,
        occurred_at timestamptz not null,
        schema_version int not null,
        tenant_id text null,
        user_id text null,
        request_id text null,
        payload jsonb not null,
        status text not null,
        attempts int not null,
        next_attempt_at timestamptz not null,
        last_error text null,
        created_at timestamptz not null,
        updated_at timestamptz not null
      );
    `);
		this.addSql(`create unique index if not exists uniq_outbox_message_id on messaging_outbox (message_id);`);
		this.addSql(`create index if not exists idx_outbox_pending on messaging_outbox (status, next_attempt_at);`);

		// Inbox
		this.addSql(`
      create table if not exists messaging_inbox (
        id uuid primary key,
        message_id text not null,
        processed_at timestamptz not null
      );
    `);
		this.addSql(`create unique index if not exists uniq_inbox_message_id on messaging_inbox (message_id);`);

		// 投影读模型
		this.addSql(`
      create table if not exists tenant_read_model (
        tenant_id text primary key,
        name text not null,
        created_at timestamptz not null,
        updated_at timestamptz not null
      );
    `);

		// 投影水位
		this.addSql(`
      create table if not exists projection_checkpoints (
        projection_name text primary key,
        last_message_id text null,
        updated_at timestamptz not null
      );
    `);
	}
}
