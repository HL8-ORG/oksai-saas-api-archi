import type { INestApplication } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { PinoLogger } from 'nestjs-pino';
import { AnyExceptionFilter } from './filters/any-exception.filter';
import { AppExceptionFilter } from './filters/app-exception.filter';
import { NestHttpExceptionFilter } from './filters/nest-http-exception.filter';

export interface SetupGlobalExceptionFiltersOptions {
	/**
	 * @description 是否启用兜底异常过滤器（默认 true）
	 */
	enableAnyExceptionFilter?: boolean;
}

/**
 * @description 一键装配全局异常 Filters（RFC7807 Problem Details）
 *
 * @param app - Nest 应用实例
 * @param options - 装配选项
 *
 * @example
 * ```ts
 * await setupGlobalExceptionFilters(app);
 * ```
 */
export async function setupGlobalExceptionFilters(
	app: INestApplication,
	options: SetupGlobalExceptionFiltersOptions = {}
): Promise<void> {
	const httpAdapterHost = app.get(HttpAdapterHost);
	// 注意：PinoLogger 是 scoped provider（request/transient），不能用 app.get() 获取，需要 resolve()
	const logger = await app.resolve(PinoLogger);

	const enableAny = options.enableAnyExceptionFilter ?? true;

	const filters = [
		new AppExceptionFilter(httpAdapterHost, logger),
		new NestHttpExceptionFilter(httpAdapterHost, logger),
		...(enableAny ? [new AnyExceptionFilter(httpAdapterHost, logger)] : [])
	];

	app.useGlobalFilters(...filters);
}
