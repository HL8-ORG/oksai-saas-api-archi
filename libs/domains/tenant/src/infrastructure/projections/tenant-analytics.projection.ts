import { Injectable, Logger } from '@nestjs/common';
import { ProjectionBase } from '@oksai/event-store';
import type { StoredEvent, IEventStore } from '@oksai/event-store';
import type { TenantAnalyticsReadModel, ITenantAnalyticsRepository } from '../read-model/tenant-analytics.read-model';

/**
 * @description 租户分析投影
 *
 * 将租户事件转换为优化的分析读模型。
 * 支持多维度分析：成员统计、活跃度、数据使用等。
 *
 * 订阅事件：
 * - TenantCreated：创建租户分析记录
 * - TenantActivated：更新状态为激活
 * - TenantSuspended：更新状态为暂停
 * - MemberAdded：增加成员计数
 * - MemberRemoved：减少成员计数
 */
@Injectable()
export class TenantAnalyticsProjection extends ProjectionBase<TenantAnalyticsReadModel> {
	private readonly logger = new Logger(TenantAnalyticsProjection.name);

	readonly name = 'TenantAnalyticsProjection';
	readonly subscribedEvents = ['TenantCreated', 'TenantActivated', 'TenantSuspended', 'MemberAdded', 'MemberRemoved'];

	constructor(private readonly analyticsRepo: ITenantAnalyticsRepository) {
		super();
	}

	/**
	 * @description 设置事件存储（用于重建）
	 */
	setEventStoreForRebuild(eventStore: IEventStore): void {
		this.setEventStore(eventStore);
	}

	/**
	 * @description 处理事件
	 */
	protected async handleEvent(event: StoredEvent): Promise<void> {
		this.logger.debug(`处理事件: ${event.eventType}`, {
			tenantId: event.tenantId,
			aggregateId: event.aggregateId
		});

		switch (event.eventType) {
			case 'TenantCreated':
				await this.handleTenantCreated(event);
				break;
			case 'TenantActivated':
				await this.handleTenantActivated(event);
				break;
			case 'TenantSuspended':
				await this.handleTenantSuspended(event);
				break;
			case 'MemberAdded':
				await this.handleMemberAdded(event);
				break;
			case 'MemberRemoved':
				await this.handleMemberRemoved(event);
				break;
			default:
				this.logger.warn(`未处理的事件类型: ${event.eventType}`);
		}
	}

	/**
	 * @description 处理租户创建事件
	 */
	private async handleTenantCreated(event: StoredEvent): Promise<void> {
		const payload = event.eventData as { name: string };
		const name = String(payload?.name ?? '').trim();

		const readModel: TenantAnalyticsReadModel = {
			tenantId: event.tenantId,
			name,
			status: 'active',
			memberCount: 0,
			activeUserCount: 0,
			dataImportCount: 0,
			analysisCount: 0,
			createdAt: event.occurredAt,
			updatedAt: event.occurredAt,
			lastActiveAt: event.occurredAt
		};

		await this.analyticsRepo.upsert(readModel);

		this.logger.log(`租户分析记录已创建`, {
			tenantId: event.tenantId,
			name
		});
	}

	/**
	 * @description 处理租户激活事件
	 */
	private async handleTenantActivated(event: StoredEvent): Promise<void> {
		await this.analyticsRepo.updateStatus(event.tenantId, 'active');
		await this.analyticsRepo.updateLastActiveAt(event.tenantId, event.occurredAt);

		this.logger.log(`租户已激活`, {
			tenantId: event.tenantId
		});
	}

	/**
	 * @description 处理租户暂停事件
	 */
	private async handleTenantSuspended(event: StoredEvent): Promise<void> {
		await this.analyticsRepo.updateStatus(event.tenantId, 'suspended');

		this.logger.log(`租户已暂停`, {
			tenantId: event.tenantId
		});
	}

	/**
	 * @description 处理成员添加事件
	 */
	private async handleMemberAdded(event: StoredEvent): Promise<void> {
		await this.analyticsRepo.incrementMemberCount(event.tenantId, 1);
		await this.analyticsRepo.updateLastActiveAt(event.tenantId, event.occurredAt);

		this.logger.log(`成员已添加`, {
			tenantId: event.tenantId
		});
	}

	/**
	 * @description 处理成员移除事件
	 */
	private async handleMemberRemoved(event: StoredEvent): Promise<void> {
		await this.analyticsRepo.incrementMemberCount(event.tenantId, -1);

		this.logger.log(`成员已移除`, {
			tenantId: event.tenantId
		});
	}

	/**
	 * @description 清空读模型
	 */
	protected async clearReadModels(): Promise<void> {
		await this.analyticsRepo.clear();
		this.logger.log('租户分析读模型已清空');
	}

	/**
	 * @description 获取读模型
	 */
	getReadModels(): Promise<TenantAnalyticsReadModel[]> {
		return this.analyticsRepo.findAll();
	}
}
