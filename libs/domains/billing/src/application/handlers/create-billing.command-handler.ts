import { Injectable } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@oksai/cqrs';
import { OksaiRequestContextService } from '@oksai/context';
import type { IOutbox } from '@oksai/messaging';
import { createIntegrationEventEnvelope } from '@oksai/messaging';
import type { DatabaseUnitOfWork } from '@oksai/database';
import { CREATE_BILLING_COMMAND_TYPE, type CreateBillingCommand } from '../commands/billing.commands';
import { BillingAggregate } from '../../domain/aggregates/billing.aggregate';
import { BillingId, Money, BillingType } from '../../domain/value-objects';

/**
 * @description 创建账单命令处理器
 */
@Injectable()
@CommandHandler(CREATE_BILLING_COMMAND_TYPE)
export class CreateBillingCommandHandler implements ICommandHandler<CreateBillingCommand, { billingId: string }> {
	constructor(
		private readonly outbox: IOutbox,
		private readonly ctx: OksaiRequestContextService,
		private readonly uow?: DatabaseUnitOfWork
	) {}

	async execute(command: CreateBillingCommand): Promise<{ billingId: string }> {
		const id = BillingId.generate();
		const amount = Money.from(command.amount, command.currency);
		const billingType = command.billingType as BillingType;

		const billing = BillingAggregate.create(id, command.tenantId, amount, billingType, command.description);

		const events = billing.getUncommittedEvents();
		const envelopes = events.map((e) =>
			createIntegrationEventEnvelope(e.eventType, {
				aggregateId: e.aggregateId,
				occurredAt: e.occurredAt.toISOString(),
				eventData: e.eventData,
				schemaVersion: e.schemaVersion ?? 1
			})
		);

		const persist = async () => {
			for (const env of envelopes) {
				await this.outbox.append(env);
			}
			billing.commitUncommittedEvents();
		};

		if (this.uow) {
			await this.uow.transactional(persist);
		} else {
			await persist();
		}

		return { billingId: id.toString() };
	}
}
