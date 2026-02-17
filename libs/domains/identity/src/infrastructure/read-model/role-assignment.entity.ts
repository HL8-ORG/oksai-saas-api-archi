import { Entity, Index, PrimaryKey, Property } from '@mikro-orm/core';
import { randomUUID } from 'node:crypto';

/**
 * @description Identity 角色分配读模型（用于 CASL RoleResolver 查询）
 *
 * 说明：
 * - tenantId 为 null 表示平台角色（Platform scope）
 * - tenantId 非空表示租户角色（Tenant scope）
 */
@Entity({ tableName: 'identity_role_assignments' })
@Index({ properties: ['userId'] })
@Index({ properties: ['tenantId'] })
export class IdentityRoleAssignmentEntity {
	@PrimaryKey()
	id: string = randomUUID();

	@Property({ nullable: false })
	userId!: string;

	@Property({ nullable: true })
	tenantId?: string | null;

	@Property({ nullable: false })
	role!: string;

	@Property({ nullable: false })
	createdAt: Date = new Date();
}

