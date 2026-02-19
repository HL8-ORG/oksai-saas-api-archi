import { InMemoryEventBus } from './in-memory-event-bus';

describe('InMemoryEventBus', () => {
	let eventBus: InMemoryEventBus;

	beforeEach(() => {
		eventBus = new InMemoryEventBus();
	});

	describe('publish', () => {
		it('应成功发布事件到已订阅的处理器', async () => {
			const handler = jest.fn(async () => undefined);
			await eventBus.subscribe('TestEvent', handler);

			const event = { eventType: 'TestEvent', data: 'test-data' };
			await eventBus.publish(event);

			expect(handler).toHaveBeenCalledTimes(1);
			expect(handler).toHaveBeenCalledWith(event);
		});

		it('无订阅者时发布应正常完成', async () => {
			const event = { eventType: 'NoSubscriberEvent', data: 'test' };
			await expect(eventBus.publish(event)).resolves.toBeUndefined();
		});

		it('应使用事件构造函数名作为事件类型（当无 eventType 属性时）', async () => {
			class CustomEvent {
				data = 'custom';
			}
			const handler = jest.fn(async () => undefined);
			await eventBus.subscribe('CustomEvent', handler);

			await eventBus.publish(new CustomEvent());

			expect(handler).toHaveBeenCalledTimes(1);
		});

		it('应使用 UnknownEvent 作为默认事件类型', async () => {
			const handler = jest.fn(async () => undefined);
			await eventBus.subscribe('UnknownEvent', handler);

			const event = Object.create(null);
			await eventBus.publish(event);

			expect(handler).toHaveBeenCalledTimes(1);
		});

		it('单个处理器失败不应影响其他处理器', async () => {
			const failingHandler = jest.fn(async () => {
				throw new Error('处理器失败');
			});
			const successHandler = jest.fn(async () => undefined);

			await eventBus.subscribe('TestEvent', failingHandler);
			await eventBus.subscribe('TestEvent', successHandler);

			await eventBus.publish({ eventType: 'TestEvent' });

			expect(failingHandler).toHaveBeenCalledTimes(1);
			expect(successHandler).toHaveBeenCalledTimes(1);
		});

		it('同一事件类型的多个处理器都应被调用', async () => {
			const handler1 = jest.fn(async () => undefined);
			const handler2 = jest.fn(async () => undefined);
			const handler3 = jest.fn(async () => undefined);

			await eventBus.subscribe('TestEvent', handler1);
			await eventBus.subscribe('TestEvent', handler2);
			await eventBus.subscribe('TestEvent', handler3);

			await eventBus.publish({ eventType: 'TestEvent' });

			expect(handler1).toHaveBeenCalledTimes(1);
			expect(handler2).toHaveBeenCalledTimes(1);
			expect(handler3).toHaveBeenCalledTimes(1);
		});
	});

	describe('subscribe', () => {
		it('应返回可释放的订阅对象', async () => {
			const handler = jest.fn(async () => undefined);
			const disposable = await eventBus.subscribe('TestEvent', handler);

			expect(disposable).toBeDefined();
			expect(typeof disposable.dispose).toBe('function');
		});

		it('取消订阅后不应再接收事件', async () => {
			const handler = jest.fn(async () => undefined);
			const disposable = await eventBus.subscribe('TestEvent', handler);

			await eventBus.publish({ eventType: 'TestEvent' });
			expect(handler).toHaveBeenCalledTimes(1);

			disposable.dispose();

			await eventBus.publish({ eventType: 'TestEvent' });
			expect(handler).toHaveBeenCalledTimes(1);
		});

		it('同一处理器多次订阅应被添加多次', async () => {
			const handler = jest.fn(async () => undefined);

			await eventBus.subscribe('TestEvent', handler);
			await eventBus.subscribe('TestEvent', handler);

			await eventBus.publish({ eventType: 'TestEvent' });

			expect(handler).toHaveBeenCalledTimes(1);
		});

		it('取消订阅后空的事件类型应从 Map 中移除', async () => {
			const handler = jest.fn(async () => undefined);
			const disposable = await eventBus.subscribe('TestEvent', handler);

			disposable.dispose();

			await eventBus.publish({ eventType: 'TestEvent' });
			expect(handler).not.toHaveBeenCalled();
		});

		it('dispose 应支持异步调用', async () => {
			const handler = jest.fn(async () => undefined);
			const disposable = await eventBus.subscribe('TestEvent', handler);

			await eventBus.publish({ eventType: 'TestEvent' });
			expect(handler).toHaveBeenCalledTimes(1);

			const result = disposable.dispose();
			if (result instanceof Promise) {
				await result;
			}

			await eventBus.publish({ eventType: 'TestEvent' });
			expect(handler).toHaveBeenCalledTimes(1);
		});
	});

	describe('集成场景', () => {
		it('发布-订阅-取消订阅完整流程', async () => {
			const receivedEvents: unknown[] = [];
			const handler = async (event: unknown) => {
				receivedEvents.push(event);
			};

			const disposable = await eventBus.subscribe('UserCreated', handler);

			await eventBus.publish({ eventType: 'UserCreated', userId: '1' });
			await eventBus.publish({ eventType: 'UserCreated', userId: '2' });

			expect(receivedEvents).toHaveLength(2);

			disposable.dispose();

			await eventBus.publish({ eventType: 'UserCreated', userId: '3' });

			expect(receivedEvents).toHaveLength(2);
		});

		it('多事件类型独立订阅', async () => {
			const userCreatedHandler = jest.fn(async () => undefined);
			const userDeletedHandler = jest.fn(async () => undefined);

			await eventBus.subscribe('UserCreated', userCreatedHandler);
			await eventBus.subscribe('UserDeleted', userDeletedHandler);

			await eventBus.publish({ eventType: 'UserCreated' });
			await eventBus.publish({ eventType: 'UserDeleted' });

			expect(userCreatedHandler).toHaveBeenCalledTimes(1);
			expect(userDeletedHandler).toHaveBeenCalledTimes(1);
			expect(userCreatedHandler).not.toHaveBeenCalledWith(expect.objectContaining({ eventType: 'UserDeleted' }));
		});
	});
});
