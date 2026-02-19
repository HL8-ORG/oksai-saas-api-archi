import { TenantName } from './tenant-name.value-object';

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

		it('应该接受最大长度 100 的字符串', () => {
			// Arrange
			const maxLenName = 'A'.repeat(100);

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

		it('应该支持连字符', () => {
			// Arrange
			const nameWithHyphen = 'Oksai-Tech';

			// Act
			const tenantName = TenantName.of(nameWithHyphen);

			// Assert
			expect(tenantName.getValue()).toBe(nameWithHyphen);
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
			expect(() => TenantName.of(null as unknown as string)).toThrow();
		});

		it('应该处理 undefined 值并抛出异常', () => {
			// Arrange & Act & Assert
			expect(() => TenantName.of(undefined as unknown as string)).toThrow();
		});

		it('应该处理空字符串并抛出异常', () => {
			// Arrange & Act & Assert
			expect(() => TenantName.of('')).toThrow();
		});

		it('应该处理纯空格字符串并抛出异常', () => {
			// Arrange & Act & Assert
			expect(() => TenantName.of('   ')).toThrow();
		});

		it('应该拒绝长度小于 2 的字符串', () => {
			// Arrange & Act & Assert
			expect(() => TenantName.of('A')).toThrow();
		});

		it('应该拒绝长度大于 100 的字符串', () => {
			// Arrange & Act & Assert
			expect(() => TenantName.of('A'.repeat(101))).toThrow();
		});

		it('应该拒绝以连字符开头的名称', () => {
			// Arrange & Act & Assert
			expect(() => TenantName.of('-Oksai')).toThrow();
		});

		it('应该拒绝以连字符结尾的名称', () => {
			// Arrange & Act & Assert
			expect(() => TenantName.of('Oksai-')).toThrow();
		});

		it('应该拒绝包含非法字符的名称', () => {
			// Arrange & Act & Assert
			expect(() => TenantName.of('Oksai@Tech')).toThrow();
		});
	});

	describe('create 静态方法（Either 模式）', () => {
		it('应该返回 Right 包含有效的 TenantName', () => {
			// Arrange & Act
			const result = TenantName.create('Oksai');

			// Assert
			expect(result.isOk()).toBe(true);
			expect(result.value.getValue()).toBe('Oksai');
		});

		it('应该返回 Left 包含验证错误', () => {
			// Arrange & Act
			const result = TenantName.create('A');

			// Assert
			expect(result.isFail()).toBe(true);
			expect(result.value.field).toBe('name');
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

	describe('name 访问器', () => {
		it('应该返回内部值', () => {
			// Arrange
			const tenantName = TenantName.of('Oksai');

			// Act & Assert
			expect(tenantName.name).toBe('Oksai');
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
		it('应该返回包含 value 的对象', () => {
			// Arrange
			const tenantName = TenantName.of('Oksai');

			// Act
			const json = tenantName.toJSON();

			// Assert
			expect(json).toEqual({ value: 'Oksai' });
		});

		it('应该能够正确序列化', () => {
			// Arrange
			const tenantName = TenantName.of('Oksai');

			// Act
			const serialized = JSON.stringify({ name: tenantName });

			// Assert
			expect(serialized).toContain('Oksai');
		});
	});

	describe('fromPersistence 静态方法', () => {
		it('应该跳过验证直接创建实例', () => {
			// Arrange & Act
			const tenantName = TenantName.fromPersistence('Any-Value');

			// Assert
			expect(tenantName.getValue()).toBe('Any-Value');
		});
	});
});
