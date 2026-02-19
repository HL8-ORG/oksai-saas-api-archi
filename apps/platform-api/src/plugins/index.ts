import type { PluginInput } from '@oksai/plugin';
import { DemoPluginModule } from './demo-plugin.module';
import { TenantCreatedLoggerPluginModule } from './tenant-created-logger.plugin.module';

/**
 * @description 平台可用插件清单（name -> PluginInput）
 *
 * 说明：
 * - 由 AppModule 调用 `registerPlugins(PLATFORM_PLUGINS)` 注册
 * - 由 `PLUGINS_ENABLED` 控制启用哪些插件
 */
export const PLATFORM_PLUGINS: Record<string, PluginInput> = {
	demo: DemoPluginModule,
	tenantCreatedLogger: TenantCreatedLoggerPluginModule
};
