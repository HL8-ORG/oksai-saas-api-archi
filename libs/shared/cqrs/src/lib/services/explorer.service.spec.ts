import 'reflect-metadata';
import { ExplorerService } from './explorer.service';
import { CommandBus } from '../buses/command-bus';
import { QueryBus } from '../buses/query-bus';
import { CommandHandler } from '../decorators/command-handler.decorator';
import { QueryHandler } from '../decorators/query-handler.decorator';
import { OKSAI_COMMAND_HANDLER_METADATA, OKSAI_QUERY_HANDLER_METADATA } from '../decorators/metadata.constants';
import type { ICommand, ICommandHandler, IQuery, IQueryHandler } from '../interfaces';

describe('ExplorerService', () => {
	let explorerService: ExplorerService;
	let mockModulesContainer: Map<string, any>;
	let mockModuleRef: { get: jest.Mock };
	let mockCommandBus: { register: jest.Mock };
	let mockQueryBus: { register: jest.Mock };

	beforeEach(() => {
		mockCommandBus = {
			register: jest.fn()
		};

		mockQueryBus = {
			register: jest.fn()
		};

		mockModuleRef = {
			get: jest.fn()
		};

		mockModulesContainer = new Map();

		explorerService = new ExplorerService(
			mockModulesContainer as any,
			mockModuleRef as any,
			mockCommandBus as any,
			mockQueryBus as any
		);
	});

	describe('onApplicationBootstrap', () => {
		it('应该在应用启动时触发探测和注册', () => {
			const exploreSpy = jest.spyOn(explorerService as any, 'exploreAndRegister');

			explorerService.onApplicationBootstrap();

			expect(exploreSpy).toHaveBeenCalled();
		});
	});

	describe('exploreAndRegister', () => {
		it('应该注册发现的命令处理器', () => {
			@CommandHandler('CreateUser')
			class CreateUserHandler implements ICommandHandler {
				async execute(command: ICommand): Promise<any> {
					return { id: '123' };
				}
			}

			const handlerInstance = new CreateUserHandler();

			mockModuleRef.get.mockReturnValue(handlerInstance);

			mockModulesContainer.set('TestModule', {
				providers: new Map([
					[
						'CreateUserHandler',
						{
							metatype: CreateUserHandler
						}
					]
				])
			});

			(explorerService as any).exploreAndRegister();

			expect(mockCommandBus.register).toHaveBeenCalledWith('CreateUser', handlerInstance);
			expect(mockQueryBus.register).not.toHaveBeenCalled();
		});

		it('应该注册发现的查询处理器', () => {
			@QueryHandler('GetUser')
			class GetUserHandler implements IQueryHandler {
				async execute(query: IQuery): Promise<any> {
					return { id: '123' };
				}
			}

			const handlerInstance = new GetUserHandler();

			mockModuleRef.get.mockReturnValue(handlerInstance);

			mockModulesContainer.set('TestModule', {
				providers: new Map([
					[
						'GetUserHandler',
						{
							metatype: GetUserHandler
						}
					]
				])
			});

			(explorerService as any).exploreAndRegister();

			expect(mockQueryBus.register).toHaveBeenCalledWith('GetUser', handlerInstance);
			expect(mockCommandBus.register).not.toHaveBeenCalled();
		});

		it('应该同时注册命令和查询处理器', () => {
			@CommandHandler('CreateUser')
			class CreateUserHandler implements ICommandHandler {
				async execute(command: ICommand): Promise<any> {
					return { id: '123' };
				}
			}

			@QueryHandler('GetUser')
			class GetUserHandler implements IQueryHandler {
				async execute(query: IQuery): Promise<any> {
					return { id: '123' };
				}
			}

			const createHandler = new CreateUserHandler();
			const getHandler = new GetUserHandler();

			mockModuleRef.get.mockImplementation((metatype) => {
				if (metatype === CreateUserHandler) return createHandler;
				if (metatype === GetUserHandler) return getHandler;
				return null;
			});

			mockModulesContainer.set('TestModule', {
				providers: new Map([
					['CreateUserHandler', { metatype: CreateUserHandler }],
					['GetUserHandler', { metatype: GetUserHandler }]
				])
			});

			(explorerService as any).exploreAndRegister();

			expect(mockCommandBus.register).toHaveBeenCalledWith('CreateUser', createHandler);
			expect(mockQueryBus.register).toHaveBeenCalledWith('GetUser', getHandler);
		});

		it('应该跳过没有元数据的 provider', () => {
			class RegularProvider {}

			mockModulesContainer.set('TestModule', {
				providers: new Map([['RegularProvider', { metatype: RegularProvider }]])
			});

			(explorerService as any).exploreAndRegister();

			expect(mockCommandBus.register).not.toHaveBeenCalled();
			expect(mockQueryBus.register).not.toHaveBeenCalled();
		});

		it('应该跳过没有 metatype 的 provider', () => {
			mockModulesContainer.set('TestModule', {
				providers: new Map([['NoMetatype', { metatype: null }]])
			});

			(explorerService as any).exploreAndRegister();

			expect(mockCommandBus.register).not.toHaveBeenCalled();
			expect(mockQueryBus.register).not.toHaveBeenCalled();
		});

		it('应该处理多个模块', () => {
			@CommandHandler('ModuleACommand')
			class ModuleAHandler implements ICommandHandler {
				async execute(): Promise<any> {}
			}

			@QueryHandler('ModuleBQuery')
			class ModuleBHandler implements IQueryHandler {
				async execute(): Promise<any> {}
			}

			const handlerA = new ModuleAHandler();
			const handlerB = new ModuleBHandler();

			mockModuleRef.get.mockImplementation((metatype) => {
				if (metatype === ModuleAHandler) return handlerA;
				if (metatype === ModuleBHandler) return handlerB;
				return null;
			});

			mockModulesContainer.set('ModuleA', {
				providers: new Map([['ModuleAHandler', { metatype: ModuleAHandler }]])
			});

			mockModulesContainer.set('ModuleB', {
				providers: new Map([['ModuleBHandler', { metatype: ModuleBHandler }]])
			});

			(explorerService as any).exploreAndRegister();

			expect(mockCommandBus.register).toHaveBeenCalledWith('ModuleACommand', handlerA);
			expect(mockQueryBus.register).toHaveBeenCalledWith('ModuleBQuery', handlerB);
		});

		it('应该使用 strict: false 获取实例', () => {
			@CommandHandler('TestCommand')
			class TestHandler implements ICommandHandler {
				async execute(): Promise<any> {}
			}

			mockModuleRef.get.mockReturnValue(new TestHandler());

			mockModulesContainer.set('TestModule', {
				providers: new Map([['TestHandler', { metatype: TestHandler }]])
			});

			(explorerService as any).exploreAndRegister();

			expect(mockModuleRef.get).toHaveBeenCalledWith(TestHandler, { strict: false });
		});

		it('命令处理器注册后应该跳过查询处理器检查', () => {
			@CommandHandler('TestCommand')
			class TestHandler implements ICommandHandler {
				async execute(): Promise<any> {}
			}

			Reflect.defineMetadata(OKSAI_QUERY_HANDLER_METADATA, 'TestQuery', TestHandler);

			mockModuleRef.get.mockReturnValue(new TestHandler());

			mockModulesContainer.set('TestModule', {
				providers: new Map([['TestHandler', { metatype: TestHandler }]])
			});

			(explorerService as any).exploreAndRegister();

			expect(mockCommandBus.register).toHaveBeenCalled();
			expect(mockQueryBus.register).not.toHaveBeenCalled();
		});
	});
});
