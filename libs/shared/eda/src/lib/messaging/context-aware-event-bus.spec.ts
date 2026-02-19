import { ContextAwareEventBus } from './context-aware-event-bus';
import { IntegrationEventEnvelope, type IEventBus, type Disposable } from '@oksai/messaging';

// 模拟 @oksai/context 模块
jest.mock('@oksai/context', () => ({
	getOksaiRequestContextFromCurrent: jest.fn()
}));

import { getOksaiRequestContextFromCurrent } from '@oksai/context';

const mockGetContext = getOksaiRequestContextFromCurrent as jest.MockedFunction<
	typeof getOksaiRequestContextFromCurrent
>;

describe('ContextAwareEventBus', () => {
	let contextAwareBus: ContextAwareEventBus;
	let mockInnerBus: jest.Mocked<IEventBus>;

	// 测试用的模拟处理器
	const mockHandler = jest.fn();

	beforeEach(() => {
		jest.clearAllMocks();

		// 创建内部总线的模拟
		mockInnerBus = {
			publish: jest.fn().mockResolvedValue(undefined),
			subscribe: jest.fn().mockResolvedValue({ dispose: jest.fn() })
		};

		// 创建被测实例
		contextAwareBus = new ContextAwareEventBus(mockInnerBus);

		// 默认返回空上下文
		mockGetContext.mockReturnValue({});
	});

	describe('publish', () => {
		it('当发布 IntegrationEventEnvelope 时，应从 CLS 补齐缺失的上下文字段', async () => {
			// Arrange
			mockGetContext.mockReturnValue({
				tenantId: 'tenant-123',
				userId: 'user-456',
				requestId: 'request-789'
			});

			const envelope = new IntegrationEventEnvelope({
				eventType: 'UserCreated',
				payload: { email: 'test@example.com' }
				// 不提供 tenantId/userId/requestId
			});

			// Act
			await contextAwareBus.publish(envelope);

			// Assert
			expect(mockInnerBus.publish).toHaveBeenCalledTimes(1);
			const publishedEvent = mockInnerBus.publish.mock.calls[0][0] as IntegrationEventEnvelope;
			expect(publishedEvent.tenantId).toBe('tenant-123');
			expect(publishedEvent.userId).toBe('user-456');
			expect(publishedEvent.requestId).toBe('request-789');
		});

		it('当 envelope 已有上下文字段时，不应覆盖', async () => {
			// Arrange
			mockGetContext.mockReturnValue({
				tenantId: 'ctx-tenant',
				userId: 'ctx-user',
				requestId: 'ctx-request'
			});

			const envelope = new IntegrationEventEnvelope({
				eventType: 'UserCreated',
				payload: { email: 'test@example.com' },
				tenantId: 'envelope-tenant',
				userId: 'envelope-user',
				requestId: 'envelope-request'
			});

			// Act
			await contextAwareBus.publish(envelope);

			// Assert
			const publishedEvent = mockInnerBus.publish.mock.calls[0][0] as IntegrationEventEnvelope;
			// envelope 中的值优先，不应被覆盖
			expect(publishedEvent.tenantId).toBe('envelope-tenant');
			expect(publishedEvent.userId).toBe('envelope-user');
			expect(publishedEvent.requestId).toBe('envelope-request');
		});

		it('当 CLS 上下文为空时，应保留 envelope 原有的上下文字段', async () => {
			// Arrange
			mockGetContext.mockReturnValue({});

			const envelope = new IntegrationEventEnvelope({
				eventType: 'UserCreated',
				payload: { email: 'test@example.com' },
				tenantId: 'envelope-tenant',
				userId: 'envelope-user'
			});

			// Act
			await contextAwareBus.publish(envelope);

			// Assert
			const publishedEvent = mockInnerBus.publish.mock.calls[0][0] as IntegrationEventEnvelope;
			expect(publishedEvent.tenantId).toBe('envelope-tenant');
			expect(publishedEvent.userId).toBe('envelope-user');
		});

		it('当发布非 IntegrationEventEnvelope 类型的事件时，应直接透传给内部总线', async () => {
			// Arrange
			const regularEvent = { type: 'SomeEvent', data: 'test' };

			// Act
			await contextAwareBus.publish(regularEvent);

			// Assert
			expect(mockInnerBus.publish).toHaveBeenCalledTimes(1);
			expect(mockInnerBus.publish).toHaveBeenCalledWith(regularEvent);
			// 不应调用 getContext（因为没有 instanceof 检查）
		});

		it('应保留 envelope 的其他字段不变', async () => {
			// Arrange
			const envelope = new IntegrationEventEnvelope({
				eventType: 'OrderCreated',
				payload: { orderId: 'order-123', amount: 100 },
				messageId: 'msg-unique-id',
				schemaVersion: 2,
				occurredAt: new Date('2024-01-15T10:30:00Z')
			});

			// Act
			await contextAwareBus.publish(envelope);

			// Assert
			const publishedEvent = mockInnerBus.publish.mock.calls[0][0] as IntegrationEventEnvelope;
			expect(publishedEvent.eventType).toBe('OrderCreated');
			expect(publishedEvent.messageId).toBe('msg-unique-id');
			expect(publishedEvent.schemaVersion).toBe(2);
			expect(publishedEvent.occurredAt).toEqual(new Date('2024-01-15T10:30:00Z'));
			expect(publishedEvent.payload).toEqual({ orderId: 'order-123', amount: 100 });
		});

		it('当内部总线 publish 抛出异常时，应向上传播', async () => {
			// Arrange
			const error = new Error('发布失败');
			mockInnerBus.publish.mockRejectedValue(error);

			const envelope = new IntegrationEventEnvelope({
				eventType: 'UserCreated',
				payload: { email: 'test@example.com' }
			});

			// Act & Assert
			await expect(contextAwareBus.publish(envelope)).rejects.toThrow('发布失败');
		});
	});

	describe('subscribe', () => {
		it('应将订阅请求透传给内部总线', async () => {
			// Arrange
			const eventType = 'UserCreated';
			const mockDisposable: Disposable = { dispose: jest.fn() };
			mockInnerBus.subscribe.mockResolvedValue(mockDisposable);

			// Act
			const result = await contextAwareBus.subscribe(eventType, mockHandler);

			// Assert
			expect(mockInnerBus.subscribe).toHaveBeenCalledTimes(1);
			expect(mockInnerBus.subscribe).toHaveBeenCalledWith(eventType, mockHandler);
			expect(result).toBe(mockDisposable);
		});

		it('应返回内部总线返回的 Disposable', async () => {
			// Arrange
			const mockDisposable: Disposable = { dispose: jest.fn().mockResolvedValue(undefined) };
			mockInnerBus.subscribe.mockResolvedValue(mockDisposable);

			// Act
			const result = await contextAwareBus.subscribe('TestEvent', mockHandler);

			// Assert
			expect(result).toBeDefined();
			expect(typeof result.dispose).toBe('function');
		});
	});
});
