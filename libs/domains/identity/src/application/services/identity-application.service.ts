import type { IOutbox } from '@oksai/messaging';
import type { DatabaseUnitOfWork } from '@oksai/database';
import type { OksaiRequestContextService } from '@oksai/context';
import type { IUserRepository } from '../ports/user.repository.port';
import type { RegisterUserCommand } from '../commands/register-user.command';
import { RegisterUserCommandHandler } from '../handlers/register-user.command-handler';

/**
 * @description Identity 应用服务（最小实现）
 *
 * 使用场景：
 * - 作为表现层（Controller）进入应用层的统一入口
 */
export class IdentityApplicationService {
	private readonly registerUserHandler: RegisterUserCommandHandler;

	constructor(repo: IUserRepository, outbox: IOutbox, ctx: OksaiRequestContextService, uow?: DatabaseUnitOfWork) {
		this.registerUserHandler = new RegisterUserCommandHandler(repo, outbox, ctx, uow);
	}

	async registerUser(command: RegisterUserCommand): Promise<{ userId: string }> {
		return await this.registerUserHandler.execute(command);
	}
}

