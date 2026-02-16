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
		return `欢迎使用 Platform API！当前环境：${env}`;
	}
}

