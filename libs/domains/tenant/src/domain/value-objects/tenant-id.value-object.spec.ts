import { TenantId } from './tenant-id.value-object';

describe('TenantId 值对象', () => {
	describe('of 静态方法', () => {
		it('应该使用有效字符串创建 TenantId', () => {
			// Arrange
			const validId = 't-001';

			// Act
			const tenantId = TenantId.of(validId);

			// Assert
			expect(tenantId.getValue()).toBe(validId);
		});

		it('应该接受包含字母、数字、短横线和下划线的字符串', () => {
			// Arrange
			const validId = 'tenant_123-ABC';

			// Act
			const tenantId = TenantId.of(validId);

			// Assert
			expect(tenantId.getValue()).toBe(validId);
		});

		it('应该接受最小长度 3 的字符串', () => {
			// Arrange
			const minLenId = 'abc';

			// Act
			const tenantId = TenantId.of(minLenId);

			// Assert
			expect(tenantId.getValue()).toBe(minLenId);
		});

		it('应该接受最大长度 64 的字符串', () => {
			// Arrange
			const maxLenId = 'a'.repeat(64);

			// Act
			const tenantId = TenantId.of(maxLenId);

			// Assert
			expect(tenantId.getValue()).toBe(maxLenId);
		});

		it('应该去除前后空格', () => {
			// Arrange
			const idWithSpaces = '  t-001  ';

			// Act
			const tenantId = TenantId.of(idWithSpaces);

			// Assert
			expect(tenantId.getValue()).toBe('t-001');
		});

		it('应该处理 null 值并抛出异常', () => {
			// Arrange & Act & Assert
			expect(() => TenantId.of(null as unknown as string)).toThrow();
		});

		it('应该处理 undefined 值并抛出异常', () => {
			// Arrange & Act & Assert
			expect(() => TenantId.of(undefined as unknown as string)).toThrow();
		});

		it('应该处理空字符串并抛出异常', () => {
			// Arrange & Act & Assert
			expect(() => TenantId.of('')).toThrow();
		});

		it('应该处理纯空格字符串并抛出异常', () => {
			// Arrange & Act & Assert
			expect(() => TenantId.of('   ')).toThrow();
		});

		it('应该拒绝长度小于 3 的字符串', () => {
			// Arrange & Act & Assert
			expect(() => TenantId.of('ab')).toThrow();
		});

		it('应该拒绝长度大于 64 的字符串', () => {
			// Arrange & Act & Assert
			expect(() => TenantId.of('a'.repeat(65))).toThrow();
		});

		it('应该拒绝包含非法字符的字符串', () => {
			// Arrange & Act & Assert
			expect(() => TenantId.of('tenant@001')).toThrow();
		});

		it('应该拒绝包含中文的字符串', () => {
			// Arrange & Act & Assert
			expect(() => TenantId.of('租户001')).toThrow();
		});

		it('应该拒绝包含空格的字符串', () => {
			// Arrange & Act & Assert
			expect(() => TenantId.of('tenant 001')).toThrow();
		});
	});

	describe('create 静态方法（Either 模式）', () => {
		it('应该返回 Right 包含有效的 TenantId', () => {
			// Arrange & Act
			const result = TenantId.create('t-001');

			// Assert
			expect(result.isOk()).toBe(true);
			expect(result.value.getValue()).toBe('t-001');
		});

		it('应该返回 Left 包含验证错误', () => {
			// Arrange & Act
			const result = TenantId.create('ab');

			// Assert
			expect(result.isFail()).toBe(true);
			expect(result.value.field).toBe('tenantId');
		});
	});

	describe('generate 静态方法', () => {
		it('应该生成有效的 TenantId', () => {
			// Act
			const tenantId = TenantId.generate();

			// Assert
			expect(tenantId.getValue()).toMatch(/^t-[a-f0-9]{16}$/);
		});

		it('应该生成唯一的 TenantId', () => {
			// Act
			const id1 = TenantId.generate();
			const id2 = TenantId.generate();

			// Assert
			expect(id1.getValue()).not.toBe(id2.getValue());
		});
	});

	describe('getValue 方法', () => {
		it('应该返回内部值', () => {
			// Arrange
			const tenantId = TenantId.of('t-001');

			// Act
			const value = tenantId.getValue();

			// Assert
			expect(value).toBe('t-001');
		});
	});

	describe('id 访问器', () => {
		it('应该返回内部值', () => {
			// Arrange
			const tenantId = TenantId.of('t-001');

			// Act & Assert
			expect(tenantId.id).toBe('t-001');
		});
	});

	describe('equals 方法', () => {
		it('相同值应该返回 true', () => {
			// Arrange
			const id1 = TenantId.of('t-001');
			const id2 = TenantId.of('t-001');

			// Act & Assert
			expect(id1.equals(id2)).toBe(true);
			expect(id2.equals(id1)).toBe(true);
		});

		it('不同值应该返回 false', () => {
			// Arrange
			const id1 = TenantId.of('t-001');
			const id2 = TenantId.of('t-002');

			// Act & Assert
			expect(id1.equals(id2)).toBe(false);
			expect(id2.equals(id1)).toBe(false);
		});

		it('传入 null 应该返回 false', () => {
			// Arrange
			const id1 = TenantId.of('t-001');

			// Act & Assert
			expect(id1.equals(null as unknown as TenantId)).toBe(false);
		});

		it('传入 undefined 应该返回 false', () => {
			// Arrange
			const id1 = TenantId.of('t-001');

			// Act & Assert
			expect(id1.equals(undefined as unknown as TenantId)).toBe(false);
		});
	});

	describe('toString 方法', () => {
		it('应该返回字符串值', () => {
			// Arrange
			const tenantId = TenantId.of('t-001');

			// Act
			const str = tenantId.toString();

			// Assert
			expect(str).toBe('t-001');
		});
	});

	describe('toJSON 方法', () => {
		it('应该返回包含 value 的对象', () => {
			// Arrange
			const tenantId = TenantId.of('t-001');

			// Act
			const json = tenantId.toJSON();

			// Assert
			expect(json).toEqual({ value: 't-001' });
		});

		it('应该能够正确序列化', () => {
			// Arrange
			const tenantId = TenantId.of('t-001');

			// Act
			const serialized = JSON.stringify({ id: tenantId });

			// Assert
			expect(serialized).toContain('t-001');
		});
	});

	describe('fromPersistence 静态方法', () => {
		it('应该跳过验证直接创建实例', () => {
			// Arrange & Act
			const tenantId = TenantId.fromPersistence('any-value');

			// Assert
			expect(tenantId.getValue()).toBe('any-value');
		});
	});
});
