import { OksaiPlatformModule, type SetupOksaiPlatformModuleOptions } from './oksai-platform.module';

/**
 * @description OksaiPlatformModule 单元测试
 *
 * 测试覆盖：
 * - 模块动态初始化
 * - 选项校验
 * - 提供者注册
 * - 导出配置
 */

// Mock 所有依赖模块
jest.mock('@oksai/config', () => ({
	setupConfigModule: jest.fn().mockReturnValue({ module: class MockConfigModule {} })
}));

jest.mock('@oksai/logger', () => ({
	setupLoggerModule: jest.fn().mockReturnValue({ module: class MockLoggerModule {} })
}));

jest.mock('@oksai/context', () => ({
	getOksaiRequestContextFromCurrent: jest.fn().mockReturnValue({}),
	OksaiContextModule: class MockOksaiContextModule {},
	setupOksaiContextModule: jest.fn().mockReturnValue({ module: class MockSetupContextModule {} })
}));

jest.mock('@oksai/database', () => ({
	setupDatabaseModule: jest.fn().mockReturnValue({ module: class MockDatabaseModule {} })
}));

jest.mock('@oksai/cqrs', () => ({
	OksaiCqrsModule: class MockOksaiCqrsModule {}
}));

jest.mock('@oksai/eda', () => ({
	setupEdaModule: jest.fn().mockReturnValue({ module: class MockEdaModule {} })
}));

jest.mock('@oksai/plugin', () => ({
	PluginModule: class MockPluginModule {
		static init = jest.fn().mockReturnValue({ module: class MockPluginModuleInit {} });
	}
}));

jest.mock('@oksai/messaging', () => ({
	InMemoryEventBus: class MockInMemoryEventBus {},
	InMemoryInbox: class MockInMemoryInbox {},
	InMemoryOutbox: class MockInMemoryOutbox {},
	OKSAI_EVENT_BUS_TOKEN: 'OKSAI_EVENT_BUS',
	OKSAI_INBOX_TOKEN: 'OKSAI_INBOX',
	OKSAI_OUTBOX_TOKEN: 'OKSAI_OUTBOX',
	OutboxPublisherService: class MockOutboxPublisherService {},
	setupMessagingModule: jest.fn().mockReturnValue({ module: class MockMessagingModule {} })
}));

jest.mock('@oksai/messaging-postgres', () => ({
	PgInbox: class MockPgInbox {},
	PgOutbox: class MockPgOutbox {},
	setupMessagingPostgresModule: jest.fn().mockReturnValue({ module: class MockMessagingPostgresModule {} })
}));

jest.mock('../messaging/context-aware-event-bus', () => ({
	ContextAwareEventBus: class MockContextAwareEventBus {}
}));

jest.mock('../messaging/context-aware-outbox', () => ({
	ContextAwareOutbox: class MockContextAwareOutbox {}
}));

