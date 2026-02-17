import { Module } from '@nestjs/common';
import { OksaiPlatformModule, registerPlugins, resolvePluginsFromEnv } from '@oksai/app-kit';
import { env, registerAppConfig } from '@oksai/config';
import { TenantModule } from '@oksai/tenant';
import { AppController } from './presentation/controllers/app.controller';
import { DebugController } from './presentation/controllers/debug.controller';
import { TenantController } from './presentation/controllers/tenant.controller';
import { AppService } from './presentation/services/app.service';
import { PLATFORM_PLUGINS } from './plugins';

const appConfig = registerAppConfig('app', () => ({
	port: env.int('PORT', { defaultValue: 3001 }),
	nodeEnv: env.string('NODE_ENV', { defaultValue: 'development' }),
	logLevel: env.string('LOG_LEVEL', { defaultValue: 'info' })
}));

// 注册可用插件清单（name -> module）
registerPlugins(PLATFORM_PLUGINS);
const enabledPlugins = resolvePluginsFromEnv();

@Module({
	imports: [
		OksaiPlatformModule.init({
			config: {
				load: [appConfig]
			},
			context: {
				tenantRequired: {
					enabled: true,
					options: {
						// 默认不强制；需要 tenantId 的接口用 @TenantRequired() 标记
						defaultRequired: false,
						requiredPaths: []
					}
				}
			},
			plugins: enabledPlugins
		}),
		TenantModule
	],
	controllers: [AppController, TenantController, DebugController],
	providers: [AppService]
})
export class AppModule {}

