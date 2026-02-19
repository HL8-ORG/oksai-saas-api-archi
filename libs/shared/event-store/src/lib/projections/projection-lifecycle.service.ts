import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ProjectionOrchestrator } from './projection-orchestrator';

/**
 * @description 投影生命周期服务
 *
 * 负责在应用启动时启动投影实时同步，
 * 在应用关闭时停止实时同步
 */
@Injectable()
export class ProjectionLifecycleService implements OnModuleInit, OnModuleDestroy {
	private readonly logger = new Logger(ProjectionLifecycleService.name);

	constructor(private readonly orchestrator: ProjectionOrchestrator) {}

	async onModuleInit(): Promise<void> {
		this.logger.log('初始化投影生命周期服务');

		try {
			await this.orchestrator.startRealtimeSync();
			this.logger.log('投影实时同步已自动启动');
		} catch (error) {
			this.logger.error('投影实时同步启动失败', {
				error: error instanceof Error ? error.message : String(error)
			});
		}
	}

	async onModuleDestroy(): Promise<void> {
		this.logger.log('销毁投影生命周期服务');

		try {
			await this.orchestrator.stopRealtimeSync();
			this.logger.log('投影实时同步已停止');
		} catch (error) {
			this.logger.error('投影实时同步停止失败', {
				error: error instanceof Error ? error.message : String(error)
			});
		}
	}
}
