import { DynamicModule, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { setupOksaiClsModule, type SetupOksaiClsModuleOptions } from './setup-cls-module';
import { OksaiRequestContextService } from './oksai-request-context.service';
import { TenantRequiredGuard } from './guards/tenant-required.guard';
import { OKSAI_TENANT_REQUIRED_OPTIONS_TOKEN, type OksaiTenantRequiredOptions } from './guards/tenant-required.options';

export interface SetupOksaiContextModuleOptions extends SetupOksaiClsModuleOptions {
	/**
	 * @description "租户必填"能力装配
	 *
	 * 说明：
	 * - 启用后会全局安装 `TenantRequiredGuard`
	 * - 仅当路由使用 `@TenantRequired()` 标记时才会强制要求 tenantId（默认不影响公开接口）
	 */
	tenantRequired?: {
		enabled?: boolean;
		options?: OksaiTenantRequiredOptions;
	};
}

/**
 * @description 一键装配 Oksai 请求上下文模块（CLS + Service）
 *
 * @param options - 装配选项
 * @returns DynamicModule
 */
export function setupOksaiContextModule(options: SetupOksaiContextModuleOptions = {}): DynamicModule {
	const { tenantRequired, ...clsOptions } = options;
	const tenantRequiredEnabled = tenantRequired?.enabled ?? true;
	const tenantRequiredOptions: OksaiTenantRequiredOptions = tenantRequired?.options ?? {};

	return {
		module: OksaiContextModule,
		imports: [setupOksaiClsModule(clsOptions)],
		providers: [
			OksaiRequestContextService,
			...(tenantRequiredEnabled
				? [
						{
							provide: OKSAI_TENANT_REQUIRED_OPTIONS_TOKEN,
							useValue: tenantRequiredOptions
						},
						{
							provide: APP_GUARD,
							useClass: TenantRequiredGuard
						}
					]
				: [])
		],
		exports: [OksaiRequestContextService]
	};
}

@Module({})
export class OksaiContextModule {}
