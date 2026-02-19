import { BadRequestException } from '@nestjs/common';
import { ContextAwareOutbox } from './context-aware-outbox';
import { IntegrationEventEnvelope, type IOutbox, type OutboxRecord } from '@oksai/messaging';

// 模拟 @oksai/context 模块
jest.mock('@oksai/context', () => ({
	getOksaiRequestContextFromCurrent: jest.fn()
}));

import { getOksaiRequestContextFromCurrent } from '@oksai/context';

const mockGetContext = getOksaiRequestContextFromCurrent as jest.MockedFunction<
	typeof getOksaiRequestContextFromCurrent
>;

describe('ContextAwareOutbox', () => {
	let contextAwareOutbox: ContextAwareOutbox;
	let mockInnerOutbox: jest.Mocked<IOutbox>;

	beforeEach(() => {
		jest.clearAllMocks();

		// 创建内部 Outbox 的模拟
		mockInnerOutbox = {
			append: jest.fn().mockResolvedValue(undefined),
			listPending: jest.fn().mockResolvedValue([]),
			markPublished: jest.fn().mockResolvedValue(undefined),
			markFailed: jest.fn().mockResolvedValue(undefined)
		};

		// 创建被测实例
		contextAwareOutbox = new ContextAwareOutbox(mockInnerOutbox);

		// 默认返回空上下文
		mockGetContext.mockReturnValue({});
	});

	describe('append', () => {
		it('当 CLS 有 tenantId 且 envelope 无 tenantId 时，应注入 CLS 的 tenantId', async () => {
			// Arrange
			mockGetContext.mockReturnValue({
				tenantId: 'cls-tenant-123',
				userId: 'cls-user-456',
				requestId: 'cls-request-789'
			});

			const envelope = new IntegrationEventEnvelope({
				eventType: 'UserCreated',
				payload: { email: 'test@example.com' }
				// 不提供 tenantId/userId/requestId
			});

			// Act
			await contextAwareOutbox.append(envelope);

			// Assert
			expect(mockInnerOutbox.append).toHaveBeenCalledTimes(1);
			const appendedEnvelope = mockInnerOutbox.append.mock.calls[0][0] as IntegrationEventEnvelope;
			expect(appendedEnvelope.tenantId).toBe('cls-tenant-123');
			expect(appendedEnvelope.userId).toBe('cls-user-456');
			expect(appendedEnvelope.requestId).toBe('cls-request-789');
		});

		it('当 CLS 和 envelope 的 tenantId 一致时，应正常追加', async () => {
			// Arrange
			mockGetContext.mockReturnValue({
				tenantId: 'same-tenant'
			});

			const envelope = new IntegrationEventEnvelope({
				eventType: 'UserCreated',
				payload: { email: 'test@example.com' },
				tenantId: 'same-tenant'
			});

			// Act
			await contextAwareOutbox.append(envelope);

			// Assert
			expect(mockInnerOutbox.append).toHaveBeenCalledTimes(1);
			const appendedEnvelope = mockInnerOutbox.append.mock.calls[0][0] as IntegrationEventEnvelope;
			expect(appendedEnvelope.tenantId).toBe('same-tenant');
		});

		it('当 CLS 和 envelope 的 tenantId 不一致时，应抛出 BadRequestException', async () => {
			// Arrange
			mockGetContext.mockReturnValue({
				tenantId: 'cls-tenant'
			});

			const envelope = new IntegrationEventEnvelope({
				eventType: 'UserCreated',
				payload: { email: 'test@example.com' },
				tenantId: 'envelope-tenant' // 不同的 tenantId
			});

			// Act & Assert
			await expect(contextAwareOutbox.append(envelope)).rejects.toThrow(BadRequestException);
			await expect(contextAwareOutbox.append(envelope)).rejects.toThrow(/禁止覆盖租户标识/);
		});

		it('当 CLS 无 tenantId 但 envelope 有 tenantId 时，应使用 envelope 的 tenantId', async () => {
			// Arrange
			mockGetContext.mockReturnValue({}); // CLS 中无 tenantId

			const envelope = new IntegrationEventEnvelope({
				eventType: 'UserCreated',
				payload: { email: 'test@example.com' },
				tenantId: 'envelope-tenant'
			});

			// Act
			await contextAwareOutbox.append(envelope);

			// Assert
			const appendedEnvelope = mockInnerOutbox.append.mock.calls[0][0] as IntegrationEventEnvelope;
			expect(appendedEnvelope.tenantId).toBe('envelope-tenant');
		});

		it('当 CLS 有 userId/requestId 但 envelope 无时，应从 CLS 补齐', async () => {
			// Arrange
			mockGetContext.mockReturnValue({
				userId: 'ctx-user',
				requestId: 'ctx-request'
			});

			const envelope = new IntegrationEventEnvelope({
				eventType: 'OrderCreated',
				payload: { orderId: 'order-123' }
			});

			// Act
			await contextAwareOutbox.append(envelope);

			// Assert
			const appendedEnvelope = mockInnerOutbox.append.mock.calls[0][0] as IntegrationEventEnvelope;
			expect(appendedEnvelope.userId).toBe('ctx-user');
			expect(appendedEnvelope.requestId).toBe('ctx-request');
		});

		it('当 envelope 已有 userId/requestId 时，不应覆盖', async () => {
			// Arrange
			mockGetContext.mockReturnValue({
				userId: 'ctx-user',
				requestId: 'ctx-request'
			});

			const envelope = new IntegrationEventEnvelope({
				eventType: 'OrderCreated',
				payload: { orderId: 'order-123' },
				userId: 'envelope-user',
				requestId: 'envelope-request'
			});

			// Act
			await contextAwareOutbox.append(envelope);

			// Assert
			const appendedEnvelope = mockInnerOutbox.append.mock.calls[0][0] as IntegrationEventEnvelope;
			expect(appendedEnvelope.userId).toBe('envelope-user');
			expect(appendedEnvelope.requestId).toBe('envelope-request');
		});

		it('应保留 envelope 的其他字段不变', async () => {
			// Arrange
			const originalMessageId = 'msg-original-id';
			const originalOccurredAt = new Date('2024-01-15T10:30:00Z');

			const envelope = new IntegrationEventEnvelope({
				eventType: 'OrderCreated',
				payload: { orderId: 'order-123' },
				messageId: originalMessageId,
				schemaVersion: 3,
				occurredAt: originalOccurredAt
			});

			// Act
			await contextAwareOutbox.append(envelope);

			// Assert
			const appendedEnvelope = mockInnerOutbox.append.mock.calls[0][0] as IntegrationEventEnvelope;
			expect(appendedEnvelope.eventType).toBe('OrderCreated');
			expect(appendedEnvelope.messageId).toBe(originalMessageId);
			expect(appendedEnvelope.schemaVersion).toBe(3);
			expect(appendedEnvelope.occurredAt).toEqual(originalOccurredAt);
			expect(appendedEnvelope.payload).toEqual({ orderId: 'order-123' });
		});

		it('当内部 Outbox append 抛出异常时，应向上传播', async () => {
			// Arrange
			const error = new Error('追加失败');
			mockInnerOutbox.append.mockRejectedValue(error);

			const envelope = new IntegrationEventEnvelope({
				eventType: 'UserCreated',
				payload: { email: 'test@example.com' }
			});

			// Act & Assert
			await expect(contextAwareOutbox.append(envelope)).rejects.toThrow('追加失败');
		});
	});

	describe('listPending', () => {
		it('应将请求透传给内部 Outbox', async () => {
			// Arrange
			const mockRecords: OutboxRecord[] = [
				{
					messageId: 'msg-1',
					eventType: 'UserCreated',
					occurredAt: new Date(),
					schemaVersion: 1,
					payload: {},
					status: 'pending',
					attempts: 0,
					nextAttemptAt: new Date(),
					createdAt: new Date(),
					updatedAt: new Date()
				}
			];
			mockInnerOutbox.listPending.mockResolvedValue(mockRecords);

			// Act
			const result = await contextAwareOutbox.listPending();

			// Assert
			expect(mockInnerOutbox.listPending).toHaveBeenCalledTimes(1);
			expect(result).toBe(mockRecords);
		});

		it('应传递查询参数', async () => {
			// Arrange
			const params = { now: new Date(), limit: 10 };
			mockInnerOutbox.listPending.mockResolvedValue([]);

			// Act
			await contextAwareOutbox.listPending(params);

			// Assert
			expect(mockInnerOutbox.listPending).toHaveBeenCalledWith(params);
		});
	});

	describe('markPublished', () => {
		it('应将请求透传给内部 Outbox', async () => {
			// Arrange
			const messageId = 'msg-123';

			// Act
			await contextAwareOutbox.markPublished(messageId);

			// Assert
			expect(mockInnerOutbox.markPublished).toHaveBeenCalledTimes(1);
			expect(mockInnerOutbox.markPublished).toHaveBeenCalledWith(messageId);
		});
	});

	describe('markFailed', () => {
		it('应将请求透传给内部 Outbox', async () => {
			// Arrange
			const params = {
				messageId: 'msg-123',
				attempts: 3,
				nextAttemptAt: new Date(),
				lastError: '连接超时'
			};

			// Act
			await contextAwareOutbox.markFailed(params);

			// Assert
			expect(mockInnerOutbox.markFailed).toHaveBeenCalledTimes(1);
			expect(mockInnerOutbox.markFailed).toHaveBeenCalledWith(params);
		});
	});
});
