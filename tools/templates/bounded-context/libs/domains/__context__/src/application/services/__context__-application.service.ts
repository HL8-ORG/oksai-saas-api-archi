import { Injectable } from '@nestjs/common';
import { CommandBus } from '@oksai/cqrs';
import type { Create__CONTEXT__Command } from '../commands/create-__context__.command';

/**
 * @description __CONTEXT__ 应用服务（模板）
 *
 * 使用场景：
 * - 作为 presentation 层（Controller）进入应用层的统一入口
 *
 * 变更说明：
 * - 已迁移到 CQRS 调度路径（通过 CommandBus.execute() 调用 handler）
 * - Handler 通过 @CommandHandler 装饰器自动注册到 CommandBus
 */
@Injectable()
export class __CONTEXT__ApplicationService {
	constructor(private readonly commandBus: CommandBus) {}

	/**
	 * @description 创建 __CONTEXT__
	 *
	 * @param command - 创建命令
	 * @returns 新创建的 __CONTEXT__ ID
	 */
	async create(command: Create__CONTEXT__Command): Promise<{ id: string }> {
		return await this.commandBus.execute<{ id: string }>(command);
	}
}
