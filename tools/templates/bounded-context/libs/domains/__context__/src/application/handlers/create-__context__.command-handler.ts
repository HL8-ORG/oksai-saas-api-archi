import { Injectable } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@oksai/cqrs';
import { OksaiRequestContextService } from '@oksai/context';
import type { IOutbox } from '@oksai/messaging';
import { createIntegrationEventEnvelope } from '@oksai/messaging';
import type { DatabaseUnitOfWork } from '@oksai/database';
import type { I__CONTEXT__Repository } from '../ports/__context__.repository.port';
import { CREATE___CONTEXT___COMMAND_TYPE, type Create__CONTEXT__Command } from '../commands/create-__context__.command';
import { __CONTEXT__Aggregate } from '../../domain/aggregates/__context__.aggregate';

/**
 * @description 创建 __CONTEXT__ 用例处理器（模板）
 *
 * 强约束：
 * - tenantId 必须来自 CLS
 * - 写侧必须先落库（EventStore/Outbox）再由 publisher 异步投递
 *
 * 使用方式：
 * - 通过 @CommandHandler 装饰器自动注册到 CommandBus
 * - 由 ApplicationService 通过 commandBus.execute() 调用
 */
@Injectable()
@CommandHandler(CREATE___CONTEXT___COMMAND_TYPE)
export class Create__CONTEXT__CommandHandler implements ICommandHandler<Create__CONTEXT__Command, { id: string }> {
	constructor(
		private readonly repo: I__CONTEXT__Repository,
		private readonly outbox: IOutbox,
		private readonly ctx: OksaiRequestContextService,
		private readonly uow?: DatabaseUnitOfWork
	) {}

	async execute(command: Create__CONTEXT__Command): Promise<{ id: string }> {
		const id = generateId();

		// 模板：演示如何在用例入口写入 CLS 中的 tenantId（实际项目应按业务定义 tenantId 生命周期）
		this.ctx.setTenantId(id);

		const agg = __CONTEXT__Aggregate.create(id, command.name);
		const events = agg.getUncommittedEvents();
		const envelopes = events.map((e) =>
			createIntegrationEventEnvelope(e.eventType, {
				aggregateId: e.aggregateId,
				occurredAt: e.occurredAt.toISOString(),
				eventData: e.eventData,
				schemaVersion: e.schemaVersion ?? 1
			})
		);

		const persist = async () => {
			await this.repo.save(agg);
			for (const env of envelopes) {
				await this.outbox.append(env);
			}
			agg.commitUncommittedEvents();
		};

		if (this.uow) {
			await this.uow.transactional(persist);
		} else {
			await persist();
		}

		return { id };
	}
}

function generateId(): string {
	const rand = Math.random().toString(36).slice(2, 8);
	return `x_${Date.now()}_${rand}`;
}
