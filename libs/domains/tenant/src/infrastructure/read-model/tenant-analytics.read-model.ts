/**
 * @description 租户分析读模型
 *
 * 存储租户的分析统计数据，用于数据分析平台
 */
export interface TenantAnalyticsReadModel {
	/**
	 * 租户 ID
	 */
	tenantId: string;

	/**
	 * 租户名称
	 */
	name: string;

	/**
	 * 租户状态
	 */
	status: 'active' | 'suspended' | 'pending';

	/**
	 * 成员数量
	 */
	memberCount: number;

	/**
	 * 活跃用户数
	 */
	activeUserCount: number;

	/**
	 * 数据导入次数
	 */
	dataImportCount: number;

	/**
	 * 分析查询次数
	 */
	analysisCount: number;

	/**
	 * 创建时间
	 */
	createdAt: Date;

	/**
	 * 更新时间
	 */
	updatedAt: Date;

	/**
	 * 最后活跃时间
	 */
	lastActiveAt?: Date;
}

/**
 * @description 租户分析读模型仓库接口
 */
export interface ITenantAnalyticsRepository {
	/**
	 * 保存或更新租户分析读模型
	 */
	upsert(model: TenantAnalyticsReadModel): Promise<void>;

	/**
	 * 根据 ID 获取租户分析读模型
	 */
	findById(tenantId: string): Promise<TenantAnalyticsReadModel | null>;

	/**
	 * 获取所有租户分析读模型
	 */
	findAll(): Promise<TenantAnalyticsReadModel[]>;

	/**
	 * 增加成员计数
	 */
	incrementMemberCount(tenantId: string, delta: number): Promise<void>;

	/**
	 * 增加数据导入计数
	 */
	incrementDataImportCount(tenantId: string, delta: number): Promise<void>;

	/**
	 * 增加分析查询计数
	 */
	incrementAnalysisCount(tenantId: string, delta: number): Promise<void>;

	/**
	 * 更新租户状态
	 */
	updateStatus(tenantId: string, status: TenantAnalyticsReadModel['status']): Promise<void>;

	/**
	 * 更新最后活跃时间
	 */
	updateLastActiveAt(tenantId: string, lastActiveAt: Date): Promise<void>;

	/**
	 * 清空所有读模型
	 */
	clear(): Promise<void>;
}
