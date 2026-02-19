import { Injectable } from '@nestjs/common';
import { MikroORM } from '@mikro-orm/core';
import { DatabaseTransactionHost } from '@oksai/database';
import type { ITenantReadModel } from '../../application/ports/tenant-read-model.port';

/**
 * @description PostgreSQL 租户读模型实现
 */
@Injectable()
export class PgTenantReadModel implements ITenantReadModel {
	constructor(
		private readonly orm: MikroORM,
		private readonly txHost: DatabaseTransactionHost
	) {}

	async findByTenantId(tenantId: string): Promise<{ tenantId: string; name: string } | null> {
		const em = this.txHost.getCurrentEntityManager() ?? this.orm.em;
		const conn = em.getConnection();
		const rows = await conn.execute<any[]>(
			`select tenant_id, name from tenant_read_model where tenant_id = ? limit 1`,
			[tenantId]
		);
		if (rows.length === 0) return null;
		return { tenantId: String(rows[0]!.tenant_id), name: String(rows[0]!.name) };
	}
}
