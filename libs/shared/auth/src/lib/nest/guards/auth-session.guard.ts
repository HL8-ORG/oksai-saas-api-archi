import { CanActivate, ExecutionContext, Injectable, Inject } from '@nestjs/common';
import type { Auth } from 'better-auth';
import { OksaiRequestContextService } from '@oksai/context';
import { OKSAI_BETTER_AUTH_TOKEN } from '../tokens';
import { fromNodeHeaders } from '../utils/node-headers';

/**
 * @description 会话解析守卫（可选认证）
 *
 * 设计目标：
 * - 在 Guard 阶段尽早解析 Better Auth session，并把 userId 写入 CLS
 * - 不强制登录：若无会话则放行（由后续 PoliciesGuard/业务守卫决定是否阻断）
 */
@Injectable()
export class AuthSessionGuard implements CanActivate {
	constructor(
		private readonly ctx: OksaiRequestContextService,
		@Inject(OKSAI_BETTER_AUTH_TOKEN) private readonly auth: Auth
	) {}

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
			return true;
		}

		return true;
	}
}

