import { ArgumentsHost, Catch, ExceptionFilter } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { PinoLogger } from 'nestjs-pino';
import { HttpError } from '../../exceptions/http-error';
import { buildProblemDetails } from '../../problem-details';
import { getRequestId } from '../utils/request-context';

/**
 * @description 捕获 HttpError 并输出 RFC7807 Problem Details
 *
 * 注意：该 Filter 只处理本库的 `HttpError`，用于"业务/应用层显式指定 HTTP 状态"的场景。
 */
@Catch(HttpError)
export class AppExceptionFilter implements ExceptionFilter {
	constructor(
		private readonly httpAdapterHost: HttpAdapterHost,
		private readonly logger: PinoLogger
	) {}

	catch(exception: HttpError, host: ArgumentsHost): void {
		const { httpAdapter } = this.httpAdapterHost;
		const ctx = host.switchToHttp();
		const req = ctx.getRequest();
		const requestId = getRequestId(req);

		const body = buildProblemDetails({
			type: exception.type,
			title: exception.title,
			detail: exception.detail,
			status: exception.status,
			instance: requestId,
			errorCode: exception.errorCode,
			data: exception.data
		});

		if (exception.status >= 500) {
			this.logger.error({ err: exception, requestId, errorCode: exception.errorCode }, '服务端异常（HttpError）');
		} else {
			this.logger.warn({ err: exception, requestId, errorCode: exception.errorCode }, '业务异常（HttpError）');
		}

		httpAdapter.reply(ctx.getResponse(), body, body.status);
	}
}
