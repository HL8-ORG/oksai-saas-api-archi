import { SetMetadata } from '@nestjs/common';

/**
 * @description 标记当前 Controller / Handler 需要租户上下文（tenantId）
 *
 * 说明：
 * - 需要配合 `TenantRequiredGuard`（推荐通过 `setupOksaiContextModule({ tenantRequired: { enabled: true } })` 全局安装）
 * - 当请求上下文中缺少 tenantId 时，会抛出 400 Bad Request（由异常过滤器转换为 RFC7807 Problem Details）
 *
 * @example
 * ```ts
 * @Controller('orders')
 * @TenantRequired()
 * export class OrderController {
 *   @Get()
 *   async list() {}
 *
 *   @Post()
 *   async create() {}
 * }
 * ```
 */
export function TenantRequired(): ClassDecorator & MethodDecorator {
	// SetMetadata 的类型签名是 string，但底层 Reflect Metadata 支持 symbol。
	// 这里显式 as any，确保运行时 key 仍为 symbol。
	return SetMetadata(OKSAI_TENANT_REQUIRED_METADATA_KEY as any, true);
}

/**
 * @description 显式标记当前 Controller / Handler 不需要租户上下文（tenantId）
 *
 * 使用场景：
 * - 当启用了 `defaultRequired=true` 时，某些公开路由需要明确放行
 * - 当 Controller 级别设置了 `@TenantRequired()`，但个别 Handler 需要放行时
 */
export function TenantOptional(): ClassDecorator & MethodDecorator {
	return SetMetadata(OKSAI_TENANT_REQUIRED_METADATA_KEY as any, false);
}

/**
 * @description "租户必需"元数据 key
 *
 * 说明：使用 Symbol.for 避免跨包/多版本冲突。
 */
export const OKSAI_TENANT_REQUIRED_METADATA_KEY = Symbol.for('oksai:context:tenantRequired');
