import type { Disposable, IEventBus } from './event-bus';
import { InMemoryOutbox } from './in-memory-outbox';
import { IntegrationEventEnvelope } from './integration-event-envelope';
import { OutboxPublisherService } from './outbox-publisher.service';

describe('OutboxPublisherService', () => {
	it('should publish pending records and markPublished', async () => {
		const outbox = new InMemoryOutbox();

		const bus: IEventBus = {
			publish: jest.fn(async () => undefined),
			subscribe: async (): Promise<Disposable> => ({ dispose: () => undefined })
		};

		await outbox.append(
			new IntegrationEventEnvelope({
				eventType: 'TenantCreated',
				messageId: 'm-100',
				payload: { ok: true }
			})
		);

		const publisher = new OutboxPublisherService(outbox, bus);
		await publisher.tickOnce();

		expect(bus.publish).toHaveBeenCalledTimes(1);
		expect(outbox.getSnapshot('m-100')?.status).toBe('published');
	});

	it('should markFailed and backoff on publish error', async () => {
		const outbox = new InMemoryOutbox();
		const bus: IEventBus = {
			publish: jest.fn(async () => {
				throw new Error('publish failed');
			}),
			subscribe: async (): Promise<Disposable> => ({ dispose: () => undefined })
		};

		await outbox.append(
			new IntegrationEventEnvelope({
				eventType: 'TenantCreated',
				messageId: 'm-200',
				payload: {}
			})
		);

		const publisher = new OutboxPublisherService(outbox, bus);
		await publisher.tickOnce();

		const snap = outbox.getSnapshot('m-200');
		expect(bus.publish).toHaveBeenCalledTimes(1);
		expect(snap?.status).toBe('pending');
		expect(snap?.attempts).toBe(1);
		expect(snap?.lastError).toContain('publish failed');

		// 下次未到重试时间不应再次发布
		await publisher.tickOnce();
		expect(bus.publish).toHaveBeenCalledTimes(1);
	});
});

