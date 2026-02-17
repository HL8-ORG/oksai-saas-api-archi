/**
 * @description 将 Node/Fastify 的 headers 转换为 Web 标准 Headers
 *
 * 注意事项：
 * - 避免直接依赖 `better-auth/node`（其为 ESM 导出，会给 Jest/CJS 带来解析问题）
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

