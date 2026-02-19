import { MetricsPipe, DefaultMetricsCollector } from './metrics.pipe';
import type { ICqrsMetricsCollector, CqrsMetrics } from './metrics.pipe';
import { createCqrsContext } from '../pipeline';
import type { ICommand } from '../../interfaces';

describe('MetricsPipe', () => {
	let metricsPipe: MetricsPipe;
	let mockRecordMetrics: jest.Mock;

	beforeEach(() => {
		mockRecordMetrics = jest.fn();
		const mockCollector: ICqrsMetricsCollector = {
			recordMetrics: mockRecordMetrics
		};
		metricsPipe = new MetricsPipe(mockCollector);
	});

	describe('基本属性', () => {
		it('应该有正确的管道名称', () => {
			expect(metricsPipe.name).toBe('MetricsPipe');
		});
	});

	describe('execute', () => {
		it('应该记录成功的用例执行指标', async () => {
			const command: ICommand = { type: 'CreateUser' };
			const context = createCqrsContext('CreateUser', command, {
				tenantId: 'tenant-001'
			});
			const next = jest.fn().mockResolvedValue({ id: 'new-user' });

			const result = await metricsPipe.execute(context, next);

			expect(result).toEqual({ id: 'new-user' });
			expect(mockRecordMetrics).toHaveBeenCalledWith(
				expect.objectContaining({
					commandType: 'CreateUser',
					tenantId: 'tenant-001',
					status: 'success'
				})
			);
		});

		it('应该记录执行的耗时', async () => {
			const command: ICommand = { type: 'TestCommand' };
			const context = createCqrsContext('TestCommand', command);
			const next = jest.fn().mockImplementation(async () => {
				await new Promise((resolve) => setTimeout(resolve, 10));
				return 'result';
			});

			await metricsPipe.execute(context, next);

			expect(mockRecordMetrics).toHaveBeenCalledWith(
				expect.objectContaining({
					duration: expect.any(Number)
				})
			);

			const metricsCall = mockRecordMetrics.mock.calls[0][0] as CqrsMetrics;
			expect(metricsCall.duration).toBeGreaterThanOrEqual(0);
			expect(metricsCall.duration).toBeLessThan(10000);
		});

		it('应该记录失败的用例执行指标', async () => {
			const command: ICommand = { type: 'DeleteUser' };
			const context = createCqrsContext('DeleteUser', command, {
				tenantId: 'tenant-001'
			});
			const error = new Error('删除失败');
			const next = jest.fn().mockRejectedValue(error);

			await expect(metricsPipe.execute(context, next)).rejects.toThrow('删除失败');

			expect(mockRecordMetrics).toHaveBeenCalledWith(
				expect.objectContaining({
					commandType: 'DeleteUser',
					tenantId: 'tenant-001',
					status: 'error',
					errorType: 'Error'
				})
			);
		});

		it('应该正确记录自定义异常类型', async () => {
			class ValidationException extends Error {
				constructor(message: string) {
					super(message);
					this.name = 'ValidationException';
				}
			}

			const command: ICommand = { type: 'TestCommand' };
			const context = createCqrsContext('TestCommand', command);
			const error = new ValidationException('验证失败');
			const next = jest.fn().mockRejectedValue(error);

			await expect(metricsPipe.execute(context, next)).rejects.toThrow();

			expect(mockRecordMetrics).toHaveBeenCalledWith(
				expect.objectContaining({
					errorType: 'ValidationException'
				})
			);
		});

		it('应该处理没有 tenantId 的情况', async () => {
			const command: ICommand = { type: 'TestCommand' };
			const context = createCqrsContext('TestCommand', command);
			const next = jest.fn().mockResolvedValue('result');

			await metricsPipe.execute(context, next);

			expect(mockRecordMetrics).toHaveBeenCalledWith(
				expect.objectContaining({
					tenantId: undefined
				})
			);
		});

		it('应该正确传播异常', async () => {
			const command: ICommand = { type: 'TestCommand' };
			const context = createCqrsContext('TestCommand', command);
			const error = new Error('测试错误');
			const next = jest.fn().mockRejectedValue(error);

			await expect(metricsPipe.execute(context, next)).rejects.toBe(error);
		});

		it('应该正确记录字符串类型错误', async () => {
			const command: ICommand = { type: 'TestCommand' };
			const context = createCqrsContext('TestCommand', command);
			const next = jest.fn().mockRejectedValue('string error');

			await expect(metricsPipe.execute(context, next)).rejects.toBe('string error');

			expect(mockRecordMetrics).toHaveBeenCalledWith(
				expect.objectContaining({
					errorType: 'String'
				})
			);
		});
	});
});

describe('DefaultMetricsCollector', () => {
	let collector: DefaultMetricsCollector;

	beforeEach(() => {
		collector = new DefaultMetricsCollector();
	});

	it('应该有空实现（不抛出异常）', () => {
		const metrics: CqrsMetrics = {
			commandType: 'TestCommand',
			duration: 100,
			status: 'success'
		};

		expect(() => collector.recordMetrics(metrics)).not.toThrow();
	});

	it('应该接受错误状态的指标', () => {
		const metrics: CqrsMetrics = {
			commandType: 'TestCommand',
			duration: 100,
			status: 'error',
			errorType: 'Error',
			tenantId: 'tenant-001'
		};

		expect(() => collector.recordMetrics(metrics)).not.toThrow();
	});
});
