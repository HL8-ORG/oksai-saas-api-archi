/**
 * @description "租户必填"守卫选项
 *
 * 说明：
 * - 守卫默认只对 `@TenantRequired()` 标记的路由生效
 * - 你也可以通过 `defaultRequired=true` 让"默认全局必填"，并通过 `ignoredPaths` 放行公开路由
 * - `requiredPaths` 用于"仅这些路由必填"的白名单模式
 */
export interface OksaiTenantRequiredOptions {
	/**
	 * @description 默认是否要求 tenantId（默认 false）
	 *
	 * - false：仅当路由被 `@TenantRequired()` 标记时要求 tenantId
	 * - true：除 `ignoredPaths` 外，所有路由默认都要求 tenantId
	 */
	defaultRequired?: boolean;

	/**
	 * @description 仅当路径命中时要求 tenantId（可选）
	 *
	 * 规则：
	 * - 以 `^` 开头：按正则表达式匹配（RegExp）
	 * - 其他：按前缀匹配（startsWith）
	 *
	 * 注意：若设置了该项，会优先生效（未命中则不要求）。
	 */
	requiredPaths?: string[];

	/**
	 * @description 当 defaultRequired=true 时的放行路径（可选）
	 *
	 * 规则同 requiredPaths。
	 */
	ignoredPaths?: string[];
}

/**
 * @description Oksai TenantRequired options DI token
 */
export const OKSAI_TENANT_REQUIRED_OPTIONS_TOKEN = Symbol.for('oksai:context:tenantRequiredOptions');
