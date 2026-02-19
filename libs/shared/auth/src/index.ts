/**
 * @oksai/auth - 认证模块公共 API
 *
 * 导出 Better Auth 集成所需的所有公共接口、类型和工具函数
 *
 * @module @oksai/auth
 */

// 模块配置
export { setupAuthModule, OksaiAuthModule } from './lib/nest/setup-auth-module';
export type { SetupAuthModuleOptions } from './lib/nest/setup-auth-module';

// 依赖注入令牌
export { OKSAI_BETTER_AUTH_TOKEN } from './lib/nest/tokens';

// 守卫
export { AuthSessionGuard } from './lib/nest/guards/auth-session.guard';

// 拦截器
export { AuthContextInterceptor } from './lib/nest/auth-context.interceptor';

// 控制器
export { BetterAuthController } from './lib/nest/better-auth.controller';

// 工具函数
export { fromNodeHeaders } from './lib/nest/utils/node-headers';

