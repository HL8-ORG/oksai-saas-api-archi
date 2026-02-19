import type { IOutbox, OutboxRecord, OutboxRecordStatus } from './outbox';

describe('Outbox 类型定义', () => {
	describe('OutboxRecordStatus', () => {
		it('应包含 pending 状态', () => {
			const status: OutboxRecordStatus = 'pending';
			expect(status).toBe('pending');
		});

		it('应包含 published 状态', () => {
			const status: OutboxRecordStatus = 'published';
			expect(status).toBe('published');
		});
	});

	describe('OutboxRecord', () => {
		it('应包含所有必需字段', () => {
			const record: OutboxRecord = {
				messageId: 'msg-1',
				eventType: 'TestEvent',
				occurredAt: new Date(),
				schemaVersion: 1,
				payload: { data: 'test' },
				status: 'pending',
				attempts: 0,
				nextAttemptAt: new Date(),
				createdAt: new Date(),
				updatedAt: new Date()
			};

			expect(record.messageId).toBe('msg-1');
			expect(record.eventType).toBe('TestEvent');
			expect(record.status).toBe('pending');
		});

		it('应支持可选的上下文字段', () => {
			const record: OutboxRecord = {
				messageId: 'msg-1',
				eventType: 'TestEvent',
				occurredAt: new Date(),
				schemaVersion: 1,
				tenantId: 'tenant-1',
				userId: 'user-1',
				requestId: 'req-1',
				payload: {},
				status: 'pending',
				attempts: 0,
				nextAttemptAt: new Date(),
				createdAt: new Date(),
				updatedAt: new Date()
			};

			expect(record.tenantId).toBe('tenant-1');
			expect(record.userId).toBe('user-1');
			expect(record.requestId).toBe('req-1');
		});

		it('应支持可选的 lastError 字段', () => {
			const record: OutboxRecord = {
				messageId: 'msg-1',
				eventType: 'TestEvent',
				occurredAt: new Date(),
				schemaVersion: 1,
				payload: {},
				status: 'pending',
				attempts: 1,
				nextAttemptAt: new Date(),
				lastError: '连接超时',
				createdAt: new Date(),
				updatedAt: new Date()
			};

			expect(record.lastError).toBe('连接超时');
		});

		it('应支持泛型 payload 类型', () => {
			interface UserCreatedPayload {
				userId: string;
				email: string;
			}

			const record: OutboxRecord<UserCreatedPayload> = {
				messageId: 'msg-1',
				eventType: 'UserCreated',
				occurredAt: new Date(),
				schemaVersion: 1,
				payload: { userId: 'u-1', email: 'test@example.com' },
				status: 'pending',
				attempts: 0,
				nextAttemptAt: new Date(),
				createdAt: new Date(),
				updatedAt: new Date()
			};

			expect(record.payload.userId).toBe('u-1');
			expect(record.payload.email).toBe('test@example.com');
		});
	});
});

describe('IOutbox 接口契约', () => {
	it('IOutbox 接口应定义 append 方法', () => {
		const outbox: IOutbox = {
			append: async () => undefined,
			listPending: async () => [],
			markPublished: async () => undefined,
			markFailed: async () => undefined
		};
		expect(typeof outbox.append).toBe('function');
	});

	it('IOutbox 接口应定义 listPending 方法', () => {
		const outbox: IOutbox = {
			append: async () => undefined,
			listPending: async () => [],
			markPublished: async () => undefined,
			markFailed: async () => undefined
		};
		expect(typeof outbox.listPending).toBe('function');
	});

	it('IOutbox 接口应定义 markPublished 方法', () => {
		const outbox: IOutbox = {
			append: async () => undefined,
			listPending: async () => [],
			markPublished: async () => undefined,
			markFailed: async () => undefined
		};
		expect(typeof outbox.markPublished).toBe('function');
	});

	it('IOutbox 接口应定义 markFailed 方法', () => {
		const outbox: IOutbox = {
			append: async () => undefined,
			listPending: async () => [],
			markPublished: async () => undefined,
			markFailed: async () => undefined
		};
		expect(typeof outbox.markFailed).toBe('function');
	});

	it('listPending 应支持可选参数', async () => {
		const outbox: IOutbox = {
			append: async () => undefined,
			listPending: async (params) => {
				expect(params?.now).toBeInstanceOf(Date);
				expect(typeof params?.limit).toBe('number');
				return [];
			},
			markPublished: async () => undefined,
			markFailed: async () => undefined
		};

		await outbox.listPending({ now: new Date(), limit: 10 });
	});

	it('markFailed 应接受正确的参数结构', async () => {
		const outbox: IOutbox = {
			append: async () => undefined,
			listPending: async () => [],
			markPublished: async () => undefined,
			markFailed: async (params) => {
				expect(typeof params.messageId).toBe('string');
				expect(typeof params.attempts).toBe('number');
				expect(params.nextAttemptAt).toBeInstanceOf(Date);
				expect(params.lastError === undefined || typeof params.lastError === 'string').toBe(true);
			}
		};

		await outbox.markFailed({
			messageId: 'msg-1',
			attempts: 1,
			nextAttemptAt: new Date(),
			lastError: '错误信息'
		});
	});
});
