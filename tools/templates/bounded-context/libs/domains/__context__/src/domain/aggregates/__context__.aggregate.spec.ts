import { __CONTEXT__Aggregate } from './__context__.aggregate';

describe('__CONTEXT__Aggregate (模板)', () => {
	it('should record created event on create', () => {
		const agg = __CONTEXT__Aggregate.create('x_1', 'NAME');
		const events = agg.getUncommittedEvents();
		expect(events).toHaveLength(1);
		expect(events[0]?.eventType).toBe('__CONTEXT__Created');
	});
});

