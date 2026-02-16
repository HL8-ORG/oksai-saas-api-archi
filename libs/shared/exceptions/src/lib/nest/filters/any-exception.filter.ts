import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { PinoLogger } from 'nestjs-pino';
import { buildProblemDetails } from '../../problem-details';
import { getRequestId } from '../utils/request-context';

/**
 * @description 兜底异常 Filter（500）
 *
 * 用于捕获未被 `HttpError` / `HttpException` 处理的异常，并统一返回 Problem Details。
 */
@Catch()
export class AnyExceptionFilter implements ExceptionFilter {
	constructor(
		private readonly httpAdapterHost: HttpAdapterHost,
		private readonly logger: PinoLogger
	) {}

	catch(exception: unknown, host: ArgumentsHost): void {
		const { httpAdapter } = this.httpAdapterHost;
		const ctx = host.switchToHttp();
		const req = ctx.getRequest();
		const requestId = getRequestId(req);

		// 重要：在 Nest 中全局 filters 的执行顺序可能导致该兜底 filter 先于 HttpException filter 生效。
		// 为避免把 404/400 等 HttpException 错误错误地转换成 500，这里显式保留 HttpException 的 status。
		if (exception instanceof HttpException) {
			const status = exception.getStatus();
			const response = exception.getResponse() as unknown;
			const detail =
				typeof response === 'string'
					? response
					: typeof response === 'object' && response !== null && 'message' in response
						? ((response as { message?: unknown }).message ?? 'Request Error')
						: 'Request Error';

			const body = buildProblemDetails({
				type: 'about:blank',
				title: statusToTitle(status),
				detail: Array.isArray(detail) ? detail.join('; ') : detail.toString(),
				status,
				instance: requestId
			});

			if (status >= 500) {
				this.logger.error({ err: exception, requestId }, `服务端异常（HttpException ${status}）`);
			} else {
				this.logger.warn({ err: exception, requestId }, `请求异常（HttpException ${status}）`);
			}

			httpAdapter.reply(ctx.getResponse(), body, body.status);
			return;
		}

		const body = buildProblemDetails({
			type: 'about:blank',
			title: 'Internal Server Error',
			detail: '服务端发生未知错误，请稍后重试。',
			status: HttpStatus.INTERNAL_SERVER_ERROR,
			instance: requestId
		});

		this.logger.error({ err: exception, requestId }, '未知异常（兜底 AnyExceptionFilter）');

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
