import { All, Controller, Inject, Optional, Req, Res } from '@nestjs/common';
import type { Auth } from 'better-auth';
import type { IOutbox } from '@oksai/messaging';
import { createIntegrationEventEnvelope, OKSAI_OUTBOX_TOKEN } from '@oksai/messaging';
import { OKSAI_BETTER_AUTH_TOKEN } from './tokens';
import { fromNodeHeaders } from './utils/node-headers';

/**
 * @description Better Auth 路由转发控制器（Nest(Fastify) 适配）
 *
 * 说明：
 * - Better Auth 默认使用 `/api/auth/*` 路由（可通过 Better Auth 选项叠加 basePath）
 * - 由于 Fastify 可能已提前解析 body，本控制器会手动构造 `Request` 调用 `auth.handler()`
 */
@Controller('api/auth')
export class BetterAuthController {
	constructor(
		@Inject(OKSAI_BETTER_AUTH_TOKEN) auth: Auth,
		@Optional() @Inject(OKSAI_OUTBOX_TOKEN) private readonly outbox?: IOutbox
	) {
		this.auth = auth;
	}

	private readonly auth: Auth;

	/**
	 * @description 捕获并转发所有 /api/auth/* 请求到 Better Auth handler
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

