import { createIntegrationEventEnvelope, IntegrationEventEnvelope } from './integration-event-envelope';

describe('IntegrationEventEnvelope', () => {
	describe('构造函数', () => {
		it('应使用必需参数创建 Envelope', () => {
			const envelope = new IntegrationEventEnvelope({
				eventType: 'UserCreated',
				payload: { userId: 'u-1' }
			});

			expect(envelope.eventType).toBe('UserCreated');
			expect(envelope.payload).toEqual({ userId: 'u-1' });
		});

		it('应自动生成 messageId', () => {
			const envelope = new IntegrationEventEnvelope({
				eventType: 'TestEvent',
				payload: {}
			});

			expect(envelope.messageId).toBeDefined();
			expect(typeof envelope.messageId).toBe('string');
			expect(envelope.messageId.length).toBeGreaterThan(0);
		});

		it('应自动生成 occurredAt', () => {
			const before = new Date();
			const envelope = new IntegrationEventEnvelope({
				eventType: 'TestEvent',
				payload: {}
			});
			const after = new Date();

			expect(envelope.occurredAt).toBeInstanceOf(Date);
			expect(envelope.occurredAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
			expect(envelope.occurredAt.getTime()).toBeLessThanOrEqual(after.getTime());
		});

		it('应使用默认 schemaVersion 为 1', () => {
			const envelope = new IntegrationEventEnvelope({
				eventType: 'TestEvent',
				payload: {}
			});

			expect(envelope.schemaVersion).toBe(1);
		});

		it('应接受自定义 messageId', () => {
			const envelope = new IntegrationEventEnvelope({
				eventType: 'TestEvent',
				payload: {},
				messageId: 'custom-msg-id'
			});

			expect(envelope.messageId).toBe('custom-msg-id');
		});

		it('应接受自定义 occurredAt', () => {
			const customDate = new Date('2024-01-01T00:00:00Z');
			const envelope = new IntegrationEventEnvelope({
				eventType: 'TestEvent',
				payload: {},
				occurredAt: customDate
			});

			expect(envelope.occurredAt).toBe(customDate);
		});

		it('应接受自定义 schemaVersion', () => {
			const envelope = new IntegrationEventEnvelope({
				eventType: 'TestEvent',
				payload: {},
				schemaVersion: 2
			});

			expect(envelope.schemaVersion).toBe(2);
		});

		it('应接受可选的上下文字段', () => {
			const envelope = new IntegrationEventEnvelope({
				eventType: 'TestEvent',
				payload: {},
				tenantId: 'tenant-1',
				userId: 'user-1',
				requestId: 'req-1'
			});

			expect(envelope.tenantId).toBe('tenant-1');
			expect(envelope.userId).toBe('user-1');
			expect(envelope.requestId).toBe('req-1');
		});

		it('上下文字段应为可选的', () => {
			const envelope = new IntegrationEventEnvelope({
				eventType: 'TestEvent',
				payload: {}
			});

			expect(envelope.tenantId).toBeUndefined();
			expect(envelope.userId).toBeUndefined();
			expect(envelope.requestId).toBeUndefined();
		});
	});

	describe('泛型 payload', () => {
		it('应支持强类型 payload', () => {
			interface UserCreatedPayload {
				userId: string;
				email: string;
				name: string;
			}

			const envelope = new IntegrationEventEnvelope<UserCreatedPayload>({
				eventType: 'UserCreated',
				payload: {
					userId: 'u-1',
					email: 'test@example.com',
					name: 'Test User'
				}
			});

			expect(envelope.payload.userId).toBe('u-1');
			expect(envelope.payload.email).toBe('test@example.com');
			expect(envelope.payload.name).toBe('Test User');
		});

		it('应支持复杂嵌套 payload', () => {
			interface OrderCreatedPayload {
				orderId: string;
				items: Array<{
					productId: string;
					quantity: number;
					price: number;
				}>;
				metadata: {
					source: string;
					tags: string[];
				};
			}

			const envelope = new IntegrationEventEnvelope<OrderCreatedPayload>({
				eventType: 'OrderCreated',
				payload: {
					orderId: 'o-1',
					items: [
						{ productId: 'p-1', quantity: 2, price: 100 },
						{ productId: 'p-2', quantity: 1, price: 200 }
					],
					metadata: {
						source: 'web',
						tags: ['priority', 'express']
					}
				}
			});

			expect(envelope.payload.items).toHaveLength(2);
			expect(envelope.payload.metadata.tags).toContain('priority');
		});
	});

	describe('只读属性', () => {
		it('messageId 属性应标记为 readonly（TypeScript 编译时检查）', () => {
			const envelope = new IntegrationEventEnvelope({
				eventType: 'TestEvent',
				payload: {}
			});

			expect(envelope.messageId).toBeDefined();
			expect(typeof envelope.messageId).toBe('string');
		});

		it('eventType 属性应标记为 readonly', () => {
			const envelope = new IntegrationEventEnvelope({
				eventType: 'TestEvent',
				payload: {}
			});

			expect(envelope.eventType).toBe('TestEvent');
		});
	});

	describe('唯一性', () => {
		it('多个 Envelope 应生成不同的 messageId', () => {
			const envelope1 = new IntegrationEventEnvelope({
				eventType: 'TestEvent',
				payload: {}
			});
			const envelope2 = new IntegrationEventEnvelope({
				eventType: 'TestEvent',
				payload: {}
			});

			expect(envelope1.messageId).not.toBe(envelope2.messageId);
		});
	});
});

describe('createIntegrationEventEnvelope', () => {
	it('应创建基本的 Envelope', () => {
		const envelope = createIntegrationEventEnvelope('TestEvent', { data: 'test' });

		expect(envelope.eventType).toBe('TestEvent');
		expect(envelope.payload).toEqual({ data: 'test' });
		expect(envelope.messageId).toBeDefined();
		expect(envelope.schemaVersion).toBe(1);
	});

	it('应接受可选的 meta 参数', () => {
		const envelope = createIntegrationEventEnvelope(
			'TestEvent',
			{ data: 'test' },
			{
				tenantId: 'tenant-1',
				userId: 'user-1',
				requestId: 'req-1',
				schemaVersion: 2,
				messageId: 'custom-id'
			}
		);

		expect(envelope.tenantId).toBe('tenant-1');
		expect(envelope.userId).toBe('user-1');
		expect(envelope.requestId).toBe('req-1');
		expect(envelope.schemaVersion).toBe(2);
		expect(envelope.messageId).toBe('custom-id');
	});

	it('应支持部分 meta 参数', () => {
		const envelope = createIntegrationEventEnvelope(
			'TestEvent',
			{},
			{
				tenantId: 'tenant-1'
			}
		);

		expect(envelope.tenantId).toBe('tenant-1');
		expect(envelope.userId).toBeUndefined();
		expect(envelope.requestId).toBeUndefined();
	});

	it('应返回 IntegrationEventEnvelope 实例', () => {
		const envelope = createIntegrationEventEnvelope('TestEvent', {});

		expect(envelope).toBeInstanceOf(IntegrationEventEnvelope);
	});

	it('应支持泛型 payload 类型', () => {
		interface TenantCreatedPayload {
			tenantId: string;
			name: string;
			slug: string;
		}

		const envelope = createIntegrationEventEnvelope<TenantCreatedPayload>('TenantCreated', {
			tenantId: 't-1',
			name: 'Test Tenant',
			slug: 'test-tenant'
		});

		expect(envelope.payload.tenantId).toBe('t-1');
		expect(envelope.payload.slug).toBe('test-tenant');
	});

	it('空 meta 参数应使用默认值', () => {
		const envelope = createIntegrationEventEnvelope('TestEvent', {});

		expect(envelope.schemaVersion).toBe(1);
		expect(envelope.messageId).toBeDefined();
		expect(envelope.tenantId).toBeUndefined();
	});
});
