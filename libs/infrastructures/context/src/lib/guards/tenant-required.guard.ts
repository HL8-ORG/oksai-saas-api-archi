import { BadRequestException, CanActivate, ExecutionContext, Inject, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { OksaiRequestContextService } from '../oksai-request-context.service';
import { OKSAI_TENANT_REQUIRED_METADATA_KEY } from '../decorators/tenant-required.decorator';
import { OKSAI_TENANT_REQUIRED_OPTIONS_TOKEN, type OksaiTenantRequiredOptions } from './tenant-required.options';

/**
 * @description 租户必需守卫
 *
 * 功能：
 * - 验证请求上下文中是否存在 tenantId
 * - 如果不存在则抛出 400 Bad Request 异常
 *
 * 使用场景：
 * - 需要租户上下文的业务接口
 * - 防止跨租户访问
 *
 * @example
 * ```ts
 * @Controller('users')
 * @UseGuards(TenantRequiredGuard)
 * export class UsersController {
 *   @Get()
 *   async findAll() {
 *     // 此处一定有 tenantId
 *   }
 * }
 * ```
 */
@Injectable()
export class TenantRequiredGuard implements CanActivate {
	constructor(
		private readonly ctx: OksaiRequestContextService,
		private readonly reflector: Reflector,
		@Inject(OKSAI_TENANT_REQUIRED_OPTIONS_TOKEN) private readonly options: OksaiTenantRequiredOptions = {}
	) {}

	canActivate(context: ExecutionContext): boolean {
		const metadataRequired = this.reflector.getAllAndOverride<boolean>(OKSAI_TENANT_REQUIRED_METADATA_KEY, [
			context.getHandler(),
			context.getClass()
		]);

		// 显式放行（@TenantOptional）
		if (metadataRequired === false) {
			return true;
		}

		const required = this.isTenantRequired(context, metadataRequired);
		if (!required) {
			return true;
		}

		const tenantId = this.ctx.getTenantId();
		if (!tenantId) {
			// 由 @oksai/exceptions 的 NestHttpExceptionFilter 转换为 RFC7807 Problem Details
			throw new BadRequestException('缺少租户标识（tenantId），请在请求头 x-tenant-id 中传入。');
		}
		return true;
	}

	private isTenantRequired(context: ExecutionContext, metadataRequired: boolean | undefined): boolean {
		// 显式要求（@TenantRequired）
		if (metadataRequired === true) return true;

		const req = context.switchToHttp().getRequest() as { url?: unknown } | null | undefined;
		const url = typeof req?.url === 'string' ? req.url : '';
		const path = url.split('?')[0] ?? '';

		const requiredPaths = this.options.requiredPaths ?? [];
		if (requiredPaths.length > 0) {
			return requiredPaths.some((p) => matchPath(p, path));
		}

		const defaultRequired = this.options.defaultRequired ?? false;
		if (!defaultRequired) return false;

		const ignoredPaths = this.options.ignoredPaths ?? [];
		if (ignoredPaths.some((p) => matchPath(p, path))) {
			return false;
		}
		return true;
	}
}

function matchPath(pattern: string, path: string): boolean {
	if (!pattern) return false;
	if (pattern.startsWith('^')) {
		try {
			return new RegExp(pattern).test(path);
		} catch {
			return false;
		}
	}
	return path.startsWith(pattern);
}

/**
 * @description 可选的租户守卫（如果不需要强制要求 tenantId，可以使用这个）
 *
 * @example
 * ```ts
 * @Controller('public')
 * @UseGuards(TenantOptionalGuard)
 * export class PublicController {
 *   @Get()
 *   async getPublicData() {
 *     const tenantId = this.ctx.getTenantId();
 *     // tenantId 可能为空
 *   }
 * }
 * ```
 */
@Injectable()
export class TenantOptionalGuard implements CanActivate {
	constructor(private readonly ctx: OksaiRequestContextService) {}

	canActivate(context: ExecutionContext): boolean {
		return true;
	}
}
