import { DynamicModule } from '@nestjs/common';
import { LoggerModule } from 'nestjs-pino';

export interface SetupLoggerModuleOptions {
	/**
	 * @description
	 * 额外的日志字段注入器（会被合并到每条请求日志中）。
	 *
	 * @param req - 框架传入的 request 对象（Fastify/Express 适配器会有所差异）
	 * @param res - 框架传入的 response 对象
	 * @returns 需要附加到日志中的字段对象
	 *
	 * @example
	 * ```ts
	 * customProps: (req) => ({
	 *   tenantId: (req as any).tenantId,
	 *   userId: (req as any).userId,
	 * })
	 * ```
	 */
	customProps?: (req: unknown, res: unknown) => Record<string, unknown>;
	/**
	 * @description
	 * 日志级别（优先级：options.level > LOG_LEVEL > info）
	 */
	level?: string;
	/**
	 * @description
	 * 是否启用控制台美化输出（基于 `pino-pretty`）。
	 *
	 * 说明：
	 * - 建议仅在开发环境开启（生产环境保持 JSON 结构化日志更利于采集与检索）
	 * - 若未安装 `pino-pretty`，即使 pretty=true 也会安全降级为 JSON 输出
	 */
	pretty?: boolean;
	/**
	 * @description
	 * 日志脱敏路径（pino redact 语法），默认会脱敏鉴权与 cookie。
	 */
	redact?: string[];
	prettyOptions?: {
		/**
		 * @description 是否启用 ANSI 颜色（默认 true）
		 */
		colorize?: boolean;
		/**
		 * @description
		 * 时间格式（传递给 pino-pretty 的 translateTime）。
		 *
		 * 常用值示例：
		 * - `SYS:standard`
		 * - `HH:MM:ss.l`
		 */
		timeFormat?: string;
		/**
		 * @description 单行输出（默认 false）
		 */
		singleLine?: boolean;
		/**
		 * @description 错误对象字段 key（默认 ['err','error']）
		 */
		errorLikeObjectKeys?: string[];
		/**
		 * @description 忽略字段（默认 'pid,hostname'）
		 */
		ignore?: string;
	};
}

/**
 * @description
 * 初始化全局日志模块（基于 `nestjs-pino`）。
 *
 * 能力：
 * - 统一请求日志（含 requestId）
 * - 支持请求字段脱敏（redact）
 * - 支持开发环境控制台美化输出（pino-pretty）
 *
 * @param options - 配置项
 * @returns Nest `DynamicModule`
 *
 * @example
 * ```ts
 * @Module({
 *   imports: [
 *     setupLoggerModule({
 *       level: process.env.LOG_LEVEL ?? 'info',
 *       pretty: process.env.NODE_ENV === 'development',
 *       prettyOptions: { colorize: true, timeFormat: 'HH:MM:ss.l', ignore: 'pid,hostname' },
 *     }),
 *   ],
 * })
 * export class AppModule {}
 * ```
 */
export function setupLoggerModule(options: SetupLoggerModuleOptions = {}): DynamicModule {
	const level = options.level ?? process.env.LOG_LEVEL ?? 'info';
	const redact = options.redact ?? ['req.headers.authorization', 'req.headers.cookie', 'req.headers.set-cookie'];
	const pretty = options.pretty === true;

	const prettyOptions = options.prettyOptions ?? {};
	const prettyTarget = pretty ? resolveOptionalDependency('pino-pretty') : null;
	const transport = prettyTarget
		? {
				target: prettyTarget,
				options: {
					colorize: prettyOptions.colorize !== false,
					translateTime: prettyOptions.timeFormat ?? 'SYS:standard',
					singleLine: prettyOptions.singleLine ?? false,
					errorLikeObjectKeys: prettyOptions.errorLikeObjectKeys ?? ['err', 'error'],
					ignore: prettyOptions.ignore ?? 'pid,hostname'
				}
			}
		: undefined;

	return LoggerModule.forRoot({
		pinoHttp: {
			level,
			autoLogging: true,
			quietReqLogger: true,
			redact,
			...(transport ? { transport } : {}),
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
			}
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

/**
 * @description
 * 在 pnpm workspace 的隔离 node_modules 结构下，依赖可能不在当前包的 node_modules 中。
 * 这里通过多路径尝试解析，确保在应用侧安装的可选依赖（如 pino-pretty）也能被找到。
 *
 * @param name - 依赖包名
 * @returns 解析到的绝对路径；解析失败返回 null
 */
function resolveOptionalDependency(name: string): string | null {
	try {
		return require.resolve(name);
	} catch {
		// ignore
	}

	try {
		// 优先从应用工作目录解析（典型场景：应用安装了 pino-pretty，但 logger 包自身未声明为 dependencies）
		return require.resolve(name, { paths: [process.cwd()] });
	} catch {
		// ignore
	}

	return null;
}
