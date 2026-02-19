import { Logger } from '@nestjs/common';
import { MikroORM } from '@mikro-orm/core';
import type { AggregateRoot, AuditInfo } from '@oksai/event-store';
import type {
	IFullAggregateMetadata,
	AnalyzableExtension,
	AIEnabledExtension,
	SyncableExtension
} from '../interfaces/aggregate-metadata.interface';

/**
 * @description 聚合根元数据提取器接口
 *
 * 各 bounded context 需要实现此接口以支持元数据投影
 */
export interface IAggregateMetadataExtractor<TAggregate extends AggregateRoot> {
	/**
	 * @description 获取聚合类型标识
	 */
	getAggregateType(): string;

	/**
	 * @description 从聚合根提取租户 ID
	 */
	getTenantId(aggregate: TAggregate): string;

	/**
	 * @description 从聚合根提取聚合 ID
	 */
	getAggregateId(aggregate: TAggregate): string;

	/**
	 * @description 从聚合根提取可分析扩展（可选）
	 */
	getAnalyzableExtension?(aggregate: TAggregate): AnalyzableExtension | undefined;

	/**
	 * @description 从聚合根提取 AI 能力扩展（可选）
	 */
	getAIEnabledExtension?(aggregate: TAggregate): AIEnabledExtension | undefined;

	/**
	 * @description 从聚合根提取可同步扩展（可选）
	 */
	getSyncableExtension?(aggregate: TAggregate): SyncableExtension | undefined;
}

/**
 * @description 聚合元数据投影更新器
 *
 * 提供统一的元数据表更新能力，各 bounded context 的仓储可以调用此服务
 */
export class AggregateMetadataProjector {
	private readonly logger = new Logger(AggregateMetadataProjector.name);

	constructor(private readonly orm: MikroORM) {}

	/**
	 * @description 从聚合根提取并更新元数据
	 *
	 * @param aggregate - 聚合根
	 * @param extractor - 元数据提取器
	 */
	async project<TAggregate extends AggregateRoot>(
		aggregate: TAggregate,
		extractor: IAggregateMetadataExtractor<TAggregate>
	): Promise<void> {
		const metadata = this.extractMetadata(aggregate, extractor);
		await this.upsertMetadata(metadata);
	}

	/**
	 * @description 批量更新元数据
	 *
	 * @param aggregates - 聚合根数组
	 * @param extractor - 元数据提取器
	 */
	async projectBatch<TAggregate extends AggregateRoot>(
		aggregates: TAggregate[],
		extractor: IAggregateMetadataExtractor<TAggregate>
	): Promise<void> {
		for (const aggregate of aggregates) {
			await this.project(aggregate, extractor);
		}
	}

	/**
	 * @description 从聚合根提取完整元数据
	 */
	private extractMetadata<TAggregate extends AggregateRoot>(
		aggregate: TAggregate,
		extractor: IAggregateMetadataExtractor<TAggregate>
	): IFullAggregateMetadata {
		const auditInfo = aggregate.getAuditInfo();

		const metadata: IFullAggregateMetadata = {
			aggregateType: extractor.getAggregateType(),
			aggregateId: extractor.getAggregateId(aggregate),
			tenantId: extractor.getTenantId(aggregate),
			createdAt: auditInfo.createdAt,
			updatedAt: auditInfo.updatedAt,
			createdBy: auditInfo.createdBy,
			updatedBy: auditInfo.updatedBy,
			deletedAt: auditInfo.deletedAt,
			deletedBy: auditInfo.deletedBy,
			isDeleted: auditInfo.isDeleted
		};

		// 提取可分析扩展
		if (extractor.getAnalyzableExtension) {
			metadata.analyzable = extractor.getAnalyzableExtension(aggregate);
		}

		// 提取 AI 能力扩展
		if (extractor.getAIEnabledExtension) {
			metadata.aiEnabled = extractor.getAIEnabledExtension(aggregate);
		}

		// 提取可同步扩展
		if (extractor.getSyncableExtension) {
			metadata.syncable = extractor.getSyncableExtension(aggregate);
		}

		return metadata;
	}

