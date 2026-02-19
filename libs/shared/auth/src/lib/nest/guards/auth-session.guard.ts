import { CanActivate, ExecutionContext, Injectable, Inject } from '@nestjs/common';
import type { Auth } from 'better-auth';
import { OksaiRequestContextService } from '@oksai/context';
import { OKSAI_BETTER_AUTH_TOKEN } from '../tokens';
import { fromNodeHeaders } from '../utils/node-headers';

/**
 * 会话解析守卫（可选认证）
 *
 * 在 Guard 阶段尽早解析 Better Auth session，并将 userId 写入 CLS（请求上下文服务）。
 * 该守卫不强制要求登录，若无有效会话则放行，由后续守卫（如 PoliciesGuard）决定是否阻断请求。
 *
 * @description
 * 设计目标：
 * - 透明解析：不影响未登录用户的请求流程
 * - 避免重复解析：若 CLS 中已存在 userId 则跳过
 * - 容错处理：解析失败时静默放行，不阻塞主流程
 *
 * @example
 * ```typescript
 * // 在 Controller 或全局使用
 * @UseGuards(AuthSessionGuard)
 * @Get('profile')
 * async getProfile() {
 *   // this.ctx.getUserId() 可获取当前用户 ID
 * }
 * ```
 *
 * @see {@link OksaiRequestContextService} CLS 请求上下文服务
 */
@Injectable()
export class AuthSessionGuard implements CanActivate {
	constructor(
		private readonly ctx: OksaiRequestContextService,
		@Inject(OKSAI_BETTER_AUTH_TOKEN) private readonly auth: Auth
	) {}

	/**
	 * 执行会话解析
	 *
	 * @param context - NestJS 执行上下文
	 * @returns 始终返回 true（该守卫不阻断请求）
	 */
	/**
	 * 尝试从 Better Auth 会话中解析用户 ID
	 *
	 * @param context - NestJS 执行上下文
	 * @returns 始终返回 true，不会阻断请求
	 */
	async canActivate(context: ExecutionContext): Promise<boolean> {
		// 若已存在 userId，则不重复解析
		if (this.ctx.getUserId()) return true;

		const http = context.switchToHttp();
		const req = http.getRequest<{ raw?: { headers?: unknown }; headers?: unknown }>();

		try {
			const nodeHeaders = (req?.raw?.headers ?? req?.headers ?? {}) as Record<string, unknown>;
			const headers = fromNodeHeaders(nodeHeaders as any);
			const res = await this.auth.handler(
				new Request('http://localhost/api/auth/get-session', {
					method: 'GET',
					headers
				})
			);
			if (!res.ok) return true;
			const json = (await res.json()) as { user?: { id?: string } } | null;
			const userId = json?.user?.id;
			if (userId) this.ctx.setUserId(String(userId));
		} catch {
			// 认证解析失败时静默放行，不阻塞主流程
			return true;
		}

		return true;
	}
}
