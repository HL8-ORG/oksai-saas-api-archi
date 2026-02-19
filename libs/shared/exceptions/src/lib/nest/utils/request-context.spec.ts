import { getRequestId } from './request-context';

/**
 * @description getRequestId 单元测试
 *
 * 测试覆盖：
 * - 从 x-request-id header 提取
 * - 从 x-correlation-id header 提取（备选）
 * - 从 req.id 提取（Fastify 默认）
 * - 从 req.requestId 提取
 * - 各种边界情况
 */
describe('getRequestId', () => {
	describe('从 header 提取', () => {
		it('应优先从 x-request-id header 提取', () => {
			// Arrange
			const req = { headers: { 'x-request-id': 'header-request-id' } };

			// Act
			const result = getRequestId(req);

			// Assert
			expect(result).toBe('header-request-id');
		});

		it('应从 x-correlation-id header 提取（作为备选）', () => {
			// Arrange
			const req = { headers: { 'x-correlation-id': 'correlation-123' } };

			// Act
			const result = getRequestId(req);

			// Assert
			expect(result).toBe('correlation-123');
		});

		it('x-request-id 优先级高于 x-correlation-id', () => {
			// Arrange
			const req = {
				headers: {
					'x-request-id': 'priority-id',
					'x-correlation-id': 'fallback-id'
				}
			};

			// Act
			const result = getRequestId(req);

			// Assert
			expect(result).toBe('priority-id');
		});

		it('header 名称为小写时可正确提取', () => {
			// Arrange
			const req = {
				headers: {
					'x-request-id': 'lowercase-header'
				}
			};

			// Act
			const result = getRequestId(req);

			// Assert
			expect(result).toBe('lowercase-header');
		});
	});

	describe('从请求对象属性提取', () => {
		it('应从 req.id 提取（Fastify 默认）', () => {
			// Arrange
			const req = { headers: {}, id: 'fastify-id-123' };

			// Act
			const result = getRequestId(req);

			// Assert
			expect(result).toBe('fastify-id-123');
		});

		it('应从 req.requestId 提取', () => {
			// Arrange
			const req = { headers: {}, requestId: 'custom-request-id' };

			// Act
			const result = getRequestId(req);

			// Assert
			expect(result).toBe('custom-request-id');
		});

		it('header 优先级高于 req.id', () => {
			// Arrange
			const req = {
				headers: { 'x-request-id': 'header-priority' },
				id: 'fastify-id'
			};

			// Act
			const result = getRequestId(req);

			// Assert
			expect(result).toBe('header-priority');
		});

		it('req.id 优先级高于 req.requestId', () => {
			// Arrange
			const req = {
				headers: {},
				id: 'fastify-id-priority',
				requestId: 'custom-request-id'
			};

			// Act
			const result = getRequestId(req);

			// Assert
			expect(result).toBe('fastify-id-priority');
		});
	});

	describe('边界情况', () => {
		it('无任何 requestId 时应返回 unknown', () => {
			// Arrange
			const req = { headers: {} };

			// Act
			const result = getRequestId(req);

			// Assert
			expect(result).toBe('unknown');
		});

		it('传入 null 时应返回 unknown', () => {
			// Arrange & Act
			const result = getRequestId(null);

			// Assert
			expect(result).toBe('unknown');
		});

		it('传入 undefined 时应返回 unknown', () => {
			// Arrange & Act
			const result = getRequestId(undefined);

			// Assert
			expect(result).toBe('unknown');
		});

		it('headers 为 null 时应返回 unknown', () => {
			// Arrange
			const req = { headers: null };

			// Act
			const result = getRequestId(req);

			// Assert
			expect(result).toBe('unknown');
		});

		it('headers 为 undefined 时应返回 unknown', () => {
			// Arrange
			const req = { headers: undefined };

			// Act
			const result = getRequestId(req);

			// Assert
			expect(result).toBe('unknown');
		});

		it('空对象时应返回 unknown', () => {
			// Arrange
			const req = {};

			// Act
			const result = getRequestId(req);

			// Assert
			expect(result).toBe('unknown');
		});

		it('x-request-id 为空字符串时应返回空字符串', () => {
			// Arrange
			const req = { headers: { 'x-request-id': '' } };

			// Act
			const result = getRequestId(req);

			// Assert
			expect(result).toBe('');
		});

		it('x-request-id 为数字时应返回字符串形式', () => {
			// Arrange
			const req = { headers: { 'x-request-id': 12345 } };

			// Act
			const result = getRequestId(req);

			// Assert
			expect(result).toBe('12345');
		});

		it('req.id 为数字时应返回字符串形式', () => {
			// Arrange
			const req = { headers: {}, id: 999 };

			// Act
			const result = getRequestId(req);

			// Assert
			expect(result).toBe('999');
		});

		it('完整的优先级顺序：x-request-id > x-correlation-id > req.id > req.requestId > unknown', () => {
			// x-request-id 最高优先级
			const req1 = {
				headers: { 'x-request-id': 'a', 'x-correlation-id': 'b' },
				id: 'c',
				requestId: 'd'
			};
			expect(getRequestId(req1)).toBe('a');

			// x-correlation-id 次优先级
			const req2 = {
				headers: { 'x-correlation-id': 'b' },
				id: 'c',
				requestId: 'd'
			};
			expect(getRequestId(req2)).toBe('b');

			// req.id 次优先级
			const req3 = {
				headers: {},
				id: 'c',
				requestId: 'd'
			};
			expect(getRequestId(req3)).toBe('c');

			// req.requestId 次优先级
			const req4 = {
				headers: {},
				requestId: 'd'
			};
			expect(getRequestId(req4)).toBe('d');

			// 无任何字段
			const req5 = { headers: {} };
			expect(getRequestId(req5)).toBe('unknown');
		});
	});
});
