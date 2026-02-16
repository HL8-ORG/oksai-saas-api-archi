/* eslint-disable @typescript-eslint/no-explicit-any */
import { setupOksaiClsModule } from './setup-cls-module';
import { OKSAI_REQUEST_CONTEXT_KEYS } from './oksai-request-context';

jest.mock('nestjs-cls', () => ({
	...jest.requireActual('nestjs-cls'),
	ClsModule: {
		forRoot: jest.fn()
	}
}));

describe('setupOksaiClsModule', () => {
	let ClsModule: any;
	let mockCls: any;
	let contextMap: Record<string, unknown>;

	beforeEach(() => {
		jest.clearAllMocks();
		contextMap = {};
		mockCls = {
			set: jest.fn((key: string, value: unknown) => {
				contextMap[key] = value;
			})
		};

		ClsModule = require('nestjs-cls').ClsModule;
		ClsModule.forRoot = jest.fn(() => 'dynamic-module');
	});

	describe('默认配置', () => {
		it('应该使用默认 header 名称创建 CLS 模块', () => {
			const result = setupOksaiClsModule();

			expect(ClsModule.forRoot).toHaveBeenCalledWith(
				expect.objectContaining({
					global: true,
					middleware: expect.objectContaining({
						mount: true,
						setup: expect.any(Function)
					})
				})
			);
			expect(result).toBe('dynamic-module');
		});

		it('应该从默认 headers 提取上下文并写入 CLS', () => {
			setupOksaiClsModule();
			const setupFn = (ClsModule.forRoot as jest.Mock).mock.calls[0][0].middleware.setup;

			const mockReq = {
				id: 'req-123',
				headers: {
					'x-tenant-id': 't-001',
					'x-lang': 'zh-CN',
					'x-request-id': 'req-abc'
				}
			};

			setupFn(mockCls, mockReq);

			expect(contextMap[OKSAI_REQUEST_CONTEXT_KEYS.requestId]).toBe('req-abc');
			expect(contextMap[OKSAI_REQUEST_CONTEXT_KEYS.tenantId]).toBe('t-001');
			expect(contextMap[OKSAI_REQUEST_CONTEXT_KEYS.locale]).toBe('zh-CN');
			expect(mockCls.set).toHaveBeenCalledTimes(3);
		});

		it('应该使用 x-correlation-id 作为备选 requestId', () => {
			setupOksaiClsModule();
			const setupFn = (ClsModule.forRoot as jest.Mock).mock.calls[0][0].middleware.setup;

			const mockReq = {
				headers: {
					'x-correlation-id': 'correlation-xyz',
					'x-tenant-id': 't-001'
				}
			};

			setupFn(mockCls, mockReq);

			expect(contextMap[OKSAI_REQUEST_CONTEXT_KEYS.requestId]).toBe('correlation-xyz');
		});

		it('应该使用 req.id 作为备选 requestId', () => {
			setupOksaiClsModule();
			const setupFn = (ClsModule.forRoot as jest.Mock).mock.calls[0][0].middleware.setup;

			const mockReq = {
				id: 'req-from-id',
				headers: {
					'x-tenant-id': 't-001'
				}
			};

			setupFn(mockCls, mockReq);

			expect(contextMap[OKSAI_REQUEST_CONTEXT_KEYS.requestId]).toBe('req-from-id');
		});
	});

	describe('自定义 header 名称', () => {
		it('应该使用自定义 tenantId header 名称', () => {
			setupOksaiClsModule({
				tenantIdHeaderName: 'custom-tenant-id'
			});
			const setupFn = (ClsModule.forRoot as jest.Mock).mock.calls[0][0].middleware.setup;

			const mockReq = {
				headers: {
					'custom-tenant-id': 't-custom',
					'x-lang': 'en-US'
				}
			};

			setupFn(mockCls, mockReq);

			expect(contextMap[OKSAI_REQUEST_CONTEXT_KEYS.tenantId]).toBe('t-custom');
		});

		it('应该使用自定义 locale header 名称', () => {
			setupOksaiClsModule({
				localeHeaderName: 'accept-language'
			});
			const setupFn = (ClsModule.forRoot as jest.Mock).mock.calls[0][0].middleware.setup;

			const mockReq = {
				headers: {
					'accept-language': 'fr-FR'
				}
			};

			setupFn(mockCls, mockReq);

			expect(contextMap[OKSAI_REQUEST_CONTEXT_KEYS.locale]).toBe('fr-FR');
		});

		it('应该同时使用多个自定义 header 名称', () => {
			setupOksaiClsModule({
				tenantIdHeaderName: 'org-id',
				localeHeaderName: 'accept-language'
			});
			const setupFn = (ClsModule.forRoot as jest.Mock).mock.calls[0][0].middleware.setup;

			const mockReq = {
				headers: {
					'org-id': 'org-123',
					'accept-language': 'de-DE',
					'x-request-id': 'req-xyz'
				}
			};

			setupFn(mockCls, mockReq);

			expect(contextMap[OKSAI_REQUEST_CONTEXT_KEYS.tenantId]).toBe('org-123');
			expect(contextMap[OKSAI_REQUEST_CONTEXT_KEYS.locale]).toBe('de-DE');
		});
	});

	describe('边界情况', () => {
		it('当 enabled 为 false 时应该返回空模块', () => {
			const result = setupOksaiClsModule({ enabled: false });

			expect(ClsModule.forRoot).not.toHaveBeenCalled();
			expect(result).toEqual({ module: ClsModule });
		});

		it('不应该写入空字符串的值', () => {
			setupOksaiClsModule();
			const setupFn = (ClsModule.forRoot as jest.Mock).mock.calls[0][0].middleware.setup;

			const mockReq = {
				headers: {
					'x-tenant-id': '',
					'x-lang': ''
				}
			};

			setupFn(mockCls, mockReq);

			expect(mockCls.set).not.toHaveBeenCalled();
		});

		it('应该处理数组类型 header 值', () => {
			setupOksaiClsModule();
			const setupFn = (ClsModule.forRoot as jest.Mock).mock.calls[0][0].middleware.setup;

			const mockReq = {
				headers: {
					'x-tenant-id': ['t-001', 't-002'],
					'x-lang': ['zh-CN', 'en-US']
				}
			};

			setupFn(mockCls, mockReq);

			expect(contextMap[OKSAI_REQUEST_CONTEXT_KEYS.tenantId]).toBe('t-001');
			expect(contextMap[OKSAI_REQUEST_CONTEXT_KEYS.locale]).toBe('zh-CN');
		});

		it('应该处理 null header 值', () => {
			setupOksaiClsModule();
			const setupFn = (ClsModule.forRoot as jest.Mock).mock.calls[0][0].middleware.setup;

			const mockReq = {
				headers: {
					'x-tenant-id': null,
					'x-lang': null
				}
			};

			setupFn(mockCls, mockReq);

			expect(mockCls.set).not.toHaveBeenCalled();
		});

		it('应该处理缺少 headers 的请求', () => {
			setupOksaiClsModule();
			const setupFn = (ClsModule.forRoot as jest.Mock).mock.calls[0][0].middleware.setup;

			const mockReq = {};

			setupFn(mockCls, mockReq);

			expect(mockCls.set).not.toHaveBeenCalled();
		});

		it('应该处理 headers 为 null 的请求', () => {
			setupOksaiClsModule();
			const setupFn = (ClsModule.forRoot as jest.Mock).mock.calls[0][0].middleware.setup;

			const mockReq = null;

			setupFn(mockCls, mockReq);

			expect(mockCls.set).not.toHaveBeenCalled();
		});

		it('应该不区分大小写匹配 header 名称', () => {
			setupOksaiClsModule();
			const setupFn = (ClsModule.forRoot as jest.Mock).mock.calls[0][0].middleware.setup;

			const mockReq = {
				headers: {
					'x-tenant-id': 't-001',
					'x-lang': 'zh-CN'
				}
			};

			setupFn(mockCls, mockReq);

			expect(contextMap[OKSAI_REQUEST_CONTEXT_KEYS.tenantId]).toBe('t-001');
			expect(contextMap[OKSAI_REQUEST_CONTEXT_KEYS.locale]).toBe('zh-CN');
		});

		it('应该将自定义 header 名称转为小写', () => {
			setupOksaiClsModule({
				tenantIdHeaderName: 'Custom-Tenant-ID'
			});
			const setupFn = (ClsModule.forRoot as jest.Mock).mock.calls[0][0].middleware.setup;

			const mockReq = {
				headers: {
					'custom-tenant-id': 't-001'
				}
			};

			setupFn(mockCls, mockReq);

			expect(contextMap[OKSAI_REQUEST_CONTEXT_KEYS.tenantId]).toBe('t-001');
		});
	});
});
