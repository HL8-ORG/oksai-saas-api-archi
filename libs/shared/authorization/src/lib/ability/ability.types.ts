import type { AbilityBuilder, ForcedSubject, MongoAbility } from '@casl/ability';

/**
 * @description 系统内动作枚举（CASL Action）
 */
export type AppAction = 'manage' | 'read' | 'create' | 'update' | 'delete';

/**
 * @description 系统内资源（CASL Subject）
 *
 * 说明：
 * - `Platform`：平台级资源（不绑定 tenantId）
 * - `Tenant`：租户级资源（必须绑定 tenantId）
 * - `Any`：占位，用于扩展其他领域资源
 */
export type AppSubject = 'Platform' | 'Tenant' | 'Any';

export interface TenantScopedResource {
	/**
	 * @description 资源所属租户 ID（强约束：必须来自 CLS）
	 */
	tenantId: string;
}

/**
 * @description 应用内 Subject 联合类型（包含 ForcedSubject，用于给 subject 实例绑定类型）
 *
 * 说明：
 * - `Tenant` 场景必须带 tenantId（强约束：来自 CLS）
 */
export type AppSubjects =
	| AppSubject
	| ForcedSubject<'Platform'>
	| ForcedSubject<'Any'>
	| (ForcedSubject<'Tenant'> & TenantScopedResource);

export type AppAbilityTuple = [AppAction, AppSubjects];

/**
 * @description 应用内统一 Ability 类型
 *
 * 注意事项：
 * - 使用 MongoQuery 语义表达条件（便于 future DB 条件映射）
 */
export type AppAbility = MongoAbility<AppAbilityTuple>;

/**
 * @description AbilityBuilder 的类型别名（便于在 factory 内构建规则）
 */
export type AppAbilityBuilder = AbilityBuilder<AppAbility>;
