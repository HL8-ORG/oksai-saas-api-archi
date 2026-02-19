import { ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { PinoLogger } from 'nestjs-pino';
import { NestHttpExceptionFilter } from './nest-http-exception.filter';

/**
 * @description NestHttpExceptionFilter 单元测试
 *
 * 测试覆盖：
 * - 捕获 Nest HttpException 并转换为 Problem Details
 * - 正确提取 response 中的 message
 * - 日志记录（error/warn 级别区分）
 * - 各种 HTTP 状态码的标题映射
 */
describe('NestHttpExceptionFilter', () => {
	let filter: NestHttpExceptionFilter;
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
		mockRequest = { headers: { 'x-request-id': 'req-789' } };

		mockHost = {
			switchToHttp: () => ({
				getRequest: () => mockRequest,
				getResponse: () => mockResponse
			})
		} as unknown as ArgumentsHost;

		filter = new NestHttpExceptionFilter(mockHttpAdapterHost, mockLogger);
	});

	describe('捕获 HttpException', () => {
		it('应正确处理字符串形式的响应', () => {
			// Arrange
			const exception = new HttpException('请求失败', HttpStatus.BAD_REQUEST);

			// Act
			filter.catch(exception, mockHost);

			// Assert
			expect(mockHttpAdapter.reply).toHaveBeenCalledWith(
				mockResponse,
				expect.objectContaining({
					type: 'about:blank',
					title: 'Bad Request',
					status: HttpStatus.BAD_REQUEST,
					detail: '请求失败',
					instance: 'req-789'
				}),
				HttpStatus.BAD_REQUEST
			);
		});

		it('应正确处理对象形式的响应（带 message 字段）', () => {
			// Arrange
			const exception = new HttpException({ message: '用户名已存在', error: 'Conflict' }, HttpStatus.CONFLICT);

			// Act
			filter.catch(exception, mockHost);

			// Assert
			expect(mockHttpAdapter.reply).toHaveBeenCalledWith(
				mockResponse,
				expect.objectContaining({
					title: 'Conflict',
					detail: '用户名已存在',
					status: HttpStatus.CONFLICT
				}),
				HttpStatus.CONFLICT
			);
		});

		it('应正确处理数组形式的 message', () => {
			// Arrange
			const exception = new HttpException({ message: ['邮箱格式错误', '密码长度不足'] }, HttpStatus.BAD_REQUEST);

			// Act
			filter.catch(exception, mockHost);

			// Assert
			expect(mockHttpAdapter.reply).toHaveBeenCalledWith(
				mockResponse,
				expect.objectContaining({
					detail: '邮箱格式错误; 密码长度不足'
				}),
				HttpStatus.BAD_REQUEST
			);
		});

		it('响应对象无 message 字段时应使用标题作为 detail', () => {
			// Arrange
			const exception = new HttpException({ error: 'Unknown' }, HttpStatus.INTERNAL_SERVER_ERROR);

			// Act
			filter.catch(exception, mockHost);

			// Assert
			expect(mockHttpAdapter.reply).toHaveBeenCalledWith(
				mockResponse,
				expect.objectContaining({
					title: 'Internal Server Error',
					detail: 'Internal Server Error'
				}),
				HttpStatus.INTERNAL_SERVER_ERROR
			);
		});
	});

	describe('状态码标题映射', () => {
		it('400 应映射为 Bad Request', () => {
			// Arrange
			const exception = new HttpException('test', HttpStatus.BAD_REQUEST);

			// Act
			filter.catch(exception, mockHost);

			// Assert
			expect(mockHttpAdapter.reply).toHaveBeenCalledWith(
				mockResponse,
				expect.objectContaining({ title: 'Bad Request' }),
				HttpStatus.BAD_REQUEST
			);
		});

		it('401 应映射为 Unauthorized', () => {
			// Arrange
			const exception = new HttpException('test', HttpStatus.UNAUTHORIZED);

			// Act
			filter.catch(exception, mockHost);

			// Assert
			expect(mockHttpAdapter.reply).toHaveBeenCalledWith(
				mockResponse,
				expect.objectContaining({ title: 'Unauthorized' }),
				HttpStatus.UNAUTHORIZED
			);
		});

		it('403 应映射为 Forbidden', () => {
			// Arrange
			const exception = new HttpException('test', HttpStatus.FORBIDDEN);

			// Act
			filter.catch(exception, mockHost);

			// Assert
			expect(mockHttpAdapter.reply).toHaveBeenCalledWith(
				mockResponse,
				expect.objectContaining({ title: 'Forbidden' }),
				HttpStatus.FORBIDDEN
			);
		});

		it('404 应映射为 Not Found', () => {
			// Arrange
			const exception = new HttpException('test', HttpStatus.NOT_FOUND);

			// Act
			filter.catch(exception, mockHost);

			// Assert
			expect(mockHttpAdapter.reply).toHaveBeenCalledWith(
				mockResponse,
				expect.objectContaining({ title: 'Not Found' }),
				HttpStatus.NOT_FOUND
			);
		});

		it('409 应映射为 Conflict', () => {
			// Arrange
			const exception = new HttpException('test', HttpStatus.CONFLICT);

			// Act
			filter.catch(exception, mockHost);

			// Assert
			expect(mockHttpAdapter.reply).toHaveBeenCalledWith(
				mockResponse,
				expect.objectContaining({ title: 'Conflict' }),
				HttpStatus.CONFLICT
			);
		});

		it('422 应映射为 Unprocessable Entity', () => {
			// Arrange
			const exception = new HttpException('test', HttpStatus.UNPROCESSABLE_ENTITY);

			// Act
			filter.catch(exception, mockHost);

			// Assert
			expect(mockHttpAdapter.reply).toHaveBeenCalledWith(
				mockResponse,
				expect.objectContaining({ title: 'Unprocessable Entity' }),
				HttpStatus.UNPROCESSABLE_ENTITY
			);
		});

		it('503 应映射为 Service Unavailable', () => {
			// Arrange
			const exception = new HttpException('test', HttpStatus.SERVICE_UNAVAILABLE);

			// Act
			filter.catch(exception, mockHost);

			// Assert
			expect(mockHttpAdapter.reply).toHaveBeenCalledWith(
				mockResponse,
				expect.objectContaining({ title: 'Service Unavailable' }),
				HttpStatus.SERVICE_UNAVAILABLE
			);
		});

		it('500 应映射为 Internal Server Error', () => {
			// Arrange
			const exception = new HttpException('test', HttpStatus.INTERNAL_SERVER_ERROR);

			// Act
			filter.catch(exception, mockHost);

			// Assert
			expect(mockHttpAdapter.reply).toHaveBeenCalledWith(
				mockResponse,
				expect.objectContaining({ title: 'Internal Server Error' }),
				HttpStatus.INTERNAL_SERVER_ERROR
			);
		});

		it('未知 5xx 状态码应映射为 Internal Server Error', () => {
			// Arrange
			const exception = new HttpException('test', 501);

			// Act
			filter.catch(exception, mockHost);

			// Assert
			expect(mockHttpAdapter.reply).toHaveBeenCalledWith(
				mockResponse,
				expect.objectContaining({ title: 'Internal Server Error' }),
				501
			);
		});

		it('未知 4xx 状态码应映射为 Request Error', () => {
			// Arrange
			const exception = new HttpException('test', 418);

			// Act
			filter.catch(exception, mockHost);

			// Assert
			expect(mockHttpAdapter.reply).toHaveBeenCalledWith(
				mockResponse,
				expect.objectContaining({ title: 'Request Error' }),
				418
			);
		});
	});

	describe('日志记录', () => {
		it('4xx 异常应使用 warn 级别记录日志', () => {
			// Arrange
			const exception = new HttpException('Not Found', HttpStatus.NOT_FOUND);

			// Act
			filter.catch(exception, mockHost);

			// Assert
			expect(mockLogger.warn).toHaveBeenCalledWith(
				expect.objectContaining({ err: exception, requestId: 'req-789' }),
				`请求异常（HTTP ${HttpStatus.NOT_FOUND}）`
			);
		});

		it('5xx 异常应使用 error 级别记录日志', () => {
			// Arrange
			const exception = new HttpException('Internal Error', HttpStatus.INTERNAL_SERVER_ERROR);

			// Act
			filter.catch(exception, mockHost);

			// Assert
			expect(mockLogger.error).toHaveBeenCalledWith(
				expect.objectContaining({ err: exception, requestId: 'req-789' }),
				'服务端异常（Nest HttpException）'
			);
		});
	});

	describe('请求上下文', () => {
		it('应从请求中提取 requestId 并设置到 instance', () => {
			// Arrange
			mockRequest = { headers: { 'x-request-id': 'custom-instance-id' } };
			mockHost = {
				switchToHttp: () => ({
					getRequest: () => mockRequest,
					getResponse: () => mockResponse
				})
			} as unknown as ArgumentsHost;
			const exception = new HttpException('test', HttpStatus.BAD_REQUEST);

			// Act
			filter.catch(exception, mockHost);

			// Assert
			expect(mockHttpAdapter.reply).toHaveBeenCalledWith(
				mockResponse,
				expect.objectContaining({ instance: 'custom-instance-id' }),
				HttpStatus.BAD_REQUEST
			);
		});

		it('应从 req.id 提取 requestId（当 header 不存在时）', () => {
			// Arrange
			mockRequest = { headers: {}, id: 'fastify-req-id' };
			mockHost = {
				switchToHttp: () => ({
					getRequest: () => mockRequest,
					getResponse: () => mockResponse
				})
			} as unknown as ArgumentsHost;
			const exception = new HttpException('test', HttpStatus.BAD_REQUEST);

			// Act
			filter.catch(exception, mockHost);

			// Assert
			expect(mockHttpAdapter.reply).toHaveBeenCalledWith(
				mockResponse,
				expect.objectContaining({ instance: 'fastify-req-id' }),
				HttpStatus.BAD_REQUEST
			);
		});
	});
});
