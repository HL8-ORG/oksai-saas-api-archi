import { Injectable } from '@nestjs/common';
import type { ICommand, ICommandHandler } from '../interfaces';

/**
 * @description 命令总线（CommandBus）
 *
 * 说明：
 * - 只负责“用例调度”（Command -> Handler），不包含 EventBus/Saga 能力
 * - 事件驱动（集成事件）必须使用 `@oksai/eda`（Outbox/Inbox/Publisher）
 */
@Injectable()
export class CommandBus {
	private readonly handlers = new Map<string, ICommandHandler>();

	/**
	 * @description 注册命令处理器（由 ExplorerService 在启动时自动调用）
	 *
	 * @param commandType - 命令类型（稳定字符串）
	 * @param handler - 处理器实例
	 * @throws Error 当重复注册同一 commandType 时
	 */
	register(commandType: string, handler: ICommandHandler): void {
		if (this.handlers.has(commandType)) {
			throw new Error(`命令处理器重复注册：commandType=${commandType}。`);
		}
		this.handlers.set(commandType, handler);
	}

	/**
	 * @description 执行命令（写用例入口）
	 *
	 * @param command - 命令对象（必须包含 type）
	 * @returns 用例结果
	 * @throws Error 当未找到匹配 handler 时
	 */
	async execute<TResult = unknown>(command: ICommand): Promise<TResult> {
		const handler = this.handlers.get(command.type);
		if (!handler) {
			throw new Error(`未找到命令处理器：commandType=${command.type}。`);
		}
		return (await handler.execute(command as any)) as TResult;
	}
}