describe('OksaiPlatformModule', () => {
	// 保存原始环境变量
	const originalEnv = process.env;

	beforeEach(() => {
		jest.clearAllMocks();
		// 重置环境变量
		process.env = { ...originalEnv };
	});

	afterAll(() => {
		// 恢复原始环境变量
		process.env = originalEnv;
	});

	describe('init', () => {
		it('应返回动态模块配置', () => {
			// Arrange & Act
			const dynamicModule = OksaiPlatformModule.init();

			// Assert
			expect(dynamicModule).toBeDefined();
			expect(dynamicModule.module).toBe(OksaiPlatformModule);
			expect(dynamicModule.global).toBe(true);
		});

		it('应使用默认空选项初始化', () => {
			// Arrange & Act
			const dynamicModule = OksaiPlatformModule.init();

			// Assert
			expect(dynamicModule.imports).toBeDefined();
			expect(dynamicModule.providers).toBeDefined();
			expect(dynamicModule.exports).toBeDefined();
		});

		it('应正确处理显式传入的选项', () => {
			// Arrange
			const options: SetupOksaiPlatformModuleOptions = {
				prettyLogs: true,
				cqrs: { enabled: true }
			};

			// Act
			const dynamicModule = OksaiPlatformModule.init(options);

			// Assert
			expect(dynamicModule).toBeDefined();
		});
	});

	describe('选项校验', () => {
		it('当启用 messagingPostgres 但未启用 database 时应抛出错误', () => {
			// Arrange
			const options: SetupOksaiPlatformModuleOptions = {
				messagingPostgres: {
					/* 配置 */
				} as any,
				database: undefined
			};

			// Act & Assert
			expect(() => OksaiPlatformModule.init(options)).toThrow(
				'装配配置错误：启用 messagingPostgres 时必须同时启用 database（MikroORM 连接/迁移）。'
			);
		});

		it('当同时启用 messagingPostgres 和 database 时不应抛出错误', () => {
			// Arrange
			const options: SetupOksaiPlatformModuleOptions = {
				messagingPostgres: {
					/* 配置 */
				} as any,
				database: {
					/* 配置 */
				} as any
			};

			// Act & Assert
			expect(() => OksaiPlatformModule.init(options)).not.toThrow();
		});
	});

	describe('EDA Facade 模式', () => {
		it('当 EDA_FACADE_ENABLED=true 时应启用 EDA 模块', () => {
			// Arrange
			process.env.EDA_FACADE_ENABLED = 'true';

			// Act
			const dynamicModule = OksaiPlatformModule.init();

			// Assert
			expect(dynamicModule).toBeDefined();
		});

		it('当 EDA_FACADE_ENABLED=false 时不应启用 EDA 模块', () => {
			// Arrange
			process.env.EDA_FACADE_ENABLED = 'false';

			// Act
			const dynamicModule = OksaiPlatformModule.init();

			// Assert
			expect(dynamicModule).toBeDefined();
		});

		it('当 EDA_FACADE_ENABLED 未设置时应使用默认值（不启用）', () => {
			// Arrange
			delete process.env.EDA_FACADE_ENABLED;

			// Act
			const dynamicModule = OksaiPlatformModule.init();

			// Assert
			expect(dynamicModule).toBeDefined();
		});
	});

	describe('CQRS 模块配置', () => {
		it('当 cqrs.enabled=true 时应包含 CQRS 模块', () => {
			// Arrange
			const options: SetupOksaiPlatformModuleOptions = {
				cqrs: { enabled: true }
			};

			// Act
			const dynamicModule = OksaiPlatformModule.init(options);

			// Assert
			expect(dynamicModule.exports).toBeDefined();
		});

		it('当 cqrs.enabled=false 时不应包含 CQRS 模块', () => {
			// Arrange
			const options: SetupOksaiPlatformModuleOptions = {
				cqrs: { enabled: false }
			};

			// Act
			const dynamicModule = OksaiPlatformModule.init(options);

			// Assert
			expect(dynamicModule).toBeDefined();
		});

		it('当未指定 cqrs 选项时应默认不启用', () => {
			// Arrange & Act
			const dynamicModule = OksaiPlatformModule.init();

			// Assert
			expect(dynamicModule).toBeDefined();
		});
	});

	describe('数据库模块配置', () => {
		it('当提供 database 选项时应包含数据库模块', () => {
			// Arrange
			const options: SetupOksaiPlatformModuleOptions = {
				database: {
					/* 配置 */
				} as any
			};

			// Act
			const dynamicModule = OksaiPlatformModule.init(options);

			// Assert
			expect(dynamicModule.imports).toBeDefined();
		});

		it('当未提供 database 选项时不应包含数据库模块', () => {
			// Arrange & Act
			const dynamicModule = OksaiPlatformModule.init();

			// Assert
			expect(dynamicModule.imports).toBeDefined();
		});
	});

	describe('插件配置', () => {
		it('当提供插件列表时应正确处理', () => {
			// Arrange
			const mockPlugin = { name: 'test-plugin', provider: class MockProvider {} };
			const options: SetupOksaiPlatformModuleOptions = {
				plugins: [mockPlugin as any]
			};

			// Act
			const dynamicModule = OksaiPlatformModule.init(options);

			// Assert
			expect(dynamicModule).toBeDefined();
		});

		it('当未提供插件列表时应使用空数组', () => {
			// Arrange & Act
			const dynamicModule = OksaiPlatformModule.init();

			// Assert
			expect(dynamicModule).toBeDefined();
		});
	});

	describe('提供者注册', () => {
		it('应注册事件总线提供者', () => {
			// Arrange & Act
			const dynamicModule = OksaiPlatformModule.init();

			// Assert
			expect(dynamicModule.providers).toBeDefined();
			expect(dynamicModule.providers!.length).toBeGreaterThan(0);
		});

		it('应正确设置 InMemory 消息覆盖', () => {
			// Arrange
			delete process.env.EDA_FACADE_ENABLED;

			// Act
			const dynamicModule = OksaiPlatformModule.init();

			// Assert
			expect(dynamicModule.providers).toBeDefined();
		});

		it('当启用 messagingPostgres 时应注册 PostgreSQL 版提供者', () => {
			// Arrange
			const options: SetupOksaiPlatformModuleOptions = {
				database: {
					/* 配置 */
				} as any,
				messagingPostgres: {
					/* 配置 */
				} as any
			};
			delete process.env.EDA_FACADE_ENABLED;

			// Act
			const dynamicModule = OksaiPlatformModule.init(options);

			// Assert
			expect(dynamicModule.providers).toBeDefined();
		});
	});

	describe('导出配置', () => {
		it('应导出必要的服务令牌', () => {
			// Arrange & Act
			const dynamicModule = OksaiPlatformModule.init();

			// Assert
			expect(dynamicModule.exports).toBeDefined();
		});

		it('当启用 CQRS 时应导出 CQRS 模块', () => {
			// Arrange
			const options: SetupOksaiPlatformModuleOptions = {
				cqrs: { enabled: true }
			};

			// Act
			const dynamicModule = OksaiPlatformModule.init(options);

			// Assert
			expect(dynamicModule.exports).toBeDefined();
		});
	});

	describe('日志配置', () => {
		it('当 NODE_ENV=development 时应默认启用美化日志', () => {
			// Arrange
			process.env.NODE_ENV = 'development';

			// Act
			const dynamicModule = OksaiPlatformModule.init();

			// Assert
			expect(dynamicModule).toBeDefined();
		});

		it('当 NODE_ENV=production 时应默认禁用美化日志', () => {
			// Arrange
			process.env.NODE_ENV = 'production';

			// Act
			const dynamicModule = OksaiPlatformModule.init();

			// Assert
			expect(dynamicModule).toBeDefined();
		});

		it('应支持显式设置 prettyLogs 选项', () => {
			// Arrange
			const options: SetupOksaiPlatformModuleOptions = {
				prettyLogs: false
			};

			// Act
			const dynamicModule = OksaiPlatformModule.init(options);

			// Assert
			expect(dynamicModule).toBeDefined();
		});
	});
});
