import { Injectable } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@oksai/cqrs';
import { OksaiRequestContextService } from '@oksai/context';
import type { IOutbox } from '@oksai/messaging';
import { createIntegrationEventEnvelope } from '@oksai/messaging';
import type { DatabaseUnitOfWork } from '@oksai/database';
import type { IUserRepository } from '../ports/user.repository.port';
import { REGISTER_USER_COMMAND_TYPE, type RegisterUserCommand } from '../commands/register-user.command';
import { UserAggregate } from '../../domain/aggregates/user.aggregate';

/**
 * @description 注册用户命令处理器
 *
 * 说明：
 * - 负责编排：创建聚合 → 持久化 → 发布事件
 * - 不包含业务规则细节（交由领域对象保证）
 *
 * 使用方式：
 * - 通过 @CommandHandler 装饰器自动注册到 CommandBus
 * - 由 ApplicationService 通过 commandBus.execute() 调用
 *
 * 强约束：
 * - 发布侧写入 Outbox（不直接 publish）
 * - userId 必须来自可信上下文（后续由 Better Auth 统一生成/管理）
 */
@Injectable()
@CommandHandler(REGISTER_USER_COMMAND_TYPE)
export class RegisterUserCommandHandler implements ICommandHandler<RegisterUserCommand, { userId: string }> {
	constructor(
		private readonly repo: IUserRepository,
		private readonly outbox: IOutbox,
		private readonly ctx: OksaiRequestContextService,
		private readonly uow?: DatabaseUnitOfWork
	) {}

	async execute(command: RegisterUserCommand): Promise<{ userId: string }> {
		const agg = UserAggregate.register(command.userId, command.email);
		const events = agg.getUncommittedEvents();

		const tenantId = this.ctx.getTenantId();
		const requestId = this.ctx.getRequestId();
		const userId = this.ctx.getUserId();

		const envelopes = events.map((e) =>
			createIntegrationEventEnvelope(e.eventType, e.eventData, {
				schemaVersion: e.schemaVersion ?? 1,
				tenantId: tenantId ?? undefined,
				userId: userId ?? undefined,
				requestId: requestId ?? undefined
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

		return { userId: command.userId };
	}
}
