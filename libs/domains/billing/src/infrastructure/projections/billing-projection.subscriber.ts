import { Inject, Injectable } from '@nestjs/common';
import type { IEventBus, IInbox, IntegrationEventEnvelope } from '@oksai/messaging';
import { OKSAI_EVENT_BUS_TOKEN, OKSAI_INBOX_TOKEN } from '@oksai/messaging';
import type { DatabaseUnitOfWork } from '@oksai/database';
import { BaseIntegrationEventSubscriber } from '@oksai/eda';
import { MikroORM } from '@mikro-orm/core';
import { BillingReadModel } from '../read-model/billing-read-model.entity';

/**
 * @description Billing 投影订阅者
 *
 * 说明：
 * - 监听 BillingCreatedEvent/BillingPaidEvent 等事件
 * - 更新 billing_read_model 投影表
 *
 * 强约束：
 * - 使用 BaseIntegrationEventSubscriber 确保幂等消费
 * - tenantId/userId/requestId 自动从 CLS 获取
 */
@Injectable()
export class BillingProjectionSubscriber extends BaseIntegrationEventSubscriber {
	constructor(
		@Inject(OKSAI_EVENT_BUS_TOKEN) bus: IEventBus,
		@Inject(OKSAI_INBOX_TOKEN) inbox: IInbox,
		uow: DatabaseUnitOfWork,
		private readonly orm: MikroORM
	) {
		super(bus, inbox, uow);
	}

	protected async setupSubscriptions(): Promise<void> {
		await this.subscribe<{ aggregateId: string; eventData: any }>('BillingCreated', (env) =>
			this.handleBillingCreated(env)
		);
		await this.subscribe<{ aggregateId: string; eventData: any }>('BillingPaid', (env) =>
			this.handleBillingPaid(env)
		);
		await this.subscribe<{ aggregateId: string; eventData: any }>('BillingFailed', (env) =>
			this.handleBillingFailed(env)
		);
		await this.subscribe<{ aggregateId: string; eventData: any }>('BillingRefunded', (env) =>
			this.handleBillingRefunded(env)
		);
	}

	private async handleBillingCreated(
		env: IntegrationEventEnvelope<{ aggregateId: string; eventData: any }>
	): Promise<void> {
		const { payload } = env;
		const { aggregateId, eventData } = payload;
		const em = this.orm.em.fork();

		const existing = await em.findOne(BillingReadModel, { id: aggregateId });
		if (existing) {
			this.logger.debug(`账单已存在，跳过创建: ${aggregateId}`);
			return;
		}

		const model = em.create(BillingReadModel, {
			id: aggregateId,
			tenantId: eventData.tenantId,
			amount: eventData.amount,
			currency: eventData.currency,
			billingType: eventData.billingType,
			status: 'pending',
			description: eventData.description,
			createdAt: new Date(),
			updatedAt: new Date()
		});

		await em.persistAndFlush(model);
		this.logger.log(`账单投影已创建: ${aggregateId}`);
	}

	private async handleBillingPaid(
		env: IntegrationEventEnvelope<{ aggregateId: string; eventData: any }>
	): Promise<void> {
		const { payload } = env;
		const { aggregateId, eventData } = payload;
		const em = this.orm.em.fork();

		const model = await em.findOne(BillingReadModel, { id: aggregateId });
		if (!model) {
			this.logger.warn(`账单不存在，无法更新为已支付: ${aggregateId}`);
			return;
		}

		model.status = 'paid';
		model.paidAt = new Date(eventData.paidAt);
		model.updatedAt = new Date();
		await em.persistAndFlush(model);
		this.logger.log(`账单投影已更新为已支付: ${aggregateId}`);
	}

	private async handleBillingFailed(
		env: IntegrationEventEnvelope<{ aggregateId: string; eventData: any }>
	): Promise<void> {
		const { payload } = env;
		const { aggregateId, eventData } = payload;
		const em = this.orm.em.fork();

		const model = await em.findOne(BillingReadModel, { id: aggregateId });
		if (!model) {
			this.logger.warn(`账单不存在，无法更新为失败: ${aggregateId}`);
			return;
		}

		model.status = 'failed';
		model.failedAt = new Date(eventData.failedAt);
		model.updatedAt = new Date();
		await em.persistAndFlush(model);
		this.logger.log(`账单投影已更新为失败: ${aggregateId}`);
	}

	private async handleBillingRefunded(
		env: IntegrationEventEnvelope<{ aggregateId: string; eventData: any }>
	): Promise<void> {
		const { payload } = env;
		const { aggregateId, eventData } = payload;
		const em = this.orm.em.fork();

		const model = await em.findOne(BillingReadModel, { id: aggregateId });
		if (!model) {
			this.logger.warn(`账单不存在，无法更新为已退款: ${aggregateId}`);
			return;
		}

		model.status = 'refunded';
		model.refundAmount = eventData.refundAmount;
		model.updatedAt = new Date();
		await em.persistAndFlush(model);
		this.logger.log(`账单投影已更新为已退款: ${aggregateId}`);
	}
}
