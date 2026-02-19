import { setupRequestIdResponseHeader, SetupRequestIdResponseHeaderOptions } from './setup-request-id-response-header';

describe('setupRequestIdResponseHeader', () => {
	let mockApp: any;
	let mockHttpAdapter: any;
	let mockInstance: any;

	beforeEach(() => {
		mockInstance = {
			addHook: jest.fn()
		};

		mockHttpAdapter = {
			getInstance: jest.fn().mockReturnValue(mockInstance)
		};

		mockApp = {
			getHttpAdapter: jest.fn().mockReturnValue(mockHttpAdapter)
		};
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	describe('Fastify 环境设置', () => {
		it('应该注册 onSend 钩子', () => {
			setupRequestIdResponseHeader(mockApp);

			expect(mockInstance.addHook).toHaveBeenCalledWith('onSend', expect.any(Function));
		});

		it('应该使用默认 header 名称 x-request-id', () => {
			setupRequestIdResponseHeader(mockApp);

			const onSendCallback = mockInstance.addHook.mock.calls[0][1];
			const mockReply = { header: jest.fn() };

			onSendCallback({ id: 'req-123' }, mockReply, 'payload', jest.fn());

			expect(mockReply.header).toHaveBeenCalledWith('x-request-id', 'req-123');
		});

		it('应该支持自定义 header 名称', () => {
			setupRequestIdResponseHeader(mockApp, { headerName: 'x-correlation-id' });

			const onSendCallback = mockInstance.addHook.mock.calls[0][1];
			const mockReply = { header: jest.fn() };

			onSendCallback({ id: 'req-456' }, mockReply, 'payload', jest.fn());

			expect(mockReply.header).toHaveBeenCalledWith('x-correlation-id', 'req-456');
		});
	});

	describe('请求 ID 提取', () => {
		it('应该从 req.id 提取请求 ID', () => {
			setupRequestIdResponseHeader(mockApp);

			const onSendCallback = mockInstance.addHook.mock.calls[0][1];
			const mockReply = { header: jest.fn() };

			onSendCallback({ id: 'test-request-id' }, mockReply, 'payload', jest.fn());

			expect(mockReply.header).toHaveBeenCalledWith('x-request-id', 'test-request-id');
		});

		it('当没有请求 ID 时应该返回 unknown', () => {
			setupRequestIdResponseHeader(mockApp);

			const onSendCallback = mockInstance.addHook.mock.calls[0][1];
			const mockReply = { header: jest.fn() };

			onSendCallback({}, mockReply, 'payload', jest.fn());

			expect(mockReply.header).toHaveBeenCalledWith('x-request-id', 'unknown');
		});

		it('当 req.id 为 null 时应该返回 unknown', () => {
			setupRequestIdResponseHeader(mockApp);

			const onSendCallback = mockInstance.addHook.mock.calls[0][1];
			const mockReply = { header: jest.fn() };

			onSendCallback({ id: null }, mockReply, 'payload', jest.fn());

			expect(mockReply.header).toHaveBeenCalledWith('x-request-id', 'unknown');
		});

		it('应该将数字 ID 转换为字符串', () => {
			setupRequestIdResponseHeader(mockApp);

			const onSendCallback = mockInstance.addHook.mock.calls[0][1];
			const mockReply = { header: jest.fn() };

			onSendCallback({ id: 12345 }, mockReply, 'payload', jest.fn());

			expect(mockReply.header).toHaveBeenCalledWith('x-request-id', '12345');
		});
	});

	describe('钩子回调行为', () => {
		it('应该调用 done 回调并传递 payload', () => {
			setupRequestIdResponseHeader(mockApp);

			const onSendCallback = mockInstance.addHook.mock.calls[0][1];
			const mockDone = jest.fn();
			const mockReply = { header: jest.fn() };
			const payload = { data: 'test' };

			onSendCallback({ id: 'req-1' }, mockReply, payload, mockDone);

			expect(mockDone).toHaveBeenCalledWith(null, payload);
		});

		it('应该将 error 参数设为 null', () => {
			setupRequestIdResponseHeader(mockApp);

			const onSendCallback = mockInstance.addHook.mock.calls[0][1];
			const mockDone = jest.fn();
			const mockReply = { header: jest.fn() };

			onSendCallback({ id: 'req-1' }, mockReply, 'payload', mockDone);

			expect(mockDone).toHaveBeenCalledWith(null, expect.anything());
		});
	});

	describe('非 Fastify 环境', () => {
		it('当 addHook 不是函数时应该安全退出', () => {
			mockInstance.addHook = 'not a function';

			setupRequestIdResponseHeader(mockApp);

			expect(mockApp.getHttpAdapter).toHaveBeenCalled();
		});

		it('当 instance 没有 addHook 时应该安全退出', () => {
			mockInstance = {};
			mockHttpAdapter.getInstance.mockReturnValue(mockInstance);

			setupRequestIdResponseHeader(mockApp);

			expect(mockInstance.addHook).toBeUndefined();
		});

		it('当 instance 为 null 时应该安全退出', () => {
			mockHttpAdapter.getInstance.mockReturnValue(null);

			expect(() => setupRequestIdResponseHeader(mockApp)).not.toThrow();
		});

		it('当 instance 为 undefined 时应该安全退出', () => {
			mockHttpAdapter.getInstance.mockReturnValue(undefined);

			expect(() => setupRequestIdResponseHeader(mockApp)).not.toThrow();
		});
	});

	describe('选项处理', () => {
		it('应该支持空选项对象', () => {
			setupRequestIdResponseHeader(mockApp, {});

			expect(mockInstance.addHook).toHaveBeenCalled();
		});

		it('应该支持不传选项', () => {
			setupRequestIdResponseHeader(mockApp);

			expect(mockInstance.addHook).toHaveBeenCalled();
		});

		it('应该忽略未知的选项属性', () => {
			setupRequestIdResponseHeader(mockApp, { unknownOption: 'value' } as any);

			expect(mockInstance.addHook).toHaveBeenCalled();
		});
	});

	describe('完整集成场景', () => {
		it('应该在完整的请求响应周期中正确工作', () => {
			setupRequestIdResponseHeader(mockApp);

			const onSendCallback = mockInstance.addHook.mock.calls[0][1];
			const mockReply = { header: jest.fn() };
			const mockDone = jest.fn();
			const mockReq = { id: 'fastify-generated-id' };
			const mockPayload = Buffer.from('response body');

			onSendCallback(mockReq, mockReply, mockPayload, mockDone);

			expect(mockReply.header).toHaveBeenCalledTimes(1);
			expect(mockReply.header).toHaveBeenCalledWith('x-request-id', 'fastify-generated-id');
			expect(mockDone).toHaveBeenCalledTimes(1);
			expect(mockDone).toHaveBeenCalledWith(null, mockPayload);
		});
	});
});
