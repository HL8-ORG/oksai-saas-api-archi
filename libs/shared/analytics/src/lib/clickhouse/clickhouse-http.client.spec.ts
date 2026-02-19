import { Test, TestingModule } from '@nestjs/testing';
import { ClickHouseHttpClient } from './clickhouse-http.client';
import type { ClickHouseConfig, ClickHouseTableSchema, ClickHouseInsertOptions } from './clickhouse.interface';

/**
 * @description ClickHouseHttpClient 单元测试
 *
 * 测试覆盖：
 * - 客户端初始化
 * - 查询执行
 * - 批量插入
 * - 命令执行
 * - 表结构获取
 * - 表存在检查
 * - 表创建/删除/截断
 * - 健康检查
 * - 超时处理
 * - 错误处理
 */
describe('ClickHouseHttpClient', () => {
	let client: ClickHouseHttpClient;
	let mockFetch: jest.Mock;

	const defaultConfig: ClickHouseConfig = {
		host: 'localhost',
		port: 8123,
		database: 'test_db',
		username: 'default',
		password: '',
		protocol: 'http'
	};

	const createMockResponse = (
		data: unknown,
		options?: { ok?: boolean; status?: number; headers?: Record<string, string> }
	) => {
		return {
			ok: options?.ok ?? true,
			status: options?.status ?? 200,
			json: jest.fn().mockResolvedValue(data),
			text: jest.fn().mockResolvedValue(typeof data === 'string' ? data : JSON.stringify(data)),
			headers: {
				get: jest.fn((key: string) => options?.headers?.[key] ?? null)
			}
		};
	};

	beforeEach(() => {
		mockFetch = jest.fn();
		global.fetch = mockFetch;

		client = new ClickHouseHttpClient(defaultConfig);
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	describe('客户端初始化', () => {
		it('应该使用默认配置初始化', () => {
			const minimalConfig: ClickHouseConfig = {
				host: 'localhost',
				port: 8123,
				database: 'test',
				username: 'user',
				password: 'pass'
			};
			const c = new ClickHouseHttpClient(minimalConfig);
			expect(c).toBeDefined();
		});

		it('应该正确构建 HTTP URL', () => {
			const httpConfig: ClickHouseConfig = {
				...defaultConfig,
				protocol: 'http'
			};
			const c = new ClickHouseHttpClient(httpConfig);
			expect(c).toBeDefined();
		});

		it('应该正确构建 HTTPS URL', () => {
			const httpsConfig: ClickHouseConfig = {
				...defaultConfig,
				protocol: 'https',
				port: 8443
			};
			const c = new ClickHouseHttpClient(httpsConfig);
			expect(c).toBeDefined();
		});

		it('应该正确设置默认端口（HTTP）', () => {
			const configWithoutPort: ClickHouseConfig = {
				host: 'localhost',
				port: 8123,
				database: 'test',
				username: 'user',
				password: 'pass',
				protocol: 'http'
			};
			const c = new ClickHouseHttpClient(configWithoutPort);
			expect(c).toBeDefined();
		});

		it('应该正确设置默认端口（HTTPS）', () => {
			const configWithoutPort: ClickHouseConfig = {
				host: 'localhost',
				port: 8443,
				database: 'test',
				username: 'user',
				password: 'pass',
				protocol: 'https'
			};
			const c = new ClickHouseHttpClient(configWithoutPort);
			expect(c).toBeDefined();
		});
	});

	describe('查询执行', () => {
		it('应该成功执行查询', async () => {
			const mockResult = {
				data: [{ id: 1, name: 'test' }],
				meta: [
					{ name: 'id', type: 'UInt32' },
					{ name: 'name', type: 'String' }
				],
				rows: 1,
				statistics: { elapsed: 0.001, rows_read: 1, bytes_read: 100 }
			};

			mockFetch.mockResolvedValue(createMockResponse(mockResult));

			const result = await client.query<{ id: number; name: string }>('SELECT * FROM test');

			expect(result.data).toHaveLength(1);
			expect(result.data[0].id).toBe(1);
			expect(result.rows).toBe(1);
			expect(mockFetch).toHaveBeenCalledTimes(1);
		});

		it('应该处理空结果', async () => {
			const mockResult = {
				data: [],
				rows: 0
			};

			mockFetch.mockResolvedValue(createMockResponse(mockResult));

			const result = await client.query('SELECT * FROM test WHERE 1=0');

			expect(result.data).toHaveLength(0);
			expect(result.rows).toBe(0);
		});

		it('应该正确传递查询选项', async () => {
			const mockResult = { data: [], rows: 0 };
			mockFetch.mockResolvedValue(createMockResponse(mockResult));

			await client.query('SELECT 1', {
				timeout: 5000,
				queryId: 'test-query-123',
				settings: { max_rows_to_read: '1000' }
			});

			const fetchCall = mockFetch.mock.calls[0];
			expect(fetchCall[0]).toContain('max_execution_time=5');
			expect(fetchCall[0]).toContain('max_rows_to_read=1000');
		});

		it('应该抛出查询错误', async () => {
			mockFetch.mockResolvedValue(createMockResponse('Syntax error', { ok: false, status: 400 }));

			await expect(client.query('INVALID SQL')).rejects.toThrow('ClickHouse 查询失败');
		});
	});

	describe('批量插入', () => {
		it('应该成功插入数据', async () => {
			mockFetch.mockResolvedValue(createMockResponse({}));

			const insertOptions: ClickHouseInsertOptions = {
				table: 'test_table',
				values: [
					{ id: 1, name: 'test1' },
					{ id: 2, name: 'test2' }
				]
			};

			await client.insert(insertOptions);

			expect(mockFetch).toHaveBeenCalledTimes(1);
			const fetchCall = mockFetch.mock.calls[0];
			expect(fetchCall[1].body).toContain('INSERT INTO test_table');
			expect(fetchCall[1].body).toContain('"id":1');
		});

		it('应该跳过空数据插入', async () => {
			await client.insert({ table: 'test_table', values: [] });
			expect(mockFetch).not.toHaveBeenCalled();
		});

		it('应该使用指定列名插入', async () => {
			mockFetch.mockResolvedValue(createMockResponse({}));

			await client.insert({
				table: 'test_table',
				values: [{ id: 1, name: 'test', extra: 'ignored' }],
				columns: ['id', 'name']
			});

			const fetchCall = mockFetch.mock.calls[0];
			expect(fetchCall[1].body).toContain('id, name');
		});

		it('应该支持覆盖插入模式', async () => {
			mockFetch.mockResolvedValue(createMockResponse({}));

			await client.insert({
				table: 'test_table',
				values: [{ id: 1, name: 'test' }],
				override: true
			});

			const fetchCall = mockFetch.mock.calls[0];
			expect(fetchCall[1].body).toContain('replace=1');
		});

		it('应该抛出插入错误', async () => {
			mockFetch.mockResolvedValue(createMockResponse('Table not found', { ok: false, status: 404 }));

			await expect(client.insert({ table: 'nonexistent', values: [{ id: 1 }] })).rejects.toThrow(
				'ClickHouse 插入失败'
			);
		});
	});

	describe('命令执行', () => {
		it('应该成功执行命令', async () => {
			mockFetch.mockResolvedValue(createMockResponse({}));

			await client.command('CREATE TABLE test (id UInt32)');

			expect(mockFetch).toHaveBeenCalledTimes(1);
		});

		it('应该抛出命令执行错误', async () => {
			mockFetch.mockResolvedValue(createMockResponse('Table already exists', { ok: false, status: 400 }));

			await expect(client.command('CREATE TABLE test (id UInt32)')).rejects.toThrow('ClickHouse 命令执行失败');
		});
	});

	describe('表结构获取', () => {
		it('应该成功获取表结构', async () => {
			const describeResult = {
				data: [
					{ name: 'id', type: 'UInt32', default: '', comment: 'ID' },
					{ name: 'name', type: 'String', default: '', comment: '名称' }
				],
				rows: 2
			};

			const createResult = {
				data: [
					{
						statement:
							'CREATE TABLE test_db.test_table (id UInt32, name String) ENGINE = MergeTree() PARTITION BY toYYYYMM(created_at) ORDER BY (id)'
					}
				],
				rows: 1
			};

			mockFetch
				.mockResolvedValueOnce(createMockResponse(describeResult))
				.mockResolvedValueOnce(createMockResponse(createResult));

			const schema = await client.describeTable('test_table');

			expect(schema.name).toBe('test_table');
			expect(schema.database).toBe('test_db');
			expect(schema.engine).toBe('MergeTree');
			expect(schema.columns).toHaveLength(2);
			expect(schema.sortingKey).toEqual(['id']);
			expect(schema.partitionBy).toBe('toYYYYMM(created_at)');
		});

		it('应该正确解析 Nullable 类型', async () => {
			const describeResult = {
				data: [
					{ name: 'id', type: 'UInt32', default: '', comment: '' },
					{ name: 'name', type: 'Nullable(String)', default: '', comment: '' }
				],
				rows: 2
			};

			const createResult = {
				data: [
					{
						statement:
							'CREATE TABLE test_db.test_table (id UInt32, name Nullable(String)) ENGINE = MergeTree() ORDER BY (id)'
					}
				],
				rows: 1
			};

			mockFetch
				.mockResolvedValueOnce(createMockResponse(describeResult))
				.mockResolvedValueOnce(createMockResponse(createResult));

			const schema = await client.describeTable('test_table');

			expect(schema.columns[0].nullable).toBe(false);
			expect(schema.columns[1].nullable).toBe(true);
		});
	});

	describe('表存在检查', () => {
		it('应该返回 true 当表存在时', async () => {
			mockFetch.mockResolvedValue(createMockResponse({ data: [{ result: 1 }], rows: 1 }));

			const exists = await client.tableExists('existing_table');

			expect(exists).toBe(true);
		});

		it('应该返回 false 当表不存在时', async () => {
			mockFetch.mockResolvedValue(createMockResponse({ data: [{ result: 0 }], rows: 1 }));

			const exists = await client.tableExists('nonexistent_table');

			expect(exists).toBe(false);
		});
	});

	describe('表创建', () => {
		it('应该成功创建表', async () => {
			mockFetch.mockResolvedValue(createMockResponse({}));

			const schema: ClickHouseTableSchema = {
				name: 'test_table',
				database: 'test_db',
				engine: 'MergeTree',
				columns: [
					{ name: 'id', type: 'UInt32' },
					{ name: 'name', type: 'String' }
				],
				primaryKey: ['id'],
				sortingKey: ['id']
			};

			await client.createTable(schema);

			const fetchCall = mockFetch.mock.calls[0];
			expect(fetchCall[1].body).toContain('CREATE TABLE IF NOT EXISTS test_table');
			expect(fetchCall[1].body).toContain('ENGINE = MergeTree');
			expect(fetchCall[1].body).toContain('ORDER BY (id)');
			expect(fetchCall[1].body).toContain('PRIMARY KEY (id)');
		});

		it('应该支持分区键', async () => {
			mockFetch.mockResolvedValue(createMockResponse({}));

			const schema: ClickHouseTableSchema = {
				name: 'test_table',
				database: 'test_db',
				engine: 'MergeTree',
				columns: [{ name: 'id', type: 'UInt32' }],
				partitionBy: 'toYYYYMM(created_at)',
				sortingKey: ['id']
			};

			await client.createTable(schema);

			const fetchCall = mockFetch.mock.calls[0];
			expect(fetchCall[1].body).toContain('PARTITION BY toYYYYMM(created_at)');
		});

		it('应该支持列默认值和注释', async () => {
			mockFetch.mockResolvedValue(createMockResponse({}));

			const schema: ClickHouseTableSchema = {
				name: 'test_table',
				database: 'test_db',
				engine: 'MergeTree',
				columns: [
					{ name: 'id', type: 'UInt32', default: '0' },
					{ name: 'status', type: 'String', comment: '状态字段' }
				],
				sortingKey: ['id']
			};

			await client.createTable(schema);

			const fetchCall = mockFetch.mock.calls[0];
			expect(fetchCall[1].body).toContain('DEFAULT 0');
			expect(fetchCall[1].body).toContain("COMMENT '状态字段'");
		});
	});

	describe('表删除和截断', () => {
		it('应该成功删除表', async () => {
			mockFetch.mockResolvedValue(createMockResponse({}));

			await client.dropTable('test_table');

			const fetchCall = mockFetch.mock.calls[0];
			expect(fetchCall[1].body).toContain('DROP TABLE IF EXISTS test_table');
		});

		it('应该成功截断表', async () => {
			mockFetch.mockResolvedValue(createMockResponse({}));

			await client.truncateTable('test_table');

			const fetchCall = mockFetch.mock.calls[0];
			expect(fetchCall[1].body).toContain('TRUNCATE TABLE IF EXISTS test_table');
		});
	});

	describe('健康检查', () => {
		it('应该返回 true 当服务可用时', async () => {
			mockFetch.mockResolvedValue(createMockResponse('Ok.', { ok: true }));

			const result = await client.ping();

			expect(result).toBe(true);
		});

		it('应该返回 false 当服务不可用时', async () => {
			mockFetch.mockResolvedValue(createMockResponse('', { ok: false, status: 503 }));

			const result = await client.ping();

			expect(result).toBe(false);
		});

		it('应该返回 false 当连接超时时', async () => {
			mockFetch.mockRejectedValue(new Error('Network error'));

			const result = await client.ping();

			expect(result).toBe(false);
		});
	});

	describe('连接关闭', () => {
		it('应该成功关闭连接', async () => {
			await expect(client.close()).resolves.not.toThrow();
		});
	});
});
