/* eslint-disable @typescript-eslint/no-explicit-any */
import { OksaiRequestContextService } from './oksai-request-context.service';

describe('OksaiRequestContextService', () => {
	let service: OksaiRequestContextService;
	let mockCls: any;
	let contextMap: Record<string, unknown>;

	beforeEach(() => {
		contextMap = {};
		mockCls = {
			get: jest.fn((key: string) => contextMap[key]),
			set: jest.fn((key: string, value: unknown) => {
				contextMap[key] = value;
			})
		};
		service = new OksaiRequestContextService(mockCls);
	});

	describe('get', () => {
		it('应该成功获取完整的上下文快照', () => {
			contextMap = {
				requestId: 'req-001',
				tenantId: 't-001',
				userId: 'u-001',
				locale: 'zh-CN'
			};

			const result = service.get();

			expect(result).toEqual({
				requestId: 'req-001',
				tenantId: 't-001',
				userId: 'u-001',
				locale: 'zh-CN'
			});
			expect(mockCls.get).toHaveBeenCalledTimes(4);
		});

		it('应该成功获取空上下文', () => {
			contextMap = {};

			const result = service.get();

			expect(result).toEqual({
				requestId: undefined,
				tenantId: undefined,
				userId: undefined,
				locale: undefined
			});
		});
	});

	describe('getRequestId', () => {
		it('应该成功获取 requestId', () => {
			contextMap.requestId = 'req-001';

			const result = service.getRequestId();

			expect(result).toBe('req-001');
			expect(mockCls.get).toHaveBeenCalledWith('requestId');
		});

		it('应该返回 undefined 当 requestId 不存在时', () => {
			const result = service.getRequestId();

			expect(result).toBeUndefined();
			expect(mockCls.get).toHaveBeenCalledWith('requestId');
		});
	});

	describe('setRequestId', () => {
		it('应该成功设置 requestId', () => {
			service.setRequestId('req-001');

			expect(contextMap.requestId).toBe('req-001');
			expect(mockCls.set).toHaveBeenCalledWith('requestId', 'req-001');
		});
	});

	describe('getTenantId', () => {
		it('应该成功获取 tenantId', () => {
			contextMap.tenantId = 't-001';

			const result = service.getTenantId();

			expect(result).toBe('t-001');
			expect(mockCls.get).toHaveBeenCalledWith('tenantId');
		});

		it('应该返回 undefined 当 tenantId 不存在时', () => {
			const result = service.getTenantId();

			expect(result).toBeUndefined();
			expect(mockCls.get).toHaveBeenCalledWith('tenantId');
		});
	});

	describe('setTenantId', () => {
		it('应该成功设置 tenantId', () => {
			service.setTenantId('t-001');

			expect(contextMap.tenantId).toBe('t-001');
			expect(mockCls.set).toHaveBeenCalledWith('tenantId', 't-001');
		});
	});

	describe('getUserId', () => {
		it('应该成功获取 userId', () => {
			contextMap.userId = 'u-001';

			const result = service.getUserId();

			expect(result).toBe('u-001');
			expect(mockCls.get).toHaveBeenCalledWith('userId');
		});

		it('应该返回 undefined 当 userId 不存在时', () => {
			const result = service.getUserId();

			expect(result).toBeUndefined();
			expect(mockCls.get).toHaveBeenCalledWith('userId');
		});
	});

	describe('setUserId', () => {
		it('应该成功设置 userId', () => {
			service.setUserId('u-001');

			expect(contextMap.userId).toBe('u-001');
			expect(mockCls.set).toHaveBeenCalledWith('userId', 'u-001');
		});
	});

	describe('getLocale', () => {
		it('应该成功获取 locale', () => {
			contextMap.locale = 'zh-CN';

			const result = service.getLocale();

			expect(result).toBe('zh-CN');
			expect(mockCls.get).toHaveBeenCalledWith('locale');
		});

		it('应该返回 undefined 当 locale 不存在时', () => {
			const result = service.getLocale();

			expect(result).toBeUndefined();
			expect(mockCls.get).toHaveBeenCalledWith('locale');
		});
	});

	describe('setLocale', () => {
		it('应该成功设置 locale', () => {
			service.setLocale('zh-CN');

			expect(contextMap.locale).toBe('zh-CN');
			expect(mockCls.set).toHaveBeenCalledWith('locale', 'zh-CN');
		});
	});
});
