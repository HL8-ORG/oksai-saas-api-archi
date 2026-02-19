import { TenantName } from './tenant-name.value-object';
import { DomainException } from '../exceptions/domain.exception';

describe('TenantName 值对象', () => {
	describe('of 静态方法', () => {
		it('应该使用有效字符串创建 TenantName', () => {
			// Arrange
			const validName = 'Oksai';

			// Act
			const tenantName = TenantName.of(validName);

			// Assert
			expect(tenantName.getValue()).toBe(validName);
		});

		it('应该接受最小长度 2 的字符串', () => {
			// Arrange
			const minLenName = 'AB';

			// Act
			const tenantName = TenantName.of(minLenName);

			// Assert
			expect(tenantName.getValue()).toBe(minLenName);
		});

		it('应该接受最大长度 50 的字符串', () => {
			// Arrange
			const maxLenName = 'A'.repeat(50);

			// Act
			const tenantName = TenantName.of(maxLenName);

			// Assert
			expect(tenantName.getValue()).toBe(maxLenName);
		});

		it('应该支持中文字符', () => {
			// Arrange
			const chineseName = '奥赛科技';

			// Act
			const tenantName = TenantName.of(chineseName);

			// Assert
			expect(tenantName.getValue()).toBe(chineseName);
		});

		it('应该支持特殊字符', () => {
			// Arrange
			const nameWithSpecialChars = 'Oksai-科技@2024';

			// Act
			const tenantName = TenantName.of(nameWithSpecialChars);

			// Assert
			expect(tenantName.getValue()).toBe(nameWithSpecialChars);
		});

		it('应该去除前后空格', () => {
			// Arrange
			const nameWithSpaces = '  Oksai  ';

			// Act
			const tenantName = TenantName.of(nameWithSpaces);

			// Assert
			expect(tenantName.getValue()).toBe('Oksai');
		});

		it('应该处理 null 值并抛出异常', () => {
			// Arrange & Act & Assert
			expect(() => TenantName.of(null as unknown as string)).toThrow(DomainException);
			expect(() => TenantName.of(null as unknown as string)).toThrow('租户名称不能为空');
		});

		it('应该处理 undefined 值并抛出异常', () => {
			// Arrange & Act & Assert
			expect(() => TenantName.of(undefined as unknown as string)).toThrow(DomainException);
			expect(() => TenantName.of(undefined as unknown as string)).toThrow('租户名称不能为空');
		});

		it('应该处理空字符串并抛出异常', () => {
			// Arrange & Act & Assert
			expect(() => TenantName.of('')).toThrow(DomainException);
			expect(() => TenantName.of('')).toThrow('租户名称不能为空');
		});

		it('应该处理纯空格字符串并抛出异常', () => {
			// Arrange & Act & Assert
			expect(() => TenantName.of('   ')).toThrow(DomainException);
			expect(() => TenantName.of('   ')).toThrow('租户名称不能为空');
		});

		it('应该拒绝长度小于 2 的字符串', () => {
			// Arrange & Act & Assert
			expect(() => TenantName.of('A')).toThrow(DomainException);
			expect(() => TenantName.of('A')).toThrow('租户名称长度必须在 2-50 之间');
		});

		it('应该拒绝长度大于 50 的字符串', () => {
			// Arrange & Act & Assert
			expect(() => TenantName.of('A'.repeat(51))).toThrow(DomainException);
			expect(() => TenantName.of('A'.repeat(51))).toThrow('租户名称长度必须在 2-50 之间');
		});
	});

	describe('getValue 方法', () => {
		it('应该返回内部值', () => {
			// Arrange
			const tenantName = TenantName.of('Oksai');

			// Act
			const value = tenantName.getValue();

			// Assert
			expect(value).toBe('Oksai');
		});
	});

	describe('equals 方法', () => {
		it('相同值应该返回 true', () => {
			// Arrange
			const name1 = TenantName.of('Oksai');
			const name2 = TenantName.of('Oksai');

			// Act & Assert
			expect(name1.equals(name2)).toBe(true);
			expect(name2.equals(name1)).toBe(true);
		});

		it('不同值应该返回 false', () => {
			// Arrange
			const name1 = TenantName.of('Oksai');
			const name2 = TenantName.of('Other');

			// Act & Assert
			expect(name1.equals(name2)).toBe(false);
			expect(name2.equals(name1)).toBe(false);
		});

		it('大小写敏感', () => {
			// Arrange
			const name1 = TenantName.of('Oksai');
			const name2 = TenantName.of('OKSAI');

			// Act & Assert
			expect(name1.equals(name2)).toBe(false);
		});

		it('传入 null 应该返回 false', () => {
			// Arrange
			const name1 = TenantName.of('Oksai');

			// Act & Assert
			expect(name1.equals(null as unknown as TenantName)).toBe(false);
		});

		it('传入 undefined 应该返回 false', () => {
			// Arrange
			const name1 = TenantName.of('Oksai');

			// Act & Assert
			expect(name1.equals(undefined as unknown as TenantName)).toBe(false);
		});
	});

	describe('toString 方法', () => {
		it('应该返回字符串值', () => {
			// Arrange
			const tenantName = TenantName.of('Oksai');

			// Act
			const str = tenantName.toString();

			// Assert
			expect(str).toBe('Oksai');
		});
	});

	describe('toJSON 方法', () => {
		it('应该返回字符串值用于 JSON 序列化', () => {
			// Arrange
			const tenantName = TenantName.of('Oksai');

			// Act
			const json = tenantName.toJSON();

			// Assert
			expect(json).toBe('Oksai');
		});

		it('应该能够正确序列化和反序列化', () => {
			// Arrange
			const tenantName = TenantName.of('Oksai');

			// Act
			const serialized = JSON.stringify({ name: tenantName });
			const parsed = JSON.parse(serialized);

			// Assert
			expect(parsed.name).toBe('Oksai');
		});
	});

	describe('不可变性', () => {
		it('对象应该被冻结', () => {
			// Arrange
			const tenantName = TenantName.of('Oksai');

			// Act & Assert
			expect(Object.isFrozen(tenantName)).toBe(true);
		});
	});
});
