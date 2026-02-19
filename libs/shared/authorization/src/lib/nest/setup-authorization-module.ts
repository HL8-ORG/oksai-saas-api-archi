import { DynamicModule, type ModuleMetadata } from '@nestjs/common';
import { AbilityFactory } from '../ability/ability.factory';
import { OKSAI_ROLE_RESOLVER_TOKEN, type IRoleResolver } from '../ports/role-resolver.port';

export interface SetupAuthorizationModuleOptions {
	/**
	 * @description 是否注册为全局模块（默认 false）
	 */
	isGlobal?: boolean;

	/**
	 * @description 额外 imports（用于把 roleResolver 所在模块引入到本模块作用域）
	 */
	imports?: ModuleMetadata['imports'];

	/**
	 * @description 角色解析器实现（由应用侧提供）
	 */
	roleResolver?: IRoleResolver;

	/**
	 * @description 角色解析器 Provider（优先使用）
	 */
	roleResolverProvider?:
		| { provide: typeof OKSAI_ROLE_RESOLVER_TOKEN; useExisting: unknown }
		| { provide: typeof OKSAI_ROLE_RESOLVER_TOKEN; useValue: IRoleResolver };
}

/**
 * @description 装配授权模块（CASL）
 *
 * 说明：
 * - 该模块仅提供 AbilityFactory 与角色解析端口的绑定
 * - Guard/Decorator 由应用侧按需使用（M13 会在 app 中启用）
 */
export function setupAuthorizationModule(options: SetupAuthorizationModuleOptions): DynamicModule {
	const provider =
		options.roleResolverProvider ??
		(options.roleResolver
			? {
					provide: OKSAI_ROLE_RESOLVER_TOKEN,
					useValue: options.roleResolver
				}
			: null);

	if (!provider) {
		throw new Error('装配配置错误：setupAuthorizationModule 必须提供 roleResolver 或 roleResolverProvider。');
	}

	return {
		module: class OksaiAuthorizationModule {},
		global: options.isGlobal ?? false,
		imports: options.imports ?? [],
		providers: [AbilityFactory, provider as any],
		exports: [AbilityFactory, OKSAI_ROLE_RESOLVER_TOKEN]
	};
}
