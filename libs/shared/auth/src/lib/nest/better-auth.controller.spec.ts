import { Test, TestingModule } from '@nestjs/testing';
import { BetterAuthController } from './better-auth.controller';
import { OKSAI_BETTER_AUTH_TOKEN } from './tokens';
import { OKSAI_OUTBOX_TOKEN } from '@oksai/messaging';

// 模拟 IOutbox 接口
interface MockOutbox {
	append: jest.Mock;
}

describe('BetterAuthController', () => {
	let controller: BetterAuthController;
	let mockAuth: { handler: jest.Mock };
	let mockOutbox: MockOutbox;

	beforeEach(async () => {
		// 创建模拟的 Auth 实例
		mockAuth = {
			handler: jest.fn()
		};

		// 创建模拟的 Outbox 实例
		mockOutbox = {
			append: jest.fn()
		};

		const module: TestingModule = await Test.createTestingModule({
			controllers: [BetterAuthController],
			providers: [
				{
					provide: OKSAI_BETTER_AUTH_TOKEN,
					useValue: mockAuth
				},
				{
					provide: OKSAI_OUTBOX_TOKEN,
					useValue: mockOutbox
				}
			]
		}).compile();

		controller = module.get<BetterAuthController>(BetterAuthController);
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	describe('初始化', () => {
		it('应正确实例化', () => {
			expect(controller).toBeDefined();
		});

		it('当无 Outbox 时应也能正常实例化', async () => {
			const moduleWithoutOutbox: TestingModule = await Test.createTestingModule({
				controllers: [BetterAuthController],
				providers: [
					{
						provide: OKSAI_BETTER_AUTH_TOKEN,
						useValue: mockAuth
					}
				]
			}).compile();

			const controllerWithoutOutbox = moduleWithoutOutbox.get<BetterAuthController>(BetterAuthController);
			expect(controllerWithoutOutbox).toBeDefined();
		});
	});

	describe('handle', () => {
		const createMockRequest = (
			options: {
				method?: string;
				url?: string;
				headers?: Record<string, unknown>;
				body?: unknown;
			} = {}
		) => ({
			method: options.method ?? 'GET',
			url: options.url ?? '/api/auth/get-session',
			headers: options.headers ?? {},
			body: options.body,
			raw: {
				method: options.method ?? 'GET',
				url: options.url ?? '/api/auth/get-session',
				headers: options.headers ?? {}
			}
		});

		const createMockReply = () => {
			const headers: Record<string, string> = {};
			let statusCode = 200;
			let sentPayload: unknown;

			return {
				status: jest.fn((code: number) => {
					statusCode = code;
					return createMockReply();
				}),
				header: jest.fn((name: string, value: string) => {
					headers[name] = value;
					return createMockReply();
				}),
				headers: jest.fn((h: Record<string, string>) => {
					Object.assign(headers, h);
					return createMockReply();
				}),
				send: jest.fn((payload?: unknown) => {
					sentPayload = payload;
					return createMockReply();
				}),
				_getStatusCode: () => statusCode,
				_getHeaders: () => headers,
				_getSentPayload: () => sentPayload
			};
		};

		describe('GET 请求', () => {
			it('应正确处理 GET 请求并返回 JSON 响应', async () => {
				const mockResponse = {
					user: { id: 'user-123', email: 'test@example.com' }
				};

				mockAuth.handler.mockResolvedValue(
					new Response(JSON.stringify(mockResponse), {
						status: 200,
						headers: { 'Content-Type': 'application/json' }
					})
				);

				const req = createMockRequest({
					method: 'GET',
					url: '/api/auth/get-session',
					headers: { cookie: 'session=abc' }
				});
				const reply = createMockReply();

				await controller.handle(req, reply);

				expect(mockAuth.handler).toHaveBeenCalled();
				expect(reply.status).toHaveBeenCalledWith(200);
				expect(reply.send).toHaveBeenCalledWith(mockResponse);
			});

			it('应正确复制响应头到 reply', async () => {
				mockAuth.handler.mockResolvedValue(
					new Response(JSON.stringify({ success: true }), {
						status: 200,
						headers: {
							'Content-Type': 'application/json',
							'X-Custom-Header': 'custom-value'
						}
					})
				);

				const req = createMockRequest({ method: 'GET' });
				const reply = createMockReply();

				await controller.handle(req, reply);

				expect(reply.header).toHaveBeenCalledWith('content-type', 'application/json');
				expect(reply.header).toHaveBeenCalledWith('x-custom-header', 'custom-value');
			});

			it('应正确处理 set-cookie 响应头', async () => {
				const mockResponse = new Response(JSON.stringify({ success: true }), {
					status: 200,
					headers: { 'Content-Type': 'application/json' }
				});

				// 手动设置 set-cookie（模拟 Headers.getSetCookie）
				Object.defineProperty(mockResponse.headers, 'getSetCookie', {
					value: () => ['session=abc; Path=/', 'token=xyz; Path=/']
				});

				mockAuth.handler.mockResolvedValue(mockResponse);

				const req = createMockRequest({ method: 'GET' });
				const reply = createMockReply();

				await controller.handle(req, reply);

				expect(reply.header).toHaveBeenCalledWith('set-cookie', 'session=abc; Path=/');
				expect(reply.header).toHaveBeenCalledWith('set-cookie', 'token=xyz; Path=/');
			});
		});

		describe('POST 请求', () => {
			it('应正确处理 POST 请求并传递 body', async () => {
				const requestBody = { email: 'test@example.com', password: 'password123' };
				const mockResponse = {
					user: { id: 'new-user', email: 'test@example.com' }
				};

				mockAuth.handler.mockResolvedValue(
					new Response(JSON.stringify(mockResponse), {
						status: 201,
						headers: { 'Content-Type': 'application/json' }
					})
				);

				const req = createMockRequest({
					method: 'POST',
					url: '/api/auth/sign-in/email',
					headers: { 'content-type': 'application/json' },
					body: requestBody
				});
				const reply = createMockReply();

				await controller.handle(req, reply);

				expect(mockAuth.handler).toHaveBeenCalled();
				const calledRequest = mockAuth.handler.mock.calls[0][0];
				expect(calledRequest.method).toBe('POST');

				// 验证 body 被正确序列化
				const bodyText = await calledRequest.text();
				expect(JSON.parse(bodyText)).toEqual(requestBody);
			});

			it('当 body 为字符串时应直接使用', async () => {
				const bodyString = '{"email":"test@example.com","password":"pass"}';

				mockAuth.handler.mockResolvedValue(
					new Response(JSON.stringify({ success: true }), {
						status: 200,
						headers: { 'Content-Type': 'application/json' }
					})
				);

				const req = createMockRequest({
					method: 'POST',
					body: bodyString,
					headers: { 'content-type': 'application/json' }
				});
				const reply = createMockReply();

				await controller.handle(req, reply);

				const calledRequest = mockAuth.handler.mock.calls[0][0];
				const bodyText = await calledRequest.text();
				expect(bodyText).toBe(bodyString);
			});

			it('当缺少 content-type 时应自动添加 application/json', async () => {
				const requestBody = { email: 'test@example.com' };

				mockAuth.handler.mockResolvedValue(
					new Response(JSON.stringify({ success: true }), {
						status: 200,
						headers: { 'Content-Type': 'application/json' }
					})
				);

				const req = createMockRequest({
					method: 'POST',
					body: requestBody
					// 无 headers
				});
				const reply = createMockReply();

				await controller.handle(req, reply);

				const calledRequest = mockAuth.handler.mock.calls[0][0];
				expect(calledRequest.headers.get('content-type')).toBe('application/json');
			});

			it('当 body 为 undefined 时不应添加 body', async () => {
				mockAuth.handler.mockResolvedValue(
					new Response(JSON.stringify({ success: true }), {
						status: 200,
						headers: { 'Content-Type': 'application/json' }
					})
				);

				const req = createMockRequest({
					method: 'POST',
					body: undefined
				});
				const reply = createMockReply();

				await controller.handle(req, reply);

				const calledRequest = mockAuth.handler.mock.calls[0][0];
				// Request 构造函数会将 undefined body 转为 null
				expect(calledRequest.body).toBeNull();
			});
		});

		describe('非 JSON 响应', () => {
			it('应正确处理非 JSON 响应（如 HTML）', async () => {
				const htmlContent = '<html><body>Success</body></html>';

				mockAuth.handler.mockResolvedValue(
					new Response(htmlContent, {
						status: 200,
						headers: { 'Content-Type': 'text/html' }
					})
				);

				const req = createMockRequest({ method: 'GET' });
				const reply = createMockReply();

				await controller.handle(req, reply);

				expect(reply.send).toHaveBeenCalled();
				const sentPayload = reply.send.mock.calls[0][0];
				expect(sentPayload).toBeInstanceOf(Buffer);
				expect(sentPayload.toString()).toBe(htmlContent);
			});
		});

		describe('使用 raw 请求属性', () => {
			it('应优先使用 raw.method 和 raw.url', async () => {
				mockAuth.handler.mockResolvedValue(
					new Response(JSON.stringify({ success: true }), {
						status: 200,
						headers: { 'Content-Type': 'application/json' }
					})
				);

				const req = {
					method: 'GET',
					url: '/wrong-url',
					raw: {
						method: 'POST',
						url: '/api/auth/sign-in/email',
						headers: { 'content-type': 'application/json' }
					},
					body: { email: 'test@example.com' }
				};
				const reply = createMockReply();

				await controller.handle(req, reply);

				const calledRequest = mockAuth.handler.mock.calls[0][0];
				expect(calledRequest.method).toBe('POST');
			});
		});
	});
});
