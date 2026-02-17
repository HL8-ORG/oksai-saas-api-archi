/**
 * @description 创建 Tenant subject 实例（用于 ability.can 条件匹配）
 *
 * 强约束：
 * - tenantId 必须来自 CLS（调用方不得使用客户端透传覆盖）
 */
export function makeTenantSubject(tenantId: string): { __caslSubjectType__: 'Tenant'; tenantId: string } {
	return { __caslSubjectType__: 'Tenant', tenantId };
}

