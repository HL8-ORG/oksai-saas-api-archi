import { DynamicModule } from '@nestjs/common';
import { ClsModule, type ClsService } from 'nestjs-cls';
import { OKSAI_REQUEST_CONTEXT_KEYS } from './oksai-request-context';

export interface SetupOksaiClsModuleOptions {
	/**
	 * @description 是否启用 CLS（默认 true）
	 */
	enabled?: boolean;

	/**
	 * @description tenantId header 名称（默认 x-tenant-id）
	 */
	tenantIdHeaderName?: string;

	/**
	 * @description userId header 名称（默认 x-user-id）
	 *
	 * 说明：当前阶段仅做占位（后续可由认证模块写入 cls）
	 */
	userIdHeaderName?: string;

	/**
	 * @description locale header 名称（默认 x-lang）
	 */
	localeHeaderName?: string;
}

/**
 * @description 装配 nestjs-cls（为 Oksai 提供 request-scoped 上下文）
 *
 * 默认写入：
 * - requestId：优先读取 headers（x-request-id/x-correlation-id），其次取 req.id/req.requestId
 * - tenantId：读取 x-tenant-id
 * - userId：读取 x-user-id（占位）
 * - locale：读取 x-lang
 *
 * @param options - 装配选项
 */
export function setupOksaiClsModule(options: SetupOksaiClsModuleOptions = {}): DynamicModule {
	const enabled = options.enabled ?? true;
	if (!enabled) return { module: ClsModule };

	const tenantIdHeaderName = (options.tenantIdHeaderName ?? 'x-tenant-id').toLowerCase();
	const localeHeaderName = (options.localeHeaderName ?? 'x-lang').toLowerCase();

	return ClsModule.forRoot({
		global: true,
		middleware: {
			mount: true,
			setup: (cls: ClsService, req: unknown) => {
				const anyReq = req as Record<string, unknown> | null | undefined;
				const headers = (anyReq as { headers?: Record<string, unknown> } | null | undefined)?.headers ?? {};
				const header = (name: string): string | undefined => {
					const v = headers[name];
					if (v === undefined || v === null) return undefined;
					return Array.isArray(v) ? String(v[0] ?? '') : String(v);
				};

				const requestId =
					header('x-request-id') ??
					header('x-correlation-id') ??
					String(
						(anyReq as { id?: unknown } | null | undefined)?.id ??
							(anyReq as { requestId?: unknown } | null | undefined)?.requestId ??
							''
					);

				const tenantId = header(tenantIdHeaderName);
				const locale = header(localeHeaderName);

				if (requestId && requestId.length > 0) cls.set(OKSAI_REQUEST_CONTEXT_KEYS.requestId, requestId);
				if (tenantId && tenantId.length > 0) cls.set(OKSAI_REQUEST_CONTEXT_KEYS.tenantId, tenantId);
				if (locale && locale.length > 0) cls.set(OKSAI_REQUEST_CONTEXT_KEYS.locale, locale);
			}
		}
	});
}