	/**
	 * @description 更新或插入元数据记录
	 */
	private async upsertMetadata(metadata: IFullAggregateMetadata): Promise<void> {
		const conn = this.orm.em.getConnection();

		const params: any[] = [
			metadata.updatedAt,
			metadata.createdBy ?? null,
			metadata.updatedBy ?? null,
			metadata.deletedAt ?? null,
			metadata.deletedBy ?? null,
			metadata.isDeleted,
			// 可分析扩展
			metadata.analyzable?.tags ?? null,
			metadata.analyzable?.category ?? null,
			metadata.analyzable?.analyticsDimensions ?? null,
			metadata.analyzable?.qualityScore ?? null,
			metadata.analyzable?.includeInAnalytics ?? true,
			// AI 能力扩展
			metadata.aiEnabled?.embeddingStatus ?? null,
			metadata.aiEnabled?.embeddingVersion ?? null,
			metadata.aiEnabled?.embeddingId ?? null,
			metadata.aiEnabled?.aiMetadata ?? null,
			// 可同步扩展
			metadata.syncable?.externalIds ?? null,
			metadata.syncable?.dataSource ?? null,
			metadata.syncable?.syncStatus ?? null,
			metadata.syncable?.lastSyncedAt ?? null,
			metadata.syncable?.syncVersion ?? 1,
			metadata.syncable?.etlMetadata ?? null,
			// 主键
			metadata.tenantId,
			metadata.aggregateType,
			metadata.aggregateId,
			// 创建时间（用于插入）
			metadata.createdAt
		];

		await conn.execute(
			`INSERT INTO aggregate_metadata (
				tenant_id, aggregate_type, aggregate_id, created_at, updated_at,
				created_by, updated_by, deleted_at, deleted_by, is_deleted,
				tags, category, analytics_dimensions, quality_score, include_in_analytics,
				embedding_status, embedding_version, embedding_id, ai_metadata,
				external_ids, data_source, sync_status, last_synced_at, sync_version, etl_metadata
			) VALUES ($21, $22, $23, $24, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
			ON CONFLICT (tenant_id, aggregate_type, aggregate_id) DO UPDATE SET
				updated_at = EXCLUDED.updated_at,
				updated_by = EXCLUDED.updated_by,
				deleted_at = EXCLUDED.deleted_at,
				deleted_by = EXCLUDED.deleted_by,
				is_deleted = EXCLUDED.is_deleted,
				tags = EXCLUDED.tags,
				category = EXCLUDED.category,
				analytics_dimensions = EXCLUDED.analytics_dimensions,
				quality_score = EXCLUDED.quality_score,
				include_in_analytics = EXCLUDED.include_in_analytics,
				embedding_status = EXCLUDED.embedding_status,
				embedding_version = EXCLUDED.embedding_version,
				embedding_id = EXCLUDED.embedding_id,
				ai_metadata = EXCLUDED.ai_metadata,
				external_ids = EXCLUDED.external_ids,
				data_source = EXCLUDED.data_source,
				sync_status = EXCLUDED.sync_status,
				last_synced_at = EXCLUDED.last_synced_at,
				sync_version = EXCLUDED.sync_version,
				etl_metadata = EXCLUDED.etl_metadata`,
			params
		);

		this.logger.debug(
			`已更新元数据: ${metadata.aggregateType}/${metadata.aggregateId} (tenant=${metadata.tenantId})`
		);
	}

	/**
	 * @description 软删除元数据记录
	 *
	 * @param tenantId - 租户 ID
	 * @param aggregateType - 聚合类型
	 * @param aggregateId - 聚合 ID
	 * @param deletedBy - 删除者
	 */
	async softDelete(tenantId: string, aggregateType: string, aggregateId: string, deletedBy?: string): Promise<void> {
		const conn = this.orm.em.getConnection();
		await conn.execute(
			`UPDATE aggregate_metadata 
			SET is_deleted = true, deleted_at = NOW(), deleted_by = $4, updated_at = NOW()
			WHERE tenant_id = $1 AND aggregate_type = $2 AND aggregate_id = $3`,
			[tenantId, aggregateType, aggregateId, deletedBy ?? null]
		);
	}

	/**
	 * @description 恢复软删除的元数据记录
	 *
	 * @param tenantId - 租户 ID
	 * @param aggregateType - 聚合类型
	 * @param aggregateId - 聚合 ID
	 */
	async restore(tenantId: string, aggregateType: string, aggregateId: string): Promise<void> {
		const conn = this.orm.em.getConnection();
		await conn.execute(
			`UPDATE aggregate_metadata 
			SET is_deleted = false, deleted_at = null, deleted_by = null, updated_at = NOW()
			WHERE tenant_id = $1 AND aggregate_type = $2 AND aggregate_id = $3`,
			[tenantId, aggregateType, aggregateId]
		);
	}
}
