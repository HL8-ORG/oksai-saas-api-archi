import { Injectable } from '@nestjs/common';
import { CommandBus } from '@oksai/cqrs';
import type { RegisterUserCommand } from '../commands/register-user.command';

/**
 * @description Identity 应用服务（用例门面）
 *
 * 使用场景：
 * - Presentation 层（Controller/Resolver）调用应用层时的入口点
 * - 避免 Controller 直接依赖多个 handler / port（降低装配复杂度）
 *
 * 注意事项：
 * - 该类保持无状态
 * - 不包含领域规则细节
 *
 * 变更说明：
 * - 已迁移到 CQRS 调度路径（通过 CommandBus.execute() 调用 handler）
 * - Handler 通过 @CommandHandler 装饰器自动注册到 CommandBus
 */
@Injectable()
export class IdentityApplicationService {
	constructor(private readonly commandBus: CommandBus) {}

	/**
	 * @description 注册用户
	 * @param command - 命令
	 * @returns 用户 ID
	 */
	async registerUser(command: RegisterUserCommand): Promise<{ userId: string }> {
		return await this.commandBus.execute<{ userId: string }>(command);
	}
}
