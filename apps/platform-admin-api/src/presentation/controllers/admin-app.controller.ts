import { Controller, Get, UseGuards } from '@nestjs/common';
import { CheckPolicies, PoliciesGuard } from '@oksai/authorization';
import { AuthSessionGuard } from '@oksai/auth';

/**
 * @description 管理端基础控制器（健康检查/诊断入口）
 */
@Controller()
export class AdminAppController {
	/**
	 * @description 健康检查（管理端）
	 */
	@Get('health')
	health(): { status: 'ok' } {
		return { status: 'ok' };
	}

	/**
	 * @description 管理端保护接口示例（用于验证 CASL 守卫链路）
	 */
	@Get('protected/ping')
	@UseGuards(AuthSessionGuard, PoliciesGuard)
	@CheckPolicies((ability) => ability.can('manage', 'Platform'))
	ping(): { ok: true } {
		return { ok: true };
	}
}

