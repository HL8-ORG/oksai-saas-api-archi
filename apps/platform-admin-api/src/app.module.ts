import { Module } from '@nestjs/common';
import { OksaiPlatformModule, registerPlugins, resolvePluginsFromEnv } from '@oksai/app-kit';
import { setupAuthModule } from '@oksai/auth';
import { setupAuthorizationModule, OKSAI_ROLE_RESOLVER_TOKEN } from '@oksai/authorization';
import { env, registerAppConfig } from '@oksai/config';
import { IdentityModule, PgRoleResolver } from '@oksai/identity';
import { AdminAppController } from './presentation/controllers/admin-app.controller';

const adminConfig = registerAppConfig('admin', () => ({
	port: env.int('ADMIN_PORT', { defaultValue: 3002 }),
	nodeEnv: env.string('NODE_ENV', { defaultValue: 'development' }),
	logLevel: env.string('LOG_LEVEL', { defaultValue: 'info' })
}));

// 管理端暂不启用插件（后续可通过 PLATFORM_ADMIN_PLUGINS 扩展）
registerPlugins({});
const enabledPlugins = resolvePluginsFromEnv({ envName: 'PLUGINS_ENABLED' });

@Module({
	imports: [
		OksaiPlatformModule.init({
			config: {
				load: [adminConfig]
			},
			// 管理端默认启用数据库能力（后续身份/权限落库需要）
			database: {},
			messagingPostgres: {},
			context: {
				tenantRequired: {
					enabled: true,
					options: {
						// 管理端接口通常不强制 tenantId；具体接口可按需标记强制
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
		})
	],
	controllers: [AdminAppController],
	providers: []
})
export class AppModule {}
