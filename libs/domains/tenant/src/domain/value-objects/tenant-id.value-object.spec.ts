import { TenantId } from './tenant-id.value-object';
import { DomainException } from '../exceptions/domain.exception';

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
			expect(() => TenantId.of(null as unknown as string)).toThrow(DomainException);
			expect(() => TenantId.of(null as unknown as string)).toThrow('tenantId 不能为空');
		});

		it('应该处理 undefined 值并抛出异常', () => {
			// Arrange & Act & Assert
			expect(() => TenantId.of(undefined as unknown as string)).toThrow(DomainException);
			expect(() => TenantId.of(undefined as unknown as string)).toThrow('tenantId 不能为空');
		});

		it('应该处理空字符串并抛出异常', () => {
			// Arrange & Act & Assert
			expect(() => TenantId.of('')).toThrow(DomainException);
			expect(() => TenantId.of('')).toThrow('tenantId 不能为空');
		});

		it('应该处理纯空格字符串并抛出异常', () => {
			// Arrange & Act & Assert
			expect(() => TenantId.of('   ')).toThrow(DomainException);
			expect(() => TenantId.of('   ')).toThrow('tenantId 不能为空');
		});

		it('应该拒绝长度小于 3 的字符串', () => {
			// Arrange & Act & Assert
			expect(() => TenantId.of('ab')).toThrow(DomainException);
			expect(() => TenantId.of('ab')).toThrow('tenantId 格式非法');
		});

		it('应该拒绝长度大于 64 的字符串', () => {
			// Arrange & Act & Assert
			expect(() => TenantId.of('a'.repeat(65))).toThrow(DomainException);
			expect(() => TenantId.of('a'.repeat(65))).toThrow('tenantId 格式非法');
		});

		it('应该拒绝包含非法字符的字符串', () => {
			// Arrange & Act & Assert
			expect(() => TenantId.of('tenant@001')).toThrow(DomainException);
			expect(() => TenantId.of('tenant@001')).toThrow('tenantId 格式非法');
		});

		it('应该拒绝包含中文的字符串', () => {
			// Arrange & Act & Assert
			expect(() => TenantId.of('租户001')).toThrow(DomainException);
			expect(() => TenantId.of('租户001')).toThrow('tenantId 格式非法');
		});

		it('应该拒绝包含空格的字符串', () => {
			// Arrange & Act & Assert
			expect(() => TenantId.of('tenant 001')).toThrow(DomainException);
			expect(() => TenantId.of('tenant 001')).toThrow('tenantId 格式非法');
		});
	});

	describe('create 静态方法', () => {
		it('应该生成有效的 TenantId', () => {
			// Act
			const tenantId = TenantId.create();

			// Assert
			expect(tenantId.getValue()).toMatch(/^t-[a-f0-9]{16}$/);
		});

		it('应该生成唯一的 TenantId', () => {
			// Act
			const id1 = TenantId.create();
			const id2 = TenantId.create();

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
		it('应该返回字符串值用于 JSON 序列化', () => {
			// Arrange
			const tenantId = TenantId.of('t-001');

			// Act
			const json = tenantId.toJSON();

			// Assert
			expect(json).toBe('t-001');
		});

		it('应该能够正确序列化和反序列化', () => {
			// Arrange
			const tenantId = TenantId.of('t-001');

			// Act
			const serialized = JSON.stringify({ id: tenantId });
			const parsed = JSON.parse(serialized);

			// Assert
			expect(parsed.id).toBe('t-001');
		});
	});

	describe('不可变性', () => {
		it('对象应该被冻结', () => {
			// Arrange
			const tenantId = TenantId.of('t-001');

			// Act & Assert
			expect(Object.isFrozen(tenantId)).toBe(true);
		});
	});
});
