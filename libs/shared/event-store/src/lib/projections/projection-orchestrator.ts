import { Injectable, Logger } from '@nestjs/common';
import type { StoredEvent, IEventStore } from '../event-store.interface';
import { ProjectionBase } from './projection.base';
import type { IProjection } from './interfaces/projection.interface';
import { ProjectionStatus, type ProjectionRuntimeStatus } from './interfaces/projection.interface';

/**
 * @description 投影编排器配置
 */
export interface ProjectionOrchestratorConfig {
	/**
	 * 是否在启动时自动重建投影
	 *
	 * 默认值：false
	 */
	autoRebuildOnStart?: boolean;

	/**
	 * 事件分发失败时的重试次数
	 *
	 * 默认值：3
	 */
	dispatchRetryCount?: number;

	/**
	 * 事件分发失败时的重试延迟（毫秒）
	 *
	 * 默认值：1000
	 */
	dispatchRetryDelayMs?: number;

	/**
	 * 是否启用并行分发
	 *
	 * 默认值：false（保证顺序）
	 */
	enableParallelDispatch?: boolean;

	/**
	 * 批量处理大小
	 *
	 * 默认值：100
	 */
	batchSize?: number;
}

/**
 * @description 投影编排器
 *
 * 管理所有投影的生命周期和实时同步：
 * - 投影注册和发现
 * - 事件分发和路由
 * - 投影状态管理
 * - 投影重建
 */
@Injectable()
export class ProjectionOrchestrator {
	private readonly logger = new Logger(ProjectionOrchestrator.name);
	private readonly projections: Map<string, IProjection> = new Map();
	private readonly config: Required<ProjectionOrchestratorConfig>;
	private _isRunning = false;
	private _unsubscribe?: () => void;

	constructor(
		private readonly eventStore: IEventStore,
		config?: ProjectionOrchestratorConfig
	) {
		this.config = {
			autoRebuildOnStart: config?.autoRebuildOnStart ?? false,
			dispatchRetryCount: config?.dispatchRetryCount ?? 3,
			dispatchRetryDelayMs: config?.dispatchRetryDelayMs ?? 1000,
			enableParallelDispatch: config?.enableParallelDispatch ?? false,
			batchSize: config?.batchSize ?? 100
		};
	}

	/**
	 * @description 获取运行状态
	 */
	get isRunning(): boolean {
		return this._isRunning;
	}

	/**
	 * @description 获取已注册的投影数量
	 */
	get projectionCount(): number {
		return this.projections.size;
	}

	/**
	 * @description 注册投影
	 *
	 * @param projection - 投影实例
	 */
	registerProjection(projection: IProjection): void {
		if (this.projections.has(projection.name)) {
			this.logger.warn(`投影 "${projection.name}" 已存在，将被覆盖`);
		}

		this.projections.set(projection.name, projection);

		// 如果是 ProjectionBase，设置事件存储
		if (projection instanceof ProjectionBase) {
			projection.setEventStore(this.eventStore);
		}

		this.logger.log(`投影 "${projection.name}" 已注册，订阅事件：${projection.subscribedEvents.join(', ')}`);
	}

	/**
	 * @description 批量注册投影
	 *
	 * @param projections - 投影实例数组
	 */
	registerProjections(projections: IProjection[]): void {
		for (const projection of projections) {
			this.registerProjection(projection);
		}
	}

	/**
	 * @description 取消注册投影
	 *
	 * @param name - 投影名称
	 */
	unregisterProjection(name: string): boolean {
		const removed = this.projections.delete(name);
		if (removed) {
			this.logger.log(`投影 "${name}" 已取消注册`);
		}
		return removed;
	}

	/**
	 * @description 获取投影
	 *
	 * @param name - 投影名称
	 */
	getProjection(name: string): IProjection | undefined {
		return this.projections.get(name);
	}

	/**
	 * @description 获取所有投影
	 */
	getAllProjections(): IProjection[] {
		return Array.from(this.projections.values());
	}

	/**
	 * @description 启动实时同步
	 */
	async startRealtimeSync(): Promise<void> {
		if (this._isRunning) {
			this.logger.warn('投影编排器已在运行');
			return;
		}

		if (!this.eventStore.subscribe) {
			throw new Error('事件存储不支持订阅功能');
		}

		// 如果配置了自动重建，先重建所有投影
		if (this.config.autoRebuildOnStart) {
			await this.rebuildAll();
		}

		// 订阅事件总线
		this._unsubscribe = this.eventStore.subscribe(async (event: StoredEvent) => {
			await this.dispatchEvent(event);
		});

		this._isRunning = true;
		this.logger.log('投影实时同步已启动', {
			projectionCount: this.projections.size
		});
	}

	/**
	 * @description 停止实时同步
	 */
	async stopRealtimeSync(): Promise<void> {
		if (!this._isRunning) {
			return;
		}

		if (this._unsubscribe) {
			this._unsubscribe();
			this._unsubscribe = undefined;
		}

		this._isRunning = false;
		this.logger.log('投影实时同步已停止');
	}

