import { registerAppConfig } from './register-app-config';

// Mock @nestjs/config 的 registerAs 函数
jest.mock('@nestjs/config', () => ({
	registerAs: jest.fn((namespace: string, factory: () => Record<string, unknown>) => {
		// 返回一个模拟的配置提供者对象
		return {
			provide: `CONFIG_${namespace.toUpperCase()}`,
			useFactory: factory
		};
	})
}));

describe('registerAppConfig', () => {
	const mockRegisterAs = require('@nestjs/config').registerAs;

	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe('基本功能', () => {
		it('应该使用正确的命名空间调用 registerAs', () => {
			// Arrange
			const factory = () => ({ port: 3000 });

			// Act
			registerAppConfig('app', factory);

			// Assert
			expect(mockRegisterAs).toHaveBeenCalledWith('app', expect.any(Function));
		});

		it('应该返回 registerAs 的结果', () => {
			// Arrange
			const factory = () => ({ port: 3000 });
			const expectedResult = {
				provide: 'CONFIG_APP',
				useFactory: expect.any(Function)
			};

			// Act
			const result = registerAppConfig('app', factory);

			// Assert
			expect(result).toEqual(expectedResult);
		});

		it('应该正确传递工厂函数的返回值', () => {
			// Arrange
			const config = { port: 3000, host: 'localhost' };
			const factory = () => config;

			// Act
			registerAppConfig('app', factory);

			// 获取传递给 registerAs 的包装工厂函数
			const wrappedFactory = mockRegisterAs.mock.calls[0][1];

			// Assert
			expect(wrappedFactory()).toEqual(config);
		});
	});

	describe('配置验证', () => {
		it('应该接受有效的对象配置', () => {
			// Arrange
			const factory = () => ({
				port: 3000,
				host: 'localhost',
				features: { auth: true }
			});

			// Act
			registerAppConfig('app', factory);

			// 获取包装工厂函数
			const wrappedFactory = mockRegisterAs.mock.calls[0][1];

			// Assert - 不应该抛出错误
			expect(() => wrappedFactory()).not.toThrow();
		});

		it('应该接受空对象配置', () => {
			// Arrange
			const factory = () => ({});

			// Act
			registerAppConfig('app', factory);

			// 获取包装工厂函数
			const wrappedFactory = mockRegisterAs.mock.calls[0][1];

			// Assert - 不应该抛出错误
			expect(() => wrappedFactory()).not.toThrow();
		});

		it('应该抛出错误当工厂返回 null', () => {
			// Arrange
			const factory = () => null as unknown as object;

			// Act
			registerAppConfig('app', factory);

			// 获取包装工厂函数
			const wrappedFactory = mockRegisterAs.mock.calls[0][1];

			// Assert
			expect(() => wrappedFactory()).toThrow('配置工厂 "app" 必须返回对象（Record），但收到：[object Null]');
		});

		it('应该抛出错误当工厂返回数组', () => {
			// Arrange
			const factory = () => [1, 2, 3] as unknown as object;

			// Act
			registerAppConfig('app', factory);

			// 获取包装工厂函数
			const wrappedFactory = mockRegisterAs.mock.calls[0][1];

			// Assert
			expect(() => wrappedFactory()).toThrow('配置工厂 "app" 必须返回对象（Record），但收到：[object Array]');
		});

		it('应该抛出错误当工厂返回字符串', () => {
			// Arrange
			const factory = () => 'string' as unknown as object;

			// Act
			registerAppConfig('app', factory);

			// 获取包装工厂函数
			const wrappedFactory = mockRegisterAs.mock.calls[0][1];

			// Assert
			expect(() => wrappedFactory()).toThrow('配置工厂 "app" 必须返回对象（Record），但收到：[object String]');
		});

		it('应该抛出错误当工厂返回数字', () => {
			// Arrange
			const factory = () => 123 as unknown as object;

			// Act
			registerAppConfig('app', factory);

			// 获取包装工厂函数
			const wrappedFactory = mockRegisterAs.mock.calls[0][1];

			// Assert
			expect(() => wrappedFactory()).toThrow('配置工厂 "app" 必须返回对象（Record），但收到：[object Number]');
		});

		it('应该抛出错误当工厂返回 undefined', () => {
			// Arrange
			const factory = () => undefined as unknown as object;

			// Act
			registerAppConfig('app', factory);

			// 获取包装工厂函数
			const wrappedFactory = mockRegisterAs.mock.calls[0][1];

			// Assert
			expect(() => wrappedFactory()).toThrow('配置工厂 "app" 必须返回对象（Record），但收到：[object Undefined]');
		});

		it('应该抛出错误当工厂返回数组', () => {
			// Arrange
			const factory = () => [1, 2, 3];

			// Act
			registerAppConfig('app', factory);

			// 获取包装工厂函数
			const wrappedFactory = mockRegisterAs.mock.calls[0][1];

			// Assert
			expect(() => wrappedFactory()).toThrow('配置工厂 "app" 必须返回对象（Record），但收到：[object Array]');
		});

		it('应该抛出错误当工厂返回字符串', () => {
			// Arrange
			const factory = () => 'string' as unknown as object;

			// Act
			registerAppConfig('app', factory);

			// 获取包装工厂函数
			const wrappedFactory = mockRegisterAs.mock.calls[0][1];

			// Assert
			expect(() => wrappedFactory()).toThrow('配置工厂 "app" 必须返回对象（Record），但收到：[object String]');
		});

		it('应该抛出错误当工厂返回数字', () => {
			// Arrange
			const factory = () => 123 as unknown as object;

			// Act
			registerAppConfig('app', factory);

			// 获取包装工厂函数
			const wrappedFactory = mockRegisterAs.mock.calls[0][1];

			// Assert
			expect(() => wrappedFactory()).toThrow('配置工厂 "app" 必须返回对象（Record），但收到：[object Number]');
		});

		it('应该抛出错误当工厂返回 undefined', () => {
			// Arrange
			const factory = () => undefined as unknown as object;

			// Act
			registerAppConfig('app', factory);

			// 获取包装工厂函数
			const wrappedFactory = mockRegisterAs.mock.calls[0][1];

			// Assert
			expect(() => wrappedFactory()).toThrow('配置工厂 "app" 必须返回对象（Record），但收到：[object Undefined]');
		});
	});

	describe('不同命名空间', () => {
		it('应该支持 logger 命名空间', () => {
			// Arrange
			const factory = () => ({ level: 'info' });

			// Act
			registerAppConfig('logger', factory);

			// Assert
			expect(mockRegisterAs).toHaveBeenCalledWith('logger', expect.any(Function));
		});

		it('应该支持 database 命名空间', () => {
			// Arrange
			const factory = () => ({ host: 'localhost', port: 5432 });

			// Act
			registerAppConfig('database', factory);

			// Assert
			expect(mockRegisterAs).toHaveBeenCalledWith('database', expect.any(Function));
		});

		it('应该支持带连字符的命名空间', () => {
			// Arrange
			const factory = () => ({ enabled: true });

			// Act
			registerAppConfig('my-service', factory);

			// Assert
			expect(mockRegisterAs).toHaveBeenCalledWith('my-service', expect.any(Function));
		});
	});

	describe('复杂配置对象', () => {
		it('应该支持嵌套对象配置', () => {
			// Arrange
			const factory = () => ({
				server: {
					host: 'localhost',
					port: 3000,
					tls: {
						enabled: true,
						cert: '/path/to/cert'
					}
				},
				features: {
					auth: true,
					rateLimit: {
						enabled: false
					}
				}
			});

			// Act
			registerAppConfig('app', factory);

			// 获取包装工厂函数
			const wrappedFactory = mockRegisterAs.mock.calls[0][1];
			const result = wrappedFactory();

			// Assert
			expect(result).toEqual({
				server: {
					host: 'localhost',
					port: 3000,
					tls: {
						enabled: true,
						cert: '/path/to/cert'
					}
				},
				features: {
					auth: true,
					rateLimit: {
						enabled: false
					}
				}
			});
		});

		it('应该支持包含数组的配置', () => {
			// Arrange
			const factory = () => ({
				cors: {
					origins: ['http://localhost', 'https://example.com']
				}
			});

			// Act
			registerAppConfig('app', factory);

			// 获取包装工厂函数
			const wrappedFactory = mockRegisterAs.mock.calls[0][1];
			const result = wrappedFactory();

			// Assert
			expect(result).toEqual({
				cors: {
					origins: ['http://localhost', 'https://example.com']
				}
			});
		});

		it('应该支持包含 null 值的配置', () => {
			// Arrange
			const factory = () => ({
				optional: null,
				required: 'value'
			});

			// Act
			registerAppConfig('app', factory);

			// 获取包装工厂函数
			const wrappedFactory = mockRegisterAs.mock.calls[0][1];
			const result = wrappedFactory();

			// Assert
			expect(result).toEqual({
				optional: null,
				required: 'value'
			});
		});
	});
});
