import { Injectable, Logger } from '@nestjs/common';
import { BaseIntegrationEventSubscriber } from './base-integration-event-subscriber';
import { IntegrationEventEnvelope, type IEventBus, type IInbox, type Disposable } from '@oksai/messaging';
import type { DatabaseUnitOfWork } from '@oksai/database';

describe('BaseIntegrationEventSubscriber', () => {
	// 创建具体的测试用子类
	@Injectable()
	class TestSubscriber extends BaseIntegrationEventSubscriber {
		public readonly handledEvents: IntegrationEventEnvelope[] = [];
		public setupCalled = false;

		protected async setupSubscriptions(): Promise<void> {
			this.setupCalled = true;
			// 订阅测试事件
			await this.subscribe('TestEvent', async (env) => {
				this.handledEvents.push(env);
			});
		}

		// 暴露受保护的方法供测试使用
		public async testSubscribe<TPayload extends object>(
			eventType: string,
			handler: (env: IntegrationEventEnvelope<TPayload>) => Promise<void>
		): Promise<void> {
			return this.subscribe(eventType, handler);
		}
	}

	let subscriber: TestSubscriber;
	let mockBus: jest.Mocked<IEventBus>;
	let mockInbox: jest.Mocked<IInbox>;
	let mockUow: jest.Mocked<DatabaseUnitOfWork>;
	let capturedHandler: ((env: IntegrationEventEnvelope) => Promise<void>) | undefined;

	beforeEach(() => {
		jest.clearAllMocks();
		capturedHandler = undefined;

		// 创建模拟的 EventBus
		mockBus = {
			publish: jest.fn().mockResolvedValue(undefined),
			subscribe: jest.fn().mockImplementation(async (_eventType, handler) => {
				capturedHandler = handler as (env: IntegrationEventEnvelope) => Promise<void>;
				return { dispose: jest.fn() } as Disposable;
			})
		};

		// 创建模拟的 Inbox
		mockInbox = {
			isProcessed: jest.fn().mockResolvedValue(false),
			markProcessed: jest.fn().mockResolvedValue(undefined)
		};

		// 创建模拟的 UnitOfWork
		mockUow = {
			transactional: jest.fn().mockImplementation(async (fn: () => Promise<unknown>) => {
				return await fn();
			})
		} as unknown as jest.Mocked<DatabaseUnitOfWork>;

		// 创建被测实例
		subscriber = new TestSubscriber(mockBus, mockInbox, mockUow);
	});

	describe('onModuleInit', () => {
		it('应调用 setupSubscriptions 并记录日志', async () => {
			// Act
			await subscriber.onModuleInit();

			// Assert
			expect(subscriber.setupCalled).toBe(true);
			expect(mockBus.subscribe).toHaveBeenCalledWith('TestEvent', expect.any(Function));
		});
	});

	describe('onModuleDestroy', () => {
		it('应释放所有订阅资源', async () => {
			// Arrange
			const mockDisposable1 = { dispose: jest.fn() };
			const mockDisposable2 = { dispose: jest.fn().mockResolvedValue(undefined) };

			mockBus.subscribe.mockResolvedValueOnce(mockDisposable1).mockResolvedValueOnce(mockDisposable2);

			// 先初始化以注册订阅
			await subscriber.onModuleInit();
			await subscriber.testSubscribe('AnotherEvent', async () => {});

			// Act
			await subscriber.onModuleDestroy();

			// Assert
			expect(mockDisposable1.dispose).toHaveBeenCalled();
			expect(mockDisposable2.dispose).toHaveBeenCalled();
		});

		it('应支持同步和异步的 dispose 方法', async () => {
			// Arrange
			const syncDisposable = { dispose: jest.fn() }; // 同步
			const asyncDisposable = { dispose: jest.fn().mockResolvedValue(undefined) }; // 异步

			mockBus.subscribe.mockResolvedValueOnce(syncDisposable).mockResolvedValueOnce(asyncDisposable);

			await subscriber.testSubscribe('Event1', async () => {});
			await subscriber.testSubscribe('Event2', async () => {});

			// Act
			await subscriber.onModuleDestroy();

			// Assert
			expect(syncDisposable.dispose).toHaveBeenCalled();
			expect(asyncDisposable.dispose).toHaveBeenCalled();
		});
	});

	describe('事件处理 - 幂等性', () => {
		it('当事件已处理时应跳过（快速检查）', async () => {
			// Arrange
			await subscriber.onModuleInit();
			mockInbox.isProcessed.mockResolvedValue(true);

			const envelope = new IntegrationEventEnvelope({
				eventType: 'TestEvent',
				payload: { data: 'test' },
				messageId: 'msg-processed'
			});

			// Act
			await capturedHandler!(envelope);

			// Assert
			expect(mockInbox.isProcessed).toHaveBeenCalledWith('msg-processed');
			expect(mockInbox.markProcessed).not.toHaveBeenCalled();
			expect(mockUow.transactional).not.toHaveBeenCalled();
		});

		it('当事件未处理时应在事务中执行处理器并标记已处理', async () => {
			// Arrange
			await subscriber.onModuleInit();
			mockInbox.isProcessed.mockResolvedValue(false);

			const envelope = new IntegrationEventEnvelope({
				eventType: 'TestEvent',
				payload: { data: 'test' },
				messageId: 'msg-new'
			});

			// Act
			await capturedHandler!(envelope);

			// Assert
			expect(mockUow.transactional).toHaveBeenCalled();
			expect(mockInbox.markProcessed).toHaveBeenCalledWith('msg-new');
		});

		it('应在事务内再次检查以防止并发', async () => {
			// Arrange
			await subscriber.onModuleInit();

			// 第一次检查（快速检查）返回 false，事务内检查返回 true
			mockInbox.isProcessed
				.mockResolvedValueOnce(false) // 快速检查
				.mockResolvedValueOnce(true); // 事务内检查

			const envelope = new IntegrationEventEnvelope({
				eventType: 'TestEvent',
				payload: { data: 'test' },
				messageId: 'msg-concurrent'
			});

			// Act
			await capturedHandler!(envelope);

			// Assert - 事务内再次检查返回 true，所以不应调用 markProcessed
			expect(mockInbox.isProcessed).toHaveBeenCalledTimes(2);
			expect(mockInbox.markProcessed).not.toHaveBeenCalled();
		});
	});

	describe('错误处理', () => {
		it('当处理器抛出异常时应记录错误并重新抛出', async () => {
			// Arrange
			let localHandler: ((env: IntegrationEventEnvelope) => Promise<void>) | undefined;
			mockBus.subscribe.mockImplementation(async (_eventType, handler) => {
				localHandler = handler as (env: IntegrationEventEnvelope) => Promise<void>;
				return { dispose: jest.fn() };
			});

			// 创建会抛出异常的订阅者
			class ErrorSubscriber extends BaseIntegrationEventSubscriber {
				protected async setupSubscriptions(): Promise<void> {
					await this.subscribe('FailingEvent', async () => {
						throw new Error('处理器执行失败');
					});
				}
			}
			const errorSubscriber = new ErrorSubscriber(mockBus, mockInbox, mockUow);
			await errorSubscriber.onModuleInit();

			const envelope = new IntegrationEventEnvelope({
				eventType: 'FailingEvent',
				payload: {},
				messageId: 'msg-fail',
				tenantId: 'tenant-1',
				userId: 'user-1',
				requestId: 'request-1'
			});

			// Act & Assert
			await expect(localHandler!(envelope)).rejects.toThrow('处理器执行失败');
		});

		it('当事务失败时不应标记消息为已处理', async () => {
			// Arrange
			await subscriber.onModuleInit();

			mockUow.transactional = jest.fn().mockRejectedValue(new Error('事务失败'));

			const envelope = new IntegrationEventEnvelope({
				eventType: 'TestEvent',
				payload: { data: 'test' },
				messageId: 'msg-tx-fail'
			});

			// Act & Assert
			await expect(capturedHandler!(envelope)).rejects.toThrow('事务失败');
			expect(mockInbox.markProcessed).not.toHaveBeenCalled();
		});
	});

	describe('日志记录', () => {
		it('当事件已处理时应记录调试日志', async () => {
			// Arrange - spy Logger.prototype.debug
			const debugSpy = jest.spyOn(Logger.prototype, 'debug').mockImplementation();

			await subscriber.onModuleInit();
			mockInbox.isProcessed.mockResolvedValue(true);

			const envelope = new IntegrationEventEnvelope({
				eventType: 'TestEvent',
				payload: {},
				messageId: 'msg-ctx',
				tenantId: 'tenant-ctx',
				userId: 'user-ctx',
				requestId: 'request-ctx'
			});

			// Act
			await capturedHandler!(envelope);

			// Assert
			expect(debugSpy).toHaveBeenCalledWith(expect.stringContaining('tenantId=tenant-ctx'));

			debugSpy.mockRestore();
		});

		it('当上下文字段为空时应在日志中处理', async () => {
			// Arrange
			const debugSpy = jest.spyOn(Logger.prototype, 'debug').mockImplementation();

			await subscriber.onModuleInit();
			mockInbox.isProcessed.mockResolvedValue(true);

			// Act - 不提供上下文字段
			const envelope = new IntegrationEventEnvelope({
				eventType: 'TestEvent',
				payload: {},
				messageId: 'msg-no-ctx'
			});

			await capturedHandler!(envelope);

			// Assert - 日志应包含事件信息
			expect(debugSpy).toHaveBeenCalledWith(expect.stringContaining('msg-no-ctx'));

			debugSpy.mockRestore();
		});

		it('当事件处理失败时应记录错误日志', async () => {
			// Arrange
			const errorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation();

			class ErrorSubscriber extends BaseIntegrationEventSubscriber {
				protected async setupSubscriptions(): Promise<void> {
					await this.subscribe('ErrorEvent', async () => {
						throw new Error('测试错误');
					});
				}
			}

			let localHandler: ((env: IntegrationEventEnvelope) => Promise<void>) | undefined;
			mockBus.subscribe.mockImplementation(async (_eventType, handler) => {
				localHandler = handler as (env: IntegrationEventEnvelope) => Promise<void>;
				return { dispose: jest.fn() };
			});

			const errorSubscriber = new ErrorSubscriber(mockBus, mockInbox, mockUow);
			await errorSubscriber.onModuleInit();

			const envelope = new IntegrationEventEnvelope({
				eventType: 'ErrorEvent',
				payload: {},
				messageId: 'msg-error',
				tenantId: 'tenant-err'
			});

			// Act
			try {
				await localHandler!(envelope);
			} catch {
				// 预期的错误
			}

			// Assert
			expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('事件处理失败'), expect.any(String));

			errorSpy.mockRestore();
		});
	});
});
