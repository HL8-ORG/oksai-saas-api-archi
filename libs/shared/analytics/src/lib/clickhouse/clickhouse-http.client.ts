import { Injectable, Logger } from '@nestjs/common';
import type {
	ClickHouseConfig,
	ClickHouseQueryOptions,
	ClickHouseQueryResult,
	ClickHouseInsertOptions,
	ClickHouseTableSchema,
	ClickHouseColumnSchema
} from './clickhouse.interface';
import type { IClickHouseClient } from './clickhouse.port';

/**
 * @description ClickHouse HTTP 客户端
 *
 * 使用 HTTP 协议与 ClickHouse 服务器通信
 */
@Injectable()
export class ClickHouseHttpClient implements IClickHouseClient {
	private readonly logger = new Logger(ClickHouseHttpClient.name);
	private readonly baseUrl: string;
	private readonly defaultHeaders: Record<string, string>;

	constructor(private readonly config: ClickHouseConfig) {
		const protocol = config.protocol ?? 'http';
		const port = config.port ?? (protocol === 'https' ? 8443 : 8123);
		this.baseUrl = `${protocol}://${config.host}:${port}`;

		this.defaultHeaders = {
			'X-ClickHouse-User': config.username,
			'X-ClickHouse-Key': config.password,
			'X-ClickHouse-Database': config.database,
			'Content-Type': 'text/plain'
		};

		if (config.debug) {
			this.logger.debug(`ClickHouse 客户端已初始化: ${this.baseUrl}/${config.database}`);
		}
	}

	/**
	 * @description 执行查询
	 */
	async query<T = Record<string, unknown>>(
		sql: string,
		options?: ClickHouseQueryOptions
	): Promise<ClickHouseQueryResult<T>> {
		const startTime = Date.now();

		try {
			const url = this.buildUrl(options);
			const response = await this.fetchWithTimeout(url, {
				method: 'POST',
				headers: {
					...this.defaultHeaders,
					...(options?.queryId ? { 'X-ClickHouse-Query-Id': options.queryId } : {})
				},
				body: sql
			});

			if (!response.ok) {
				const errorText = await response.text();
				throw new Error(`ClickHouse 查询失败: ${response.status} ${errorText}`);
			}

			const result = (await response.json()) as {
				data?: T[];
				meta?: Array<{ name: string; type: string }>;
				rows?: number;
				statistics?: { elapsed: number; rows_read: number; bytes_read: number };
			};

			if (this.config.debug) {
				const elapsed = Date.now() - startTime;
				this.logger.debug(`查询完成: ${elapsed}ms, 行数: ${result.data?.length ?? 0}`);
			}

			return {
				data: result.data ?? [],
				meta: result.meta,
				rows: result.rows ?? result.data?.length ?? 0,
				statistics: result.statistics,
				queryId: options?.queryId ?? response.headers.get('X-ClickHouse-Query-Id') ?? undefined
			};
		} catch (error) {
			this.logger.error(`查询失败: ${error}`, { sql });
			throw error;
		}
	}

	/**
	 * @description 执行批量插入
	 */
	async insert(options: ClickHouseInsertOptions): Promise<void> {
		const { table, values, columns, override } = options;

		if (!values || values.length === 0) {
			this.logger.warn('插入数据为空，跳过插入');
			return;
		}

		const columnList = columns ?? Object.keys(values[0]);
		const format = 'JSONEachRow';

		const sql = override
			? `INSERT INTO ${table} (${columnList.join(', ')}) SETTINGS replace=1 FORMAT ${format}`
			: `INSERT INTO ${table} (${columnList.join(', ')}) FORMAT ${format}`;

		const body = values.map((row) => JSON.stringify(row)).join('\n');

		try {
			const response = await this.fetchWithTimeout(this.baseUrl, {
				method: 'POST',
				headers: this.defaultHeaders,
				body: `${sql}\n${body}`
			});

			if (!response.ok) {
				const errorText = await response.text();
				throw new Error(`ClickHouse 插入失败: ${response.status} ${errorText}`);
			}

			if (this.config.debug) {
				this.logger.debug(`插入完成: 表=${table}, 行数=${values.length}`);
			}
		} catch (error) {
			this.logger.error(`插入失败: ${error}`, { table, rowCount: values.length });
			throw error;
		}
	}

	/**
	 * @description 执行原始 SQL 命令
	 */
	async command(sql: string, options?: ClickHouseQueryOptions): Promise<void> {
		const url = this.buildUrl(options);

		try {
			const response = await this.fetchWithTimeout(url, {
				method: 'POST',
				headers: this.defaultHeaders,
				body: sql
			});

			if (!response.ok) {
				const errorText = await response.text();
				throw new Error(`ClickHouse 命令执行失败: ${response.status} ${errorText}`);
			}

			if (this.config.debug) {
				this.logger.debug(`命令执行完成: ${sql.substring(0, 100)}...`);
			}
		} catch (error) {
			this.logger.error(`命令执行失败: ${error}`, { sql });
			throw error;
		}
	}

