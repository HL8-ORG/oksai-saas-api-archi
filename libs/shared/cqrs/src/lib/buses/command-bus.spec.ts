import { CommandBus } from './command-bus';
import type { ICommand, ICommandHandler } from '../interfaces';
import type { ICqrsPipe, CqrsExecutionContext } from '../pipeline';

jest.mock('@oksai/context', () => ({
	getOksaiRequestContextFromCurrent: jest.fn()
}));

const { getOksaiRequestContextFromCurrent } = jest.requireMock('@oksai/context');

describe('CommandBus', () => {
	let commandBus: CommandBus;

	beforeEach(() => {
		commandBus = new CommandBus();
		jest.clearAllMocks();

		getOksaiRequestContextFromCurrent.mockReturnValue({
			tenantId: 'tenant-001',
			userId: 'user-001',
			requestId: 'request-001'
		});
	});

	describe('register', () => {
		it('应该成功注册命令处理器', () => {
			const handler: ICommandHandler = {
				execute: jest.fn()
			};

			commandBus.register('CreateUser', handler);

			expect(commandBus['handlers'].has('CreateUser')).toBe(true);
		});

		it('当重复注册同一命令类型时应该抛出错误', () => {
			const handler: ICommandHandler = {
				execute: jest.fn()
			};

			commandBus.register('CreateUser', handler);

			expect(() => {
				commandBus.register('CreateUser', handler);
			}).toThrow('命令处理器重复注册：commandType=CreateUser。');
		});
	});

	describe('registerPipes', () => {
		it('应该成功注册管道数组', () => {
			const pipe: ICqrsPipe = {
				name: 'TestPipe',
				execute: jest.fn()
			};

			commandBus.registerPipes([pipe]);

			expect(commandBus['pipes']).toHaveLength(1);
			expect(commandBus['pipes'][0]).toBe(pipe);
		});

		it('应该支持注册多个管道', () => {
			const pipe1: ICqrsPipe = { name: 'Pipe1', execute: jest.fn() };
			const pipe2: ICqrsPipe = { name: 'Pipe2', execute: jest.fn() };

			commandBus.registerPipes([pipe1, pipe2]);

			expect(commandBus['pipes']).toHaveLength(2);
		});
	});

	describe('execute', () => {
		interface ICreateUserCommand extends ICommand {
			type: 'CreateUser';
			name: string;
			email: string;
		}

		it('应该成功执行命令并返回结果', async () => {
			const expectedResult = { id: 'user-123', name: 'Test User' };
			const handler: ICommandHandler<ICreateUserCommand> = {
				execute: jest.fn().mockResolvedValue(expectedResult)
			};

			commandBus.register('CreateUser', handler);

			const command: ICreateUserCommand = {
				type: 'CreateUser',
				name: 'Test User',
				email: 'test@example.com'
			};

			const result = await commandBus.execute(command);

			expect(result).toEqual(expectedResult);
			expect(handler.execute).toHaveBeenCalledWith(command);
		});

		it('当未找到处理器时应该抛出错误', async () => {
			const command: ICreateUserCommand = {
				type: 'CreateUser',
				name: 'Test User',
				email: 'test@example.com'
			};

			await expect(commandBus.execute(command)).rejects.toThrow('未找到命令处理器：commandType=CreateUser。');
		});

		it('应该从 CLS 获取上下文信息', async () => {
			const handler: ICommandHandler = {
				execute: jest.fn().mockResolvedValue({})
			};

			commandBus.register('CreateUser', handler);

			await commandBus.execute({ type: 'CreateUser' });

			expect(getOksaiRequestContextFromCurrent).toHaveBeenCalled();
		});

		it('应该通过管道链执行命令', async () => {
			const expectedResult = { id: 'user-123' };
			const handler: ICommandHandler = {
				execute: jest.fn().mockResolvedValue(expectedResult)
			};

			const pipe: ICqrsPipe = {
				name: 'TestPipe',
				execute: jest.fn(async (ctx: CqrsExecutionContext, next: () => Promise<any>) => {
					return next();
				})
			};

			commandBus.register('CreateUser', handler);
			commandBus.registerPipes([pipe]);

			const result = await commandBus.execute({ type: 'CreateUser' });

			expect(pipe.execute).toHaveBeenCalled();
			expect(result).toEqual(expectedResult);
		});

		it('管道应该按照注册顺序执行', async () => {
			const executionOrder: string[] = [];
			const handler: ICommandHandler = {
				execute: jest.fn().mockImplementation(async () => {
					executionOrder.push('handler');
					return {};
				})
			};

			const pipe1: ICqrsPipe = {
				name: 'Pipe1',
				execute: jest.fn(async (_ctx, next) => {
					executionOrder.push('pipe1-start');
					const result = await next();
					executionOrder.push('pipe1-end');
					return result;
				})
			};

			const pipe2: ICqrsPipe = {
				name: 'Pipe2',
				execute: jest.fn(async (_ctx, next) => {
					executionOrder.push('pipe2-start');
					const result = await next();
					executionOrder.push('pipe2-end');
					return result;
				})
			};

			commandBus.register('CreateUser', handler);
			commandBus.registerPipes([pipe1, pipe2]);

			await commandBus.execute({ type: 'CreateUser' });

			expect(executionOrder).toEqual(['pipe1-start', 'pipe2-start', 'handler', 'pipe2-end', 'pipe1-end']);
		});

		it('管道中断执行时不应该调用处理器', async () => {
			const handler: ICommandHandler = {
				execute: jest.fn().mockResolvedValue({})
			};

			const pipe: ICqrsPipe = {
				name: 'BlockingPipe',
				execute: jest.fn().mockResolvedValue({ blocked: true })
			};

			commandBus.register('CreateUser', handler);
			commandBus.registerPipes([pipe]);

			const result = await commandBus.execute({ type: 'CreateUser' });

			expect(handler.execute).not.toHaveBeenCalled();
			expect(result).toEqual({ blocked: true });
		});
	});
});
