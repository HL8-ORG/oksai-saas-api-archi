import { registerRedisConfig, OksaiRedisConfig } from './redis.config';

// 模拟 @nestjs/config
jest.mock('@nestjs/config', () => ({
	registerAs: jest.fn((namespace: string, factory: () => Record<string, unknown>) => ({
		provide: `CONFIG_${namespace.toUpperCase()}`,
		useFactory: factory
	}))
}));

// 模拟 @oksai/config 模块
jest.mock('@oksai/config', () => ({
	registerAppConfig: jest.fn(require('@nestjs/config').registerAs),
	env: {
		url: jest.fn()
	}
}));

const mockEnv = jest.requireMock('@oksai/config').env;

// 定义模拟返回的配置对象类型
interface MockConfigResult {
	provide: string;
	useFactory: () => OksaiRedisConfig;
}

describe('registerRedisConfig', () => {
	// 保存原始 process.env
	const originalEnv = process.env;

	beforeEach(() => {
		jest.clearAllMocks();
		process.env = { ...originalEnv };
	});

	afterAll(() => {
		process.env = originalEnv;
	});

	describe('配置注册', () => {
		it('应该返回包含 useFactory 的配置对象', () => {
			// Arrange
			mockEnv.url.mockReturnValue('redis://localhost:6379/0');

			// Act
			const result = registerRedisConfig() as unknown as MockConfigResult;

			// Assert
			expect(result).toHaveProperty('useFactory');
			expect(typeof result.useFactory).toBe('function');
		});
	});

	describe('配置工厂函数', () => {
		it('应该正确读取 REDIS_URL 环境变量', () => {
			// Arrange
			const expectedUrl = 'redis://localhost:6379/0';
			mockEnv.url.mockReturnValue(expectedUrl);
			delete process.env.REDIS_KEY_PREFIX;

			// Act
			const result = registerRedisConfig() as unknown as MockConfigResult;
			const config = result.useFactory();

			// Assert
			expect(mockEnv.url).toHaveBeenCalledWith('REDIS_URL', { allowedProtocols: ['redis:', 'rediss:'] });
			expect(config.url).toBe(expectedUrl);
		});

		it('应该支持 rediss:// 协议（TLS 连接）', () => {
			// Arrange
			const tlsUrl = 'rediss://localhost:6379/0';
			mockEnv.url.mockReturnValue(tlsUrl);

			// Act
			const result = registerRedisConfig() as unknown as MockConfigResult;
			const config = result.useFactory();

			// Assert
			expect(config.url).toBe(tlsUrl);
		});

		it('应该返回 undefined 当 REDIS_KEY_PREFIX 未设置时', () => {
			// Arrange
			mockEnv.url.mockReturnValue('redis://localhost:6379/0');
			delete process.env.REDIS_KEY_PREFIX;

			// Act
			const result = registerRedisConfig() as unknown as MockConfigResult;
			const config = result.useFactory();

			// Assert
			expect(config.keyPrefix).toBeUndefined();
		});

		it('应该正确读取 REDIS_KEY_PREFIX 环境变量', () => {
			// Arrange
			mockEnv.url.mockReturnValue('redis://localhost:6379/0');
			process.env.REDIS_KEY_PREFIX = 'myapp:';

			// Act
			const result = registerRedisConfig() as unknown as MockConfigResult;
			const config = result.useFactory();

			// Assert
			expect(config.keyPrefix).toBe('myapp:');
		});

		it('应该去除 REDIS_KEY_PREFIX 的首尾空格', () => {
			// Arrange
			mockEnv.url.mockReturnValue('redis://localhost:6379/0');
			process.env.REDIS_KEY_PREFIX = '  myapp:  ';

			// Act
			const result = registerRedisConfig() as unknown as MockConfigResult;
			const config = result.useFactory();

			// Assert
			expect(config.keyPrefix).toBe('myapp:');
		});

		it('应该返回 undefined 当 REDIS_KEY_PREFIX 只包含空格时', () => {
			// Arrange
			mockEnv.url.mockReturnValue('redis://localhost:6379/0');
			process.env.REDIS_KEY_PREFIX = '   ';

			// Act
			const result = registerRedisConfig() as unknown as MockConfigResult;
			const config = result.useFactory();

			// Assert
			expect(config.keyPrefix).toBeUndefined();
		});
	});

	describe('OksaiRedisConfig 接口', () => {
		it('应该包含必需的 url 属性', () => {
			// Arrange
			mockEnv.url.mockReturnValue('redis://localhost:6379/0');

			// Act
			const result = registerRedisConfig() as unknown as MockConfigResult;
			const config = result.useFactory();

			// Assert
			expect(config).toHaveProperty('url');
			expect(typeof config.url).toBe('string');
		});

		it('应该包含可选的 keyPrefix 属性', () => {
			// Arrange
			mockEnv.url.mockReturnValue('redis://localhost:6379/0');

			// Act
			const result = registerRedisConfig() as unknown as MockConfigResult;
			const config = result.useFactory();

			// Assert
			expect(config).toHaveProperty('keyPrefix');
		});

		it('完整的配置应包含所有预期的字段', () => {
			// Arrange
			mockEnv.url.mockReturnValue('redis://localhost:6379/0');
			process.env.REDIS_KEY_PREFIX = 'test:';

			// Act
			const result = registerRedisConfig() as unknown as MockConfigResult;
			const config = result.useFactory();

			// Assert
			expect(config).toMatchObject({
				url: 'redis://localhost:6379/0',
				keyPrefix: 'test:'
			});
		});
	});
});
