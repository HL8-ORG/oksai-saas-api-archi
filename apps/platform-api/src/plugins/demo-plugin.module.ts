import { Injectable, Logger, Module } from '@nestjs/common';
import { OksaiCorePlugin, type IOnPluginBootstrap, type IOnPluginDestroy } from '@oksai/plugin';

@Injectable()
class DemoPluginService {
	private readonly logger = new Logger(DemoPluginService.name);

	hello() {
		this.logger.log('DemoPluginService 已就绪。');
	}
}

/**
 * @description 平台演示插件（用于验证插件装配与生命周期）
 */
@OksaiCorePlugin({
	imports: [],
	providers: [DemoPluginService],
	exports: [DemoPluginService],
	extensions: () => ({
		name: 'demo'
	})
})
@Module({})
export class DemoPluginModule implements IOnPluginBootstrap, IOnPluginDestroy {
	private readonly logger = new Logger(DemoPluginModule.name);

	constructor(private readonly svc: DemoPluginService) {}

	async onPluginBootstrap(): Promise<void> {
		this.logger.log('Demo 插件启动中...');
		this.svc.hello();
		this.logger.log('Demo 插件启动完成。');
	}

	async onPluginDestroy(): Promise<void> {
		this.logger.log('Demo 插件销毁完成。');
	}
}

