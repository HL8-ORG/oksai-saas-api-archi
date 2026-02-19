import { CanActivate, ExecutionContext, Injectable, NotFoundException } from '@nestjs/common';

/**
 * @description
 * 仅开发环境可用的守卫（用于调试接口）。
 *
 * 规则：
 * - 当 `NODE_ENV=development` 时放行
 * - 当 `DEBUG_ROUTES_ENABLED=true` 时放行（用于临时诊断）
 * - 否则返回 404（避免泄露调试接口存在性）
 */
@Injectable()
export class DevOnlyGuard implements CanActivate {
	canActivate(_context: ExecutionContext): boolean {
		const nodeEnv = (process.env.NODE_ENV ?? 'development').trim();
		if (nodeEnv === 'development') return true;

		const enabled = String(process.env.DEBUG_ROUTES_ENABLED ?? '')
			.trim()
			.toLowerCase();
		if (enabled === 'true') return true;

		throw new NotFoundException('未找到资源。');
	}
}
