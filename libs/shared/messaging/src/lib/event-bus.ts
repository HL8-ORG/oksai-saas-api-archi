/**
 * @description
 * 消息/事件总线抽象（最小集合）。
 *
 * 设计目标：
 * - Application/Domain 只依赖抽象，不依赖具体 MQ/Redis Streams/RabbitMQ 等实现
 * - 支持同进程（同步）与跨进程（异步）的统一调用形态
 *
 * 注意事项：
 * - 跨进程投递通常是“至少一次”，因此消费端必须幂等（参见 ARCHITECTURE.md 6.5）
 */
export interface IEventBus {
	/**
	 * @description 发布事件
	 * @param event - 领域事件/集成事件
	 */
	publish<TEvent extends object>(event: TEvent): Promise<void>;

	/**
	 * @description 订阅事件
	 *
	 * @param eventType - 事件类型标识（通常为 event.eventType）
	 * @param handler - 处理函数
	 * @returns Disposable，用于取消订阅
	 */
	subscribe<TEvent extends object>(eventType: string, handler: (event: TEvent) => Promise<void>): Promise<Disposable>;
}

/**
 * @description 可释放资源（取消订阅等）
 */
export interface Disposable {
	dispose(): Promise<void> | void;
}

