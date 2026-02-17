/**
 * @description 全局事件总线 Token
 *
 * 说明：
 * - 统一使用该 token 注入事件总线，避免直接依赖具体实现类
 * - 该 token 仅代表“同进程事件总线”抽象，跨进程投递需后续引入 Outbox/消息队列
 */
export const OKSAI_EVENT_BUS_TOKEN = Symbol.for('oksai:messaging:eventBus');

/**
 * @description 全局 Inbox Token（幂等去重）
 */
export const OKSAI_INBOX_TOKEN = Symbol.for('oksai:messaging:inbox');

/**
 * @description 全局 Outbox Token（发布侧一致性）
 */
export const OKSAI_OUTBOX_TOKEN = Symbol.for('oksai:messaging:outbox');

/**
 * @description Inbox 内部实现 Token（用于装配层包装/替换实现）
 */
export const OKSAI_INBOX_INNER_TOKEN = Symbol.for('oksai:messaging:inbox:inner');

/**
 * @description Outbox 内部实现 Token（用于装配层包装/替换实现）
 */
export const OKSAI_OUTBOX_INNER_TOKEN = Symbol.for('oksai:messaging:outbox:inner');
