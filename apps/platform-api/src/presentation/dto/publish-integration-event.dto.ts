import { IsObject, IsOptional, IsString } from 'class-validator';

/**
 * @description 发布集成事件（调试用）DTO
 *
 * 注意事项：
 * - 仅用于验证插件订阅 + Inbox 幂等行为
 * - 生产环境应禁用或进行严格鉴权
 */
export class PublishIntegrationEventDto {
	@IsString()
	eventType!: string;

	@IsOptional()
	@IsString()
	messageId?: string;

	@IsObject()
	payload!: Record<string, unknown>;
}
