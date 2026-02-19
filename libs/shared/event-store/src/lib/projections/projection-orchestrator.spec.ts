import { ProjectionOrchestrator } from './projection-orchestrator';
import { ProjectionBase } from './projection.base';
import { ProjectionStatus } from './interfaces/projection.interface';
import type { StoredEvent, IEventStore } from '../event-store.interface';

/**
 * @description 测试用投影实现
 */
class TestProjection extends ProjectionBase<unknown> {
	readonly name: string;
	readonly subscribedEvents: string[];

	public handledEvents: StoredEvent[] = [];

	constructor(name: string, subscribedEvents: string[]) {
		super();
		this.name = name;
		this.subscribedEvents = subscribedEvents;
	}

	protected async handleEvent(event: StoredEvent): Promise<void> {
		this.handledEvents.push(event);
	}

	protected async clearReadModels(): Promise<void> {
		this.handledEvents = [];
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
function createMockEventStore() {
	return {
		appendToStream: jest.fn(),
		loadStream: jest.fn(),
		streamAllEvents: jest.fn(),
		subscribe: jest.fn()
	};
}

describe('ProjectionOrchestrator', () => {
	let orchestrator: ProjectionOrchestrator;
	let mockEventStore: jest.Mocked<IEventStore>;

	beforeEach(() => {
		mockEventStore = createMockEventStore();
		orchestrator = new ProjectionOrchestrator(mockEventStore);
	});

	describe('registerProjection', () => {
		it('应正确注册投影', () => {
			const projection = new TestProjection('TestProjection', ['TestCreated', 'TestUpdated']);

			orchestrator.registerProjection(projection);

			expect(orchestrator.projectionCount).toBe(1);
			expect(orchestrator.getProjection('TestProjection')).toBe(projection);
		});

		it('重复注册同名投影应覆盖', () => {
			const projection1 = new TestProjection('TestProjection', ['TestCreated']);
			const projection2 = new TestProjection('TestProjection', ['TestUpdated']);

			orchestrator.registerProjection(projection1);
			orchestrator.registerProjection(projection2);

			expect(orchestrator.projectionCount).toBe(1);
			expect(orchestrator.getProjection('TestProjection')?.subscribedEvents).toContain('TestUpdated');
		});
	});

	describe('registerProjections', () => {
		it('应批量注册多个投影', () => {
			const projections = [
				new TestProjection('Projection1', ['Event1']),
				new TestProjection('Projection2', ['Event2']),
				new TestProjection('Projection3', ['Event3'])
			];

			orchestrator.registerProjections(projections);

			expect(orchestrator.projectionCount).toBe(3);
		});
	});

	describe('unregisterProjection', () => {
		it('应正确取消注册投影', () => {
			const projection = new TestProjection('TestProjection', ['TestCreated']);
			orchestrator.registerProjection(projection);

			const result = orchestrator.unregisterProjection('TestProjection');

			expect(result).toBe(true);
			expect(orchestrator.projectionCount).toBe(0);
		});

		it('取消不存在的投影应返回 false', () => {
			const result = orchestrator.unregisterProjection('NonExistent');

			expect(result).toBe(false);
		});
	});

	describe('startRealtimeSync', () => {
		it('当事件存储不支持订阅时应抛出错误', async () => {
			const eventStoreWithoutSubscribe = {
				appendToStream: jest.fn(),
				loadStream: jest.fn()
			} as unknown as IEventStore;

			const localOrchestrator = new ProjectionOrchestrator(eventStoreWithoutSubscribe);

			await expect(localOrchestrator.startRealtimeSync()).rejects.toThrow('事件存储不支持订阅功能');
		});

		it('应正确启动实时同步', async () => {
			(mockEventStore.subscribe as jest.Mock).mockReturnValue(() => {});

			await orchestrator.startRealtimeSync();

			expect(mockEventStore.subscribe).toHaveBeenCalled();
			expect(orchestrator.isRunning).toBe(true);
		});

		it('重复启动应发出警告', async () => {
			(mockEventStore.subscribe as jest.Mock).mockReturnValue(() => {});

			await orchestrator.startRealtimeSync();
			await orchestrator.startRealtimeSync();

			expect(mockEventStore.subscribe).toHaveBeenCalledTimes(1);
		});
	});

	describe('stopRealtimeSync', () => {
		it('应正确停止实时同步', async () => {
			const unsubscribe = jest.fn();
			(mockEventStore.subscribe as jest.Mock).mockReturnValue(unsubscribe);

			await orchestrator.startRealtimeSync();
			await orchestrator.stopRealtimeSync();

			expect(unsubscribe).toHaveBeenCalled();
			expect(orchestrator.isRunning).toBe(false);
		});
	});

	describe('dispatchEvent', () => {
		it('应将事件分发给订阅的投影', async () => {
			const projection1 = new TestProjection('Projection1', ['TestCreated']);
			const projection2 = new TestProjection('Projection2', ['TestCreated', 'TestUpdated']);
			const projection3 = new TestProjection('Projection3', ['OtherEvent']);

			orchestrator.registerProjections([projection1, projection2, projection3]);

			const event = createMockEvent({ eventType: 'TestCreated' });
			await orchestrator.dispatchEvent(event);

			expect(projection1.handledEvents).toHaveLength(1);
			expect(projection2.handledEvents).toHaveLength(1);
			expect(projection3.handledEvents).toHaveLength(0);
		});

		it('当没有投影订阅事件时应正常返回', async () => {
			const projection = new TestProjection('Projection1', ['OtherEvent']);
			orchestrator.registerProjection(projection);

			const event = createMockEvent({ eventType: 'TestCreated' });
			await orchestrator.dispatchEvent(event);

			expect(projection.handledEvents).toHaveLength(0);
		});

		it('应按顺序分发事件（默认配置）', async () => {
			const order: string[] = [];
			class OrderedProjection extends TestProjection {
				protected async handleEvent(event: StoredEvent): Promise<void> {
					order.push(this.name);
					await super.handleEvent(event);
				}
			}

			const projection1 = new OrderedProjection('Projection1', ['TestCreated']);
			const projection2 = new OrderedProjection('Projection2', ['TestCreated']);

			orchestrator.registerProjections([projection1, projection2]);

			await orchestrator.dispatchEvent(createMockEvent({ eventType: 'TestCreated' }));

			expect(order).toEqual(['Projection1', 'Projection2']);
		});

		it('并行分发模式应并行执行', async () => {
			const localOrchestrator = new ProjectionOrchestrator(mockEventStore, {
				enableParallelDispatch: true
			});

			const order: string[] = [];
			class OrderedProjection extends TestProjection {
				protected async handleEvent(event: StoredEvent): Promise<void> {
					order.push(`${this.name}-start`);
					await new Promise((resolve) => setTimeout(resolve, 10));
					order.push(`${this.name}-end`);
					await super.handleEvent(event);
				}
			}

			const projection1 = new OrderedProjection('Projection1', ['TestCreated']);
			const projection2 = new OrderedProjection('Projection2', ['TestCreated']);

			localOrchestrator.registerProjections([projection1, projection2]);

			await localOrchestrator.dispatchEvent(createMockEvent({ eventType: 'TestCreated' }));

			// 并行执行时，两个投影应该几乎同时开始
			expect(order[0]).toBe('Projection1-start');
			expect(order[1]).toBe('Projection2-start');
		});

		it('投影失败时应重试', async () => {
			const localOrchestrator = new ProjectionOrchestrator(mockEventStore, {
				dispatchRetryCount: 3,
				dispatchRetryDelayMs: 10
			});

			let attempts = 0;
			class RetryProjection extends TestProjection {
				protected async handleEvent(): Promise<void> {
					attempts++;
					if (attempts < 3) {
						throw new Error('临时错误');
					}
				}
			}

			const projection = new RetryProjection('RetryProjection', ['TestCreated']);
			localOrchestrator.registerProjection(projection);

			await localOrchestrator.dispatchEvent(createMockEvent({ eventType: 'TestCreated' }));

			expect(attempts).toBe(3);
		});
	});

	describe('rebuildAll', () => {
		it('应重建所有投影', async () => {
			const createEventGenerator = () => {
				async function* generator(): AsyncIterable<StoredEvent> {
					yield createMockEvent({ eventType: 'TestCreated' });
				}
				return generator();
			};

			(mockEventStore.streamAllEvents as jest.Mock).mockImplementation(() => createEventGenerator());

			const projection1 = new TestProjection('Projection1', ['TestCreated']);
			const projection2 = new TestProjection('Projection2', ['TestCreated']);

			projection1.setEventStore(mockEventStore as unknown as IEventStore);
			projection2.setEventStore(mockEventStore as unknown as IEventStore);

			orchestrator.registerProjections([projection1, projection2]);

			await orchestrator.rebuildAll();

			expect(projection1.handledEvents).toHaveLength(1);
			expect(projection2.handledEvents).toHaveLength(1);
		});

		it('单个投影失败不应影响其他投影', async () => {
			const createEventGenerator = () => {
				async function* generator(): AsyncIterable<StoredEvent> {
					yield createMockEvent({ eventType: 'TestCreated' });
				}
				return generator();
			};

			(mockEventStore.streamAllEvents as jest.Mock).mockImplementation(() => createEventGenerator());

			class ErrorProjection extends TestProjection {
				protected async handleEvent(): Promise<void> {
					throw new Error('处理失败');
				}
			}

			const errorProjection = new ErrorProjection('ErrorProjection', ['TestCreated']);
			const successProjection = new TestProjection('SuccessProjection', ['TestCreated']);

			errorProjection.setEventStore(mockEventStore as unknown as IEventStore);
			successProjection.setEventStore(mockEventStore as unknown as IEventStore);

			orchestrator.registerProjections([errorProjection, successProjection]);

			await orchestrator.rebuildAll();

			expect(successProjection.handledEvents).toHaveLength(1);
		});
	});

	describe('rebuildProjection', () => {
		it('应重建指定投影', async () => {
			const createEventGenerator = () => {
				async function* generator(): AsyncIterable<StoredEvent> {
					yield createMockEvent({ eventType: 'TestCreated' });
				}
				return generator();
			};

			(mockEventStore.streamAllEvents as jest.Mock).mockImplementation(() => createEventGenerator());

			const projection = new TestProjection('TestProjection', ['TestCreated']);
			projection.setEventStore(mockEventStore as unknown as IEventStore);

			orchestrator.registerProjection(projection);

			await orchestrator.rebuildProjection('TestProjection');

			expect(projection.handledEvents).toHaveLength(1);
		});

		it('投影不存在时应抛出错误', async () => {
			await expect(orchestrator.rebuildProjection('NonExistent')).rejects.toThrow('不存在');
		});
	});

	describe('getAllProjectionStatuses', () => {
		it('应返回所有投影状态', async () => {
			const projection1 = new TestProjection('Projection1', ['Event1']);
			const projection2 = new TestProjection('Projection2', ['Event2']);

			orchestrator.registerProjections([projection1, projection2]);

			const statuses = await orchestrator.getAllProjectionStatuses();

			expect(statuses).toHaveLength(2);
			expect(statuses.map((s) => s.name)).toContain('Projection1');
			expect(statuses.map((s) => s.name)).toContain('Projection2');
		});
	});

	describe('pauseProjection and resumeProjection', () => {
		it('应正确暂停和恢复投影', async () => {
			const projection = new TestProjection('TestProjection', ['TestCreated']);
			orchestrator.registerProjection(projection);

			await orchestrator.pauseProjection('TestProjection');
			const pausedStatus = await orchestrator.getProjectionStatus('TestProjection');
			expect(pausedStatus?.status).toBe(ProjectionStatus.PAUSED);

			await orchestrator.resumeProjection('TestProjection');
			const resumedStatus = await orchestrator.getProjectionStatus('TestProjection');
			expect(resumedStatus?.status).toBe(ProjectionStatus.RUNNING);
		});

		it('投影不存在时应抛出错误', async () => {
			await expect(orchestrator.pauseProjection('NonExistent')).rejects.toThrow('不存在');
			await expect(orchestrator.resumeProjection('NonExistent')).rejects.toThrow('不存在');
		});
	});
});
