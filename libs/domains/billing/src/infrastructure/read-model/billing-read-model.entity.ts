import { Entity, Index, PrimaryKey, Property } from '@mikro-orm/core';
import { randomUUID } from 'node:crypto';

/**
 * @description 账单读模型实体（PostgreSQL 投影表）
 *
 * 说明：
 * - 由 BillingProjectionSubscriber 从 BillingCreatedEvent/BillingPaidEvent 等事件更新
 * - 用于查询账单列表和详情
 */
@Entity({ tableName: 'billing_read_model' })
@Index({ properties: ['tenantId'] })
@Index({ properties: ['status'] })
export class BillingReadModel {
	@PrimaryKey()
	id: string = randomUUID();

	@Property({ nullable: false })
	tenantId!: string;

	@Property({ nullable: false })
	amount!: number;

	@Property({ nullable: false, length: 3 })
	currency!: string;

	@Property({ nullable: false })
	billingType!: string;

	@Property({ nullable: false })
	status!: string;

	@Property({ nullable: true })
	description?: string;

	@Property({ nullable: true })
	paidAt?: Date;

	@Property({ nullable: true })
	failedAt?: Date;

	@Property({ nullable: true })
	refundAmount?: number;

	@Property({ nullable: false })
	createdAt: Date = new Date();

	@Property({ nullable: false, onUpdate: () => new Date() })
	updatedAt: Date = new Date();
}
