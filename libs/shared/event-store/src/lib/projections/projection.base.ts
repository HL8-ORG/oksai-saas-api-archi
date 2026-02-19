import type { StoredEvent, IEventStore, EventFilter } from '../event-store.interface';
import {
	IProjection,
	ProjectionStatus,
	ProjectionRuntimeStatus,
	ProjectionConfig,
	DEFAULT_PROJECTION_CONFIG
} from './interfaces/projection.interface';

/**
 * @description 投影抽象基类
 *
 * 提供投影的通用能力：
 * - 事件处理和分发
 * - 状态管理
 * - 错误处理和重试
 * - 投影重建
 *
 * @template TReadModel - 读模型类型
 *
 * @example
 * ```typescript
 * export class TenantAnalyticsProjection extends ProjectionBase<TenantAnalyticsReadModel> {
 *   readonly name = 'TenantAnalyticsProjection';
 *   readonly subscribedEvents = ['TenantCreated', 'TenantActivated', 'MemberAdded'];
 *
 *   protected async handleEvent(event: StoredEvent): Promise<void> {
 *     switch (event.eventType) {
 *       case 'TenantCreated':
 *         await this.handleTenantCreated(event);
 *         break;
 *       // ... 其他事件处理
 *     }
 *   }
 *
 *   private async handleTenantCreated(event: StoredEvent): Promise<void> {
 *     // 处理逻辑
 *   }
 * }
 * ```
 */
export abstract class ProjectionBase<TReadModel = unknown> implements IProjection<TReadModel> {
	/**
	 * 投影名称（必须唯一）
	 */
	abstract readonly name: string;

	/**
	 * 订阅的事件类型列表
	 */
	abstract readonly subscribedEvents: string[];

	/**
	 * 投影配置
	 */
	protected readonly config: Required<ProjectionConfig>;

	/**
	 * 当前状态
	 */
	protected _status: ProjectionStatus = ProjectionStatus.NOT_INITIALIZED;

	/**
	 * 已处理事件数量
	 */
	protected _processedEventCount = 0;

	/**
	 * 错误计数
	 */
	protected _errorCount = 0;

	/**
	 * 最后错误信息
	 */
	protected _lastError?: string;

	/**
	 * 最后错误时间
	 */
	protected _lastErrorAt?: Date;

	/**
	 * 最后处理的事件 ID
	 */
	protected _lastProcessedEventId?: string;

	/**
	 * 最后处理的事件版本
	 */
	protected _lastProcessedVersion?: number;

	/**
	 * 最后处理时间
	 */
	protected _lastProcessedAt?: Date;

	/**
	 * 投影创建时间
	 */
	protected _createdAt: Date;

	/**
	 * 投影更新时间
	 */
	protected _updatedAt: Date;

	/**
	 * 事件存储（用于重建）
	 */
	protected eventStore?: IEventStore;

	constructor(config?: Partial<ProjectionConfig>) {
		this.config = {
			...DEFAULT_PROJECTION_CONFIG,
			...config,
			name: config?.name ?? this.constructor.name
		};
		this._createdAt = new Date();
		this._updatedAt = new Date();
	}

	/**
	 * @description 设置事件存储（用于重建）
	 */
	setEventStore(eventStore: IEventStore): void {
		this.eventStore = eventStore;
	}

	/**
	 * @description 处理单个事件
	 *
	 * 包含事件过滤、错误处理和重试逻辑
	 *
	 * @param event - 存储的事件
	 */
	async handle(event: StoredEvent): Promise<void> {
		// 检查是否订阅此事件类型
		if (!this.subscribedEvents.includes(event.eventType)) {
			return;
		}

		// 检查投影状态
		if (this._status === ProjectionStatus.PAUSED || this._status === ProjectionStatus.STOPPED) {
			return;
		}

		this._status = ProjectionStatus.RUNNING;

		try {
			await this.handleWithRetry(event);

			// 更新处理进度
			this._processedEventCount++;
			this._lastProcessedEventId = event.aggregateId;
			this._lastProcessedVersion = event.version;
			this._lastProcessedAt = new Date();
			this._updatedAt = new Date();
		} catch (error) {
			this._errorCount++;
			this._lastError = error instanceof Error ? error.message : String(error);
			this._lastErrorAt = new Date();
			this._updatedAt = new Date();

			// 如果错误次数过多，标记为错误状态
			if (this._errorCount >= this.config.maxRetries * 3) {
				this._status = ProjectionStatus.ERROR;
			}

			throw error;
		}
	}

