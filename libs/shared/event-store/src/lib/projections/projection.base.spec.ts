import { ProjectionBase } from './projection.base';
import { ProjectionStatus } from './interfaces/projection.interface';
import type { StoredEvent, IEventStore } from '../event-store.interface';

/**
 * @description 测试用投影实现
 */
class TestProjection extends ProjectionBase<{ id: string; count: number }> {
	readonly name = 'TestProjection';
	readonly subscribedEvents = ['TestCreated', 'TestUpdated', 'TestDeleted'];

	private readModels: Map<string, { id: string; count: number }> = new Map();
	public handledEvents: StoredEvent[] = [];

	protected async handleEvent(event: StoredEvent): Promise<void> {
		this.handledEvents.push(event);

		switch (event.eventType) {
			case 'TestCreated':
				this.readModels.set(event.aggregateId, {
					id: event.aggregateId,
					count: 1
				});
				break;
			case 'TestUpdated':
				const existing = this.readModels.get(event.aggregateId);
				if (existing) {
					existing.count++;
				}
				break;
			case 'TestDeleted':
				this.readModels.delete(event.aggregateId);
				break;
		}
	}

	protected async clearReadModels(): Promise<void> {
		this.readModels.clear();
		this.handledEvents = [];
	}

	getReadModels(): Promise<{ id: string; count: number }[]> {
		return Promise.resolve(Array.from(this.readModels.values()));
	}
}

/**
 * @description 创建模拟事件
 */
function createMockEvent(overrides: Partial<StoredEvent> = {}): StoredEvent {
	return {
		tenantId: 'tenant-1',
		aggregateType: 'Test',
		aggregateId: 'test-1',
		version: 1,
		eventType: 'TestCreated',
		occurredAt: new Date(),
		schemaVersion: 1,
		eventData: {},
		...overrides
	};
}

/**
 * @description 创建模拟事件存储
 */
function createMockEventStore(): IEventStore {
	return {
		appendToStream: jest.fn(),
		loadStream: jest.fn(),
		streamAllEvents: jest.fn()
	} as unknown as IEventStore;
}

