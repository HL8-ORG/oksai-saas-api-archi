import { Entity, PrimaryKey, Property } from '@mikro-orm/core';

/**
 * @description __CONTEXT__ 读模型实体（模板）
 *
 * 强约束：
 * - 必须包含 tenantId，并且所有查询必须按 tenantId 过滤
 */
@Entity({ tableName: '__context___read_models' })
export class __CONTEXT__ReadModelEntity {
	@PrimaryKey()
	tenantId!: string;

	@Property({ nullable: false })
	name!: string;

	@Property({ nullable: false })
	updatedAt: Date = new Date();
}

