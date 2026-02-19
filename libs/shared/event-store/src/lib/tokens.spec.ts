import { OKSAI_EVENT_STORE_TOKEN } from './tokens';

describe('Tokens', () => {
	describe('OKSAI_EVENT_STORE_TOKEN', () => {
		it('应定义为 Symbol', () => {
			// Assert
			expect(typeof OKSAI_EVENT_STORE_TOKEN).toBe('symbol');
		});

		it('应使用 Symbol.for 确保全局唯一', () => {
			// Arrange
			const expectedSymbol = Symbol.for('oksai:event-store:eventStore');

			// Assert
			expect(OKSAI_EVENT_STORE_TOKEN).toBe(expectedSymbol);
		});

		it('多次引用应返回相同的 Symbol', () => {
			// Arrange
			const token1 = OKSAI_EVENT_STORE_TOKEN;
			const token2 = Symbol.for('oksai:event-store:eventStore');

			// Assert
			expect(token1).toBe(token2);
		});

		it('Token 描述应包含命名空间', () => {
			// Assert
			const description = OKSAI_EVENT_STORE_TOKEN.description;
			expect(description).toBe('oksai:event-store:eventStore');
		});
	});
});
