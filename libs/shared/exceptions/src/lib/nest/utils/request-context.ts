/**
 * @description 从不同框架/适配器提取 requestId
 *
 * Fastify 一般为 `req.id`，部分项目为 `req.requestId` 或自定义字段。
 *
 * @param req - 请求对象
 * @returns requestId（尽量保证有值）
 */
export function getRequestId(req: unknown): string {
	const anyReq = req as Record<string, unknown> | null | undefined;
	const headers = (anyReq as { headers?: Record<string, unknown> } | null | undefined)?.headers;
	return (
		(headers?.['x-request-id'] as string | undefined) ??
		(headers?.['x-correlation-id'] as string | undefined) ??
		(anyReq as { id?: unknown } | null | undefined)?.id ??
		(anyReq as { requestId?: unknown } | null | undefined)?.requestId ??
		'unknown'
	).toString();
}
