import { ClsServiceManager } from 'nestjs-cls';
import { OKSAI_REQUEST_CONTEXT_KEYS, runWithOksaiContext } from './oksai-request-context';

describe('runWithOksaiContext', () => {
	afterEach(() => {
		jest.restoreAllMocks();
	});

	it('should throw when CLS is not initialized', () => {
		jest.spyOn(ClsServiceManager, 'getClsService').mockReturnValue(undefined as any);

		expect(() => runWithOksaiContext({ tenantId: 't-001' }, () => 1)).toThrow('CLS 未初始化');
	});

	it('should create a new CLS store and set provided context keys', async () => {
		const set = jest.fn();
		const runWith = jest.fn((_store: unknown, cb: () => unknown) => cb());
		const cls = { set, runWith };

		jest.spyOn(ClsServiceManager, 'getClsService').mockReturnValue(cls as any);

		const result = await runWithOksaiContext(
			{ requestId: 'job-1', tenantId: 't-001', userId: 'u-001', locale: 'zh' },
			async () => 'ok'
		);

		expect(result).toBe('ok');
		expect(runWith).toHaveBeenCalledTimes(1);

		expect(set).toHaveBeenCalledWith(OKSAI_REQUEST_CONTEXT_KEYS.requestId, 'job-1');
		expect(set).toHaveBeenCalledWith(OKSAI_REQUEST_CONTEXT_KEYS.tenantId, 't-001');
		expect(set).toHaveBeenCalledWith(OKSAI_REQUEST_CONTEXT_KEYS.userId, 'u-001');
		expect(set).toHaveBeenCalledWith(OKSAI_REQUEST_CONTEXT_KEYS.locale, 'zh');
	});
});
