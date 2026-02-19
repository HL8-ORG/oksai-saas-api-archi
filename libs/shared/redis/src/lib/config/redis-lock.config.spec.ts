import { registerRedisLockConfig, OksaiRedisLockConfig } from './redis-lock.config';

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
		int: jest.fn()
	}
}));

const mockEnv = jest.requireMock('@oksai/config').env;

// 定义模拟返回的配置对象类型
interface MockConfigResult {
	provide: string;
	useFactory: () => OksaiRedisLockConfig;
}

describe('registerRedisLockConfig', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe('配置注册', () => {
		it('应该返回包含 useFactory 的配置对象', () => {
			// Arrange
			mockEnv.int.mockReturnValueOnce(30000).mockReturnValueOnce(3).mockReturnValueOnce(200);

			// Act
			const result = registerRedisLockConfig() as unknown as MockConfigResult;

			// Assert
			expect(result).toHaveProperty('useFactory');
			expect(typeof result.useFactory).toBe('function');
		});
	});

	describe('配置工厂函数 - 默认值', () => {
		it('defaultTtlMs 默认值应该为 30000', () => {
			// Arrange
			mockEnv.int.mockImplementation((_name: string, options: { defaultValue: number }) => options.defaultValue);

			// Act
			const result = registerRedisLockConfig() as unknown as MockConfigResult;
			const config = result.useFactory();

			// Assert
			expect(config.defaultTtlMs).toBe(30000);
		});

		it('retryCount 默认值应该为 3', () => {
			// Arrange
			mockEnv.int.mockImplementation((_name: string, options: { defaultValue: number }) => options.defaultValue);

			// Act
			const result = registerRedisLockConfig() as unknown as MockConfigResult;
			const config = result.useFactory();

			// Assert
			expect(config.retryCount).toBe(3);
		});

		it('retryDelayMs 默认值应该为 200', () => {
			// Arrange
			mockEnv.int.mockImplementation((_name: string, options: { defaultValue: number }) => options.defaultValue);

			// Act
			const result = registerRedisLockConfig() as unknown as MockConfigResult;
			const config = result.useFactory();

			// Assert
			expect(config.retryDelayMs).toBe(200);
		});
	});

	describe('配置工厂函数 - 环境变量读取', () => {
		it('应该正确读取 REDIS_LOCK_TTL_MS 环境变量', () => {
			// Arrange
			mockEnv.int.mockReturnValueOnce(60000).mockReturnValueOnce(3).mockReturnValueOnce(200);

			// Act
			const result = registerRedisLockConfig() as unknown as MockConfigResult;
			const config = result.useFactory();

			// Assert
			expect(mockEnv.int).toHaveBeenCalledWith('REDIS_LOCK_TTL_MS', { defaultValue: 30000, min: 100 });
			expect(config.defaultTtlMs).toBe(60000);
		});

		it('应该正确读取 REDIS_LOCK_RETRY_COUNT 环境变量', () => {
			// Arrange
			mockEnv.int.mockReturnValueOnce(30000).mockReturnValueOnce(10).mockReturnValueOnce(200);

			// Act
			const result = registerRedisLockConfig() as unknown as MockConfigResult;
			const config = result.useFactory();

			// Assert
			expect(mockEnv.int).toHaveBeenCalledWith('REDIS_LOCK_RETRY_COUNT', { defaultValue: 3, min: 0, max: 50 });
			expect(config.retryCount).toBe(10);
		});

		it('应该正确读取 REDIS_LOCK_RETRY_DELAY_MS 环境变量', () => {
			// Arrange
			mockEnv.int.mockReturnValueOnce(30000).mockReturnValueOnce(3).mockReturnValueOnce(500);

			// Act
			const result = registerRedisLockConfig() as unknown as MockConfigResult;
			const config = result.useFactory();

			// Assert
			expect(mockEnv.int).toHaveBeenCalledWith('REDIS_LOCK_RETRY_DELAY_MS', {
				defaultValue: 200,
				min: 0,
				max: 10000
			});
			expect(config.retryDelayMs).toBe(500);
		});
	});

	describe('配置验证约束', () => {
		it('REDIS_LOCK_TTL_MS 最小值应为 100', () => {
			// Arrange
			mockEnv.int.mockReturnValue(100);

			// Act
			const result = registerRedisLockConfig() as unknown as MockConfigResult;
			result.useFactory();

			// Assert
			const ttlCall = mockEnv.int.mock.calls.find((call: [string]) => call[0] === 'REDIS_LOCK_TTL_MS');
			expect(ttlCall[1]).toHaveProperty('min', 100);
		});

		it('REDIS_LOCK_RETRY_COUNT 范围应为 0-50', () => {
			// Arrange
			mockEnv.int.mockReturnValue(3);

			// Act
			const result = registerRedisLockConfig() as unknown as MockConfigResult;
			result.useFactory();

			// Assert
			const retryCountCall = mockEnv.int.mock.calls.find(
				(call: [string]) => call[0] === 'REDIS_LOCK_RETRY_COUNT'
			);
			expect(retryCountCall[1]).toHaveProperty('min', 0);
			expect(retryCountCall[1]).toHaveProperty('max', 50);
		});

		it('REDIS_LOCK_RETRY_DELAY_MS 范围应为 0-10000', () => {
			// Arrange
			mockEnv.int.mockReturnValue(200);

			// Act
			const result = registerRedisLockConfig() as unknown as MockConfigResult;
			result.useFactory();

			// Assert
			const retryDelayCall = mockEnv.int.mock.calls.find(
				(call: [string]) => call[0] === 'REDIS_LOCK_RETRY_DELAY_MS'
			);
			expect(retryDelayCall[1]).toHaveProperty('min', 0);
			expect(retryDelayCall[1]).toHaveProperty('max', 10000);
		});
	});

	describe('OksaiRedisLockConfig 接口', () => {
		it('应该包含所有必需属性', () => {
			// Arrange
			mockEnv.int.mockReturnValueOnce(30000).mockReturnValueOnce(3).mockReturnValueOnce(200);

			// Act
			const result = registerRedisLockConfig() as unknown as MockConfigResult;
			const config = result.useFactory();

			// Assert
			expect(config).toHaveProperty('defaultTtlMs');
			expect(config).toHaveProperty('retryCount');
			expect(config).toHaveProperty('retryDelayMs');
		});

		it('所有属性应为数字类型', () => {
			// Arrange
			mockEnv.int.mockReturnValueOnce(30000).mockReturnValueOnce(3).mockReturnValueOnce(200);

			// Act
			const result = registerRedisLockConfig() as unknown as MockConfigResult;
			const config = result.useFactory();

			// Assert
			expect(typeof config.defaultTtlMs).toBe('number');
			expect(typeof config.retryCount).toBe('number');
			expect(typeof config.retryDelayMs).toBe('number');
		});

		it('完整的配置应包含所有预期的字段', () => {
			// Arrange
			mockEnv.int.mockReturnValueOnce(60000).mockReturnValueOnce(5).mockReturnValueOnce(300);

			// Act
			const result = registerRedisLockConfig() as unknown as MockConfigResult;
			const config = result.useFactory();

			// Assert
			expect(config).toMatchObject({
				defaultTtlMs: 60000,
				retryCount: 5,
				retryDelayMs: 300
			});
		});
	});
});
