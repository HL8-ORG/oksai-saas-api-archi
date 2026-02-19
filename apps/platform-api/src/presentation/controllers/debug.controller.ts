import { Body, Controller, HttpCode, HttpStatus, Inject, Post, UseGuards } from '@nestjs/common';
import { OKSAI_OUTBOX_TOKEN, createIntegrationEventEnvelope, type IOutbox } from '@oksai/messaging';
import { TenantOptional } from '@oksai/context';
import { PublishIntegrationEventDto } from '../dto/publish-integration-event.dto';
import { DevOnlyGuard } from '../guards/dev-only.guard';

/**
 * @description 调试控制器（仅用于开发验证）
 *
 * 注意事项：
 * - 生产环境应禁用或加鉴权
 */
@Controller('debug')
@TenantOptional()
@UseGuards(DevOnlyGuard)
export class DebugController {
	constructor(@Inject(OKSAI_OUTBOX_TOKEN) private readonly outbox: IOutbox) {}

	/**
	 * @description 发布集成事件（用于验证 Inbox 幂等）
	 */
	@Post('events')
	@HttpCode(HttpStatus.ACCEPTED)
	async publishEvent(@Body() body: PublishIntegrationEventDto): Promise<{ accepted: true; messageId: string }> {
		const envelope = createIntegrationEventEnvelope(body.eventType, body.payload, { messageId: body.messageId });
		await this.outbox.append(envelope);
		return { accepted: true, messageId: envelope.messageId };
	}
}
