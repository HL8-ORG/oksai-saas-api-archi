import { DocumentTitle } from './document-title.value-object';

/**
 * @description DocumentTitle 值对象单元测试
 */
describe('DocumentTitle', () => {
	describe('创建', () => {
		it('应使用有效的字符串创建 DocumentTitle', () => {
			// Arrange
			const validTitle = '测试文档标题';

			// Act
			const documentTitle = DocumentTitle.of(validTitle);

			// Assert
			expect(documentTitle).toBeDefined();
			expect(documentTitle.getValue()).toBe(validTitle);
		});

		it('创建时应自动去除前后空格', () => {
			// Arrange
			const titleWithSpaces = '  测试标题  ';
			const expectedTitle = '测试标题';

			// Act
			const documentTitle = DocumentTitle.of(titleWithSpaces);

			// Assert
			expect(documentTitle.getValue()).toBe(expectedTitle);
		});

		it('应支持中文字符', () => {
			// Arrange
			const chineseTitle = '这是一份中文文档的标题';

			// Act
			const documentTitle = DocumentTitle.of(chineseTitle);

			// Assert
			expect(documentTitle.getValue()).toBe(chineseTitle);
		});

		it('应支持英文字符', () => {
			// Arrange
			const englishTitle = 'Test Document Title';

			// Act
			const documentTitle = DocumentTitle.of(englishTitle);

			// Assert
			expect(documentTitle.getValue()).toBe(englishTitle);
		});

		it('应支持混合字符', () => {
			// Arrange
			const mixedTitle = '测试 Document 标题 123';

			// Act
			const documentTitle = DocumentTitle.of(mixedTitle);

			// Assert
			expect(documentTitle.getValue()).toBe(mixedTitle);
		});
	});

	describe('验证', () => {
		it('当值为空字符串时应抛出错误', () => {
			// Arrange & Act & Assert
			expect(() => DocumentTitle.of('')).toThrow('DocumentTitle 不能为空');
		});

		it('当值仅包含空格时应抛出错误', () => {
			// Arrange & Act & Assert
			expect(() => DocumentTitle.of('   ')).toThrow('DocumentTitle 不能为空');
		});

		it('当值为 null 时应抛出错误', () => {
			// Arrange & Act & Assert
			expect(() => DocumentTitle.of(null as any)).toThrow();
		});

		it('当值为 undefined 时应抛出错误', () => {
			// Arrange & Act & Assert
			expect(() => DocumentTitle.of(undefined as any)).toThrow();
		});

		it('当值长度超过 200 字符时应抛出错误', () => {
			// Arrange
			const longTitle = 'a'.repeat(201);

			// Act & Assert
			expect(() => DocumentTitle.of(longTitle)).toThrow('DocumentTitle 长度不能超过 200 字符');
		});

		it('当值长度等于 200 字符时应正常创建', () => {
			// Arrange
			const maxTitle = 'a'.repeat(200);

			// Act
			const documentTitle = DocumentTitle.of(maxTitle);

			// Assert
			expect(documentTitle.getValue()).toBe(maxTitle);
			expect(documentTitle.getValue().length).toBe(200);
		});
	});

	describe('相等性比较', () => {
		it('相同值的两个 DocumentTitle 应相等', () => {
			// Arrange
			const title1 = DocumentTitle.of('测试标题');
			const title2 = DocumentTitle.of('测试标题');

			// Act & Assert
			expect(title1.equals(title2)).toBe(true);
		});

		it('不同值的两个 DocumentTitle 应不相等', () => {
			// Arrange
			const title1 = DocumentTitle.of('标题一');
			const title2 = DocumentTitle.of('标题二');

			// Act & Assert
			expect(title1.equals(title2)).toBe(false);
		});

		it('DocumentTitle 应与自身相等', () => {
			// Arrange
			const title = DocumentTitle.of('测试标题');

			// Act & Assert
			expect(title.equals(title)).toBe(true);
		});

		it('去除空格后值相同的 DocumentTitle 应相等', () => {
			// Arrange
			const title1 = DocumentTitle.of('测试标题');
			const title2 = DocumentTitle.of('  测试标题  ');

			// Act & Assert
			expect(title1.equals(title2)).toBe(true);
		});
	});

	describe('边界条件', () => {
		it('应支持单个字符的标题', () => {
			// Arrange
			const singleCharTitle = '测';

			// Act
			const documentTitle = DocumentTitle.of(singleCharTitle);

			// Assert
			expect(documentTitle.getValue()).toBe(singleCharTitle);
		});

		it('应支持包含特殊字符的标题', () => {
			// Arrange
			const specialTitle = '标题 - 测试 (v1.0) [重要]';

			// Act
			const documentTitle = DocumentTitle.of(specialTitle);

			// Assert
			expect(documentTitle.getValue()).toBe(specialTitle);
		});

		it('应支持包含 emoji 的标题', () => {
			// Arrange
			const emojiTitle = '文档标题 📄 测试 ✅';

			// Act
			const documentTitle = DocumentTitle.of(emojiTitle);

			// Assert
			expect(documentTitle.getValue()).toBe(emojiTitle);
		});

		it('应支持包含换行符的标题', () => {
			// Arrange
			const multilineTitle = '第一行\n第二行';

			// Act
			const documentTitle = DocumentTitle.of(multilineTitle);

			// Assert
			expect(documentTitle.getValue()).toBe(multilineTitle);
		});
	});
});
