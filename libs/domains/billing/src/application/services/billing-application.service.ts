import { Injectable } from '@nestjs/common';
import { CommandBus } from '@oksai/cqrs';
import type { CreateBillingCommand } from '../commands/billing.commands';

/**
 * @description Billing 应用服务
 */
@Injectable()
export class BillingApplicationService {
	constructor(private readonly commandBus: CommandBus) {}

	async createBilling(command: CreateBillingCommand): Promise<{ billingId: string }> {
		return await this.commandBus.execute<{ billingId: string }>(command);
	}
}
