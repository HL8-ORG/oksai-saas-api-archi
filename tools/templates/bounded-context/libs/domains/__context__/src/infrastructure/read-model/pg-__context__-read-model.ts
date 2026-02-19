import { EntityManager } from '@mikro-orm/postgresql';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository } from '@mikro-orm/core';
import { Injectable } from '@nestjs/common';
import type { I__CONTEXT__ReadModel } from '../../application/ports/__context__-read-model.port';
import { __CONTEXT__ReadModelEntity } from './__context__-read-model.entity';

/**
 * @description __CONTEXT__ 读模型查询实现（PostgreSQL）（模板）
 */
@Injectable()
export class Pg__CONTEXT__ReadModel implements I__CONTEXT__ReadModel {
	constructor(
		@InjectRepository(__CONTEXT__ReadModelEntity)
		private readonly repo: EntityRepository<__CONTEXT__ReadModelEntity>
	) {}

	private get em(): EntityManager {
		return this.repo.getEntityManager() as EntityManager;
	}

	async findByTenantId(tenantId: string): Promise<{ tenantId: string; name: string } | null> {
		// 强约束：查询必须按 tenantId 过滤
		const row = await this.repo.findOne({ tenantId });
		if (!row) return null;
		return { tenantId: row.tenantId, name: row.name };
	}
}
