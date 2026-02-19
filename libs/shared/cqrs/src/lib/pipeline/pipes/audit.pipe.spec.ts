import { Logger } from '@nestjs/common';
import { AuditPipe } from './audit.pipe';
import { createCqrsContext } from '../pipeline';
import type { ICommand } from '../../interfaces';

describe('AuditPipe', () => {
	let auditPipe: AuditPipe;
	let mockLogger: { log: jest.Mock; warn: jest.Mock };

	beforeEach(() => {
		mockLogger = {
			log: jest.fn(),
			warn: jest.fn()
		};

		auditPipe = new AuditPipe();
		(auditPipe as any).logger = mockLogger;
	});

	describe('基本属性', () => {
		it('应该有正确的管道名称', () => {
			expect(auditPipe.name).toBe('AuditPipe');
		});
	});

	describe('execute', () => {
		it('应该记录成功的用例执行', async () => {
			const command: ICommand = { type: 'CreateUser' };
			const context = createCqrsContext('CreateUser', command, {
				userId: 'user-001',
				tenantId: 'tenant-001',
				requestId: 'request-001'
			});
			const next = jest.fn().mockResolvedValue({ id: 'new-user' });

			const result = await auditPipe.execute(context, next);

			expect(result).toEqual({ id: 'new-user' });
			expect(next).toHaveBeenCalled();
			expect(mockLogger.log).toHaveBeenCalledWith(
				expect.objectContaining({
					message: '用例执行成功',
					commandType: 'CreateUser',
					userId: 'user-001',
					tenantId: 'tenant-001',
					requestId: 'request-001',
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

			await auditPipe.execute(context, next);

			expect(mockLogger.log).toHaveBeenCalledWith(
				expect.objectContaining({
					duration: expect.any(Number)
				})
			);

			const logCall = mockLogger.log.mock.calls[0][0];
			expect(logCall.duration).toBeGreaterThanOrEqual(10);
		});

		it('应该记录失败的用例执行', async () => {
			const command: ICommand = { type: 'DeleteUser' };
			const context = createCqrsContext('DeleteUser', command, {
				userId: 'user-001',
				tenantId: 'tenant-001',
				requestId: 'request-001'
			});
			const error = new Error('删除失败');
			const next = jest.fn().mockRejectedValue(error);

			await expect(auditPipe.execute(context, next)).rejects.toThrow('删除失败');

			expect(mockLogger.warn).toHaveBeenCalledWith(
				expect.objectContaining({
					message: '用例执行失败',
					commandType: 'DeleteUser',
					userId: 'user-001',
					tenantId: 'tenant-001',
					requestId: 'request-001',
					status: 'error',
					errorType: 'Error',
					errorMessage: '删除失败'
				})
			);
		});

		it('应该正确记录自定义异常类型', async () => {
			class CustomBusinessError extends Error {
				constructor(message: string) {
					super(message);
					this.name = 'CustomBusinessError';
				}
			}

			const command: ICommand = { type: 'TestCommand' };
			const context = createCqrsContext('TestCommand', command);
			const error = new CustomBusinessError('业务错误');
			const next = jest.fn().mockRejectedValue(error);

			await expect(auditPipe.execute(context, next)).rejects.toThrow();

			expect(mockLogger.warn).toHaveBeenCalledWith(
				expect.objectContaining({
					errorType: 'CustomBusinessError',
					errorMessage: '业务错误'
				})
			);
		});

		it('应该处理没有上下文信息的情况', async () => {
			const command: ICommand = { type: 'TestCommand' };
			const context = createCqrsContext('TestCommand', command);
			const next = jest.fn().mockResolvedValue('result');

			await auditPipe.execute(context, next);

			expect(mockLogger.log).toHaveBeenCalledWith(
				expect.objectContaining({
					userId: undefined,
					tenantId: undefined,
					requestId: undefined
				})
			);
		});

		it('应该正确传播异常', async () => {
			const command: ICommand = { type: 'TestCommand' };
			const context = createCqrsContext('TestCommand', command);
			const error = new Error('测试错误');
			const next = jest.fn().mockRejectedValue(error);

			await expect(auditPipe.execute(context, next)).rejects.toBe(error);
		});

		it('应该处理字符串类型的错误', async () => {
			const command: ICommand = { type: 'TestCommand' };
			const context = createCqrsContext('TestCommand', command);
			const next = jest.fn().mockRejectedValue('string error');

			await expect(auditPipe.execute(context, next)).rejects.toBe('string error');

			expect(mockLogger.warn).toHaveBeenCalledWith(
				expect.objectContaining({
					errorType: 'String',
					errorMessage: undefined
				})
			);
		});
	});
});
