/**
 * @description 租户读模型端口（CQRS 查询侧）
 *
 * 强约束：
 * - 读模型只做读优化，禁止反向修改聚合
 * - 查询必须显式带 tenantId（多租户隔离）
 */
export interface ITenantReadModel {
	/**
	 * @description 按 tenantId 查询租户概要信息
	 * @param tenantId - 租户标识
	 */
	findByTenantId(tenantId: string): Promise<{ tenantId: string; name: string } | null>;
}

/**
 * @description 租户读模型注入 Token
 */
export const OKSAI_TENANT_READ_MODEL_TOKEN = Symbol.for('oksai:tenant:readModel');

