import { IntegrationEventEnvelope } from '@oksai/messaging';
import { ContextAwareEventBus } from './context-aware-event-bus';

/**
 * @description ContextAwareEventBus 单元测试
 *
 * 测试覆盖：
 * - 上下文传递（从 CLS 补齐 tenantId/userId/requestId）
 * - 事件发布（普通事件和 IntegrationEventEnvelope）
 * - 订阅代理
 */

// Mock @oksai/context 模块
jest.mock('@oksai/context', () => ({
	getOksaiRequestContextFromCurrent: jest.fn()
}));

// 导入 mock 后的函数
import { getOksaiRequestContextFromCurrent } from '@oksai/context';

const mockGetContext = getOksaiRequestContextFromCurrent as jest.MockedFunction<
	typeof getOksaiRequestContextFromCurrent
>;

describe('ContextAwareEventBus', () => {
	let eventBus: ContextAwareEventBus;
	let mockInner: jest.Mocked<{
		publish: jest.Mock;
		subscribe: jest.Mock;
	}>;

	beforeEach(() => {
		// 重置 mock
		jest.clearAllMocks();

		// 创建 mock 内部事件总线
		mockInner = {
			publish: jest.fn().mockResolvedValue(undefined),
			subscribe: jest.fn().mockResolvedValue({ dispose: jest.fn() })
		};

		eventBus = new ContextAwareEventBus(mockInner as any);
	});

	describe('publish', () => {
		describe('IntegrationEventEnvelope 处理', () => {
			it('应从 CLS 上下文补齐缺失的 tenantId', async () => {
				// Arrange
				mockGetContext.mockReturnValue({
					tenantId: 'tenant-from-cls',
					userId: undefined,
					requestId: undefined
				});

				const envelope = new IntegrationEventEnvelope({
					eventType: 'UserCreated',
					payload: { userId: 'u-1' }
				});

				// Act
				await eventBus.publish(envelope);

				// Assert
				expect(mockInner.publish).toHaveBeenCalledTimes(1);
				const publishedEnvelope = mockInner.publish.mock.calls[0][0];
				expect(publishedEnvelope.tenantId).toBe('tenant-from-cls');
			});

			it('应从 CLS 上下文补齐缺失的 userId', async () => {
				// Arrange
				mockGetContext.mockReturnValue({
					tenantId: undefined,
					userId: 'user-from-cls',
					requestId: undefined
				});

				const envelope = new IntegrationEventEnvelope({
					eventType: 'UserCreated',
					payload: { userId: 'u-1' }
				});

				// Act
				await eventBus.publish(envelope);

				// Assert
				const publishedEnvelope = mockInner.publish.mock.calls[0][0];
				expect(publishedEnvelope.userId).toBe('user-from-cls');
			});

			it('应从 CLS 上下文补齐缺失的 requestId', async () => {
				// Arrange
				mockGetContext.mockReturnValue({
					tenantId: undefined,
					userId: undefined,
					requestId: 'req-from-cls'
				});

				const envelope = new IntegrationEventEnvelope({
					eventType: 'UserCreated',
					payload: { userId: 'u-1' }
				});

				// Act
				await eventBus.publish(envelope);

				// Assert
				const publishedEnvelope = mockInner.publish.mock.calls[0][0];
				expect(publishedEnvelope.requestId).toBe('req-from-cls');
			});

			it('应同时补齐多个缺失的上下文字段', async () => {
				// Arrange
				mockGetContext.mockReturnValue({
					tenantId: 't-001',
					userId: 'u-001',
					requestId: 'req-001'
				});

				const envelope = new IntegrationEventEnvelope({
					eventType: 'OrderCreated',
					payload: { orderId: 'o-1' }
				});

				// Act
				await eventBus.publish(envelope);

				// Assert
				const publishedEnvelope = mockInner.publish.mock.calls[0][0];
				expect(publishedEnvelope.tenantId).toBe('t-001');
				expect(publishedEnvelope.userId).toBe('u-001');
				expect(publishedEnvelope.requestId).toBe('req-001');
			});

			it('不应覆盖 envelope 中已有的 tenantId', async () => {
				// Arrange
				mockGetContext.mockReturnValue({
					tenantId: 'cls-tenant',
					userId: undefined,
					requestId: undefined
				});

				const envelope = new IntegrationEventEnvelope({
					eventType: 'UserCreated',
					payload: { userId: 'u-1' },
					tenantId: 'envelope-tenant'
				});

				// Act
				await eventBus.publish(envelope);

				// Assert
				const publishedEnvelope = mockInner.publish.mock.calls[0][0];
				expect(publishedEnvelope.tenantId).toBe('envelope-tenant');
			});

			it('不应覆盖 envelope 中已有的 userId', async () => {
				// Arrange
				mockGetContext.mockReturnValue({
					tenantId: undefined,
					userId: 'cls-user',
					requestId: undefined
				});

				const envelope = new IntegrationEventEnvelope({
					eventType: 'UserCreated',
					payload: { userId: 'u-1' },
					userId: 'envelope-user'
				});

				// Act
				await eventBus.publish(envelope);

				// Assert
				const publishedEnvelope = mockInner.publish.mock.calls[0][0];
				expect(publishedEnvelope.userId).toBe('envelope-user');
			});

			it('不应覆盖 envelope 中已有的 requestId', async () => {
				// Arrange
				mockGetContext.mockReturnValue({
					tenantId: undefined,
					userId: undefined,
					requestId: 'cls-req'
				});

				const envelope = new IntegrationEventEnvelope({
					eventType: 'UserCreated',
					payload: { userId: 'u-1' },
					requestId: 'envelope-req'
				});

				// Act
				await eventBus.publish(envelope);

				// Assert
				const publishedEnvelope = mockInner.publish.mock.calls[0][0];
				expect(publishedEnvelope.requestId).toBe('envelope-req');
			});

			it('当 CLS 为空时不应补齐任何字段', async () => {
				// Arrange
				mockGetContext.mockReturnValue({});

				const envelope = new IntegrationEventEnvelope({
					eventType: 'UserCreated',
					payload: { userId: 'u-1' }
				});

				// Act
				await eventBus.publish(envelope);

				// Assert
				const publishedEnvelope = mockInner.publish.mock.calls[0][0];
				expect(publishedEnvelope.tenantId).toBeUndefined();
				expect(publishedEnvelope.userId).toBeUndefined();
				expect(publishedEnvelope.requestId).toBeUndefined();
			});

			it('应保留 envelope 的其他字段（eventType、payload、schemaVersion 等）', async () => {
				// Arrange
				mockGetContext.mockReturnValue({});

				const customDate = new Date('2024-01-01T00:00:00Z');
				const envelope = new IntegrationEventEnvelope({
					eventType: 'CustomEvent',
					payload: { data: 'test' },
					schemaVersion: 2,
					messageId: 'custom-msg-id',
					occurredAt: customDate
				});

				// Act
				await eventBus.publish(envelope);

				// Assert
				const publishedEnvelope = mockInner.publish.mock.calls[0][0];
				expect(publishedEnvelope.eventType).toBe('CustomEvent');
				expect(publishedEnvelope.payload).toEqual({ data: 'test' });
				expect(publishedEnvelope.schemaVersion).toBe(2);
				expect(publishedEnvelope.messageId).toBe('custom-msg-id');
				expect(publishedEnvelope.occurredAt).toBe(customDate);
			});
		});

		describe('普通事件处理', () => {
			it('应直接发布非 IntegrationEventEnvelope 的事件', async () => {
				// Arrange
				mockGetContext.mockReturnValue({
					tenantId: 't-001',
					userId: 'u-001',
					requestId: 'req-001'
				});

				const plainEvent = { type: 'PlainEvent', data: 'test' };

				// Act
				await eventBus.publish(plainEvent);

				// Assert
				expect(mockInner.publish).toHaveBeenCalledTimes(1);
				expect(mockInner.publish).toHaveBeenCalledWith(plainEvent);
			});

			it('发布普通事件时不应修改事件对象', async () => {
				// Arrange
				mockGetContext.mockReturnValue({ tenantId: 't-001' });

				const plainEvent = { type: 'PlainEvent', data: 'original' };

				// Act
				await eventBus.publish(plainEvent);

				// Assert
				expect(mockInner.publish).toHaveBeenCalledWith(plainEvent);
				expect(plainEvent).toEqual({ type: 'PlainEvent', data: 'original' });
			});
		});
	});

	describe('subscribe', () => {
		it('应代理订阅到内部事件总线', async () => {
			// Arrange
			const handler = jest.fn().mockResolvedValue(undefined);

			// Act
			await eventBus.subscribe('UserCreated', handler);

			// Assert
			expect(mockInner.subscribe).toHaveBeenCalledTimes(1);
			expect(mockInner.subscribe).toHaveBeenCalledWith('UserCreated', handler);
		});

		it('应返回内部事件总线的订阅结果', async () => {
			// Arrange
			const mockDisposable = { dispose: jest.fn() };
			mockInner.subscribe.mockResolvedValue(mockDisposable);
			const handler = jest.fn().mockResolvedValue(undefined);

			// Act
			const result = await eventBus.subscribe('UserCreated', handler);

			// Assert
			expect(result).toBe(mockDisposable);
		});
	});
});
