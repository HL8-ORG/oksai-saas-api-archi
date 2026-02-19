/**
 * 将 Node.js/Fastify 的 headers 格式转换为 Web 标准 Headers 对象
 *
 * Node.js 的 IncomingMessage 和 Fastify 的 request.headers 返回的是 Record<string, string | string[] | undefined> 格式，
 * 而 Better Auth handler 需要标准的 Web Headers 对象。此函数负责进行格式转换。
 *
 * @description
 * 处理规则：
 * - 跳过 undefined 和 null 值
 * - 数组值使用 append 方法添加多个同名 header
 * - 其他值使用 set 方法设置单个 header
 *
 * 注意：
 * - 避免直接依赖 `better-auth/node`（其为 ESM 导出，会给 Jest/CJS 带来解析问题）
 * - 此实现为轻量级替代方案
 *
 * @param nodeHeaders - Node.js/Fastify 格式的 headers 对象
 * @returns Web 标准 Headers 对象
 *
 * @example
 * ```typescript
 * const nodeHeaders = {
 *   'content-type': 'application/json',
 *   'set-cookie': ['session=abc; Path=/', 'token=xyz; Path=/']
 * };
 * const headers = fromNodeHeaders(nodeHeaders);
 * headers.get('content-type'); // 'application/json'
 * headers.getSetCookie?.(); // ['session=abc; Path=/', 'token=xyz; Path=/']
 * ```
 */
export function fromNodeHeaders(nodeHeaders: Record<string, unknown>): Headers {
	const headers = new Headers();
	for (const [key, value] of Object.entries(nodeHeaders ?? {})) {
		if (value === undefined || value === null) continue;
		if (Array.isArray(value)) {
			for (const v of value) {
				if (v === undefined || v === null) continue;
				headers.append(key, String(v));
			}
			continue;
		}
		headers.set(key, String(value));
	}
	return headers;
}

