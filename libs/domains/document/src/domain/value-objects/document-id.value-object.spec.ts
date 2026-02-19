import { DocumentId } from './document-id.value-object';

/**
 * @description DocumentId 值对象单元测试
 */
describe('DocumentId', () => {
	describe('创建', () => {
		it('应使用有效的字符串创建 DocumentId', () => {
			// Arrange
			const validId = 'doc-123';

			// Act
			const documentId = DocumentId.of(validId);

			// Assert
			expect(documentId).toBeDefined();
			expect(documentId.getValue()).toBe(validId);
		});

		it('应使用 UUID 字符串创建 DocumentId', () => {
			// Arrange
			const uuid = '550e8400-e29b-41d4-a716-446655440000';

			// Act
			const documentId = DocumentId.of(uuid);

			// Assert
			expect(documentId.getValue()).toBe(uuid);
		});
	});

	describe('验证', () => {
		it('当值为空字符串时应抛出错误', () => {
			// Arrange & Act & Assert
			expect(() => DocumentId.of('')).toThrow('DocumentId 不能为空');
		});

		it('当值仅包含空格时应抛出错误', () => {
			// Arrange & Act & Assert
			expect(() => DocumentId.of('   ')).toThrow('DocumentId 不能为空');
		});

		it('当值为 null 时应抛出错误', () => {
			// Arrange & Act & Assert
			expect(() => DocumentId.of(null as any)).toThrow('DocumentId 不能为空');
		});

		it('当值为 undefined 时应抛出错误', () => {
			// Arrange & Act & Assert
			expect(() => DocumentId.of(undefined as any)).toThrow('DocumentId 不能为空');
		});
	});

	describe('相等性比较', () => {
		it('相同值的两个 DocumentId 应相等', () => {
			// Arrange
			const id1 = DocumentId.of('doc-123');
			const id2 = DocumentId.of('doc-123');

			// Act & Assert
			expect(id1.equals(id2)).toBe(true);
		});

		it('不同值的两个 DocumentId 应不相等', () => {
			// Arrange
			const id1 = DocumentId.of('doc-123');
			const id2 = DocumentId.of('doc-456');

			// Act & Assert
			expect(id1.equals(id2)).toBe(false);
		});

		it('DocumentId 应与自身相等', () => {
			// Arrange
			const id = DocumentId.of('doc-123');

			// Act & Assert
			expect(id.equals(id)).toBe(true);
		});
	});

	describe('toString 方法', () => {
		it('应返回与 getValue 相同的值', () => {
			// Arrange
			const value = 'doc-123';
			const documentId = DocumentId.of(value);

			// Act
			const result = documentId.toString();

			// Assert
			expect(result).toBe(value);
			expect(result).toBe(documentId.getValue());
		});
	});

	describe('边界条件', () => {
		it('应支持包含特殊字符的 ID', () => {
			// Arrange
			const specialId = 'doc_123-456.789';

			// Act
			const documentId = DocumentId.of(specialId);

			// Assert
			expect(documentId.getValue()).toBe(specialId);
		});

		it('应支持超长 ID', () => {
			// Arrange
			const longId = 'a'.repeat(1000);

			// Act
			const documentId = DocumentId.of(longId);

			// Assert
			expect(documentId.getValue()).toBe(longId);
		});

		it('应保留 ID 中的前导和尾随空格', () => {
			// Arrange
			const idWithSpaces = '  doc-123  ';

			// Act
			const documentId = DocumentId.of(idWithSpaces);

			// Assert
			expect(documentId.getValue()).toBe(idWithSpaces);
		});
	});
});
