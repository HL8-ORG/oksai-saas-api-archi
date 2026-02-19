import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext } from '@nestjs/common';
import { AuthSessionGuard } from './auth-session.guard';
import { OKSAI_BETTER_AUTH_TOKEN } from '../tokens';

// 模拟 OksaiRequestContextService 类
class MockOksaiRequestContextService {
	getUserId = jest.fn();
	setUserId = jest.fn();
}

describe('AuthSessionGuard', () => {
	let guard: AuthSessionGuard;
	let mockCtxService: MockOksaiRequestContextService;
	let mockAuth: { handler: jest.Mock };

	beforeEach(async () => {
		// 创建模拟的 CLS 服务
		mockCtxService = new MockOksaiRequestContextService();

		// 创建模拟的 Auth 实例
		mockAuth = {
			handler: jest.fn()
		};

		const module: TestingModule = await Test.createTestingModule({
			providers: [
				AuthSessionGuard,
				{
					provide: 'OksaiRequestContextService',
					useValue: mockCtxService
				},
				{
					provide: OKSAI_BETTER_AUTH_TOKEN,
					useValue: mockAuth
				}
			]
		})
			// 使用 overrideProvider 来覆盖实际的类
			.overrideProvider(AuthSessionGuard)
			.useFactory({
				factory: () => new AuthSessionGuard(mockCtxService as any, mockAuth as any),
				inject: []
			})
			.compile();

		guard = module.get<AuthSessionGuard>(AuthSessionGuard);
	});

	describe('canActivate', () => {
		const createMockExecutionContext = (headers?: Record<string, unknown>): ExecutionContext => {
			return {
				switchToHttp: () => ({
					getRequest: () => ({
						headers,
						raw: { headers }
					})
				})
			} as unknown as ExecutionContext;
		};

		it('应正确实例化', () => {
			expect(guard).toBeDefined();
		});

		it('当 CLS 中已存在 userId 时，应跳过解析并返回 true', async () => {
			mockCtxService.getUserId.mockReturnValue('existing-user-id');

			const context = createMockExecutionContext({ cookie: 'session=abc' });
			const result = await guard.canActivate(context);

			expect(result).toBe(true);
			expect(mockCtxService.getUserId).toHaveBeenCalled();
			expect(mockAuth.handler).not.toHaveBeenCalled();
		});

		it('当会话有效时，应将 userId 写入 CLS', async () => {
			mockCtxService.getUserId.mockReturnValue(null);
			mockAuth.handler.mockResolvedValue(
				new Response(JSON.stringify({ user: { id: 'user-123' } }), {
					status: 200,
					headers: { 'Content-Type': 'application/json' }
				})
			);

			const context = createMockExecutionContext({ cookie: 'session=valid-session' });
			const result = await guard.canActivate(context);

			expect(result).toBe(true);
			expect(mockAuth.handler).toHaveBeenCalled();
			expect(mockCtxService.setUserId).toHaveBeenCalledWith('user-123');
		});

		it('当会话无效（响应非 200）时，应返回 true 但不设置 userId', async () => {
			mockCtxService.getUserId.mockReturnValue(null);
			mockAuth.handler.mockResolvedValue(
				new Response(JSON.stringify({ error: 'Unauthorized' }), {
					status: 401
				})
			);

			const context = createMockExecutionContext({ cookie: 'session=invalid' });
			const result = await guard.canActivate(context);

			expect(result).toBe(true);
			expect(mockCtxService.setUserId).not.toHaveBeenCalled();
		});

		it('当响应中无 user 字段时，应返回 true 但不设置 userId', async () => {
			mockCtxService.getUserId.mockReturnValue(null);
			mockAuth.handler.mockResolvedValue(
				new Response(JSON.stringify({ session: null }), {
					status: 200,
					headers: { 'Content-Type': 'application/json' }
				})
			);

			const context = createMockExecutionContext({});
			const result = await guard.canActivate(context);

			expect(result).toBe(true);
			expect(mockCtxService.setUserId).not.toHaveBeenCalled();
		});

		it('当 user.id 不存在时，应返回 true 但不设置 userId', async () => {
			mockCtxService.getUserId.mockReturnValue(null);
			mockAuth.handler.mockResolvedValue(
				new Response(JSON.stringify({ user: {} }), {
					status: 200,
					headers: { 'Content-Type': 'application/json' }
				})
			);

			const context = createMockExecutionContext({});
			const result = await guard.canActivate(context);

			expect(result).toBe(true);
			expect(mockCtxService.setUserId).not.toHaveBeenCalled();
		});

		it('当 auth.handler 抛出异常时，应静默处理并返回 true', async () => {
			mockCtxService.getUserId.mockReturnValue(null);
			mockAuth.handler.mockRejectedValue(new Error('Network error'));

			const context = createMockExecutionContext({});
			const result = await guard.canActivate(context);

			expect(result).toBe(true);
			expect(mockCtxService.setUserId).not.toHaveBeenCalled();
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

			const result = await guard.canActivate(context);

			expect(result).toBe(true);
		});

		it('当使用 raw.headers 时，应正确提取 headers', async () => {
			mockCtxService.getUserId.mockReturnValue(null);
			mockAuth.handler.mockResolvedValue(
				new Response(JSON.stringify({ user: { id: 'user-456' } }), {
					status: 200,
					headers: { 'Content-Type': 'application/json' }
				})
			);

			const context = {
				switchToHttp: () => ({
					getRequest: () => ({
						raw: {
							headers: { cookie: 'session=xyz' }
						}
					})
				})
			} as unknown as ExecutionContext;

			const result = await guard.canActivate(context);

			expect(result).toBe(true);
			expect(mockCtxService.setUserId).toHaveBeenCalledWith('user-456');
		});
	});
});
