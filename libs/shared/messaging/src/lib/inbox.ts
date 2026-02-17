/**
 * @description
 * Inbox 去重接口（幂等消费）。
 *
 * 说明：
 * - 用于“至少一次投递”的场景，防止重复消费造成副作用重复执行
 * - 当前仅提供最小接口；后续可替换为 Redis/DB 持久化实现
 */
export interface IInbox {
	/**
	 * @description 检查 messageId 是否已处理
	 * @param messageId - 消息唯一标识
	 */
	isProcessed(messageId: string): Promise<boolean>;

	/**
	 * @description 标记 messageId 已处理
	 * @param messageId - 消息唯一标识
	 */
	markProcessed(messageId: string): Promise<void>;
}

