import { IntegrationEventEnvelope } from './integration-event-envelope';
import { InMemoryOutbox } from './in-memory-outbox';

describe('InMemoryOutbox', () => {
	it('should append and list pending records', async () => {
		const outbox = new InMemoryOutbox();
		const envelope = new IntegrationEventEnvelope({
			eventType: 'TenantCreated',
			messageId: 'm-1',
			payload: { a: 1 }
		});

		await outbox.append(envelope);

		const pending = await outbox.listPending({ now: new Date(), limit: 10 });
		expect(pending).toHaveLength(1);
		expect(pending[0]?.messageId).toBe('m-1');
		expect(pending[0]?.status).toBe('pending');
	});

	it('should fail-fast on duplicate messageId', async () => {
		const outbox = new InMemoryOutbox();
		const envelope = new IntegrationEventEnvelope({
			eventType: 'TenantCreated',
			messageId: 'dup-1',
			payload: {}
		});

		await outbox.append(envelope);
		await expect(outbox.append(envelope)).rejects.toThrow('Outbox 追加失败');
	});

	it('should markPublished', async () => {
		const outbox = new InMemoryOutbox();
		await outbox.append(
			new IntegrationEventEnvelope({
				eventType: 'TenantCreated',
				messageId: 'pub-1',
				payload: {}
			})
		);

		await outbox.markPublished('pub-1');
		const snap = outbox.getSnapshot('pub-1');
		expect(snap?.status).toBe('published');
	});

	it('should filter by nextAttemptAt', async () => {
		const outbox = new InMemoryOutbox();
		await outbox.append(
			new IntegrationEventEnvelope({
				eventType: 'TenantCreated',
				messageId: 'retry-1',
				payload: {}
			})
		);

		const future = new Date(Date.now() + 10_000);
		await outbox.markFailed({ messageId: 'retry-1', attempts: 1, nextAttemptAt: future, lastError: 'boom' });

		const pendingNow = await outbox.listPending({ now: new Date(), limit: 10 });
		expect(pendingNow).toHaveLength(0);

		const pendingFuture = await outbox.listPending({ now: new Date(Date.now() + 20_000), limit: 10 });
		expect(pendingFuture).toHaveLength(1);
	});
});

