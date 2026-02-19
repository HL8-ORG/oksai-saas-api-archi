import { env, ConfigEnvError } from './env';

describe('env', () => {
	const originalEnv = process.env;

	beforeEach(() => {
		// 每个测试前重置 process.env
		process.env = { ...originalEnv };
	});

	afterAll(() => {
		// 测试结束后恢复原始 process.env
		process.env = originalEnv;
	});

	describe('string', () => {
		it('应该读取存在的环境变量', () => {
			// Arrange
			process.env.TEST_STRING = 'hello';

			// Act
			const result = env.string('TEST_STRING');

			// Assert
			expect(result).toBe('hello');
		});

		it('应该自动去除前后空格', () => {
			// Arrange
			process.env.TEST_STRING = '  hello  ';

			// Act
			const result = env.string('TEST_STRING');

			// Assert
			expect(result).toBe('hello');
		});

		it('当 trim 为 false 时应该保留空格', () => {
			// Arrange
			process.env.TEST_STRING = '  hello  ';

			// Act
			const result = env.string('TEST_STRING', { trim: false });

			// Assert
			expect(result).toBe('  hello  ');
		});

		it('应该返回默认值当环境变量不存在', () => {
			// Arrange
			delete process.env.TEST_STRING;

			// Act
			const result = env.string('TEST_STRING', { defaultValue: 'default' });

			// Assert
			expect(result).toBe('default');
		});

		it('应该抛出错误当环境变量不存在且无默认值', () => {
			// Arrange
			delete process.env.TEST_STRING;

			// Act & Assert
			expect(() => env.string('TEST_STRING')).toThrow(ConfigEnvError);
			expect(() => env.string('TEST_STRING')).toThrow('缺少必需的环境变量：TEST_STRING');
		});

		it('应该返回默认值当环境变量为空字符串', () => {
			// Arrange
			process.env.TEST_STRING = '';

			// Act
			const result = env.string('TEST_STRING', { defaultValue: 'default' });

			// Assert
			expect(result).toBe('default');
		});

		it('应该抛出错误当环境变量为空字符串且无默认值', () => {
			// Arrange
			process.env.TEST_STRING = '';

			// Act & Assert
			// 注意：空字符串会触发"缺少必需的环境变量"错误
			expect(() => env.string('TEST_STRING')).toThrow(ConfigEnvError);
			expect(() => env.string('TEST_STRING')).toThrow('缺少必需的环境变量：TEST_STRING');
		});

		it('应该抛出错误当去除空格后为空字符串', () => {
			// Arrange
			process.env.TEST_STRING = '   ';

			// Act & Assert
			expect(() => env.string('TEST_STRING')).toThrow('环境变量 TEST_STRING 为空字符串');
		});
	});

	describe('int', () => {
		it('应该读取整数环境变量', () => {
			// Arrange
			process.env.TEST_INT = '42';

			// Act
			const result = env.int('TEST_INT');

			// Assert
			expect(result).toBe(42);
		});

		it('应该返回默认值当环境变量不存在', () => {
			// Arrange
			delete process.env.TEST_INT;

			// Act
			const result = env.int('TEST_INT', { defaultValue: 100 });

			// Assert
			expect(result).toBe(100);
		});

		it('应该抛出错误当环境变量不是有效整数', () => {
			// Arrange
			process.env.TEST_INT = 'not-a-number';

			// Act & Assert
			expect(() => env.int('TEST_INT')).toThrow(ConfigEnvError);
			expect(() => env.int('TEST_INT')).toThrow('环境变量 TEST_INT 不是有效整数：not-a-number');
		});

		it('应该通过最小值验证', () => {
			// Arrange
			process.env.TEST_INT = '10';

			// Act
			const result = env.int('TEST_INT', { min: 5 });

			// Assert
			expect(result).toBe(10);
		});

		it('应该抛出错误当小于最小值', () => {
			// Arrange
			process.env.TEST_INT = '3';

			// Act & Assert
			expect(() => env.int('TEST_INT', { min: 5 })).toThrow('环境变量 TEST_INT 不能小于 5：3');
		});

		it('应该通过最大值验证', () => {
			// Arrange
			process.env.TEST_INT = '10';

			// Act
			const result = env.int('TEST_INT', { max: 20 });

			// Assert
			expect(result).toBe(10);
		});

		it('应该抛出错误当大于最大值', () => {
			// Arrange
			process.env.TEST_INT = '30';

			// Act & Assert
			expect(() => env.int('TEST_INT', { max: 20 })).toThrow('环境变量 TEST_INT 不能大于 20：30');
		});

		it('应该支持负数', () => {
			// Arrange
			process.env.TEST_INT = '-10';

			// Act
			const result = env.int('TEST_INT');

			// Assert
			expect(result).toBe(-10);
		});
	});

	describe('bool', () => {
		it('应该识别 true', () => {
			// Arrange
			process.env.TEST_BOOL = 'true';

			// Act
			const result = env.bool('TEST_BOOL');

			// Assert
			expect(result).toBe(true);
		});

		it('应该识别 false', () => {
			// Arrange
			process.env.TEST_BOOL = 'false';

			// Act
			const result = env.bool('TEST_BOOL');

			// Assert
			expect(result).toBe(false);
		});

		it('应该识别 1 为 true', () => {
			// Arrange
			process.env.TEST_BOOL = '1';

			// Act
			const result = env.bool('TEST_BOOL');

			// Assert
			expect(result).toBe(true);
		});

		it('应该识别 0 为 false', () => {
			// Arrange
			process.env.TEST_BOOL = '0';

			// Act
			const result = env.bool('TEST_BOOL');

			// Assert
			expect(result).toBe(false);
		});

		it('应该不区分大小写', () => {
			// Arrange
			process.env.TEST_BOOL = 'TRUE';

			// Act
			const result = env.bool('TEST_BOOL');

			// Assert
			expect(result).toBe(true);
		});

		it('应该返回默认值当环境变量不存在', () => {
			// Arrange
			delete process.env.TEST_BOOL;

			// Act
			const result = env.bool('TEST_BOOL', { defaultValue: true });

			// Assert
			expect(result).toBe(true);
		});

		it('应该抛出错误当值不是有效布尔值', () => {
			// Arrange
			process.env.TEST_BOOL = 'yes';

			// Act & Assert
			expect(() => env.bool('TEST_BOOL')).toThrow('环境变量 TEST_BOOL 不是有效布尔值（true/false/1/0）：yes');
		});
	});

	describe('enum', () => {
		it('应该读取有效的枚举值', () => {
			// Arrange
			process.env.TEST_ENUM = 'dev';

			// Act
			const result = env.enum('TEST_ENUM', ['dev', 'prod', 'test'] as const);

			// Assert
			expect(result).toBe('dev');
		});

		it('应该返回默认值当环境变量不存在', () => {
			// Arrange
			delete process.env.TEST_ENUM;

			// Act
			const result = env.enum('TEST_ENUM', ['dev', 'prod'] as const, { defaultValue: 'dev' });

			// Assert
			expect(result).toBe('dev');
		});

		it('应该抛出错误当值不在允许列表中', () => {
			// Arrange
			process.env.TEST_ENUM = 'staging';

			// Act & Assert
			expect(() => env.enum('TEST_ENUM', ['dev', 'prod'] as const)).toThrow(
				'环境变量 TEST_ENUM 的值不合法：staging，允许值为：dev, prod'
			);
		});

		it('应该自动去除前后空格', () => {
			// Arrange
			process.env.TEST_ENUM = '  dev  ';

			// Act
			const result = env.enum('TEST_ENUM', ['dev', 'prod'] as const);

			// Assert
			expect(result).toBe('dev');
		});
	});

	describe('url', () => {
		it('应该读取有效的 URL', () => {
			// Arrange
			process.env.TEST_URL = 'https://example.com/path';

			// Act
			const result = env.url('TEST_URL');

			// Assert
			expect(result).toBe('https://example.com/path');
		});

		it('应该返回默认值当环境变量不存在', () => {
			// Arrange
			delete process.env.TEST_URL;

			// Act
			const result = env.url('TEST_URL', { defaultValue: 'http://localhost' });

			// Assert
			expect(result).toBe('http://localhost');
		});

		it('应该抛出错误当 URL 无效', () => {
			// Arrange
			process.env.TEST_URL = 'not-a-url';

			// Act & Assert
			expect(() => env.url('TEST_URL')).toThrow('环境变量 TEST_URL 不是有效 URL：not-a-url');
		});

		it('应该通过协议验证', () => {
			// Arrange
			process.env.TEST_URL = 'https://example.com';

			// Act
			const result = env.url('TEST_URL', { allowedProtocols: ['https:'] });

			// Assert
			expect(result).toBe('https://example.com');
		});

		it('应该抛出错误当协议不在允许列表中', () => {
			// Arrange
			process.env.TEST_URL = 'ftp://example.com';

			// Act & Assert
			expect(() => env.url('TEST_URL', { allowedProtocols: ['http:', 'https:'] })).toThrow(
				'环境变量 TEST_URL 的协议不被允许：ftp:，允许协议：http:, https:'
			);
		});
	});

	describe('json', () => {
		it('应该解析有效的 JSON', () => {
			// Arrange
			process.env.TEST_JSON = '{"name":"test","value":123}';

			// Act
			const result = env.json<{ name: string; value: number }>('TEST_JSON');

			// Assert
			expect(result).toEqual({ name: 'test', value: 123 });
		});

		it('应该解析 JSON 数组', () => {
			// Arrange
			process.env.TEST_JSON = '[1,2,3]';

			// Act
			const result = env.json<number[]>('TEST_JSON');

			// Assert
			expect(result).toEqual([1, 2, 3]);
		});

		it('应该返回默认值当环境变量不存在', () => {
			// Arrange
			delete process.env.TEST_JSON;

			// Act
			const result = env.json('TEST_JSON', { defaultValue: { default: true } });

			// Assert
			expect(result).toEqual({ default: true });
		});

		it('应该抛出错误当 JSON 无效', () => {
			// Arrange
			process.env.TEST_JSON = 'not-json';

			// Act & Assert
			expect(() => env.json('TEST_JSON')).toThrow('环境变量 TEST_JSON 不是有效 JSON：not-json');
		});
	});

	describe('list', () => {
		it('应该解析逗号分隔的列表', () => {
			// Arrange
			process.env.TEST_LIST = 'a,b,c';

			// Act
			const result = env.list('TEST_LIST');

			// Assert
			expect(result).toEqual(['a', 'b', 'c']);
		});

		it('应该使用自定义分隔符', () => {
			// Arrange
			process.env.TEST_LIST = 'a|b|c';

			// Act
			const result = env.list('TEST_LIST', { separator: '|' });

			// Assert
			expect(result).toEqual(['a', 'b', 'c']);
		});

		it('应该自动去除每项的空格', () => {
			// Arrange
			process.env.TEST_LIST = 'a , b , c ';

			// Act
			const result = env.list('TEST_LIST');

			// Assert
			expect(result).toEqual(['a', 'b', 'c']);
		});

		it('当 trim 为 false 时应该保留每项的空格', () => {
			// Arrange
			process.env.TEST_LIST = 'a , b';

			// Act
			const result = env.list('TEST_LIST', { trim: false });

			// Assert
			expect(result).toEqual(['a ', ' b']);
		});

		it('应该过滤空字符串', () => {
			// Arrange
			process.env.TEST_LIST = 'a,,b,';

			// Act
			const result = env.list('TEST_LIST');

			// Assert
			expect(result).toEqual(['a', 'b']);
		});

		it('应该返回默认值当环境变量不存在', () => {
			// Arrange
			delete process.env.TEST_LIST;

			// Act
			const result = env.list('TEST_LIST', { defaultValue: ['default'] });

			// Assert
			expect(result).toEqual(['default']);
		});
	});

	describe('durationMs', () => {
		it('应该解析纯数字毫秒', () => {
			// Arrange
			process.env.TEST_DURATION = '1500';

			// Act
			const result = env.durationMs('TEST_DURATION');

			// Assert
			expect(result).toBe(1500);
		});

		it('应该解析毫秒单位', () => {
			// Arrange
			process.env.TEST_DURATION = '500ms';

			// Act
			const result = env.durationMs('TEST_DURATION');

			// Assert
			expect(result).toBe(500);
		});

		it('应该解析秒单位', () => {
			// Arrange
			process.env.TEST_DURATION = '2s';

			// Act
			const result = env.durationMs('TEST_DURATION');

			// Assert
			expect(result).toBe(2000);
		});

		it('应该解析分钟单位', () => {
			// Arrange
			process.env.TEST_DURATION = '5m';

			// Act
			const result = env.durationMs('TEST_DURATION');

			// Assert
			expect(result).toBe(5 * 60_000);
		});

		it('应该解析小时单位', () => {
			// Arrange
			process.env.TEST_DURATION = '1h';

			// Act
			const result = env.durationMs('TEST_DURATION');

			// Assert
			expect(result).toBe(3_600_000);
		});

		it('应该解析天单位', () => {
			// Arrange
			process.env.TEST_DURATION = '1d';

			// Act
			const result = env.durationMs('TEST_DURATION');

			// Assert
			expect(result).toBe(86_400_000);
		});

		it('应该返回默认值当环境变量不存在', () => {
			// Arrange
			delete process.env.TEST_DURATION;

			// Act
			const result = env.durationMs('TEST_DURATION', { defaultValue: 1000 });

			// Assert
			expect(result).toBe(1000);
		});

		it('应该通过最小值验证', () => {
			// Arrange
			process.env.TEST_DURATION = '5s';

			// Act
			const result = env.durationMs('TEST_DURATION', { min: 1000 });

			// Assert
			expect(result).toBe(5000);
		});

		it('应该抛出错误当小于最小值', () => {
			// Arrange
			process.env.TEST_DURATION = '500ms';

			// Act & Assert
			expect(() => env.durationMs('TEST_DURATION', { min: 1000 })).toThrow(
				'环境变量 TEST_DURATION 不能小于 1000ms：500'
			);
		});

		it('应该通过最大值验证', () => {
			// Arrange
			process.env.TEST_DURATION = '5s';

			// Act
			const result = env.durationMs('TEST_DURATION', { max: 10_000 });

			// Assert
			expect(result).toBe(5000);
		});

		it('应该抛出错误当大于最大值', () => {
			// Arrange
			process.env.TEST_DURATION = '20s';

			// Act & Assert
			expect(() => env.durationMs('TEST_DURATION', { max: 10_000 })).toThrow(
				'环境变量 TEST_DURATION 不能大于 10000ms：20000'
			);
		});

		it('应该抛出错误当格式无效', () => {
			// Arrange
			process.env.TEST_DURATION = 'invalid';

			// Act & Assert
			expect(() => env.durationMs('TEST_DURATION')).toThrow(
				'环境变量 TEST_DURATION 不是有效时长：invalid（示例：1500/2s/5m/1h/1d）'
			);
		});

		it('应该不区分大小写', () => {
			// Arrange
			process.env.TEST_DURATION = '2S';

			// Act
			const result = env.durationMs('TEST_DURATION');

			// Assert
			expect(result).toBe(2000);
		});
	});
});

describe('ConfigEnvError', () => {
	it('应该创建带有正确名称和消息的错误', () => {
		// Arrange & Act
		const error = new ConfigEnvError('测试错误消息');

		// Assert
		expect(error).toBeInstanceOf(Error);
		expect(error.name).toBe('ConfigEnvError');
		expect(error.message).toBe('测试错误消息');
	});
});
