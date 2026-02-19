/**
 * @description ClickHouse 连接配置
 */
export interface ClickHouseConfig {
	/**
	 * 主机地址
	 *
	 * 默认值：'localhost'
	 */
	host: string;

	/**
	 * 端口号
	 *
	 * 默认值：8123（HTTP）或 9000（Native）
	 */
	port: number;

	/**
	 * 数据库名称
	 *
	 * 默认值：'default'
	 */
	database: string;

	/**
	 * 用户名
	 *
	 * 默认值：'default'
	 */
	username: string;

	/**
	 * 密码
	 */
	password: string;

	/**
	 * 协议类型
	 *
	 * - 'http': HTTP 协议（推荐，支持负载均衡）
	 * - 'https': HTTPS 协议（安全连接）
	 * - 'native': 原生 TCP 协议（性能更好）
	 *
	 * 默认值：'http'
	 */
	protocol?: 'http' | 'https' | 'native';

	/**
	 * 连接超时（毫秒）
	 *
	 * 默认值：30000
	 */
	connectTimeout?: number;

	/**
	 * 查询超时（毫秒）
	 *
	 * 默认值：60000
	 */
	queryTimeout?: number;

	/**
	 * 最大连接数
	 *
	 * 默认值：10
	 */
	maxConnections?: number;

	/**
	 * 是否启用压缩
	 *
	 * 默认值：true
	 */
	compress?: boolean;

	/**
	 * 是否启用调试日志
	 *
	 * 默认值：false
	 */
	debug?: boolean;
}

/**
 * @description ClickHouse 查询选项
 */
export interface ClickHouseQueryOptions {
	/**
	 * 查询超时（毫秒）
	 */
	timeout?: number;

	/**
	 * 是否使用异步模式
	 */
	async?: boolean;

	/**
	 * 查询 ID（用于追踪）
	 */
	queryId?: string;

	/**
	 * 设置参数
	 */
	settings?: Record<string, string | number | boolean>;

	/**
	 * 是否格式化输出
	 */
	format?: string;
}

/**
 * @description ClickHouse 查询结果
 */
export interface ClickHouseQueryResult<T = Record<string, unknown>> {
	/**
	 * 查询数据
	 */
	data: T[];

	/**
	 * 查询元数据
	 */
	meta?: Array<{
		name: string;
		type: string;
	}>;

	/**
	 * 行数
	 */
	rows: number;

	/**
	 * 统计信息
	 */
	statistics?: {
		elapsed: number;
		rows_read: number;
		bytes_read: number;
	};

	/**
	 * 查询 ID
	 */
	queryId?: string;
}

/**
 * @description ClickHouse 批量插入选项
 */
export interface ClickHouseInsertOptions {
	/**
	 * 表名
	 */
	table: string;

	/**
	 * 数据
	 */
	values: Record<string, unknown>[];

	/**
	 * 列名列表（可选，默认从数据中推断）
	 */
	columns?: string[];

	/**
	 * 是否覆盖已有数据
	 */
	override?: boolean;
}

/**
 * @description ClickHouse 表结构
 */
export interface ClickHouseTableSchema {
	/**
	 * 表名
	 */
	name: string;

	/**
	 * 数据库名
	 */
	database: string;

	/**
	 * 引擎类型
	 */
	engine: string;

	/**
	 * 列定义
	 */
	columns: ClickHouseColumnSchema[];

	/**
	 * 主键
	 */
	primaryKey?: string[];

	/**
	 * 排序键
	 */
	sortingKey?: string[];

	/**
	 * 分区键
	 */
	partitionBy?: string;

	/**
	 * 分片键（分布式表）
	 */
	shardingKey?: string;
}

/**
 * @description ClickHouse 列结构
 */
export interface ClickHouseColumnSchema {
	/**
	 * 列名
	 */
	name: string;

	/**
	 * 列类型
	 */
	type: string;

	/**
	 * 默认值
	 */
	default?: string;

	/**
	 * 是否可为空
	 */
	nullable?: boolean;

	/**
	 * 注释
	 */
	comment?: string;
}
