import { All, Controller, Inject, Optional, Req, Res } from '@nestjs/common';
import type { Auth } from 'better-auth';
import type { IOutbox } from '@oksai/messaging';
import { createIntegrationEventEnvelope, OKSAI_OUTBOX_TOKEN } from '@oksai/messaging';
import { OKSAI_BETTER_AUTH_TOKEN } from './tokens';
import { fromNodeHeaders } from './utils/node-headers';

/**
 * Better Auth 路由转发控制器（NestJS + Fastify 适配）
 *
 * 将所有 `/api/auth/*` 路由的请求转发到 Better Auth handler 进行处理。
 * 由于 Fastify 可能已提前解析 body，本控制器会手动构造标准 Web Request 对象调用 Better Auth。
 *
 * @description
 * 支持的功能：
 * - 用户注册（sign-up/email）
 * - 用户登录（sign-in/email）
 * - 会话管理（get-session）
 * - 账户管理相关操作
 *
 * 事件发布：
 * - 用户注册成功后，通过 Outbox 模式发布 `AuthUserSignedUp` 集成事件
 *
 * @example
 * ```typescript
 * // 路由示例
 * POST /api/auth/sign-up/email  - 用户注册
 * POST /api/auth/sign-in/email  - 用户登录
 * GET  /api/auth/get-session    - 获取当前会话
 * POST /api/auth/sign-out       - 用户登出
 * ```
 *
 * @see {@link setupAuthModule} 认证模块配置
 */
@Controller('api/auth')
export class BetterAuthController {
	constructor(
		@Inject(OKSAI_BETTER_AUTH_TOKEN) private readonly auth: Auth,
		@Optional() @Inject(OKSAI_OUTBOX_TOKEN) private readonly outbox?: IOutbox
	) {}

	/**
	 * 捕获并转发所有 /api/auth/* 请求到 Better Auth handler
	 *
	 * @param req - HTTP 请求对象（支持 Fastify 原生请求和标准请求）
	 * @param reply - HTTP 响应对象（支持 Fastify Reply）
	 * @returns Promise<void>
	 */
	@All('*')
	async handle(@Req() req: unknown, @Res() reply: unknown): Promise<void> {
		// 仅使用最小字段，避免 shared 包强依赖 Fastify 类型
		const anyReq = req as {
			method?: string;
			url?: string;
			headers?: Record<string, unknown>;
			body?: unknown;
			raw?: { url?: string; method?: string; headers?: Record<string, unknown> };
		};
		const anyReply = reply as {
			status?: (code: number) => unknown;
			header?: (name: string, value: string) => unknown;
			headers?: (headers: Record<string, string>) => unknown;
			send?: (payload?: unknown) => unknown;
		};

		const method = String(anyReq?.raw?.method ?? anyReq?.method ?? 'GET').toUpperCase();
		const url = String(anyReq?.raw?.url ?? anyReq?.url ?? '/');
		const nodeHeaders = (anyReq?.raw?.headers ?? anyReq?.headers ?? {}) as Record<string, unknown>;
		const headers = fromNodeHeaders(nodeHeaders as any);

		let body: string | undefined;
		if (method !== 'GET' && method !== 'HEAD') {
			const reqBody = anyReq?.body;
			if (reqBody !== undefined) {
				body = typeof reqBody === 'string' ? reqBody : JSON.stringify(reqBody);
				// 确保 content-type 存在，避免 Better Auth 解析失败
				if (!headers.has('content-type')) headers.set('content-type', 'application/json');
			}
		}

		const res = await this.auth.handler(
			new Request(`http://localhost${url}`, {
				method,
				headers,
				body
			})
		);

		anyReply?.status?.(res.status);

		// 复制响应头（特别是 set-cookie）
		const anyHeaders = res.headers as unknown as { getSetCookie?: () => string[] };
		const setCookies = typeof anyHeaders.getSetCookie === 'function' ? anyHeaders.getSetCookie() : [];
		for (const c of setCookies) {
			anyReply?.header?.('set-cookie', c);
		}
		res.headers.forEach((value, key) => {
			if (key.toLowerCase() === 'set-cookie') return;
			anyReply?.header?.(key, value);
		});

		const buf = await res.arrayBuffer();
		const contentType = res.headers.get('content-type') ?? '';
		if (contentType.includes('application/json')) {
			const text = new TextDecoder().decode(buf);
			const json = text ? JSON.parse(text) : null;
			// sign-up 后发布集成事件（通过 Outbox，异步投递给订阅者）
			await this.tryAppendAuthSignedUpEvent(url, json);
			anyReply?.send?.(json);
			return;
		}

		anyReply?.send?.(Buffer.from(buf));
	}

	/**
	 * 尝试在用户注册成功后发布集成事件
	 *
	 * 当检测到 sign-up/email 路由且响应包含用户信息时，
	 * 通过 Outbox 模式发布 `AuthUserSignedUp` 事件，供其他模块订阅处理。
	 *
	 * @param url - 请求 URL
	 * @param json - 响应 JSON 数据
	 * @returns Promise<void>
	 *
	 * @example
	 * 发布的事件结构：
	 * ```typescript
	 * {
	 *   eventType: 'AuthUserSignedUp',
	 *   payload: { userId: 'xxx', email: 'user@example.com' }
	 * }
	 * ```
	 */
	private async tryAppendAuthSignedUpEvent(url: string, json: any): Promise<void> {
		if (!this.outbox) return;
		if (!url.includes('/api/auth/sign-up/email')) return;

		const userId = String(json?.user?.id ?? '');
		const email = String(json?.user?.email ?? '');
		if (!userId || !email) return;

		const envelope = createIntegrationEventEnvelope('AuthUserSignedUp', {
			userId,
			email
		});

		await this.outbox.append(envelope);
	}
}

