import { DynamicModule } from '@nestjs/common';
import { LoggerModule } from 'nestjs-pino';

export interface SetupLoggerModuleOptions {
	/**
	 * 注入到每条请求日志的自定义字段
	 *
	 * 典型用途：traceId/requestId/tenantId/actorId。
	 *
	 * @param req - 框架请求对象（Fastify/Express 均可；请按需做类型缩小）
	 * @param res - 框架响应对象
	 * @returns 需要注入的字段
	 */
	customProps?: (req: unknown, res: unknown) => Record<string, unknown>;

	/**
	 * 日志级别（默认 info）
	 */
	level?: string;

	/**
	 * 是否启用 pretty 输出（默认：development=true，其他=false）
	 */
	pretty?: boolean;

	/**
	 * 敏感字段脱敏配置（pino redact）
	 *
	 * 默认会脱敏常见凭据字段，防止意外写入日志。
	 */
	redact?: string[];
}

/**
 * 装配全局 LoggerModule（nestjs-pino）
 *
 * 说明：
 * - 统一配置 request log（pino-http）
 * - 在不强依赖 Fastify 类型的前提下，尽量保持字段一致与可观测性友好
 *
 * @param options - 装配选项
 * @returns Nest DynamicModule
 */
export function setupLoggerModule(options: SetupLoggerModuleOptions = {}): DynamicModule {
	const pretty = options.pretty ?? process.env.NODE_ENV === 'development';
	const level = options.level ?? process.env.LOG_LEVEL ?? 'info';
	const redact = options.redact ?? ['req.headers.authorization', 'req.headers.cookie', 'req.headers.set-cookie'];

	const canPretty = pretty ? hasOptionalDependency('pino-pretty') : false;

	return LoggerModule.forRoot({
		pinoHttp: {
			level,
			autoLogging: true,
			quietReqLogger: true,
			redact,
			serializers: {
				req: (req: unknown) => {
					const r = req as { method?: unknown; url?: unknown } | null | undefined;
					return {
						method: r?.method,
						url: r?.url
					};
				}
			},
			customProps: (req: unknown, res: unknown) => ({
				requestId: getRequestIdFromReq(req),
				...(options.customProps?.(req, res) ?? {})
			}),
			customLogLevel: (_req: unknown, res: unknown, err?: unknown) => {
				const statusCode = Number((res as { statusCode?: unknown } | null | undefined)?.statusCode ?? 200);
				if (statusCode >= 500 || err) return 'error';
				if (statusCode >= 400) return 'warn';
				if (statusCode >= 300) return 'info';
				return 'info';
			},
			transport: canPretty ? { target: 'pino-pretty' } : undefined
		}
	});
}

function getRequestIdFromReq(req: unknown): string {
	const anyReq = req as Record<string, unknown> | null | undefined;
	const headers = (anyReq as { headers?: Record<string, unknown> } | null | undefined)?.headers;
	return String(
		(headers?.['x-request-id'] as unknown) ??
			(headers?.['x-correlation-id'] as unknown) ??
			(anyReq as { id?: unknown } | null | undefined)?.id ??
			(anyReq as { requestId?: unknown } | null | undefined)?.requestId ??
			'unknown'
	);
}

function hasOptionalDependency(name: string): boolean {
	try {
		require.resolve(name);
		return true;
	} catch {
		return false;
	}
}
