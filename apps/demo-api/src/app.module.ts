import { env, registerAppConfig } from '@oksai/config';
import { setupLoggerModule } from '@oksai/logger';
import { Module } from '@nestjs/common';

const appConfig = registerAppConfig('app', () => ({
	port: env.int('PORT', { defaultValue: 3000 }),
	nodeEnv: env.string('NODE_ENV', { defaultValue: 'development' }),
	logLevel: env.string('LOG_LEVEL', { defaultValue: 'info' }),
}));

@Module({
	imports: [
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
				userId: (req as any).userId,
			}),
		}),
	],
})
export class AppModule {
	static register() {
		return {
			module: AppModule,
			imports: [AppModule],
		};
	}
}
