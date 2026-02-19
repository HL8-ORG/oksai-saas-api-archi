/* eslint-disable @typescript-eslint/no-explicit-any */
import { OksaiRedisHealthService } from './redis-health.service';
import Redis from 'ioredis';

jest.mock('ioredis');

describe('OksaiRedisHealthService', () => {
	let service: OksaiRedisHealthService;
	let redis: jest.Mocked<Redis>;

	beforeEach(() => {
		redis = {
			ping: jest.fn()
		} as any;

		service = new OksaiRedisHealthService(redis);
	});

	it('当 ping 成功时应该返回 ok: true', async () => {
		redis.ping.mockResolvedValue('PONG');

		const result = await service.ping();

		expect(result.ok).toBe(true);
		expect(result.latencyMs).toBeGreaterThanOrEqual(0);
		expect(result.error).toBeUndefined();
	});

	it('当 ping 失败时应该返回 ok: false', async () => {
		const error = new Error('Connection refused');
		redis.ping.mockRejectedValue(error);

		const result = await service.ping();

		expect(result.ok).toBe(false);
		expect(result.latencyMs).toBeGreaterThanOrEqual(0);
		expect(result.error).toBe('Connection refused');
	});

	it('当 ping 返回非 PONG 时应该返回 ok: false', async () => {
		redis.ping.mockResolvedValue('NOT_PONG');

		const result = await service.ping();

		expect(result.ok).toBe(false);
		expect(result.latencyMs).toBeGreaterThanOrEqual(0);
		expect(result.error).toBeUndefined();
	});

	it('应该正确测量延迟', async () => {
		redis.ping.mockImplementation(async () => {
			await new Promise((resolve) => setTimeout(resolve, 10));
			return 'PONG';
		});

		const result = await service.ping();

		expect(result.latencyMs).toBeGreaterThanOrEqual(0);
		expect(result.latencyMs).toBeLessThan(1000);
	});

	it('当错误不是 Error 实例时应该转换为字符串', async () => {
		redis.ping.mockRejectedValue('String error');

		const result = await service.ping();

		expect(result.ok).toBe(false);
		expect(result.latencyMs).toBeGreaterThanOrEqual(0);
		expect(result.error).toBe('String error');
	});
});
