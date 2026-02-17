import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable, from, switchMap } from 'rxjs';
import type { Auth } from 'better-auth';
import { OksaiRequestContextService } from '@oksai/context';
import { fromNodeHeaders } from './utils/node-headers';

/**
 * @description 认证上下文拦截器：尝试从 Better Auth 会话中解析 userId，并写入 CLS
 *
 * 设计目标：
 * - 对业务接口透明：未登录也不阻塞（仅尽力写入）
 * - 仅在非 /api/auth 路由上生效，避免递归调用
 */
@Injectable()
export class AuthContextInterceptor implements NestInterceptor {
	constructor(
		private readonly ctx: OksaiRequestContextService,
		private readonly auth: Auth
	) {}

	intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
		const http = context.switchToHttp();
		const req = http.getRequest<{ raw?: { url?: unknown; headers?: unknown }; headers?: unknown }>();

		const url = String((req?.raw?.url ?? '') as string);
		if (url.includes('/api/auth')) return next.handle();

		return from(this.trySetUserIdFromSession(req)).pipe(switchMap(() => next.handle()));
	}

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

