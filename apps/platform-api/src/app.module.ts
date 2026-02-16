import { Module } from '@nestjs/common';
import { env, registerAppConfig, setupConfigModule } from '@oksai/config';
import { setupLoggerModule } from '@oksai/logger';
import { setupOksaiContextModule } from '@oksai/context';
import { TenantModule } from '@oksai/tenant';
import { AppController } from './presentation/controllers/app.controller';
import { TenantController } from './presentation/controllers/tenant.controller';
import { AppService } from './presentation/services/app.service';

const appConfig = registerAppConfig('app', () => ({
	port: env.int('PORT', { defaultValue: 3001 }),
	nodeEnv: env.string('NODE_ENV', { defaultValue: 'development' }),
	logLevel: env.string('LOG_LEVEL', { defaultValue: 'info' })
}));

@Module({
	imports: [
		setupConfigModule({
			load: [appConfig]
		}),
		setupOksaiContextModule({
			tenantRequired: {
				enabled: true,
				options: {
					defaultRequired: false,
					requiredPaths: []
				}
			}
		}),
		setupLoggerModule({
			level: process.env.LOG_LEVEL ?? 'info',
			pretty: (process.env.NODE_ENV ?? 'development') === 'development',
			prettyOptions: {
				colorize: true,
				timeFormat: 'HH:MM:ss.l',
				singleLine: false,
				errorLikeObjectKeys: ['err', 'error'],
				ignore: 'pid,hostname'
			},
			customProps: (req) => ({
				tenantId: (req as any).tenantId,
				userId: (req as any).userId
			})
		}),
		TenantModule
	],
	controllers: [AppController, TenantController],
	providers: [AppService]
})
export class AppModule {}

