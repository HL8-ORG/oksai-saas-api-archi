import { EntityRepository } from '@mikro-orm/core';
import { InjectRepository } from '@mikro-orm/nestjs';
import { Injectable } from '@nestjs/common';
import type { IRoleResolver } from '@oksai/authorization';
import { IdentityRoleAssignmentEntity } from './role-assignment.entity';

/**
 * @description PostgreSQL 版角色解析器（IRoleResolver）
 *
 * 使用场景：
 * - 作为 @oksai/authorization 的 roleResolver 实现，供 CASL AbilityFactory 查询角色
 */
@Injectable()
export class PgRoleResolver implements IRoleResolver {
	constructor(
		@InjectRepository(IdentityRoleAssignmentEntity)
		private readonly repo: EntityRepository<IdentityRoleAssignmentEntity>
	) {}

	async getPlatformRoles(params: { userId: string }): Promise<string[]> {
		const rows = await this.repo.find({ userId: params.userId, tenantId: null });
		return rows.map((r) => r.role);
	}

	async getTenantRoles(params: { tenantId: string; userId: string }): Promise<string[]> {
		const rows = await this.repo.find({ userId: params.userId, tenantId: params.tenantId });
		return rows.map((r) => r.role);
	}
}