	/**
	 * @description 分发事件到订阅的投影
	 *
	 * @param event - 存储的事件
	 */
	async dispatchEvent(event: StoredEvent): Promise<void> {
		const interestedProjections = this.findInterestedProjections(event.eventType);

		if (interestedProjections.length === 0) {
			return;
		}

		const dispatchToProjection = async (projection: IProjection): Promise<void> => {
			for (let attempt = 1; attempt <= this.config.dispatchRetryCount; attempt++) {
				try {
					await projection.handle(event);
					return;
				} catch (error) {
					const errorMessage = error instanceof Error ? error.message : String(error);

					if (attempt < this.config.dispatchRetryCount) {
						this.logger.warn(
							`投影 "${projection.name}" 处理事件失败，准备重试 (${attempt}/${this.config.dispatchRetryCount})`,
							{
								eventType: event.eventType,
								eventId: event.aggregateId,
								error: errorMessage
							}
						);
						await this.sleep(this.config.dispatchRetryDelayMs * attempt);
					} else {
						this.logger.error(`投影 "${projection.name}" 处理事件失败，已达最大重试次数`, {
							eventType: event.eventType,
							eventId: event.aggregateId,
							error: errorMessage
						});
					}
				}
			}
		};

		if (this.config.enableParallelDispatch) {
			// 并行分发
			await Promise.all(interestedProjections.map(dispatchToProjection));
		} else {
			// 顺序分发（保证顺序）
			for (const projection of interestedProjections) {
				await dispatchToProjection(projection);
			}
		}
	}

	/**
	 * @description 重建所有投影
	 */
	async rebuildAll(): Promise<void> {
		this.logger.log('开始重建所有投影', {
			projectionCount: this.projections.size
		});

		const results: { name: string; success: boolean; error?: string }[] = [];

		for (const [name, projection] of this.projections) {
			try {
				await projection.rebuild();
				results.push({ name, success: true });
				this.logger.log(`投影 "${name}" 重建完成`);
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : String(error);
				results.push({ name, success: false, error: errorMessage });
				this.logger.error(`投影 "${name}" 重建失败`, {
					error: errorMessage
				});
			}
		}

		const successCount = results.filter((r) => r.success).length;
		const failCount = results.filter((r) => !r.success).length;

		this.logger.log('所有投影重建完成', {
			successCount,
			failCount,
			results
		});
	}

	/**
	 * @description 重建指定投影
	 *
	 * @param name - 投影名称
	 */
	async rebuildProjection(name: string): Promise<void> {
		const projection = this.projections.get(name);
		if (!projection) {
			throw new Error(`投影 "${name}" 不存在`);
		}

		this.logger.log(`开始重建投影 "${name}"`);
		await projection.rebuild();
		this.logger.log(`投影 "${name}" 重建完成`);
	}

	/**
	 * @description 获取所有投影状态
	 */
	async getAllProjectionStatuses(): Promise<ProjectionRuntimeStatus[]> {
		const statuses: ProjectionRuntimeStatus[] = [];

		for (const projection of this.projections.values()) {
			statuses.push(await projection.getStatus());
		}

		return statuses;
	}

	/**
	 * @description 获取指定投影状态
	 *
	 * @param name - 投影名称
	 */
	async getProjectionStatus(name: string): Promise<ProjectionRuntimeStatus | null> {
		const projection = this.projections.get(name);
		if (!projection) {
			return null;
		}
		return projection.getStatus();
	}

	/**
	 * @description 暂停指定投影
	 *
	 * @param name - 投影名称
	 */
	async pauseProjection(name: string): Promise<void> {
		const projection = this.projections.get(name);
		if (!projection) {
			throw new Error(`投影 "${name}" 不存在`);
		}

		if (projection.pause) {
			await projection.pause();
			this.logger.log(`投影 "${name}" 已暂停`);
		}
	}

	/**
	 * @description 恢复指定投影
	 *
	 * @param name - 投影名称
	 */
	async resumeProjection(name: string): Promise<void> {
		const projection = this.projections.get(name);
		if (!projection) {
			throw new Error(`投影 "${name}" 不存在`);
		}

		if (projection.resume) {
			await projection.resume();
			this.logger.log(`投影 "${name}" 已恢复`);
		}
	}

	/**
	 * @description 查找订阅指定事件类型的投影
	 *
	 * @param eventType - 事件类型
	 */
	private findInterestedProjections(eventType: string): IProjection[] {
		const interested: IProjection[] = [];

		for (const projection of this.projections.values()) {
			if (projection.subscribedEvents.includes(eventType)) {
				interested.push(projection);
			}
		}

		return interested;
	}

	/**
	 * @description 睡眠函数
	 */
	private sleep(ms: number): Promise<void> {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}
}
