import { DynamicModule } from '@nestjs/common';
import { setupLoggerModule, SetupLoggerModuleOptions } from './setup-logger-module';

jest.mock('nestjs-pino', () => ({
	LoggerModule: {
		forRoot: jest.fn().mockReturnValue({ module: class MockLoggerModule {} })
	}
}));

describe('setupLoggerModule', () => {
	const { LoggerModule } = jest.requireMock('nestjs-pino');

	beforeEach(() => {
		jest.clearAllMocks();
		delete process.env.LOG_LEVEL;
	});

	afterEach(() => {
		delete process.env.LOG_LEVEL;
	});

	describe('返回值', () => {
		it('应该返回 DynamicModule', () => {
			const result = setupLoggerModule();

			expect(result).toBeDefined();
			expect(result).toHaveProperty('module');
		});

		it('应该调用 LoggerModule.forRoot', () => {
			setupLoggerModule();

			expect(LoggerModule.forRoot).toHaveBeenCalledTimes(1);
		});
	});

	describe('日志级别配置', () => {
		it('使用 options.level 作为日志级别', () => {
			setupLoggerModule({ level: 'debug' });

			const callArgs = LoggerModule.forRoot.mock.calls[0][0];
			expect(callArgs.pinoHttp.level).toBe('debug');
		});

		it('使用 LOG_LEVEL 环境变量作为日志级别', () => {
			process.env.LOG_LEVEL = 'warn';
			setupLoggerModule();

			const callArgs = LoggerModule.forRoot.mock.calls[0][0];
			expect(callArgs.pinoHttp.level).toBe('warn');
		});

		it('options.level 优先于 LOG_LEVEL 环境变量', () => {
			process.env.LOG_LEVEL = 'warn';
			setupLoggerModule({ level: 'debug' });

			const callArgs = LoggerModule.forRoot.mock.calls[0][0];
			expect(callArgs.pinoHttp.level).toBe('debug');
		});

		it('默认使用 info 级别', () => {
			setupLoggerModule();

			const callArgs = LoggerModule.forRoot.mock.calls[0][0];
			expect(callArgs.pinoHttp.level).toBe('info');
		});
	});

	describe('脱敏配置', () => {
		it('应该配置默认的脱敏路径', () => {
			setupLoggerModule();

			const callArgs = LoggerModule.forRoot.mock.calls[0][0];
			expect(callArgs.pinoHttp.redact).toContain('req.headers.authorization');
			expect(callArgs.pinoHttp.redact).toContain('req.headers.cookie');
			expect(callArgs.pinoHttp.redact).toContain('req.headers.set-cookie');
		});

		it('应该支持自定义脱敏路径', () => {
			const customRedact = ['req.body.password', 'req.body.token'];
			setupLoggerModule({ redact: customRedact });

			const callArgs = LoggerModule.forRoot.mock.calls[0][0];
			expect(callArgs.pinoHttp.redact).toEqual(customRedact);
		});
	});

	describe('请求序列化', () => {
		it('应该只序列化 method 和 url', () => {
			setupLoggerModule();

			const callArgs = LoggerModule.forRoot.mock.calls[0][0];
			const serialized = callArgs.pinoHttp.serializers.req({
				method: 'GET',
				url: '/test',
				headers: { authorization: 'secret' },
				body: { password: 'secret' }
			});

			expect(serialized).toEqual({
				method: 'GET',
				url: '/test'
			});
			expect(serialized).not.toHaveProperty('headers');
			expect(serialized).not.toHaveProperty('body');
		});

		it('应该处理 null 请求', () => {
			setupLoggerModule();

			const callArgs = LoggerModule.forRoot.mock.calls[0][0];
			const serialized = callArgs.pinoHttp.serializers.req(null);

			expect(serialized).toEqual({
				method: undefined,
				url: undefined
			});
		});
	});

	describe('customProps 配置', () => {
		it('应该调用自定义属性注入器', () => {
			const customProps = jest.fn().mockReturnValue({ tenantId: 'tenant-001' });
			setupLoggerModule({ customProps });

			const callArgs = LoggerModule.forRoot.mock.calls[0][0];
			const props = callArgs.pinoHttp.customProps({ id: 'req-001' }, {});

			expect(customProps).toHaveBeenCalledWith({ id: 'req-001' }, {});
			expect(props.requestId).toBe('req-001');
			expect(props.tenantId).toBe('tenant-001');
		});

		it('当没有 customProps 时不应该出错', () => {
			setupLoggerModule();

			const callArgs = LoggerModule.forRoot.mock.calls[0][0];
			const props = callArgs.pinoHttp.customProps({ id: 'req-001' }, {});

			expect(props.requestId).toBe('req-001');
		});
	});

	describe('请求 ID 提取', () => {
		it('应该从 x-request-id header 提取请求 ID', () => {
			setupLoggerModule();

			const callArgs = LoggerModule.forRoot.mock.calls[0][0];
			const props = callArgs.pinoHttp.customProps({ headers: { 'x-request-id': 'req-123' } }, {});

			expect(props.requestId).toBe('req-123');
		});

		it('应该从 x-correlation-id header 提取请求 ID', () => {
			setupLoggerModule();

			const callArgs = LoggerModule.forRoot.mock.calls[0][0];
			const props = callArgs.pinoHttp.customProps({ headers: { 'x-correlation-id': 'corr-123' } }, {});

			expect(props.requestId).toBe('corr-123');
		});

		it('应该从 req.id 提取请求 ID', () => {
			setupLoggerModule();

			const callArgs = LoggerModule.forRoot.mock.calls[0][0];
			const props = callArgs.pinoHttp.customProps({ id: 'fastify-req-id' }, {});

			expect(props.requestId).toBe('fastify-req-id');
		});

		it('当没有请求 ID 时应该返回 unknown', () => {
			setupLoggerModule();

			const callArgs = LoggerModule.forRoot.mock.calls[0][0];
			const props = callArgs.pinoHttp.customProps({}, {});

			expect(props.requestId).toBe('unknown');
		});
	});

	describe('customLogLevel 配置', () => {
		it('当状态码 >= 500 时应该返回 error', () => {
			setupLoggerModule();

			const callArgs = LoggerModule.forRoot.mock.calls[0][0];
			const level = callArgs.pinoHttp.customLogLevel({}, { statusCode: 500 });

			expect(level).toBe('error');
		});

		it('当有错误时应该返回 error', () => {
			setupLoggerModule();

			const callArgs = LoggerModule.forRoot.mock.calls[0][0];
			const level = callArgs.pinoHttp.customLogLevel({}, { statusCode: 200 }, new Error('test'));

			expect(level).toBe('error');
		});

		it('当状态码 >= 400 时应该返回 warn', () => {
			setupLoggerModule();

			const callArgs = LoggerModule.forRoot.mock.calls[0][0];
			const level = callArgs.pinoHttp.customLogLevel({}, { statusCode: 404 });

			expect(level).toBe('warn');
		});

		it('当状态码 >= 300 时应该返回 info', () => {
			setupLoggerModule();

			const callArgs = LoggerModule.forRoot.mock.calls[0][0];
			const level = callArgs.pinoHttp.customLogLevel({}, { statusCode: 302 });

			expect(level).toBe('info');
		});

		it('当状态码 < 300 时应该返回 info', () => {
			setupLoggerModule();

			const callArgs = LoggerModule.forRoot.mock.calls[0][0];
			const level = callArgs.pinoHttp.customLogLevel({}, { statusCode: 200 });

			expect(level).toBe('info');
		});
	});

	describe('pretty 输出配置', () => {
		it('当 pretty=false 时不应该配置 transport', () => {
			setupLoggerModule({ pretty: false });

			const callArgs = LoggerModule.forRoot.mock.calls[0][0];
			expect(callArgs.pinoHttp.transport).toBeUndefined();
		});

		it('当 pretty 未设置时不应该配置 transport', () => {
			setupLoggerModule();

			const callArgs = LoggerModule.forRoot.mock.calls[0][0];
			expect(callArgs.pinoHttp.transport).toBeUndefined();
		});
	});

	describe('空配置处理', () => {
		it('应该支持不传任何配置', () => {
			const result = setupLoggerModule();

			expect(result).toBeDefined();
			expect(LoggerModule.forRoot).toHaveBeenCalled();
		});

		it('应该支持传空对象', () => {
			const result = setupLoggerModule({});

			expect(result).toBeDefined();
		});
	});
});