	/**
	 * @description 获取表结构
	 */
	async describeTable(tableName: string): Promise<ClickHouseTableSchema> {
		const sql = `DESCRIBE TABLE ${tableName} FORMAT JSON`;
		const result = await this.query<ClickHouseColumnSchema>(sql);

		const columns = result.data.map((row) => ({
			name: row.name,
			type: row.type,
			default: row.default,
			nullable: row.type.startsWith('Nullable'),
			comment: row.comment
		}));

		const createTableSql = `SHOW CREATE TABLE ${tableName}`;
		const createResult = await this.query<{ statement: string }>(createTableSql);
		const createStatement = createResult.data[0]?.statement ?? '';

		const engineMatch = createStatement.match(/ENGINE\s*=\s*(\w+)/i);
		const engine = engineMatch?.[1] ?? 'Unknown';

		const partitionMatch = createStatement.match(/PARTITION BY\s+(.+?)(?:\s+ORDER|\s+PRIMARY|\s+SAMPLE|\s+$)/i);
		const partitionBy = partitionMatch?.[1]?.trim();

		const orderMatch = createStatement.match(/ORDER BY\s*\(([^)]+)\)/i);
		const sortingKey = orderMatch?.[1]?.split(',').map((s) => s.trim());

		const primaryMatch = createStatement.match(/PRIMARY KEY\s*\(([^)]+)\)/i);
		const primaryKey = primaryMatch?.[1]?.split(',').map((s) => s.trim());

		return {
			name: tableName,
			database: this.config.database,
			engine,
			columns,
			primaryKey,
			sortingKey,
			partitionBy
		};
	}

	/**
	 * @description 检查表是否存在
	 */
	async tableExists(tableName: string): Promise<boolean> {
		const sql = `EXISTS TABLE ${tableName}`;
		const result = await this.query<{ result: number }>(sql);
		return result.data[0]?.result === 1;
	}

	/**
	 * @description 创建表
	 */
	async createTable(schema: ClickHouseTableSchema): Promise<void> {
		const columnsDef = schema.columns
			.map((col) => {
				let def = `${col.name} ${col.type}`;
				if (col.default !== undefined) {
					def += ` DEFAULT ${col.default}`;
				}
				if (col.comment) {
					def += ` COMMENT '${col.comment}'`;
				}
				return def;
			})
			.join(',\n  ');

		let sql = `CREATE TABLE IF NOT EXISTS ${schema.name} (\n  ${columnsDef}\n) ENGINE = ${schema.engine}`;

		if (schema.partitionBy) {
			sql += `\nPARTITION BY ${schema.partitionBy}`;
		}

		if (schema.sortingKey && schema.sortingKey.length > 0) {
			sql += `\nORDER BY (${schema.sortingKey.join(', ')})`;
		}

		if (schema.primaryKey && schema.primaryKey.length > 0) {
			sql += `\nPRIMARY KEY (${schema.primaryKey.join(', ')})`;
		}

		await this.command(sql);

		if (this.config.debug) {
			this.logger.debug(`表创建完成: ${schema.name}`);
		}
	}

	/**
	 * @description 删除表
	 */
	async dropTable(tableName: string): Promise<void> {
		await this.command(`DROP TABLE IF EXISTS ${tableName}`);
		this.logger.debug(`表已删除: ${tableName}`);
	}

	/**
	 * @description 截断表
	 */
	async truncateTable(tableName: string): Promise<void> {
		await this.command(`TRUNCATE TABLE IF EXISTS ${tableName}`);
		this.logger.debug(`表已截断: ${tableName}`);
	}

	/**
	 * @description 健康检查
	 */
	async ping(): Promise<boolean> {
		try {
			const response = await this.fetchWithTimeout(this.baseUrl, {
				method: 'GET',
				headers: this.defaultHeaders
			});
			return response.ok;
		} catch {
			return false;
		}
	}

	/**
	 * @description 关闭连接
	 */
	async close(): Promise<void> {
		this.logger.debug('ClickHouse 客户端已关闭');
	}

	/**
	 * @description 构建请求 URL
	 */
	private buildUrl(options?: ClickHouseQueryOptions): string {
		const params = new URLSearchParams();

		if (options?.timeout) {
			params.set('max_execution_time', String(Math.ceil(options.timeout / 1000)));
		}

		if (options?.settings) {
			for (const [key, value] of Object.entries(options.settings)) {
				params.set(key, String(value));
			}
		}

		const queryString = params.toString();
		return queryString ? `${this.baseUrl}?${queryString}` : this.baseUrl;
	}

	/**
	 * @description 带超时的 fetch
	 */
	private async fetchWithTimeout(url: string, options: RequestInit, timeout?: number): Promise<Response> {
		const timeoutMs = timeout ?? this.config.queryTimeout ?? 60000;

		const controller = new AbortController();
		const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

		try {
			const response = await fetch(url, {
				...options,
				signal: controller.signal
			});
			return response;
		} finally {
			clearTimeout(timeoutId);
		}
	}
}
