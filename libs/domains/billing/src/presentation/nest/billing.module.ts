import { Module, type DynamicModule } from '@nestjs/common';
import { OksaiCqrsModule } from '@oksai/cqrs';
import { BillingApplicationService } from '../../application/services/billing-application.service';
import { CreateBillingCommandHandler } from '../../application/handlers/create-billing.command-handler';

/**
 * @description Billing 上下文 Nest 装配模块
 */
@Module({})
export class BillingModule {
	static forRoot(options: { persistence?: 'inMemory' } = {}): DynamicModule {
		return {
			module: BillingModule,
			imports: [OksaiCqrsModule],
			providers: [CreateBillingCommandHandler, BillingApplicationService],
			exports: [BillingApplicationService]
		};
	}
}
