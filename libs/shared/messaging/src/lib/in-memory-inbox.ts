import type { IInbox } from './inbox';

/**
 * @description
 * 内存 Inbox（仅用于开发/测试）。
 *
 * 注意事项：
 * - 进程重启会丢失去重记录
 * - 不适用于生产环境
 */
export class InMemoryInbox implements IInbox {
	private readonly processed = new Set<string>();

	async isProcessed(messageId: string): Promise<boolean> {
		return this.processed.has(messageId);
	}

	async markProcessed(messageId: string): Promise<void> {
		this.processed.add(messageId);
	}
}