describe('ProjectionBase', () => {
	let projection: TestProjection;
	let mockEventStore: IEventStore;

	beforeEach(() => {
		projection = new TestProjection();
		mockEventStore = createMockEventStore();
	});

	describe('handle', () => {
		it('应处理订阅的事件类型', async () => {
			const event = createMockEvent({ eventType: 'TestCreated' });

			await projection.handle(event);

			expect(projection.handledEvents).toHaveLength(1);
		});

		it('应忽略未订阅的事件类型', async () => {
			const event = createMockEvent({ eventType: 'UnknownEvent' });

			await projection.handle(event);

			expect(projection.handledEvents).toHaveLength(0);
		});

		it('应更新处理进度', async () => {
			const event = createMockEvent({ eventType: 'TestCreated' });

			await projection.handle(event);

			const status = await projection.getStatus();
			expect(status.processedEventCount).toBe(1);
			expect(status.lastProcessedEventId).toBe('test-1');
			expect(status.lastProcessedVersion).toBe(1);
		});

		it('应正确处理多个事件', async () => {
			await projection.handle(createMockEvent({ eventType: 'TestCreated', aggregateId: 'test-1' }));
			await projection.handle(createMockEvent({ eventType: 'TestUpdated', aggregateId: 'test-1', version: 2 }));
			await projection.handle(createMockEvent({ eventType: 'TestCreated', aggregateId: 'test-2' }));

			const readModels = await projection.getReadModels();
			expect(readModels).toHaveLength(2);
			expect(readModels.find((r) => r.id === 'test-1')?.count).toBe(2);
		});
	});

	describe('rebuild', () => {
		it('当事件存储未设置时应抛出错误', async () => {
			await expect(projection.rebuild()).rejects.toThrow('事件存储未设置');
		});

		it('当事件存储不支持流式加载时应抛出错误', async () => {
			projection.setEventStore({} as IEventStore);

			await expect(projection.rebuild()).rejects.toThrow('事件存储不支持流式加载');
		});

		it('应正确重建投影', async () => {
			const events: StoredEvent[] = [
				createMockEvent({ eventType: 'TestCreated', aggregateId: 'test-1', version: 1 }),
				createMockEvent({ eventType: 'TestCreated', aggregateId: 'test-2', version: 1 }),
				createMockEvent({ eventType: 'TestUpdated', aggregateId: 'test-1', version: 2 })
			];

			// 创建异步迭代器
			async function* eventGenerator(): AsyncIterable<StoredEvent> {
				for (const event of events) {
					yield event;
				}
			}

			(mockEventStore.streamAllEvents as jest.Mock).mockReturnValue(eventGenerator());
			projection.setEventStore(mockEventStore);

			await projection.rebuild();

			expect(projection.handledEvents).toHaveLength(3);
			const status = await projection.getStatus();
			expect(status.processedEventCount).toBe(3);
			expect(status.status).toBe(ProjectionStatus.RUNNING);
		});

		it('重建时应清空现有读模型', async () => {
			// 先添加一些数据
			await projection.handle(createMockEvent({ eventType: 'TestCreated', aggregateId: 'existing-1' }));

			const events: StoredEvent[] = [createMockEvent({ eventType: 'TestCreated', aggregateId: 'new-1' })];

			async function* eventGenerator(): AsyncIterable<StoredEvent> {
				for (const event of events) {
					yield event;
				}
			}

			(mockEventStore.streamAllEvents as jest.Mock).mockReturnValue(eventGenerator());
			projection.setEventStore(mockEventStore);

			await projection.rebuild();

			const readModels = await projection.getReadModels();
			expect(readModels).toHaveLength(1);
			expect(readModels[0].id).toBe('new-1');
		});
	});

	describe('getStatus', () => {
		it('应返回正确的初始状态', async () => {
			const status = await projection.getStatus();

			expect(status.name).toBe('TestProjection');
			expect(status.status).toBe(ProjectionStatus.NOT_INITIALIZED);
			expect(status.processedEventCount).toBe(0);
			expect(status.errorCount).toBe(0);
		});

		it('应正确更新状态', async () => {
			await projection.handle(createMockEvent({ eventType: 'TestCreated' }));

			const status = await projection.getStatus();
			expect(status.status).toBe(ProjectionStatus.RUNNING);
		});
	});

	describe('pause and resume', () => {
		it('应正确暂停和恢复投影', async () => {
			await projection.handle(createMockEvent({ eventType: 'TestCreated' }));
			expect((await projection.getStatus()).status).toBe(ProjectionStatus.RUNNING);

			await projection.pause();
			expect((await projection.getStatus()).status).toBe(ProjectionStatus.PAUSED);

			// 暂停期间应忽略事件
			await projection.handle(createMockEvent({ eventType: 'TestCreated', aggregateId: 'test-2' }));
			expect(projection.handledEvents).toHaveLength(1);

			await projection.resume();
			expect((await projection.getStatus()).status).toBe(ProjectionStatus.RUNNING);
		});
	});

	describe('error handling', () => {
		it('应正确记录错误', async () => {
			class ErrorProjection extends ProjectionBase<unknown> {
				readonly name = 'ErrorProjection';
				readonly subscribedEvents = ['TestCreated'];

				protected async handleEvent(): Promise<void> {
					throw new Error('处理失败');
				}
			}

			const errorProjection = new ErrorProjection();

			await expect(errorProjection.handle(createMockEvent())).rejects.toThrow('处理失败');

			const status = await errorProjection.getStatus();
			expect(status.errorCount).toBe(1);
			expect(status.lastError).toBe('处理失败');
		});

		it('错误次数过多时应标记为错误状态', async () => {
			class ErrorProjection extends ProjectionBase<unknown> {
				readonly name = 'ErrorProjection';
				readonly subscribedEvents = ['TestCreated'];

				constructor() {
					super({ maxRetries: 1 });
				}

				protected async handleEvent(): Promise<void> {
					throw new Error('处理失败');
				}
			}

			const errorProjection = new ErrorProjection();

			// 触发 3 次错误（maxRetries * 3）
			for (let i = 0; i < 3; i++) {
				try {
					await errorProjection.handle(createMockEvent({ aggregateId: `test-${i}` }));
				} catch (e) {
					// 忽略错误
				}
			}

			const status = await errorProjection.getStatus();
			expect(status.status).toBe(ProjectionStatus.ERROR);
		});
	});

	describe('retry', () => {
		it('应在失败时重试', async () => {
			let attempts = 0;

			class RetryProjection extends ProjectionBase<unknown> {
				readonly name = 'RetryProjection';
				readonly subscribedEvents = ['TestCreated'];

				constructor() {
					super({ maxRetries: 3, retryDelayMs: 10 });
				}

				protected async handleEvent(): Promise<void> {
					attempts++;
					if (attempts < 3) {
						throw new Error('临时错误');
					}
				}
			}

			const retryProjection = new RetryProjection();
			await retryProjection.handle(createMockEvent());

			expect(attempts).toBe(3);
		});
	});
});
