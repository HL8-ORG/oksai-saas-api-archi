import { DynamicModule, Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import type { Auth } from 'better-auth';
import { OksaiRequestContextService } from '@oksai/context';
import { AuthContextInterceptor } from './auth-context.interceptor';
import { BetterAuthController } from './better-auth.controller';
import { OKSAI_BETTER_AUTH_TOKEN } from './tokens';
import { AuthSessionGuard } from './guards/auth-session.guard';

/**
 * 认证模块配置选项
 *
 * 用于配置 Better Auth 集成的各项参数
 *
 * @example
 * ```typescript
 * const options: SetupAuthModuleOptions = {
 *   isGlobal: true,
 *   secret: process.env.BETTER_AUTH_SECRET,
 *   baseURL: 'https://api.example.com',
 *   trustedOrigins: ['https://app.example.com']
 * };
 * ```
 */
export interface SetupAuthModuleOptions {
	/**
	 * 是否注册为全局模块
	 *
	 * @description 全局模块时，其提供的 Provider 在所有模块中可用
	 * @default false
	 */
	isGlobal?: boolean;

	/**
	 * Better Auth 密钥
	 *
	 * @description 用于加密会话令牌和生成签名
	 * 生产环境必须使用至少 32 位的随机字符串
	 * @default process.env.BETTER_AUTH_SECRET 或开发用固定值
	 */
	secret?: string;

	/**
	 * 服务基础 URL
	 *
	 * @description 用于 Better Auth 生成回调 URL、重定向地址等
	 * 生产环境建议由配置系统统一管理并校验
	 * @default process.env.BETTER_AUTH_BASE_URL 或 'http://localhost:3001'
	 */
	baseURL?: string;

	/**
	 * 受信任的来源列表
	 *
	 * @description 用于 CORS/Origin 校验，防止跨站请求伪造
	 * 支持配置多个来源，以逗号分隔
	 * @default [baseURL] 或 process.env.BETTER_AUTH_TRUSTED_ORIGINS 解析结果
	 */
	trustedOrigins?: string[];
}

/**
 * 装配认证模块（Better Auth 适配层）
 *
 * 该模块将 Better Auth 集成到 NestJS(Fastify) 中，实现以下功能：
 * - 提供 `/api/auth/*` 路由的统一处理
 * - 在鉴权成功后将 userId 写入 CLS（请求上下文服务）
 * - 支持通过 Outbox 模式发布认证相关集成事件
 *
 * @param options - 模块配置选项
 * @returns NestJS 动态模块，包含 Controller、Guard、Interceptor 和 Provider
 *
 * @example
 * ```typescript
 * // 在 AppModule 中使用
 * @Module({
 *   imports: [
 *     setupAuthModule({
 *       isGlobal: true,
 *       secret: process.env.BETTER_AUTH_SECRET,
 *       baseURL: process.env.API_BASE_URL
 *     })
 *   ]
 * })
 * export class AppModule {}
 * ```
 *
 * @see {@link SetupAuthModuleOptions} 配置选项详情
 */
export function setupAuthModule(options: SetupAuthModuleOptions = {}): DynamicModule {
	const secret = options.secret ?? String(process.env.BETTER_AUTH_SECRET ?? 'dev_secret_dev_secret_dev_secret_dev_32');
	const baseURL = options.baseURL ?? String(process.env.BETTER_AUTH_BASE_URL ?? 'http://localhost:3001');
	const trustedOrigins =
		options.trustedOrigins ??
		String(process.env.BETTER_AUTH_TRUSTED_ORIGINS ?? baseURL)
			.split(',')
			.map((s) => s.trim())
			.filter(Boolean);

	return {
		module: class OksaiAuthModule {},
		global: options.isGlobal ?? false,
		imports: [],
		controllers: [BetterAuthController],
		providers: [
			{
				provide: OKSAI_BETTER_AUTH_TOKEN,
				useFactory: async (): Promise<Auth> => {
					// 注意：better-auth/* 为 ESM 导出；CJS 运行时必须使用 dynamic import
					const minimal = await import('better-auth/minimal');
					const memory = await import('better-auth/adapters/memory');

					// 注意：MemoryAdapter 的模型名为单数（user/session/account/verification）
					const memoryDb: Record<string, unknown[]> = {
						user: [],
						session: [],
						account: [],
						verification: []
					};

					return minimal.betterAuth({
						database: memory.memoryAdapter(memoryDb as any),
						secret,
						baseURL,
						trustedOrigins,
						// 最小可用：启用邮箱+密码
						emailAndPassword: { enabled: true }
					} as any);
				}
			},
			AuthSessionGuard,
			{
				provide: APP_INTERCEPTOR,
				useFactory: (ctx: OksaiRequestContextService, a: Auth) => new AuthContextInterceptor(ctx, a),
				inject: [OksaiRequestContextService, OKSAI_BETTER_AUTH_TOKEN]
			}
		],
		exports: [OKSAI_BETTER_AUTH_TOKEN, AuthSessionGuard]
	};
}

/**
 * Oksai 认证模块
 *
 * 空壳模块类，实际模块由 {@link setupAuthModule} 函数动态创建
 *
 * @see {@link setupAuthModule} 使用该函数创建配置好的认证模块
 */
@Module({})
export class OksaiAuthModule {}

