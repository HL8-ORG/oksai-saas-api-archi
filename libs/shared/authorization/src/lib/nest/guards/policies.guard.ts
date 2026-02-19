import {
	CanActivate,
	ExecutionContext,
	ForbiddenException,
	Inject,
	Injectable,
	UnauthorizedException
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { PolicyContext, PolicyHandler } from '../decorators/check-policies.decorator';
import { OKSAI_CHECK_POLICIES_KEY } from '../decorators/check-policies.decorator';
import type { AppAbility } from '../../ability/ability.types';
import { AbilityFactory } from '../../ability/ability.factory';
import { OksaiRequestContextService } from '@oksai/context';

/**
 * @description 策略守卫：根据 @CheckPolicies 声明对当前请求进行 CASL 校验
 */
@Injectable()
export class PoliciesGuard implements CanActivate {
	constructor(
		private readonly reflector: Reflector,
		private readonly abilityFactory: AbilityFactory,
		private readonly ctx: OksaiRequestContextService
	) {}

	async canActivate(context: ExecutionContext): Promise<boolean> {
		const handlers =
			this.reflector.getAllAndOverride<PolicyHandler[]>(OKSAI_CHECK_POLICIES_KEY, [
				context.getHandler(),
				context.getClass()
			]) ?? [];

		// 未声明策略：默认放行（由应用侧决定哪些 controller 必须加策略）
		if (handlers.length === 0) return true;

		const userId = this.ctx.getUserId();
		if (!userId) {
			throw new UnauthorizedException('未登录，无法访问该资源。');
		}

		const ability: AppAbility = await this.abilityFactory.createForRequest();
		const policyContext: PolicyContext = {
			userId,
			tenantId: this.ctx.getTenantId()
		};
		const allowed = handlers.every((handler) => {
			try {
				return handler(ability, policyContext);
			} catch {
				return false;
			}
		});

		if (!allowed) {
			throw new ForbiddenException('权限不足，无法访问该资源。');
		}

		return true;
	}
}
