import { HttpStatus } from '@nestjs/common';
import type { ArgumentsHost } from '@nestjs/common';
import type { I18nValidationException } from 'nestjs-i18n';
import { getRequestId } from '@oksai/exceptions';

/**
 * @description 将 nestjs-i18n 的校验异常格式化为 RFC7807 Problem Details
 *
 * 该函数可直接传给 `I18nValidationExceptionFilter` 的 `responseBodyFormatter`。
 */
export function problemDetailsResponseBodyFormatter(
	host: ArgumentsHost,
	_exc: I18nValidationException,
	formattedErrors: object
): Record<string, unknown> {
	const req = host.switchToHttp().getRequest();
	const instance = getRequestId(req);

	const body = {
		type: 'about:blank',
		title: 'Bad Request',
		status: HttpStatus.BAD_REQUEST,
		detail: '请求参数校验失败',
		instance,
		data: formattedErrors
	};

	return body;
}
