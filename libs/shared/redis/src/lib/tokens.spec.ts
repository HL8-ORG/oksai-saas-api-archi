import { OKSAI_REDIS, OKSAI_REDLOCK } from './tokens';

describe('Redis 模块依赖注入 Token', () => {
	describe('OKSAI_REDIS', () => {
		it('应该被定义', () => {
			// Assert
			expect(OKSAI_REDIS).toBeDefined();
		});

		it('应该是 Symbol 类型', () => {
			// Assert
			expect(typeof OKSAI_REDIS).toBe('symbol');
		});

		it('description 应为 OKSAI_REDIS', () => {
			// Assert
			expect(OKSAI_REDIS.description).toBe('OKSAI_REDIS');
		});

		it('多次引用应返回同一个 Symbol', () => {
			// Act & Assert
			expect(OKSAI_REDIS).toBe(OKSAI_REDIS);
		});
	});

	describe('OKSAI_REDLOCK', () => {
		it('应该被定义', () => {
			// Assert
			expect(OKSAI_REDLOCK).toBeDefined();
		});

		it('应该是 Symbol 类型', () => {
			// Assert
			expect(typeof OKSAI_REDLOCK).toBe('symbol');
		});

		it('description 应为 OKSAI_REDLOCK', () => {
			// Assert
			expect(OKSAI_REDLOCK.description).toBe('OKSAI_REDLOCK');
		});

		it('多次引用应返回同一个 Symbol', () => {
			// Act & Assert
			expect(OKSAI_REDLOCK).toBe(OKSAI_REDLOCK);
		});
	});

	describe('Token 唯一性', () => {
		it('OKSAI_REDIS 和 OKSAI_REDLOCK 应该是不同的 Symbol', () => {
			// Act & Assert
			expect(OKSAI_REDIS).not.toBe(OKSAI_REDLOCK);
		});

		it('OKSAI_REDIS 不应等于新创建的同名 Symbol', () => {
			// Arrange
			const newSymbol = Symbol('OKSAI_REDIS');

			// Assert
			expect(OKSAI_REDIS).not.toBe(newSymbol);
		});

		it('OKSAI_REDLOCK 不应等于新创建的同名 Symbol', () => {
			// Arrange
			const newSymbol = Symbol('OKSAI_REDLOCK');

			// Assert
			expect(OKSAI_REDLOCK).not.toBe(newSymbol);
		});
	});

	describe('Token 作为对象键使用', () => {
		it('OKSAI_REDIS 可以作为对象键', () => {
			// Arrange
			const container: Record<symbol, string> = {};

			// Act
			container[OKSAI_REDIS] = 'redis-client';

			// Assert
			expect(container[OKSAI_REDIS]).toBe('redis-client');
		});

		it('OKSAI_REDLOCK 可以作为对象键', () => {
			// Arrange
			const container: Record<symbol, string> = {};

			// Act
			container[OKSAI_REDLOCK] = 'redlock-client';

			// Assert
			expect(container[OKSAI_REDLOCK]).toBe('redlock-client');
		});

		it('两个 Token 作为对象键时不应冲突', () => {
			// Arrange
			const container: Record<symbol, string> = {};

			// Act
			container[OKSAI_REDIS] = 'redis-client';
			container[OKSAI_REDLOCK] = 'redlock-client';

			// Assert
			expect(container[OKSAI_REDIS]).toBe('redis-client');
			expect(container[OKSAI_REDLOCK]).toBe('redlock-client');
			expect(Object.getOwnPropertySymbols(container)).toHaveLength(2);
		});
	});
});
