import { ExecutionContext, CallHandler } from '@nestjs/common';
import { AuthContextInterceptor } from './auth-context.interceptor';
import { of, lastValueFrom } from 'rxjs';

// 模拟 OksaiRequestContextService 类
class MockOksaiRequestContextService {
	getUserId = jest.fn();
	setUserId = jest.fn();
}

describe('AuthContextInterceptor', () => {
	let interceptor: AuthContextInterceptor;
	let mockCtxService: MockOksaiRequestContextService;
	let mockAuth: { handler: jest.Mock };

	// 创建模拟的执行上下文
	const createMockExecutionContext = (options: {
		url?: string;
		headers?: Record<string, unknown>;
		rawHeaders?: Record<string, unknown>;
	}): ExecutionContext => {
		return {
			switchToHttp: () => ({
				getRequest: () => ({
					raw: {
						url: options.url ?? '/api/some-endpoint',
						headers: options.rawHeaders
					},
					headers: options.headers
				})
			})
		} as unknown as ExecutionContext;
	};

	// 创建模拟的 CallHandler
	const createMockCallHandler = (): CallHandler => ({
		handle: jest.fn(() => of('response'))
	});

	beforeEach(() => {
		jest.clearAllMocks();
		mockCtxService = new MockOksaiRequestContextService();
		mockAuth = {
			handler: jest.fn()
		};
		interceptor = new AuthContextInterceptor(mockCtxService as any, mockAuth as any);
	});

	describe('intercept', () => {
		it('应正确实例化', () => {
			expect(interceptor).toBeDefined();
		});

		it('当请求 /api/auth 路由时，应跳过处理', async () => {
			const context = createMockExecutionContext({
				url: '/api/auth/sign-in',
				headers: { cookie: 'session=abc' }
			});
			const next = createMockCallHandler();

			await lastValueFrom(interceptor.intercept(context, next));

			expect(mockAuth.handler).not.toHaveBeenCalled();
			expect(next.handle).toHaveBeenCalled();
		});

		it('当请求包含 /api/auth 子路径时，应跳过处理', async () => {
			const context = createMockExecutionContext({
				url: '/api/auth/session',
				headers: {}
			});
			const next = createMockCallHandler();

			await lastValueFrom(interceptor.intercept(context, next));

			expect(mockAuth.handler).not.toHaveBeenCalled();
		});

		it('当 CLS 中已存在 userId 时，应跳过会话解析', async () => {
			mockCtxService.getUserId.mockReturnValue('existing-user-id');

			const context = createMockExecutionContext({
				url: '/api/resource',
				headers: { cookie: 'session=abc' }
			});
			const next = createMockCallHandler();

			await lastValueFrom(interceptor.intercept(context, next));

			expect(mockAuth.handler).not.toHaveBeenCalled();
			expect(next.handle).toHaveBeenCalled();
		});

		it('当会话有效时，应将 userId 写入 CLS', async () => {
			mockCtxService.getUserId.mockReturnValue(null);
			mockAuth.handler.mockResolvedValue(
				new Response(JSON.stringify({ user: { id: 'user-123' } }), {
					status: 200,
					headers: { 'Content-Type': 'application/json' }
				})
			);

			const context = createMockExecutionContext({
				url: '/api/resource',
				rawHeaders: { cookie: 'session=valid-session' }
			});
			const next = createMockCallHandler();

			await lastValueFrom(interceptor.intercept(context, next));

			expect(mockAuth.handler).toHaveBeenCalled();
			expect(mockCtxService.setUserId).toHaveBeenCalledWith('user-123');
			expect(next.handle).toHaveBeenCalled();
		});

		it('当使用 req.headers 而非 raw.headers 时，应正确提取 headers', async () => {
			mockCtxService.getUserId.mockReturnValue(null);
			mockAuth.handler.mockResolvedValue(
				new Response(JSON.stringify({ user: { id: 'user-456' } }), {
					status: 200,
					headers: { 'Content-Type': 'application/json' }
				})
			);

			const context = createMockExecutionContext({
				url: '/api/resource',
				headers: { cookie: 'session=another-session' },
				rawHeaders: undefined
			});
			const next = createMockCallHandler();

			await lastValueFrom(interceptor.intercept(context, next));

			expect(mockCtxService.setUserId).toHaveBeenCalledWith('user-456');
		});

		it('当响应非 200 时，不应设置 userId', async () => {
			mockCtxService.getUserId.mockReturnValue(null);
			mockAuth.handler.mockResolvedValue(
				new Response(JSON.stringify({ error: 'Unauthorized' }), {
					status: 401
				})
			);

			const context = createMockExecutionContext({
				url: '/api/resource',
				headers: { cookie: 'session=invalid' }
			});
			const next = createMockCallHandler();

			await lastValueFrom(interceptor.intercept(context, next));

			expect(mockCtxService.setUserId).not.toHaveBeenCalled();
			expect(next.handle).toHaveBeenCalled();
		});

		it('当响应中无 user 字段时，不应设置 userId', async () => {
			mockCtxService.getUserId.mockReturnValue(null);
			mockAuth.handler.mockResolvedValue(
				new Response(JSON.stringify({ session: null }), {
					status: 200,
					headers: { 'Content-Type': 'application/json' }
				})
			);

			const context = createMockExecutionContext({
				url: '/api/resource',
				headers: {}
			});
			const next = createMockCallHandler();

			await lastValueFrom(interceptor.intercept(context, next));

			expect(mockCtxService.setUserId).not.toHaveBeenCalled();
		});

		it('当 user.id 不存在时，不应设置 userId', async () => {
			mockCtxService.getUserId.mockReturnValue(null);
			mockAuth.handler.mockResolvedValue(
				new Response(JSON.stringify({ user: {} }), {
					status: 200,
					headers: { 'Content-Type': 'application/json' }
				})
			);

			const context = createMockExecutionContext({
				url: '/api/resource',
				headers: {}
			});
			const next = createMockCallHandler();

			await lastValueFrom(interceptor.intercept(context, next));

			expect(mockCtxService.setUserId).not.toHaveBeenCalled();
		});

		it('当 auth.handler 抛出异常时，应静默处理并继续执行', async () => {
			mockCtxService.getUserId.mockReturnValue(null);
			mockAuth.handler.mockRejectedValue(new Error('Network error'));

			const context = createMockExecutionContext({
				url: '/api/resource',
				headers: { cookie: 'session=xyz' }
			});
			const next = createMockCallHandler();

			// 不应抛出异常
			await expect(lastValueFrom(interceptor.intercept(context, next))).resolves.toBeDefined();
			expect(mockCtxService.setUserId).not.toHaveBeenCalled();
			expect(next.handle).toHaveBeenCalled();
		});

		it('当请求无 headers 时，应正常处理', async () => {
			mockCtxService.getUserId.mockReturnValue(null);
			mockAuth.handler.mockResolvedValue(
				new Response(JSON.stringify({ user: null }), {
					status: 200,
					headers: { 'Content-Type': 'application/json' }
				})
			);

			const context = {
				switchToHttp: () => ({
					getRequest: () => ({})
				})
			} as unknown as ExecutionContext;
			const next = createMockCallHandler();

			await lastValueFrom(interceptor.intercept(context, next));

			expect(next.handle).toHaveBeenCalled();
		});

		it('当请求 URL 为空字符串时，应正常处理', async () => {
			mockCtxService.getUserId.mockReturnValue(null);

			const context = createMockExecutionContext({
				url: '',
				headers: {}
			});
			const next = createMockCallHandler();

			await lastValueFrom(interceptor.intercept(context, next));

			expect(mockAuth.handler).toHaveBeenCalled();
		});

		it('当请求 URL 为 undefined 时，应正常处理', async () => {
			mockCtxService.getUserId.mockReturnValue(null);

			const context = {
				switchToHttp: () => ({
					getRequest: () => ({
						raw: { url: undefined, headers: {} }
					})
				})
			} as unknown as ExecutionContext;
			const next = createMockCallHandler();

			await lastValueFrom(interceptor.intercept(context, next));

			expect(mockAuth.handler).toHaveBeenCalled();
		});

		it('应传递正确的请求 URL 给 auth.handler', async () => {
			mockCtxService.getUserId.mockReturnValue(null);
			mockAuth.handler.mockResolvedValue(
				new Response(JSON.stringify({ user: null }), {
					status: 200
				})
			);

			const context = createMockExecutionContext({
				url: '/api/test',
				headers: { authorization: 'Bearer token' }
			});
			const next = createMockCallHandler();

			await lastValueFrom(interceptor.intercept(context, next));

			// 验证 handler 被调用时使用了正确的 URL
			expect(mockAuth.handler).toHaveBeenCalled();
			const requestArg = mockAuth.handler.mock.calls[0][0];
			expect(requestArg.url).toBe('http://localhost/api/auth/get-session');
			expect(requestArg.method).toBe('GET');
		});
	});
});