	/**
	 * @description 带重试的事件处理
	 */
	private async handleWithRetry(event: StoredEvent): Promise<void> {
		let lastError: Error | null = null;
		let attempt = 0;

		while (attempt < this.config.maxRetries) {
			try {
				await this.handleEvent(event);
				return;
			} catch (error) {
				lastError = error instanceof Error ? error : new Error(String(error));
				attempt++;

				if (attempt < this.config.maxRetries) {
					// 等待重试延迟
					await this.sleep(this.config.retryDelayMs * attempt);
				}
			}
		}

		throw lastError;
	}

	/**
	 * @description 处理事件（子类实现）
	 *
	 * 子类必须实现此方法以处理订阅的事件
	 *
	 * @param event - 存储的事件
	 */
	protected abstract handleEvent(event: StoredEvent): Promise<void>;

	/**
	 * @description 重建整个投影
	 *
	 * 清空现有读模型，从头开始处理所有事件
	 */
	async rebuild(): Promise<void> {
		if (!this.eventStore) {
			throw new Error('事件存储未设置，无法重建投影');
		}

		if (!this.eventStore.streamAllEvents) {
			throw new Error('事件存储不支持流式加载，无法重建投影');
		}

		this._status = ProjectionStatus.INITIALIZING;
		this._processedEventCount = 0;
		this._errorCount = 0;
		this._lastError = undefined;
		this._lastErrorAt = undefined;
		this._updatedAt = new Date();

		try {
			// 清空现有读模型
			await this.clearReadModels();

			// 构建事件过滤器
			const filter: EventFilter = {
				eventTypes: this.subscribedEvents,
				batchSize: this.config.batchSize
			};

			// 流式处理所有事件
			for await (const event of this.eventStore.streamAllEvents(filter)) {
				await this.handleEvent(event);
				this._processedEventCount++;
			}

			this._status = ProjectionStatus.RUNNING;
			this._updatedAt = new Date();
		} catch (error) {
			this._status = ProjectionStatus.ERROR;
			this._lastError = error instanceof Error ? error.message : String(error);
			this._lastErrorAt = new Date();
			throw error;
		}
	}

	/**
	 * @description 清空读模型（子类实现）
	 *
	 * 在重建投影时调用
	 */
	protected async clearReadModels(): Promise<void> {
		// 子类可以覆盖此方法以清空读模型
	}

	/**
	 * @description 获取投影状态
	 */
	async getStatus(): Promise<ProjectionRuntimeStatus> {
		return {
			name: this.name,
			status: this._status,
			lastProcessedEventId: this._lastProcessedEventId,
			lastProcessedVersion: this._lastProcessedVersion,
			lastProcessedAt: this._lastProcessedAt,
			processedEventCount: this._processedEventCount,
			errorCount: this._errorCount,
			lastError: this._lastError,
			lastErrorAt: this._lastErrorAt,
			createdAt: this._createdAt,
			updatedAt: this._updatedAt
		};
	}

	/**
	 * @description 暂停投影
	 */
	async pause(): Promise<void> {
		this._status = ProjectionStatus.PAUSED;
		this._updatedAt = new Date();
	}

	/**
	 * @description 恢复投影
	 */
	async resume(): Promise<void> {
		if (this._status === ProjectionStatus.PAUSED) {
			this._status = ProjectionStatus.RUNNING;
			this._updatedAt = new Date();
		}
	}

	/**
	 * @description 停止投影
	 */
	async stop(): Promise<void> {
		this._status = ProjectionStatus.STOPPED;
		this._updatedAt = new Date();
	}

	/**
	 * @description 获取读模型（子类实现）
	 */
	getReadModels?(filter?: Record<string, unknown>): Promise<TReadModel[]>;

	/**
	 * @description 睡眠函数
	 */
	protected sleep(ms: number): Promise<void> {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}
}
