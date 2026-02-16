import { DynamicModule, Module } from '@nestjs/common';
import { setupConfigModule, type SetupConfigModuleOptions } from '@oksai/config';
import { setupLoggerModule } from '@oksai/logger';
import { getOksaiRequestContextFromCurrent, setupOksaiContextModule, type SetupOksaiContextModuleOptions } from '@oksai/context';
import { PluginModule, type PluginInput } from '@oksai/plugin';

export interface SetupOksaiPlatformModuleOptions {
	/**
	 * @description ConfigModule 装配选项（主要是 `load`）
	 */
	config?: SetupConfigModuleOptions;

	/**
	 * @description 请求上下文（CLS）
	 */
	context?: SetupOksaiContextModuleOptions;

	/**
	 * @description 启用的插件列表（启动期装配）
	 */
	plugins?: PluginInput[];

	/**
	 * @description logger 美化输出开关（默认 development=true）
	 */
	prettyLogs?: boolean;
}

/**
 * @description 统一装配 Oksai 平台基础设施模块（给多个 apps 复用）
 *
 * 设计原则：
 * - 只做“装配与组合”，不引入业务模块
 * - 插件以启动期装配方式加载（PluginModule.init）
 */
@Module({})
export class OksaiPlatformModule {
	/**
	 * @description 初始化平台装配模块
	 *
	 * @param options - 装配参数
	 * @returns DynamicModule
	 */
	static init(options: SetupOksaiPlatformModuleOptions = {}): DynamicModule {
		const plugins = options.plugins ?? [];
		const baseConfig = options.config ?? {};
		const pretty = options.prettyLogs ?? ((process.env.NODE_ENV ?? 'development') === 'development');

		return {
			module: OksaiPlatformModule,
			imports: [
				setupOksaiContextModule(options.context),
				setupConfigModule(baseConfig),
				setupLoggerModule({
					pretty,
					customProps: (req) => {
						const anyReq = req as { headers?: Record<string, unknown> } | null | undefined;
						const headers = anyReq?.headers ?? {};
						const header = (name: string): string | undefined => {
							const v = headers[name];
							if (v === undefined || v === null) return undefined;
							return Array.isArray(v) ? String(v[0] ?? '') : String(v);
						};
						const ctx = getOksaiRequestContextFromCurrent();
						return {
							tenantId: ctx.tenantId ?? header('x-tenant-id'),
							locale: ctx.locale ?? header('x-lang'),
							userId: ctx.userId,
							requestId: ctx.requestId
						};
					}
				}),
				PluginModule.init({ plugins })
			],
			exports: [PluginModule]
		};
	}
}

