import { AbilityBuilder, createMongoAbility } from '@casl/ability';
import { Injectable, Inject } from '@nestjs/common';
import { OksaiRequestContextService } from '@oksai/context';
import type { AppAbility, AppAbilityBuilder } from './ability.types';
import { OKSAI_ROLE_RESOLVER_TOKEN, type IRoleResolver } from '../ports/role-resolver.port';

/**
 * @description CASL Ability 工厂
 *
 * 强约束：
 * - tenantId/userId 必须来自 CLS（@oksai/context）
 * - Ability 的条件必须绑定 tenantId（用于租户域资源）
 */
@Injectable()
export class AbilityFactory {
	constructor(
		private readonly ctx: OksaiRequestContextService,
		@Inject(OKSAI_ROLE_RESOLVER_TOKEN) private readonly roleResolver: IRoleResolver
	) {}

	/**
	 * @description 为当前请求上下文创建 Ability
	 *
	 * 注意事项：
	 * - 未登录（无 userId）时：返回空权限 Ability
	 */
	async createForRequest(): Promise<AppAbility> {
		const userId = this.ctx.getUserId();
		const tenantId = this.ctx.getTenantId();

		const builder: AppAbilityBuilder = new AbilityBuilder<AppAbility>(createMongoAbility);

		if (!userId) {
			return builder.build();
		}

		// 平台角色
		const platformRoles = await this.roleResolver.getPlatformRoles({ userId });
		if (platformRoles.includes('PlatformAdmin')) {
			builder.can('manage', 'Platform');
		}

		// 租户角色（仅当上下文存在 tenantId）
		if (tenantId) {
			const tenantRoles = await this.roleResolver.getTenantRoles({ tenantId, userId });
			if (tenantRoles.includes('TenantOwner') || tenantRoles.includes('TenantAdmin')) {
				// 管理租户域资源（按 tenantId 绑定）
				builder.can('manage', 'Tenant', { tenantId });
			} else if (tenantRoles.includes('TenantMember')) {
				builder.can('read', 'Tenant', { tenantId });
			}
		}

		return builder.build();
	}
}
