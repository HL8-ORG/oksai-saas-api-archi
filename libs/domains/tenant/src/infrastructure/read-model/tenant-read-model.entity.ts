import { Entity, PrimaryKey, Property } from '@mikro-orm/core';

/**
 * @description 租户读模型表（Projection 输出）
 */
@Entity({ tableName: 'tenant_read_model' })
export class TenantReadModelEntity {
	@PrimaryKey({ fieldName: 'tenant_id' })
	tenantId!: string;

	@Property({ nullable: false })
	name!: string;

	@Property({ fieldName: 'created_at', nullable: false })
	createdAt: Date = new Date();

	@Property({ fieldName: 'updated_at', nullable: false })
	updatedAt: Date = new Date();
}

