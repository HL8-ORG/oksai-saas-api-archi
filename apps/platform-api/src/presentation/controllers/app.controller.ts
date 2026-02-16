import { Controller, Get, HttpCode, HttpStatus, Inject } from '@nestjs/common';
import { Logger } from '@oksai/logger';
import { ConfigService } from '@nestjs/config';
import { AppService } from '../services/app.service';

@Controller()
export class AppController {
	constructor(
		@Inject(Logger) private readonly logger: Logger,
		private readonly appService: AppService,
		private readonly config: ConfigService
	) {}

	@Get()
	@HttpCode(HttpStatus.OK)
	getHello(): { message: string; timestamp: string; env: string } {
		this.logger.debug('收到根路径请求');
		const message = this.appService.getHello();
		const env = this.config.get<string>('app.nodeEnv') ?? 'unknown';
		return {
			message,
			timestamp: new Date().toISOString(),
			env
		};
	}

	@Get('health')
	@HttpCode(HttpStatus.OK)
	getHealth(): { status: string; uptime: number } {
		this.logger.debug('收到健康检查请求');
		return { status: 'ok', uptime: process.uptime() };
	}
}

