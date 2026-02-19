import { Injectable } from '@nestjs/common';
import { MikroORM } from '@mikro-orm/core';
import { DatabaseTransactionHost } from '@oksai/database';
import type { TenantAnalyticsReadModel, ITenantAnalyticsRepository } from '../read-model/tenant-analytics.read-model';

/**
 * @description PostgreSQL 租户分析读模型仓库实现
 *
 * 使用原生 SQL 进行高性能的读模型操作
 */
@Injectable()
export class PgTenantAnalyticsRepository implements ITenantAnalyticsRepository {
	constructor(
		private readonly orm: MikroORM,
		private readonly txHost: DatabaseTransactionHost
	) {}

	async upsert(model: TenantAnalyticsReadModel): Promise<void> {
		const em = this.txHost.getCurrentEntityManager() ?? this.orm.em;
		const conn = em.getConnection();

		await conn.execute(
			`insert into tenant_analytics_read_model 
       (tenant_id, name, status, member_count, active_user_count, data_import_count, analysis_count, created_at, updated_at, last_active_at)
       values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       on conflict (tenant_id) do update
       set name = excluded.name,
           status = excluded.status,
           member_count = excluded.member_count,
           active_user_count = excluded.active_user_count,
           data_import_count = excluded.data_import_count,
           analysis_count = excluded.analysis_count,
           updated_at = excluded.updated_at,
           last_active_at = excluded.last_active_at`,
			[
				model.tenantId,
				model.name,
				model.status,
				model.memberCount,
				model.activeUserCount,
				model.dataImportCount,
				model.analysisCount,
				model.createdAt,
				model.updatedAt,
				model.lastActiveAt ?? null
			]
		);
	}

	async findById(tenantId: string): Promise<TenantAnalyticsReadModel | null> {
		const em = this.txHost.getCurrentEntityManager() ?? this.orm.em;
		const conn = em.getConnection();

		const rows = await conn.execute<any[]>(
			`select tenant_id, name, status, member_count, active_user_count, data_import_count, analysis_count, created_at, updated_at, last_active_at
       from tenant_analytics_read_model
       where tenant_id = ?`,
			[tenantId]
		);

		if (rows.length === 0) {
			return null;
		}

		return this.mapRowToReadModel(rows[0]);
	}

	async findAll(): Promise<TenantAnalyticsReadModel[]> {
		const em = this.txHost.getCurrentEntityManager() ?? this.orm.em;
		const conn = em.getConnection();

		const rows = await conn.execute<any[]>(
			`select tenant_id, name, status, member_count, active_user_count, data_import_count, analysis_count, created_at, updated_at, last_active_at
       from tenant_analytics_read_model
       order by created_at desc`
		);

		return rows.map((row) => this.mapRowToReadModel(row));
	}

	async incrementMemberCount(tenantId: string, delta: number): Promise<void> {
		const em = this.txHost.getCurrentEntityManager() ?? this.orm.em;
		const conn = em.getConnection();

		await conn.execute(
			`update tenant_analytics_read_model
       set member_count = member_count + ?, updated_at = ?
       where tenant_id = ?`,
			[delta, new Date(), tenantId]
		);
	}

	async incrementDataImportCount(tenantId: string, delta: number): Promise<void> {
		const em = this.txHost.getCurrentEntityManager() ?? this.orm.em;
		const conn = em.getConnection();

		await conn.execute(
			`update tenant_analytics_read_model
       set data_import_count = data_import_count + ?, updated_at = ?
       where tenant_id = ?`,
			[delta, new Date(), tenantId]
		);
	}

	async incrementAnalysisCount(tenantId: string, delta: number): Promise<void> {
		const em = this.txHost.getCurrentEntityManager() ?? this.orm.em;
		const conn = em.getConnection();

		await conn.execute(
			`update tenant_analytics_read_model
       set analysis_count = analysis_count + ?, updated_at = ?
       where tenant_id = ?`,
			[delta, new Date(), tenantId]
		);
	}

	async updateStatus(tenantId: string, status: TenantAnalyticsReadModel['status']): Promise<void> {
		const em = this.txHost.getCurrentEntityManager() ?? this.orm.em;
		const conn = em.getConnection();

		await conn.execute(
			`update tenant_analytics_read_model
       set status = ?, updated_at = ?
       where tenant_id = ?`,
			[status, new Date(), tenantId]
		);
	}

	async updateLastActiveAt(tenantId: string, lastActiveAt: Date): Promise<void> {
		const em = this.txHost.getCurrentEntityManager() ?? this.orm.em;
		const conn = em.getConnection();

		await conn.execute(
			`update tenant_analytics_read_model
       set last_active_at = ?, updated_at = ?
       where tenant_id = ?`,
			[lastActiveAt, new Date(), tenantId]
		);
	}

	async clear(): Promise<void> {
		const em = this.txHost.getCurrentEntityManager() ?? this.orm.em;
		const conn = em.getConnection();

		await conn.execute(`truncate table tenant_analytics_read_model`);
	}

	/**
	 * @description 将数据库行映射为读模型
	 */
	private mapRowToReadModel(row: any): TenantAnalyticsReadModel {
		return {
			tenantId: String(row.tenant_id),
			name: String(row.name),
			status: row.status as TenantAnalyticsReadModel['status'],
			memberCount: Number(row.member_count),
			activeUserCount: Number(row.active_user_count),
			dataImportCount: Number(row.data_import_count),
			analysisCount: Number(row.analysis_count),
			createdAt: new Date(row.created_at),
			updatedAt: new Date(row.updated_at),
			lastActiveAt: row.last_active_at ? new Date(row.last_active_at) : undefined
		};
	}
}
