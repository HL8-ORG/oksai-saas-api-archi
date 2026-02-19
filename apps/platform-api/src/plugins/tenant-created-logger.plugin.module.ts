import { Inject, Logger, Module } from '@nestjs/common';
import { OksaiCorePlugin, type IOnPluginBootstrap, type IOnPluginDestroy } from '@oksai/plugin';
import {
	IntegrationEventEnvelope,
	OKSAI_EVENT_BUS_TOKEN,
	OKSAI_INBOX_TOKEN,
	type Disposable,
	type IEventBus,
	type IInbox
} from '@oksai/messaging';

/**
 * @description
 * TenantCreated 日志插件：订阅 TenantCreated 事件并打印日志（示例）。
 *
 * 用途：
 * - 验证插件可通过事件订阅扩展平台能力
 * - 验证平台级事件总线（@oksai/app-kit 装配）可被插件共享
 */
@OksaiCorePlugin({
	imports: [],
	providers: [],
	exports: [],
	extensions: () => ({
		name: 'tenantCreatedLogger'
	})
})
@Module({})
export class TenantCreatedLoggerPluginModule implements IOnPluginBootstrap, IOnPluginDestroy {
	private readonly logger = new Logger(TenantCreatedLoggerPluginModule.name);
	private disposable: Disposable | null = null;

	constructor(
		@Inject(OKSAI_EVENT_BUS_TOKEN) private readonly eventBus: IEventBus,
		@Inject(OKSAI_INBOX_TOKEN) private readonly inbox: IInbox
	) {}

	async onPluginBootstrap(): Promise<void> {
		this.disposable = await this.eventBus.subscribe('TenantCreated', async (event: any) => {
			// 期望收到的是 IntegrationEventEnvelope
			const envelope =
				event instanceof IntegrationEventEnvelope ? event : (event as IntegrationEventEnvelope<any>);
			const messageId = String(envelope?.messageId ?? '');
			if (!messageId) {
				this.logger.warn('收到 TenantCreated 事件但缺少 messageId，已跳过（无法做幂等去重）。');
				return;
			}

			// 幂等去重：同一个 messageId 只处理一次
			if (await this.inbox.isProcessed(messageId)) {
				this.logger.log(`跳过重复消息：messageId=${messageId}`);
				return;
			}

			const payload = envelope.payload ?? {};
			const aggregateId = String((payload as any)?.aggregateId ?? 'unknown');
			const tenantId = String(envelope.tenantId ?? 'unknown');
			const name = String((payload as any)?.eventData?.name ?? 'unknown');
			this.logger.log(
				`收到 TenantCreated 集成事件：messageId=${messageId}，tenantId=${tenantId}，aggregateId=${aggregateId}，name=${name}`
			);

			await this.inbox.markProcessed(messageId);
		});
		this.logger.log('TenantCreatedLogger 插件已订阅 TenantCreated 事件。');
	}

	async onPluginDestroy(): Promise<void> {
		await this.disposable?.dispose();
		this.disposable = null;
		this.logger.log('TenantCreatedLogger 插件已取消订阅。');
	}
}
