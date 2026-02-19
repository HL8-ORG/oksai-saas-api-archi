import {
	OKSAI_EVENT_BUS_TOKEN,
	OKSAI_INBOX_TOKEN,
	OKSAI_INBOX_INNER_TOKEN,
	OKSAI_OUTBOX_TOKEN,
	OKSAI_OUTBOX_INNER_TOKEN
} from './tokens';

describe('依赖注入 Tokens', () => {
	describe('OKSAI_EVENT_BUS_TOKEN', () => {
		it('应定义为 Symbol', () => {
			expect(typeof OKSAI_EVENT_BUS_TOKEN).toBe('symbol');
		});

		it('应具有正确的描述', () => {
			expect(OKSAI_EVENT_BUS_TOKEN.toString()).toContain('oksai:messaging:eventBus');
		});

		it('多次引用应返回相同的 Symbol', () => {
			const token1 = OKSAI_EVENT_BUS_TOKEN;
			const token2 = OKSAI_EVENT_BUS_TOKEN;
			expect(token1).toBe(token2);
		});
	});

	describe('OKSAI_INBOX_TOKEN', () => {
		it('应定义为 Symbol', () => {
			expect(typeof OKSAI_INBOX_TOKEN).toBe('symbol');
		});

		it('应具有正确的描述', () => {
			expect(OKSAI_INBOX_TOKEN.toString()).toContain('oksai:messaging:inbox');
		});

		it('多次引用应返回相同的 Symbol', () => {
			expect(OKSAI_INBOX_TOKEN).toBe(OKSAI_INBOX_TOKEN);
		});
	});

	describe('OKSAI_OUTBOX_TOKEN', () => {
		it('应定义为 Symbol', () => {
			expect(typeof OKSAI_OUTBOX_TOKEN).toBe('symbol');
		});

		it('应具有正确的描述', () => {
			expect(OKSAI_OUTBOX_TOKEN.toString()).toContain('oksai:messaging:outbox');
		});
	});

	describe('OKSAI_INBOX_INNER_TOKEN', () => {
		it('应定义为 Symbol', () => {
			expect(typeof OKSAI_INBOX_INNER_TOKEN).toBe('symbol');
		});

		it('应具有正确的描述', () => {
			expect(OKSAI_INBOX_INNER_TOKEN.toString()).toContain('oksai:messaging:inbox:inner');
		});
	});

	describe('OKSAI_OUTBOX_INNER_TOKEN', () => {
		it('应定义为 Symbol', () => {
			expect(typeof OKSAI_OUTBOX_INNER_TOKEN).toBe('symbol');
		});

		it('应具有正确的描述', () => {
			expect(OKSAI_OUTBOX_INNER_TOKEN.toString()).toContain('oksai:messaging:outbox:inner');
		});
	});

	describe('Token 唯一性', () => {
		it('所有 Token 应互不相同', () => {
			const tokens = [
				OKSAI_EVENT_BUS_TOKEN,
				OKSAI_INBOX_TOKEN,
				OKSAI_OUTBOX_TOKEN,
				OKSAI_INBOX_INNER_TOKEN,
				OKSAI_OUTBOX_INNER_TOKEN
			];

			const uniqueTokens = new Set(tokens);
			expect(uniqueTokens.size).toBe(tokens.length);
		});

		it('Inner Token 应与主 Token 不同', () => {
			expect(OKSAI_INBOX_TOKEN).not.toBe(OKSAI_INBOX_INNER_TOKEN);
			expect(OKSAI_OUTBOX_TOKEN).not.toBe(OKSAI_OUTBOX_INNER_TOKEN);
		});
	});

	describe('Symbol.for 行为', () => {
		it('使用相同 key 的 Symbol.for 应返回相同的 Symbol', () => {
			const eventBusKey = Symbol.for('oksai:messaging:eventBus');
			expect(eventBusKey).toBe(OKSAI_EVENT_BUS_TOKEN);
		});

		it('全局 Symbol 注册表应正确注册', () => {
			expect(Symbol.keyFor(OKSAI_EVENT_BUS_TOKEN)).toBe('oksai:messaging:eventBus');
			expect(Symbol.keyFor(OKSAI_INBOX_TOKEN)).toBe('oksai:messaging:inbox');
			expect(Symbol.keyFor(OKSAI_OUTBOX_TOKEN)).toBe('oksai:messaging:outbox');
			expect(Symbol.keyFor(OKSAI_INBOX_INNER_TOKEN)).toBe('oksai:messaging:inbox:inner');
			expect(Symbol.keyFor(OKSAI_OUTBOX_INNER_TOKEN)).toBe('oksai:messaging:outbox:inner');
		});
	});

	describe('依赖注入使用场景', () => {
		it('Token 可用于 Map 的键', () => {
			const container = new Map();
			container.set(OKSAI_EVENT_BUS_TOKEN, { publish: async () => undefined });
			container.set(OKSAI_INBOX_TOKEN, { isProcessed: async () => false });

			expect(container.has(OKSAI_EVENT_BUS_TOKEN)).toBe(true);
			expect(container.has(OKSAI_INBOX_TOKEN)).toBe(true);
		});

		it('Token 可用于对象属性', () => {
			const providers = {
				[OKSAI_EVENT_BUS_TOKEN]: class EventBusMock {},
				[OKSAI_INBOX_TOKEN]: class InboxMock {}
			};

			expect(providers[OKSAI_EVENT_BUS_TOKEN]).toBeDefined();
			expect(providers[OKSAI_INBOX_TOKEN]).toBeDefined();
		});
	});
});
