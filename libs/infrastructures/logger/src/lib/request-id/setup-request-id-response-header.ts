import type { INestApplication } from '@nestjs/common';

export interface SetupRequestIdResponseHeaderOptions {
	/**
	 * 回传的 requestId header 名称（默认 x-request-id）
	 */
	headerName?: string;
}

/**
 * 在 HTTP 响应中回传 requestId（Fastify）
 *
 * 说明：
 * - 该实现为 Fastify adapter 提供最小能力；若未来引入统一网关，也可由网关回传。
 * - 若当前 adapter 不是 Fastify，将安全地不做任何操作。
 */
export function setupRequestIdResponseHeader(app: INestApplication, options: SetupRequestIdResponseHeaderOptions = {}) {
	const headerName = options.headerName ?? 'x-request-id';

	const instance = app.getHttpAdapter().getInstance() as unknown;
	const addHook = (instance as { addHook?: unknown } | null | undefined)?.addHook;
	if (typeof addHook !== 'function') return;

	(
		instance as {
			addHook: (
				name: string,
				fn: (
					req: { id?: unknown },
					reply: { header: (k: string, v: string) => void },
					payload: unknown,
					done: (err: Error | null, payload?: unknown) => void
				) => void
			) => void;
		}
	).addHook('onSend', (req, reply, payload, done) => {
		reply.header(headerName, String(req.id ?? 'unknown'));
		done(null, payload);
	});
}
