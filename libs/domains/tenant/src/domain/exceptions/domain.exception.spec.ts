import { DomainException } from './domain.exception';

describe('DomainException 领域异常', () => {
	describe('构造函数', () => {
		it('应该使用消息创建异常', () => {
			// Arrange
			const message = '租户名称不能为空';

			// Act
			const exception = new DomainException(message);

			// Assert
			expect(exception.message).toBe(message);
		});

		it('应该继承 Error 类', () => {
			// Arrange & Act
			const exception = new DomainException('测试异常');

			// Assert
			expect(exception).toBeInstanceOf(Error);
		});
	});

	describe('name 属性', () => {
		it('name 应该是 DomainException', () => {
			// Arrange & Act
			const exception = new DomainException('测试异常');

			// Assert
			expect(exception.name).toBe('DomainException');
		});
	});

	describe('错误消息', () => {
		it('应该支持中文错误消息', () => {
			// Arrange
			const message = '租户名称长度必须在 2-50 之间';

			// Act
			const exception = new DomainException(message);

			// Assert
			expect(exception.message).toBe(message);
		});

		it('应该支持包含变量的错误消息', () => {
			// Arrange
			const tenantId = 't-001';
			const message = `租户事件流非法：缺少创建事件（tenantId=${tenantId}）。`;

			// Act
			const exception = new DomainException(message);

			// Assert
			expect(exception.message).toBe(message);
		});

		it('应该支持空字符串消息', () => {
			// Arrange & Act
			const exception = new DomainException('');

			// Assert
			expect(exception.message).toBe('');
		});
	});

	describe('异常抛出和捕获', () => {
		it('应该能够被 try-catch 捕获', () => {
			// Arrange & Act & Assert
			expect(() => {
				throw new DomainException('测试异常');
			}).toThrow(DomainException);
		});

		it('应该能够通过 instanceof 检查', () => {
			// Arrange
			const exception = new DomainException('测试异常');

			// Act & Assert
			expect(exception instanceof DomainException).toBe(true);
			expect(exception instanceof Error).toBe(true);
		});

		it('应该能够正确获取堆栈信息', () => {
			// Arrange & Act
			const exception = new DomainException('测试异常');

			// Assert
			expect(exception.stack).toBeDefined();
			expect(exception.stack).toContain('DomainException');
		});
	});

	describe('使用场景', () => {
		it('值对象校验失败时应该抛出 DomainException', () => {
			// Arrange & Act & Assert
			expect(() => {
				throw new DomainException('tenantId 不能为空');
			}).toThrow('tenantId 不能为空');
		});

		it('聚合根不变性约束被破坏时应该抛出 DomainException', () => {
			// Arrange & Act & Assert
			expect(() => {
				throw new DomainException('超过租户成员上限');
			}).toThrow('超过租户成员上限');
		});
	});
});
