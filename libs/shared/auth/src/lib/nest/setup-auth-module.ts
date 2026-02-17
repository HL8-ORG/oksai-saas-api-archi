import { DynamicModule, Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import type { Auth } from 'better-auth';
import { OksaiRequestContextService } from '@oksai/context';
import { AuthContextInterceptor } from './auth-context.interceptor';
import { BetterAuthController } from './better-auth.controller';
import { OKSAI_BETTER_AUTH_TOKEN } from './tokens';
import { AuthSessionGuard } from './guards/auth-session.guard';

export interface SetupAuthModuleOptions {
	/**
	 * @description 是否注册为全局模块（默认 false）
	 */
	isGlobal?: boolean;

	/**
	 * @description Better Auth secret（生产必须使用至少 32 位随机串）
	 */
	secret?: string;

	/**
	 * @description baseURL（用于 Better Auth 生成回调 URL 等）
	 *
	 * 注意：此处为最小实现；生产建议由配置系统统一管理并校验。
	 */
	baseURL?: string;

	/**
	 * @description trustedOrigins（CORS/Origin 校验）
	 */
	trustedOrigins?: string[];
}

/**
 * @description
 * 装配认证模块（Better Auth 适配层）。
 *
 * 说明：
 * - 该模块的目标是把 Better Auth 集成到 Nest(Fastify) 中，并在鉴权成功后写入 CLS（userId）。
 * - 由于 Better Auth 的具体路由/handler 形式取决于其 node integration，本模块后续会以官方文档为准完善。
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

@Module({})
export class OksaiAuthModule {}

