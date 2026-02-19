import { ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { PinoLogger } from 'nestjs-pino';
import { AnyExceptionFilter } from './any-exception.filter';

/**
 * @description AnyExceptionFilter 单元测试
 *
 * 测试覆盖：
 * - 捕获未知异常（非 HttpException）返回 500
 * - 捕获 HttpException 时保留原始状态码
 * - 日志记录（error/warn 级别区分）
 * - Problem Details 响应格式
 */
describe('AnyExceptionFilter', () => {
	let filter: AnyExceptionFilter;
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
		mockRequest = { headers: {}, id: 'req-123' };

		mockHost = {
			switchToHttp: () => ({
				getRequest: () => mockRequest,
				getResponse: () => mockResponse
			})
		} as unknown as ArgumentsHost;

		filter = new AnyExceptionFilter(mockHttpAdapterHost, mockLogger);
	});

	describe('捕获未知异常', () => {
		it('应返回 500 Internal Server Error', () => {
			// Arrange
			const exception = new Error('未知错误');

			// Act
			filter.catch(exception, mockHost);

			// Assert
			expect(mockHttpAdapter.reply).toHaveBeenCalledWith(
				mockResponse,
				expect.objectContaining({
					type: 'about:blank',
					title: 'Internal Server Error',
					status: HttpStatus.INTERNAL_SERVER_ERROR,
					detail: '服务端发生未知错误，请稍后重试。',
					instance: 'req-123'
				}),
				HttpStatus.INTERNAL_SERVER_ERROR
			);
		});

		it('应使用 error 级别记录日志', () => {
			// Arrange
			const exception = new Error('未知错误');

			// Act
			filter.catch(exception, mockHost);

			// Assert
			expect(mockLogger.error).toHaveBeenCalledWith(
				expect.objectContaining({ err: exception, requestId: 'req-123' }),
				'未知异常（兜底 AnyExceptionFilter）'
			);
		});
	});

	describe('捕获 HttpException', () => {
		it('应保留 400 Bad Request 状态码', () => {
			// Arrange
			const exception = new HttpException('Bad Request', HttpStatus.BAD_REQUEST);

			// Act
			filter.catch(exception, mockHost);

			// Assert
			expect(mockHttpAdapter.reply).toHaveBeenCalledWith(
				mockResponse,
				expect.objectContaining({
					type: 'about:blank',
					title: 'Bad Request',
					status: HttpStatus.BAD_REQUEST,
					detail: 'Bad Request'
				}),
				HttpStatus.BAD_REQUEST
			);
		});

		it('应保留 404 Not Found 状态码', () => {
			// Arrange
			const exception = new HttpException('Not Found', HttpStatus.NOT_FOUND);

			// Act
			filter.catch(exception, mockHost);

			// Assert
			expect(mockHttpAdapter.reply).toHaveBeenCalledWith(
				mockResponse,
				expect.objectContaining({
					title: 'Not Found',
					status: HttpStatus.NOT_FOUND
				}),
				HttpStatus.NOT_FOUND
			);
		});

		it('应保留 401 Unauthorized 状态码', () => {
			// Arrange
			const exception = new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);

			// Act
			filter.catch(exception, mockHost);

			// Assert
			expect(mockHttpAdapter.reply).toHaveBeenCalledWith(
				mockResponse,
				expect.objectContaining({
					title: 'Unauthorized',
					status: HttpStatus.UNAUTHORIZED
				}),
				HttpStatus.UNAUTHORIZED
			);
		});

		it('应保留 403 Forbidden 状态码', () => {
			// Arrange
			const exception = new HttpException('Forbidden', HttpStatus.FORBIDDEN);

			// Act
			filter.catch(exception, mockHost);

			// Assert
			expect(mockHttpAdapter.reply).toHaveBeenCalledWith(
				mockResponse,
				expect.objectContaining({
					title: 'Forbidden',
					status: HttpStatus.FORBIDDEN
				}),
				HttpStatus.FORBIDDEN
			);
		});

		it('应保留 409 Conflict 状态码', () => {
			// Arrange
			const exception = new HttpException('Conflict', HttpStatus.CONFLICT);

			// Act
			filter.catch(exception, mockHost);

			// Assert
			expect(mockHttpAdapter.reply).toHaveBeenCalledWith(
				mockResponse,
				expect.objectContaining({
					title: 'Conflict',
					status: HttpStatus.CONFLICT
				}),
				HttpStatus.CONFLICT
			);
		});

		it('应保留 422 Unprocessable Entity 状态码', () => {
			// Arrange
			const exception = new HttpException('Unprocessable Entity', HttpStatus.UNPROCESSABLE_ENTITY);

			// Act
			filter.catch(exception, mockHost);

			// Assert
			expect(mockHttpAdapter.reply).toHaveBeenCalledWith(
				mockResponse,
				expect.objectContaining({
					title: 'Unprocessable Entity',
					status: HttpStatus.UNPROCESSABLE_ENTITY
				}),
				HttpStatus.UNPROCESSABLE_ENTITY
			);
		});

		it('应保留 503 Service Unavailable 状态码', () => {
			// Arrange
			const exception = new HttpException('Service Unavailable', HttpStatus.SERVICE_UNAVAILABLE);

			// Act
			filter.catch(exception, mockHost);

			// Assert
			expect(mockHttpAdapter.reply).toHaveBeenCalledWith(
				mockResponse,
				expect.objectContaining({
					title: 'Service Unavailable',
					status: HttpStatus.SERVICE_UNAVAILABLE
				}),
				HttpStatus.SERVICE_UNAVAILABLE
			);
		});

		it('应保留 500 Internal Server Error 状态码', () => {
			// Arrange
			const exception = new HttpException('Internal Error', HttpStatus.INTERNAL_SERVER_ERROR);

			// Act
			filter.catch(exception, mockHost);

			// Assert
			expect(mockHttpAdapter.reply).toHaveBeenCalledWith(
				mockResponse,
				expect.objectContaining({
					title: 'Internal Server Error',
					status: HttpStatus.INTERNAL_SERVER_ERROR
				}),
				HttpStatus.INTERNAL_SERVER_ERROR
			);
		});

		it('应正确处理对象形式的响应（带 message 字段）', () => {
			// Arrange
			const exception = new HttpException(
				{ message: '参数验证失败', error: 'Bad Request' },
				HttpStatus.BAD_REQUEST
			);

			// Act
			filter.catch(exception, mockHost);

			// Assert
			expect(mockHttpAdapter.reply).toHaveBeenCalledWith(
				mockResponse,
				expect.objectContaining({
					detail: '参数验证失败'
				}),
				HttpStatus.BAD_REQUEST
			);
		});

		it('应正确处理数组形式的 message', () => {
			// Arrange
			const exception = new HttpException(
				{ message: ['字段 A 不能为空', '字段 B 格式错误'] },
				HttpStatus.BAD_REQUEST
			);

			// Act
			filter.catch(exception, mockHost);

			// Assert
			expect(mockHttpAdapter.reply).toHaveBeenCalledWith(
				mockResponse,
				expect.objectContaining({
					detail: '字段 A 不能为空; 字段 B 格式错误'
				}),
				HttpStatus.BAD_REQUEST
			);
		});

		it('4xx 异常应使用 warn 级别记录日志', () => {
			// Arrange
			const exception = new HttpException('Bad Request', HttpStatus.BAD_REQUEST);

			// Act
			filter.catch(exception, mockHost);

			// Assert
			expect(mockLogger.warn).toHaveBeenCalledWith(
				expect.objectContaining({ err: exception, requestId: 'req-123' }),
				`请求异常（HttpException ${HttpStatus.BAD_REQUEST}）`
			);
		});

		it('5xx 异常应使用 error 级别记录日志', () => {
			// Arrange
			const exception = new HttpException('Internal Error', HttpStatus.INTERNAL_SERVER_ERROR);

			// Act
			filter.catch(exception, mockHost);

			// Assert
			expect(mockLogger.error).toHaveBeenCalledWith(
				expect.objectContaining({ err: exception, requestId: 'req-123' }),
				`服务端异常（HttpException ${HttpStatus.INTERNAL_SERVER_ERROR}）`
			);
		});

		it('其他状态码（如 418）应返回默认标题 Request Error', () => {
			// Arrange
			const exception = new HttpException("I'm a teapot", 418);

			// Act
			filter.catch(exception, mockHost);

			// Assert
			expect(mockHttpAdapter.reply).toHaveBeenCalledWith(
				mockResponse,
				expect.objectContaining({
					title: 'Request Error',
					status: 418
				}),
				418
			);
		});
	});

	describe('请求上下文', () => {
		it('应从 x-request-id header 提取 requestId', () => {
			// Arrange
			mockRequest = { headers: { 'x-request-id': 'custom-request-id' } };
			mockHost = {
				switchToHttp: () => ({
					getRequest: () => mockRequest,
					getResponse: () => mockResponse
				})
			} as unknown as ArgumentsHost;
			const exception = new Error('test');

			// Act
			filter.catch(exception, mockHost);

			// Assert
			expect(mockHttpAdapter.reply).toHaveBeenCalledWith(
				mockResponse,
				expect.objectContaining({ instance: 'custom-request-id' }),
				HttpStatus.INTERNAL_SERVER_ERROR
			);
		});

		it('应从 x-correlation-id header 提取 requestId（作为备选）', () => {
			// Arrange
			mockRequest = { headers: { 'x-correlation-id': 'correlation-123' } };
			mockHost = {
				switchToHttp: () => ({
					getRequest: () => mockRequest,
					getResponse: () => mockResponse
				})
			} as unknown as ArgumentsHost;
			const exception = new Error('test');

			// Act
			filter.catch(exception, mockHost);

			// Assert
			expect(mockHttpAdapter.reply).toHaveBeenCalledWith(
				mockResponse,
				expect.objectContaining({ instance: 'correlation-123' }),
				HttpStatus.INTERNAL_SERVER_ERROR
			);
		});

		it('优先使用 x-request-id 而非其他字段', () => {
			// Arrange
			mockRequest = {
				headers: { 'x-request-id': 'priority-id' },
				id: 'fallback-id',
				requestId: 'another-fallback'
			};
			mockHost = {
				switchToHttp: () => ({
					getRequest: () => mockRequest,
					getResponse: () => mockResponse
				})
			} as unknown as ArgumentsHost;
			const exception = new Error('test');

			// Act
			filter.catch(exception, mockHost);

			// Assert
			expect(mockHttpAdapter.reply).toHaveBeenCalledWith(
				mockResponse,
				expect.objectContaining({ instance: 'priority-id' }),
				HttpStatus.INTERNAL_SERVER_ERROR
			);
		});
	});
});
