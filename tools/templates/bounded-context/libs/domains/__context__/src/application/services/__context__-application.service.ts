import type { IOutbox } from '@oksai/messaging';
import type { DatabaseUnitOfWork } from '@oksai/database';
import type { OksaiRequestContextService } from '@oksai/context';
import type { I__CONTEXT__Repository } from '../ports/__context__.repository.port';
import type { Create__CONTEXT__Command } from '../commands/create-__context__.command';
import { Create__CONTEXT__CommandHandler } from '../handlers/create-__context__.command-handler';

/**
 * @description __CONTEXT__ 应用服务（模板）
 *
 * 使用场景：
 * - 作为 presentation 层（Controller）进入应用层的统一入口
 */
export class __CONTEXT__ApplicationService {
	private readonly createHandler: Create__CONTEXT__CommandHandler;

	constructor(repo: I__CONTEXT__Repository, outbox: IOutbox, ctx: OksaiRequestContextService, uow?: DatabaseUnitOfWork) {
		this.createHandler = new Create__CONTEXT__CommandHandler(repo, outbox, ctx, uow);
	}

	async create(command: Create__CONTEXT__Command): Promise<{ id: string }> {
		return await this.createHandler.execute(command);
	}
}

