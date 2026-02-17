/**
 * @description __CONTEXT__ 读模型端口（CQRS 查询侧）（模板）
 *
 * 强约束：
 * - 查询必须显式带 tenantId（多租户隔离）
 */
export interface I__CONTEXT__ReadModel {
	findByTenantId(tenantId: string): Promise<{ tenantId: string; name: string } | null>;
}

export const OKSAI___CONTEXT___READ_MODEL_TOKEN = Symbol.for('oksai:__context__:readModel');

