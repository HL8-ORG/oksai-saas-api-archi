import type { Disposable, IEventBus } from './event-bus';

/**
 * @description
 * 内存事件总线（仅用于本地开发/单体/测试）。
 *
 * 说明：
 * - 同进程内同步触发（通过 Promise 链异步化）
 * - 不提供持久化、不保证投递可靠性
 *
 * 使用场景：
 * - 在 Outbox/真实 MQ 未落地前，先跑通“发布 → 订阅 → 投影”闭环
 */
export class InMemoryEventBus implements IEventBus {
	private readonly handlers = new Map<string, Set<(event: unknown) => Promise<void>>>();

	async publish<TEvent extends object>(event: TEvent): Promise<void> {
		const anyEvent = event as { eventType?: unknown } | null | undefined;
		const eventType = typeof anyEvent?.eventType === 'string' ? anyEvent.eventType : event.constructor?.name ?? 'UnknownEvent';
		const set = this.handlers.get(eventType);
		if (!set || set.size === 0) return;

		// 并行触发；单个 handler 失败不影响其他 handler（由上层定义重试/死信策略）
		await Promise.allSettled(Array.from(set).map((h) => h(event)));
	}

	async subscribe<TEvent extends object>(eventType: string, handler: (event: TEvent) => Promise<void>): Promise<Disposable> {
		const set = this.handlers.get(eventType) ?? new Set();
		set.add(handler as unknown as (event: unknown) => Promise<void>);
		this.handlers.set(eventType, set);

		return {
			dispose: () => {
				const current = this.handlers.get(eventType);
				current?.delete(handler as any);
				if (current && current.size === 0) {
					this.handlers.delete(eventType);
				}
			}
		};
	}
}

