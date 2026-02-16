import { ClsServiceManager, type ClsService } from 'nestjs-cls';

/**
 * @description Oksai 请求上下文 Key（基于 CLS）
 *
 * 设计目标：
 * - 为多租户、审计、日志、错误处理提供统一的 request-scoped 上下文
 * - 避免业务代码直接依赖 header/adapter 细节
 */
export const OKSAI_REQUEST_CONTEXT_KEYS = {
	requestId: 'requestId',
	tenantId: 'tenantId',
	userId: 'userId',
	locale: 'locale'
} as const;

export type OksaiRequestContextKey = (typeof OKSAI_REQUEST_CONTEXT_KEYS)[keyof typeof OKSAI_REQUEST_CONTEXT_KEYS];

export interface OksaiRequestContext {
	requestId?: string;
	tenantId?: string;
	userId?: string;
	locale?: string;
}

/**
 * @description 在 Worker/非 HTTP 场景创建并运行一段带 Oksai CLS 上下文的逻辑
 *
 * 说明：
 * - 适用于后台任务（Worker、队列消费、定时任务等），用于显式指定 `tenantId/userId/locale/requestId`
 * - 会创建一个新的 CLS store（不会污染其他任务链路）
 * - 创建后可直接复用：
 *   - `@oksai/logger` 的 customProps（优先从 CLS 获取 tenantId/userId/locale）
 *   - `@oksai/db` 的 Tenant-Aware Repository/Service（从 `OksaiRequestContextService` 获取 tenantId）
 *
 * 前置条件：
 * - 应用必须装配 `setupOksaiContextModule()`（或至少装配 `setupOksaiClsModule()`），保证 CLS 已初始化。
 *
 * @param ctx - 需要写入的上下文字段
 * @param fn - 在该上下文中运行的逻辑（可同步或异步）
 * @returns fn 的返回值
 *
 * @throws {Error} 当 CLS 未初始化时抛出（避免在无上下文情况下"误以为已注入"）
 *
 * @example
 * ```ts
 * import { runWithOksaiContext } from '@oksai/context';
 *
 * await runWithOksaiContext(
 *   { tenantId: 't-001', userId: 'u-001', requestId: 'job-123', locale: 'zh' },
 *   async () => {
 *     // 在这里注入的 TenantAwareService / TenantAwareRepository 会自动读取 tenantId
 *   }
 * );
 * ```
 */
export function runWithOksaiContext<T>(ctx: OksaiRequestContext, fn: () => T): T {
	const cls = ClsServiceManager.getClsService();
	if (!cls) {
		throw new Error('CLS 未初始化：请确保应用已装配 setupOksaiContextModule()/setupOksaiClsModule()。');
	}

	return cls.runWith({} as any, () => {
		if (ctx.requestId) cls.set(OKSAI_REQUEST_CONTEXT_KEYS.requestId, ctx.requestId);
		if (ctx.tenantId) cls.set(OKSAI_REQUEST_CONTEXT_KEYS.tenantId, ctx.tenantId);
		if (ctx.userId) cls.set(OKSAI_REQUEST_CONTEXT_KEYS.userId, ctx.userId);
		if (ctx.locale) cls.set(OKSAI_REQUEST_CONTEXT_KEYS.locale, ctx.locale);
		return fn();
	});
}

/**
 * @description 从 CLS 中读取 OksaiRequestContext（便捷函数）
 *
 * @param cls - ClsService 实例
 * @returns 上下文字段快照
 */
export function getOksaiRequestContext(cls: Pick<ClsService, 'get'>): OksaiRequestContext {
	return {
		requestId: cls.get(OKSAI_REQUEST_CONTEXT_KEYS.requestId),
		tenantId: cls.get(OKSAI_REQUEST_CONTEXT_KEYS.tenantId),
		userId: cls.get(OKSAI_REQUEST_CONTEXT_KEYS.userId),
		locale: cls.get(OKSAI_REQUEST_CONTEXT_KEYS.locale)
	};
}

/**
 * @description 从"当前 CLS 上下文"读取请求上下文快照（无需 DI）
 *
 * 说明：
 * - 适用于无法直接注入 `OksaiRequestContextService` 的位置（例如 pino-http 的 customProps）
 * - 若 CLS 未初始化或当前不在请求链路中，会返回空对象
 */
export function getOksaiRequestContextFromCurrent(): OksaiRequestContext {
	try {
		const cls = ClsServiceManager.getClsService();
		return cls ? getOksaiRequestContext(cls) : {};
	} catch {
		return {};
	}
}
