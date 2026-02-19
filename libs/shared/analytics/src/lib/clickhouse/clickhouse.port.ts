import type {
	ClickHouseConfig,
	ClickHouseQueryOptions,
	ClickHouseQueryResult,
	ClickHouseInsertOptions,
	ClickHouseTableSchema
} from './clickhouse.interface';

/**
 * @description ClickHouse 客户端接口
 *
 * 定义 ClickHouse 操作的基本契约
 */
export interface IClickHouseClient {
	/**
	 * @description 执行查询
	 *
	 * @param sql - SQL 查询语句
	 * @param options - 查询选项
	 * @returns 查询结果
	 */
	query<T = Record<string, unknown>>(
		sql: string,
		options?: ClickHouseQueryOptions
	): Promise<ClickHouseQueryResult<T>>;

	/**
	 * @description 执行批量插入
	 *
	 * @param options - 插入选项
	 */
	insert(options: ClickHouseInsertOptions): Promise<void>;

	/**
	 * @description 执行原始 SQL 命令
	 *
	 * @param sql - SQL 命令
	 * @param options - 执行选项
	 */
	command(sql: string, options?: ClickHouseQueryOptions): Promise<void>;

	/**
	 * @description 获取表结构
	 *
	 * @param tableName - 表名
	 */
	describeTable(tableName: string): Promise<ClickHouseTableSchema>;

	/**
	 * @description 检查表是否存在
	 *
	 * @param tableName - 表名
	 */
	tableExists(tableName: string): Promise<boolean>;

	/**
	 * @description 创建表
	 *
	 * @param schema - 表结构定义
	 */
	createTable(schema: ClickHouseTableSchema): Promise<void>;

	/**
	 * @description 删除表
	 *
	 * @param tableName - 表名
	 */
	dropTable(tableName: string): Promise<void>;

	/**
	 * @description 截断表
	 *
	 * @param tableName - 表名
	 */
	truncateTable(tableName: string): Promise<void>;

	/**
	 * @description 健康检查
	 */
	ping(): Promise<boolean>;

	/**
	 * @description 关闭连接
	 */
	close(): Promise<void>;
}

/**
 * @description 分析存储接口
 *
 * 定义分析数据存储的基本契约
 */
export interface IAnalyticsStore {
	/**
	 * @description 获取客户端配置
	 */
	readonly config: ClickHouseConfig;

	/**
	 * @description 插入分析数据
	 *
	 * @param table - 表名
	 * @param data - 数据列表
	 */
	insertAnalytics<T extends Record<string, unknown>>(table: string, data: T[]): Promise<void>;

	/**
	 * @description 查询分析数据
	 *
	 * @param sql - SQL 查询语句
	 * @param params - 查询参数
	 */
	queryAnalytics<T extends Record<string, unknown>>(sql: string, params?: Record<string, unknown>): Promise<T[]>;

	/**
	 * @description 批量更新分析数据
	 *
	 * 使用 ALTER TABLE UPDATE 或 ReplacingMergeTree
	 *
	 * @param table - 表名
	 * @param data - 更新数据
	 * @param keyColumns - 键列（用于匹配）
	 */
	upsertAnalytics<T extends Record<string, unknown>>(table: string, data: T[], keyColumns: string[]): Promise<void>;

	/**
	 * @description 删除分析数据
	 *
	 * 使用 ALTER TABLE DELETE 或批量删除
	 *
	 * @param table - 表名
	 * @param where - WHERE 条件
	 */
	deleteAnalytics(table: string, where: string): Promise<void>;

	/**
	 * @description 获取健康状态
	 */
	getHealth(): Promise<{
		status: 'healthy' | 'unhealthy';
		latency?: number;
		error?: string;
	}>;
}
