import { BadRequestException } from '@nestjs/common';
import { IntegrationEventEnvelope } from '@oksai/messaging';
import { ContextAwareOutbox } from './context-aware-outbox';

/**
 * @description ContextAwareOutbox 单元测试
 *
 * 测试覆盖：
 * - 上下文传递（从 CLS 注入 tenantId/userId/requestId）
 * - 租户安全（禁止覆盖 CLS tenantId）
 * - 消息存储
 * - 委托方法（listPending、markPublished、markFailed）
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

describe('ContextAwareOutbox', () => {
	let outbox: ContextAwareOutbox;
	let mockInner: jest.Mocked<{
		append: jest.Mock;
		listPending: jest.Mock;
		markPublished: jest.Mock;
		markFailed: jest.Mock;
	}>;

	beforeEach(() => {
		// 重置 mock
		jest.clearAllMocks();

		// 创建 mock 内部 Outbox
		mockInner = {
			append: jest.fn().mockResolvedValue(undefined),
			listPending: jest.fn().mockResolvedValue([]),
			markPublished: jest.fn().mockResolvedValue(undefined),
			markFailed: jest.fn().mockResolvedValue(undefined)
		};

		outbox = new ContextAwareOutbox(mockInner as any);
	});

	describe('append', () => {
		describe('租户安全', () => {
			it('当 envelope tenantId 与 CLS tenantId 不一致时应抛出 BadRequestException', async () => {
				// Arrange
				mockGetContext.mockReturnValue({
					tenantId: 'cls-tenant',
					userId: undefined,
					requestId: undefined
				});

				const envelope = new IntegrationEventEnvelope({
					eventType: 'UserCreated',
					payload: { userId: 'u-1' },
					tenantId: 'different-tenant'
				});

				// Act & Assert
				await expect(outbox.append(envelope)).rejects.toThrow(BadRequestException);
				await expect(outbox.append(envelope)).rejects.toThrow(
					'禁止覆盖租户标识：上下文 tenantId=cls-tenant，入参 tenantId=different-tenant。'
				);
			});

			it('当 envelope tenantId 与 CLS tenantId 一致时应正常处理', async () => {
				// Arrange
				mockGetContext.mockReturnValue({
					tenantId: 'same-tenant',
					userId: undefined,
					requestId: undefined
				});

				const envelope = new IntegrationEventEnvelope({
					eventType: 'UserCreated',
					payload: { userId: 'u-1' },
					tenantId: 'same-tenant'
				});

				// Act
				await outbox.append(envelope);

				// Assert
				expect(mockInner.append).toHaveBeenCalledTimes(1);
			});

			it('当 CLS 无 tenantId 且 envelope 有 tenantId 时应使用 envelope 的 tenantId', async () => {
				// Arrange
				mockGetContext.mockReturnValue({
					tenantId: undefined,
					userId: undefined,
					requestId: undefined
				});

				const envelope = new IntegrationEventEnvelope({
					eventType: 'UserCreated',
					payload: { userId: 'u-1' },
					tenantId: 'envelope-tenant'
				});

				// Act
				await outbox.append(envelope);

				// Assert
				const appendedEnvelope = mockInner.append.mock.calls[0][0];
				expect(appendedEnvelope.tenantId).toBe('envelope-tenant');
			});

			it('当 envelope 无 tenantId 且 CLS 有 tenantId 时应使用 CLS 的 tenantId', async () => {
				// Arrange
				mockGetContext.mockReturnValue({
					tenantId: 'cls-tenant',
					userId: undefined,
					requestId: undefined
				});

				const envelope = new IntegrationEventEnvelope({
					eventType: 'UserCreated',
					payload: { userId: 'u-1' }
				});

				// Act
				await outbox.append(envelope);

				// Assert
				const appendedEnvelope = mockInner.append.mock.calls[0][0];
				expect(appendedEnvelope.tenantId).toBe('cls-tenant');
			});
		});

		describe('上下文注入', () => {
			it('应从 CLS 注入 userId', async () => {
				// Arrange
				mockGetContext.mockReturnValue({
					tenantId: undefined,
					userId: 'cls-user',
					requestId: undefined
				});

				const envelope = new IntegrationEventEnvelope({
					eventType: 'UserCreated',
					payload: { userId: 'u-1' }
				});

				// Act
				await outbox.append(envelope);

				// Assert
				const appendedEnvelope = mockInner.append.mock.calls[0][0];
				expect(appendedEnvelope.userId).toBe('cls-user');
			});

			it('应从 CLS 注入 requestId', async () => {
				// Arrange
				mockGetContext.mockReturnValue({
					tenantId: undefined,
					userId: undefined,
					requestId: 'cls-req'
				});

				const envelope = new IntegrationEventEnvelope({
					eventType: 'UserCreated',
					payload: { userId: 'u-1' }
				});

				// Act
				await outbox.append(envelope);

				// Assert
				const appendedEnvelope = mockInner.append.mock.calls[0][0];
				expect(appendedEnvelope.requestId).toBe('cls-req');
			});

			it('应同时注入多个上下文字段', async () => {
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
				await outbox.append(envelope);

				// Assert
				const appendedEnvelope = mockInner.append.mock.calls[0][0];
				expect(appendedEnvelope.tenantId).toBe('t-001');
				expect(appendedEnvelope.userId).toBe('u-001');
				expect(appendedEnvelope.requestId).toBe('req-001');
			});

			it('当 CLS 为空时不应注入任何字段', async () => {
				// Arrange
				mockGetContext.mockReturnValue({});

				const envelope = new IntegrationEventEnvelope({
					eventType: 'UserCreated',
					payload: { userId: 'u-1' }
				});

				// Act
				await outbox.append(envelope);

				// Assert
				const appendedEnvelope = mockInner.append.mock.calls[0][0];
				expect(appendedEnvelope.tenantId).toBeUndefined();
				expect(appendedEnvelope.userId).toBeUndefined();
				expect(appendedEnvelope.requestId).toBeUndefined();
			});

			it('CLS userId 应优先于 envelope userId', async () => {
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
				await outbox.append(envelope);

				// Assert
				const appendedEnvelope = mockInner.append.mock.calls[0][0];
				expect(appendedEnvelope.userId).toBe('cls-user');
			});

			it('CLS requestId 应优先于 envelope requestId', async () => {
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
				await outbox.append(envelope);

				// Assert
				const appendedEnvelope = mockInner.append.mock.calls[0][0];
				expect(appendedEnvelope.requestId).toBe('cls-req');
			});
		});

		describe('envelope 字段保留', () => {
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
				await outbox.append(envelope);

				// Assert
				const appendedEnvelope = mockInner.append.mock.calls[0][0];
				expect(appendedEnvelope.eventType).toBe('CustomEvent');
				expect(appendedEnvelope.payload).toEqual({ data: 'test' });
				expect(appendedEnvelope.schemaVersion).toBe(2);
				expect(appendedEnvelope.messageId).toBe('custom-msg-id');
				expect(appendedEnvelope.occurredAt).toBe(customDate);
			});
		});
	});

	describe('listPending', () => {
		it('应委托到内部 Outbox', async () => {
			// Arrange
			const mockRecords = [{ messageId: 'msg-1', eventType: 'Test', status: 'pending' }];
			mockInner.listPending.mockResolvedValue(mockRecords as any);

			// Act
			const result = await outbox.listPending();

			// Assert
			expect(mockInner.listPending).toHaveBeenCalledWith(undefined);
			expect(result).toBe(mockRecords);
		});

		it('应传递查询参数', async () => {
			// Arrange
			const params = { now: new Date(), limit: 10 };

			// Act
			await outbox.listPending(params);

			// Assert
			expect(mockInner.listPending).toHaveBeenCalledWith(params);
		});
	});

	describe('markPublished', () => {
		it('应委托到内部 Outbox', async () => {
			// Arrange
			const messageId = 'msg-123';

			// Act
			await outbox.markPublished(messageId);

			// Assert
			expect(mockInner.markPublished).toHaveBeenCalledWith(messageId);
		});
	});

	describe('markFailed', () => {
		it('应委托到内部 Outbox', async () => {
			// Arrange
			const params = {
				messageId: 'msg-123',
				attempts: 3,
				nextAttemptAt: new Date(),
				lastError: 'Connection timeout'
			};

			// Act
			await outbox.markFailed(params);

			// Assert
			expect(mockInner.markFailed).toHaveBeenCalledWith(params);
		});
	});
});
