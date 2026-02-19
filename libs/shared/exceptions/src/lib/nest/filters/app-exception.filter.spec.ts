import { ArgumentsHost, HttpStatus } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { PinoLogger } from 'nestjs-pino';
import { HttpError } from '../../exceptions/http-error';
import { AppExceptionFilter } from './app-exception.filter';

/**
 * @description AppExceptionFilter 单元测试
 *
 * 测试覆盖：
 * - 捕获 HttpError 并返回 Problem Details
 * - 正确映射 exception 属性到响应
 * - 日志记录（error/warn 级别区分）
 * - errorCode 和 data 字段透传
 */
describe('AppExceptionFilter', () => {
	let filter: AppExceptionFilter;
	let mockHttpAdapter: { reply: jest.Mock };
	let mockHttpAdapterHost: HttpAdapterHost;
	let mockLogger: PinoLogger;
	let mockHost: ArgumentsHost;
	let mockResponse: Record<string, unknown>;
	let mockRequest: Record<string, unknown>;

	beforeEach(() => {
		// Arrange: 准备 mock 对象
		mockHttpAdapter = { reply: jest.fn() };
		mockHttpAdapterHost = { httpAdapter: mockHttpAdapter } as unknown as HttpAdapterHost;
		mockLogger = { error: jest.fn(), warn: jest.fn() } as unknown as PinoLogger;
		mockResponse = {};
		mockRequest = { headers: { 'x-request-id': 'req-456' } };

		mockHost = {
			switchToHttp: () => ({
				getRequest: () => mockRequest,
				getResponse: () => mockResponse
			})
		} as unknown as ArgumentsHost;

		filter = new AppExceptionFilter(mockHttpAdapterHost, mockLogger);
	});

	describe('捕获 HttpError', () => {
		it('应正确映射所有字段到 Problem Details', () => {
			// Arrange
			const exception = new HttpError({
				status: HttpStatus.BAD_REQUEST,
				title: '参数错误',
				detail: '用户名不能为空',
				errorCode: 'USER_NAME_REQUIRED',
				type: 'https://example.com/errors/user-name-required'
			});

			// Act
			filter.catch(exception, mockHost);

			// Assert
			expect(mockHttpAdapter.reply).toHaveBeenCalledWith(
				mockResponse,
				expect.objectContaining({
					type: 'https://example.com/errors/user-name-required',
					title: '参数错误',
					status: HttpStatus.BAD_REQUEST,
					detail: '用户名不能为空',
					instance: 'req-456',
					errorCode: 'USER_NAME_REQUIRED'
				}),
				HttpStatus.BAD_REQUEST
			);
		});

		it('应使用默认 type（about:blank）', () => {
			// Arrange
			const exception = new HttpError({
				status: HttpStatus.NOT_FOUND,
				title: '资源未找到',
				detail: '用户不存在'
			});

			// Act
			filter.catch(exception, mockHost);

			// Assert
			expect(mockHttpAdapter.reply).toHaveBeenCalledWith(
				mockResponse,
				expect.objectContaining({
					type: 'about:blank'
				}),
				HttpStatus.NOT_FOUND
			);
		});

		it('应正确透传 data 字段', () => {
			// Arrange
			const exception = new HttpError({
				status: HttpStatus.UNPROCESSABLE_ENTITY,
				title: '验证失败',
				detail: '字段验证错误',
				data: { field: 'email', reason: '格式不正确' }
			});

			// Act
			filter.catch(exception, mockHost);

			// Assert
			expect(mockHttpAdapter.reply).toHaveBeenCalledWith(
				mockResponse,
				expect.objectContaining({
					data: { field: 'email', reason: '格式不正确' }
				}),
				HttpStatus.UNPROCESSABLE_ENTITY
			);
		});

		it('应正确透传 data 数组', () => {
			// Arrange
			const exception = new HttpError({
				status: HttpStatus.UNPROCESSABLE_ENTITY,
				title: '验证失败',
				detail: '多个字段验证错误',
				data: [
					{ field: 'email', reason: '格式不正确' },
					{ field: 'password', reason: '长度不足' }
				]
			});

			// Act
			filter.catch(exception, mockHost);

			// Assert
			expect(mockHttpAdapter.reply).toHaveBeenCalledWith(
				mockResponse,
				expect.objectContaining({
					data: [
						{ field: 'email', reason: '格式不正确' },
						{ field: 'password', reason: '长度不足' }
					]
				}),
				HttpStatus.UNPROCESSABLE_ENTITY
			);
		});

		it('应正确透传 errorCode 字段', () => {
			// Arrange
			const exception = new HttpError({
				status: HttpStatus.FORBIDDEN,
				title: '权限不足',
				detail: '无权访问该资源',
				errorCode: 'PERMISSION_DENIED'
			});

			// Act
			filter.catch(exception, mockHost);

			// Assert
			expect(mockHttpAdapter.reply).toHaveBeenCalledWith(
				mockResponse,
				expect.objectContaining({
					errorCode: 'PERMISSION_DENIED'
				}),
				HttpStatus.FORBIDDEN
			);
		});
	});

	describe('日志记录', () => {
		it('4xx 异常应使用 warn 级别记录日志', () => {
			// Arrange
			const exception = new HttpError({
				status: HttpStatus.BAD_REQUEST,
				title: '参数错误',
				detail: '请求参数无效',
				errorCode: 'INVALID_PARAM'
			});

			// Act
			filter.catch(exception, mockHost);

			// Assert
			expect(mockLogger.warn).toHaveBeenCalledWith(
				expect.objectContaining({
					err: exception,
					requestId: 'req-456',
					errorCode: 'INVALID_PARAM'
				}),
				'业务异常（HttpError）'
			);
		});

		it('5xx 异常应使用 error 级别记录日志', () => {
			// Arrange
			const exception = new HttpError({
				status: HttpStatus.INTERNAL_SERVER_ERROR,
				title: '内部错误',
				detail: '服务器内部发生错误',
				errorCode: 'INTERNAL_ERROR'
			});

			// Act
			filter.catch(exception, mockHost);

			// Assert
			expect(mockLogger.error).toHaveBeenCalledWith(
				expect.objectContaining({
					err: exception,
					requestId: 'req-456',
					errorCode: 'INTERNAL_ERROR'
				}),
				'服务端异常（HttpError）'
			);
		});

		it('无 errorCode 时日志不应包含该字段', () => {
			// Arrange
			const exception = new HttpError({
				status: HttpStatus.NOT_FOUND,
				title: '资源未找到',
				detail: '请求的资源不存在'
			});

			// Act
			filter.catch(exception, mockHost);

			// Assert
			expect(mockLogger.warn).toHaveBeenCalledWith(
				expect.objectContaining({
					err: exception,
					requestId: 'req-456',
					errorCode: undefined
				}),
				'业务异常（HttpError）'
			);
		});
	});

	describe('请求上下文', () => {
		it('应从请求中提取 requestId 并设置到 instance', () => {
			// Arrange
			mockRequest = { headers: { 'x-request-id': 'test-instance-id' } };
			mockHost = {
				switchToHttp: () => ({
					getRequest: () => mockRequest,
					getResponse: () => mockResponse
				})
			} as unknown as ArgumentsHost;
			const exception = new HttpError({
				status: HttpStatus.BAD_REQUEST,
				title: 'Test',
				detail: 'Test detail'
			});

			// Act
			filter.catch(exception, mockHost);

			// Assert
			expect(mockHttpAdapter.reply).toHaveBeenCalledWith(
				mockResponse,
				expect.objectContaining({ instance: 'test-instance-id' }),
				HttpStatus.BAD_REQUEST
			);
		});
	});

	describe('边界情况', () => {
		it('应正确处理 500 状态码（边界值）', () => {
			// Arrange
			const exception = new HttpError({
				status: 500,
				title: '服务器错误',
				detail: '内部服务器错误'
			});

			// Act
			filter.catch(exception, mockHost);

			// Assert
			expect(mockLogger.error).toHaveBeenCalled();
			expect(mockHttpAdapter.reply).toHaveBeenCalledWith(
				mockResponse,
				expect.objectContaining({ status: 500 }),
				500
			);
		});

		it('应正确处理 499 状态码（边界值，4xx）', () => {
			// Arrange
			const exception = new HttpError({
				status: 499,
				title: 'Client Closed',
				detail: '客户端关闭了连接'
			});

			// Act
			filter.catch(exception, mockHost);

			// Assert
			expect(mockLogger.warn).toHaveBeenCalled();
			expect(mockHttpAdapter.reply).toHaveBeenCalledWith(
				mockResponse,
				expect.objectContaining({ status: 499 }),
				499
			);
		});
	});
});
