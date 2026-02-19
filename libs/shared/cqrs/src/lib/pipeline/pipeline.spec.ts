import { createCqrsContext, composePipelines, type CqrsExecutionContext, type ICqrsPipe } from './pipeline';
import type { ICommand } from '../interfaces';

describe('createCqrsContext', () => {
	it('应该创建包含所有必要字段的上下文', () => {
		const command: ICommand = { type: 'CreateUser' };

		const context = createCqrsContext('CreateUser', command, {
			tenantId: 'tenant-001',
			userId: 'user-001',
			requestId: 'request-001'
		});

		expect(context.commandType).toBe('CreateUser');
		expect(context.payload).toBe(command);
		expect(context.tenantId).toBe('tenant-001');
		expect(context.userId).toBe('user-001');
		expect(context.requestId).toBe('request-001');
		expect(context.startTime).toBeGreaterThan(0);
		expect(context.data).toEqual({});
	});

	it('应该支持可选的上下文参数', () => {
		const command: ICommand = { type: 'TestCommand' };

		const context = createCqrsContext('TestCommand', command);

		expect(context.tenantId).toBeUndefined();
		expect(context.userId).toBeUndefined();
		expect(context.requestId).toBeUndefined();
	});

	it('应该支持部分上下文参数', () => {
		const command: ICommand = { type: 'TestCommand' };

		const context = createCqrsContext('TestCommand', command, {
			tenantId: 'tenant-001'
		});

		expect(context.tenantId).toBe('tenant-001');
		expect(context.userId).toBeUndefined();
		expect(context.requestId).toBeUndefined();
	});

	it('每次调用应该生成不同的 startTime', async () => {
		const command: ICommand = { type: 'Test' };

		const context1 = createCqrsContext('Test', command);
		await new Promise((resolve) => setTimeout(resolve, 10));
		const context2 = createCqrsContext('Test', command);

		expect(context2.startTime).toBeGreaterThanOrEqual(context1.startTime);
	});

	it('data 字段应该是可变的空对象', () => {
		const command: ICommand = { type: 'Test' };

		const context = createCqrsContext('Test', command);

		context.data.customField = 'custom-value';

		expect(context.data.customField).toBe('custom-value');
	});
});

describe('composePipelines', () => {
	it('当没有管道时应该直接执行最终处理器', async () => {
		const finalHandler = jest.fn().mockResolvedValue('result');
		const command: ICommand = { type: 'Test' };
		const context = createCqrsContext('Test', command);

		const pipeline = composePipelines([], finalHandler);
		const result = await pipeline(context);

		expect(result).toBe('result');
		expect(finalHandler).toHaveBeenCalledWith(context);
	});

	it('应该按顺序执行单个管道', async () => {
		const command: ICommand = { type: 'Test' };
		const context = createCqrsContext('Test', command);

		const pipe: ICqrsPipe<string> = {
			name: 'TestPipe',
			execute: jest.fn(async (_ctx, next) => {
				const result = await next();
				return `wrapped: ${result}`;
			})
		};

		const finalHandler = jest.fn().mockResolvedValue('original');

		const pipeline = composePipelines([pipe], finalHandler);
		const result = await pipeline(context);

		expect(result).toBe('wrapped: original');
		expect(pipe.execute).toHaveBeenCalledWith(context, expect.any(Function));
		expect(finalHandler).toHaveBeenCalledWith(context);
	});

	it('应该按照正确的顺序执行多个管道（从右到左组合）', async () => {
		const command: ICommand = { type: 'Test' };
		const context = createCqrsContext('Test', command);
		const executionOrder: string[] = [];

		const pipe1: ICqrsPipe<string> = {
			name: 'Pipe1',
			execute: async (_ctx, next) => {
				executionOrder.push('pipe1-before');
				const result = await next();
				executionOrder.push('pipe1-after');
				return `1:${result}`;
			}
		};

		const pipe2: ICqrsPipe<string> = {
			name: 'Pipe2',
			execute: async (_ctx, next) => {
				executionOrder.push('pipe2-before');
				const result = await next();
				executionOrder.push('pipe2-after');
				return `2:${result}`;
			}
		};

		const finalHandler = jest.fn().mockImplementation(async () => {
			executionOrder.push('handler');
			return 'result';
		});

		const pipeline = composePipelines([pipe1, pipe2], finalHandler);
		const result = await pipeline(context);

		expect(result).toBe('1:2:result');
		expect(executionOrder).toEqual(['pipe1-before', 'pipe2-before', 'handler', 'pipe2-after', 'pipe1-after']);
	});

	it('应该正确传播管道中的异常', async () => {
		const command: ICommand = { type: 'Test' };
		const context = createCqrsContext('Test', command);

		const pipe: ICqrsPipe = {
			name: 'ErrorPipe',
			execute: async () => {
				throw new Error('管道执行失败');
			}
		};

		const finalHandler = jest.fn().mockResolvedValue('result');

		const pipeline = composePipelines([pipe], finalHandler);

		await expect(pipeline(context)).rejects.toThrow('管道执行失败');
		expect(finalHandler).not.toHaveBeenCalled();
	});

	it('管道应该能够修改上下文', async () => {
		const command: ICommand = { type: 'Test' };
		const context = createCqrsContext('Test', command);

		const pipe: ICqrsPipe<string> = {
			name: 'ModifyContextPipe',
			execute: async (ctx, next) => {
				ctx.data.modified = true;
				ctx.data.customValue = 'test';
				return next();
			}
		};

		const receivedContexts: CqrsExecutionContext[] = [];
		const finalHandler = jest.fn().mockImplementation(async (ctx: CqrsExecutionContext) => {
			receivedContexts.push(ctx);
			return 'result';
		});

		const pipeline = composePipelines([pipe], finalHandler);
		await pipeline(context);

		expect(receivedContexts[0].data.modified).toBe(true);
		expect(receivedContexts[0].data.customValue).toBe('test');
	});

	it('管道应该能够短路执行', async () => {
		const command: ICommand = { type: 'Test' };
		const context = createCqrsContext('Test', command);

		const shortCircuitPipe: ICqrsPipe<string> = {
			name: 'ShortCircuitPipe',
			execute: async () => {
				return 'short-circuited';
			}
		};

		const neverReachedPipe: ICqrsPipe<string> = {
			name: 'NeverReachedPipe',
			execute: jest.fn().mockResolvedValue('never-reached')
		};

		const finalHandler = jest.fn().mockResolvedValue('result');

		const pipeline = composePipelines([shortCircuitPipe, neverReachedPipe], finalHandler);
		const result = await pipeline(context);

		expect(result).toBe('short-circuited');
		expect(neverReachedPipe.execute).not.toHaveBeenCalled();
		expect(finalHandler).not.toHaveBeenCalled();
	});
});
