import { Module } from '@nestjs/common';
import { OksaiPlatformModule, registerPlugins, resolvePluginsFromEnv } from '@oksai/app-kit';
import { setupAuthModule } from '@oksai/auth';
import { setupAuthorizationModule, OKSAI_ROLE_RESOLVER_TOKEN } from '@oksai/authorization';
import { env, registerAppConfig } from '@oksai/config';
import { IdentityModule, PgRoleResolver } from '@oksai/identity';
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
			// 启用数据库（用于 EventStore/Outbox/Projection）
			database: {},
			messagingPostgres: {},
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
		setupAuthModule({ isGlobal: false }),
		setupAuthorizationModule({
			isGlobal: false,
			imports: [IdentityModule.init({ persistence: 'eventStore' })],
			roleResolverProvider: { provide: OKSAI_ROLE_RESOLVER_TOKEN, useExisting: PgRoleResolver }
		}),
		TenantModule.init({ persistence: 'eventStore' })
	],
	controllers: [AppController, TenantController, DebugController],
	providers: [AppService]
})
export class AppModule {}

