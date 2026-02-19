import { Injectable, Inject } from '@nestjs/common';
import { Logger } from '@oksai/logger';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AppService {
	constructor(
		@Inject(Logger) private readonly logger: Logger,
		private readonly config: ConfigService
	) {
		this.logger.log('AppService 初始化完成');
	}

	getHello(): string {
		this.logger.debug('生成问候消息');
		const env = this.config.get<string>('app.nodeEnv') ?? 'development';
		return `欢迎使用 Oksai SaaS 平台 API！当前环境：${env}`;
	}

	getStatus(): { status: string; version: string } {
		this.logger.debug('获取应用状态');
		return {
			status: 'running',
			version: '0.1.0'
		};
	}

	getEnvInfo(): { nodeEnv: string; logLevel: string; port: number } {
		this.logger.debug('获取环境信息');
		const nodeEnv = this.config.get<string>('app.nodeEnv') ?? 'unknown';
		const logLevel = this.config.get<string>('app.logLevel') ?? 'unknown';
		const port = this.config.get<number>('app.port') ?? 3000;
		return {
			nodeEnv,
			logLevel,
			port
		};
	}
}
