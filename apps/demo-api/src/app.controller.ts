import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { Logger } from '@oksai/logger';
import { Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppService } from './app.service';

@Controller()
export class AppController {
	constructor(
		@Inject(Logger) private readonly logger: Logger,
		private readonly appService: AppService,
		private readonly config: ConfigService
	) {
		// Logger 上下文会在注入时自动设置
	}

	@Get()
	@HttpCode(HttpStatus.OK)
	getHello(): { message: string; timestamp: string; env: string } {
		this.logger.debug('收到根路径请求');
		const message = this.appService.getHello();
		const env = this.config.get<string>('app.nodeEnv') ?? 'unknown';
		this.logger.debug(`当前环境：${env}`);
		return {
			message,
			timestamp: new Date().toISOString(),
			env,
		};
	}

	@Get('health')
	@HttpCode(HttpStatus.OK)
	getHealth(): { status: string; uptime: number } {
		this.logger.debug('收到健康检查请求');
		const uptime = process.uptime();
		return {
			status: 'ok',
			uptime,
		};
	}

	@Get('config')
	@HttpCode(HttpStatus.OK)
	getConfig(): { port: number; nodeEnv: string; logLevel: string } {
		this.logger.debug('收到配置查看请求');
		const port = this.config.get<number>('app.port') ?? 3000;
		const nodeEnv = this.config.get<string>('app.nodeEnv') ?? 'unknown';
		const logLevel = this.config.get<string>('app.logLevel') ?? 'unknown';
		return {
			port,
			nodeEnv,
			logLevel,
		};
	}
}
