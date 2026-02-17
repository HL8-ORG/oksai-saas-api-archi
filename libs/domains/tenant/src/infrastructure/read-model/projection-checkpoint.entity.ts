import { Entity, PrimaryKey, Property } from '@mikro-orm/core';

/**
 * @description 投影水位表（用于重放/追赶）
 *
 * 说明：
 * - 每个 projectionName 一条记录
 * - 当前用 messageId 作为最小水位标识（后续可演进为 (aggregateId, version)）
 */
@Entity({ tableName: 'projection_checkpoints' })
export class ProjectionCheckpointEntity {
	@PrimaryKey({ fieldName: 'projection_name' })
	projectionName!: string;

	@Property({ fieldName: 'last_message_id', nullable: true })
	lastMessageId?: string;

	@Property({ fieldName: 'updated_at', nullable: false })
	updatedAt: Date = new Date();
}

