import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable, from, switchMap } from 'rxjs';
import type { Auth } from 'better-auth';
import { OksaiRequestContextService } from '@oksai/context';
import { fromNodeHeaders } from './utils/node-headers';

/**
 * 认证上下文拦截器
 *
 * 尝试从 Better Auth 会话中解析 userId，并写入 CLS（请求上下文服务）。
 * 作为全局拦截器使用，对业务接口透明，未登录用户也不会被阻塞。
 *
 * @description
 * 设计目标：
 * - 透明处理：不影响未登录用户的请求流程
 * - 避免递归：对 `/api/auth` 路由跳过处理，避免与 BetterAuthController 冲突
 * - 避免重复解析：若 CLS 中已存在 userId 则跳过
 * - 容错处理：解析失败时静默放行，不阻塞主流程
 *
 * @example
 * ```typescript
 * // 通常在 setupAuthModule 中自动注册为全局拦截器
 * {
 *   provide: APP_INTERCEPTOR,
 *   useFactory: (ctx, auth) => new AuthContextInterceptor(ctx, auth),
 *   inject: [OksaiRequestContextService, OKSAI_BETTER_AUTH_TOKEN]
 * }
 * ```
 *
 * @see {@link AuthSessionGuard} 另一种在 Guard 阶段解析会话的方式
 * @see {@link OksaiRequestContextService} CLS 请求上下文服务
 */
@Injectable()
export class AuthContextInterceptor implements NestInterceptor {
	constructor(
		private readonly ctx: OksaiRequestContextService,
		private readonly auth: Auth
	) {}

	/**
	 * 拦截请求并尝试解析用户会话
	 *
	 * @param context - NestJS 执行上下文
	 * @param next - 调用处理器
	 * @returns 处理后的响应流
	 */
	intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
		const http = context.switchToHttp();
		const req = http.getRequest<{ raw?: { url?: unknown; headers?: unknown }; headers?: unknown }>();

		// 跳过 /api/auth 路由，避免递归调用
		const url = String((req?.raw?.url ?? '') as string);
		if (url.includes('/api/auth')) return next.handle();

		return from(this.trySetUserIdFromSession(req)).pipe(switchMap(() => next.handle()));
	}

	/**
	 * 尝试从会话中解析并设置用户 ID
	 *
	 * @param req - HTTP 请求对象
	 * @returns Promise<void>，解析成功时将 userId 写入 CLS
	 */
	private async trySetUserIdFromSession(req: any): Promise<void> {
		// 若已存在 userId，则不重复解析
		if (this.ctx.getUserId()) return;
		try {
			const nodeHeaders = (req?.raw?.headers ?? req?.headers ?? {}) as Record<string, unknown>;
			const headers = fromNodeHeaders(nodeHeaders as any);
			const res = await this.auth.handler(
				new Request('http://localhost/api/auth/get-session', {
					method: 'GET',
					headers
				})
			);
			if (!res.ok) return;
			const json = (await res.json()) as { user?: { id?: string } } | null;
			const userId = json?.user?.id;
			if (userId) this.ctx.setUserId(String(userId));
		} catch {
			// 不阻塞主流程：认证解析失败仅忽略
			return;
		}
	}
}
