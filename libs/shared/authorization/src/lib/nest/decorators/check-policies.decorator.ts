import { SetMetadata } from '@nestjs/common';
import type { AppAbility } from '../../ability/ability.types';

export const OKSAI_CHECK_POLICIES_KEY = 'oksai:authorization:checkPolicies';

export interface PolicyContext {
	tenantId?: string;
	userId?: string;
}

export type PolicyHandler = (ability: AppAbility, context: PolicyContext) => boolean;

/**
 * @description 声明接口访问策略（CASL）
 *
 * @example
 * ```ts
 * @CheckPolicies((ability) => ability.can('manage', 'Platform'))
 * ```
 */
export const CheckPolicies = (...handlers: PolicyHandler[]) => SetMetadata(OKSAI_CHECK_POLICIES_KEY, handlers);
