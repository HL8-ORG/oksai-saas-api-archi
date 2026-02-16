import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { PinoLogger } from 'nestjs-pino';
import { buildProblemDetails } from '../../problem-details';
import { getRequestId } from '../utils/request-context';

/**
 * @description 将 Nest 内置 HttpException 统一转换为 RFC7807 Problem Details
 *
 * 说明：
 * - 该 Filter 用于覆盖 Nest 默认的异常响应结构
 * - 不改变 statusCode，只统一 body 结构，便于客户端与日志处理
 */
@Catch(HttpException)
export class NestHttpExceptionFilter implements ExceptionFilter {
	constructor(
		private readonly httpAdapterHost: HttpAdapterHost,
		private readonly logger: PinoLogger
	) {}

	catch(exception: HttpException, host: ArgumentsHost): void {
		const { httpAdapter } = this.httpAdapterHost;
		const ctx = host.switchToHttp();
		const req = ctx.getRequest();
		const requestId = getRequestId(req);

		const status = exception.getStatus();
		const response = exception.getResponse() as unknown;

		// Nest 默认响应可能是 string 或 object；尽量提取 message
		const title = statusToTitle(status);
		const detail =
			typeof response === 'string'
				? response
				: typeof response === 'object' && response !== null && 'message' in response
					? ((response as { message?: unknown }).message ?? title)
					: title;

		const body = buildProblemDetails({
			type: 'about:blank',
			title,
			detail: Array.isArray(detail) ? detail.join('; ') : detail.toString(),
			status,
			instance: requestId
		});

		if (status >= 500) {
			this.logger.error({ err: exception, requestId }, '服务端异常（Nest HttpException）');
		} else {
			this.logger.warn({ err: exception, requestId }, `请求异常（HTTP ${status}）`);
		}

		httpAdapter.reply(ctx.getResponse(), body, body.status);
	}
}

function statusToTitle(status: number): string {
	switch (status) {
		case HttpStatus.BAD_REQUEST:
			return 'Bad Request';
		case HttpStatus.UNAUTHORIZED:
			return 'Unauthorized';
		case HttpStatus.FORBIDDEN:
			return 'Forbidden';
		case HttpStatus.NOT_FOUND:
			return 'Not Found';
		case HttpStatus.CONFLICT:
			return 'Conflict';
		case HttpStatus.UNPROCESSABLE_ENTITY:
			return 'Unprocessable Entity';
		case HttpStatus.SERVICE_UNAVAILABLE:
			return 'Service Unavailable';
		default:
			return status >= 500 ? 'Internal Server Error' : 'Request Error';
	}
}
