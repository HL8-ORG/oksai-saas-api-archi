import type { Disposable, IEventBus } from './event-bus';

describe('IEventBus 接口契约', () => {
	it('IEventBus 接口应定义 publish 方法', () => {
		const bus: IEventBus = {
			publish: async () => undefined,
			subscribe: async () => ({ dispose: () => undefined })
		};
		expect(typeof bus.publish).toBe('function');
	});

	it('IEventBus 接口应定义 subscribe 方法', () => {
		const bus: IEventBus = {
			publish: async () => undefined,
			subscribe: async () => ({ dispose: () => undefined })
		};
		expect(typeof bus.subscribe).toBe('function');
	});

	it('Disposable 接口应定义 dispose 方法', () => {
		const disposable: Disposable = { dispose: () => undefined };
		expect(typeof disposable.dispose).toBe('function');
	});

	it('Disposable.dispose 应支持同步调用', () => {
		const disposable: Disposable = { dispose: () => undefined };
		const result = disposable.dispose();
		expect(result).toBeUndefined();
	});

	it('Disposable.dispose 应支持异步调用', async () => {
		const disposable: Disposable = { dispose: async () => undefined };
		const result = await disposable.dispose();
		expect(result).toBeUndefined();
	});

	it('publish 方法应接受泛型事件类型', async () => {
		interface TestEvent {
			eventType: string;
			data: string;
		}
		const bus: IEventBus = {
			publish: async () => undefined,
			subscribe: async () => ({ dispose: () => undefined })
		};
		const event: TestEvent = { eventType: 'TestEvent', data: 'test' };
		await expect(bus.publish(event)).resolves.toBeUndefined();
	});

	it('subscribe 方法应返回 Disposable', async () => {
		const bus: IEventBus = {
			publish: async () => undefined,
			subscribe: async () => ({ dispose: () => undefined })
		};
		const handler = async () => undefined;
		const disposable = await bus.subscribe('TestEvent', handler);
		expect(disposable).toBeDefined();
		expect(typeof disposable.dispose).toBe('function');
	});
});
