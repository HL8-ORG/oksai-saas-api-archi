import { DocumentContent } from './document-content.value-object';

/**
 * @description DocumentContent 值对象单元测试
 */
describe('DocumentContent', () => {
	describe('创建', () => {
		it('应使用有效的字符串创建 DocumentContent', () => {
			// Arrange
			const validContent = '这是一段测试内容';

			// Act
			const documentContent = DocumentContent.of(validContent);

			// Assert
			expect(documentContent).toBeDefined();
			expect(documentContent.getValue()).toBe(validContent);
		});

		it('当值为 null 时应创建空字符串内容', () => {
			// Arrange & Act
			const documentContent = DocumentContent.of(null as any);

			// Assert
			expect(documentContent.getValue()).toBe('');
		});

		it('当值为 undefined 时应创建空字符串内容', () => {
			// Arrange & Act
			const documentContent = DocumentContent.of(undefined as any);

			// Assert
			expect(documentContent.getValue()).toBe('');
		});

		it('应支持空字符串', () => {
			// Arrange & Act
			const documentContent = DocumentContent.of('');

			// Assert
			expect(documentContent.getValue()).toBe('');
		});

		it('应支持多行内容', () => {
			// Arrange
			const multilineContent = '第一行\n第二行\n第三行';

			// Act
			const documentContent = DocumentContent.of(multilineContent);

			// Assert
			expect(documentContent.getValue()).toBe(multilineContent);
		});

		it('应支持 Markdown 格式内容', () => {
			// Arrange
			const markdownContent = '# 标题\n\n正文内容\n\n- 列表项1\n- 列表项2';

			// Act
			const documentContent = DocumentContent.of(markdownContent);

			// Assert
			expect(documentContent.getValue()).toBe(markdownContent);
		});
	});

	describe('getLength', () => {
		it('应正确返回内容长度', () => {
			// Arrange
			const content = '测试内容';
			const documentContent = DocumentContent.of(content);

			// Act
			const length = documentContent.getLength();

			// Assert
			expect(length).toBe(content.length);
		});

		it('空内容应返回长度 0', () => {
			// Arrange
			const documentContent = DocumentContent.of('');

			// Act
			const length = documentContent.getLength();

			// Assert
			expect(length).toBe(0);
		});

		it('应正确计算中文字符长度', () => {
			// Arrange
			const chineseContent = '这是中文测试';
			const documentContent = DocumentContent.of(chineseContent);

			// Act
			const length = documentContent.getLength();

			// Assert
			expect(length).toBe(chineseContent.length);
		});

		it('应正确计算混合字符长度', () => {
			// Arrange
			const mixedContent = '测试Test123';
			const documentContent = DocumentContent.of(mixedContent);

			// Act
			const length = documentContent.getLength();

			// Assert
			expect(length).toBe(mixedContent.length);
		});
	});

	describe('getTextForEmbedding', () => {
		it('当内容长度小于最大长度时应返回完整内容', () => {
			// Arrange
			const shortContent = '短内容';
			const documentContent = DocumentContent.of(shortContent);

			// Act
			const result = documentContent.getTextForEmbedding(8000);

			// Assert
			expect(result).toBe(shortContent);
		});

		it('当内容长度等于最大长度时应返回完整内容', () => {
			// Arrange
			const maxLength = 100;
			const exactLengthContent = 'a'.repeat(maxLength);
			const documentContent = DocumentContent.of(exactLengthContent);

			// Act
			const result = documentContent.getTextForEmbedding(maxLength);

			// Assert
			expect(result).toBe(exactLengthContent);
			expect(result.length).toBe(maxLength);
		});

		it('当内容长度超过最大长度时应截断', () => {
			// Arrange
			const maxLength = 100;
			const longContent = 'a'.repeat(200);
			const documentContent = DocumentContent.of(longContent);

			// Act
			const result = documentContent.getTextForEmbedding(maxLength);

			// Assert
			expect(result).toBe('a'.repeat(maxLength));
			expect(result.length).toBe(maxLength);
		});

		it('应使用默认最大长度 8000', () => {
			// Arrange
			const defaultMaxLength = 8000;
			const longContent = 'a'.repeat(10000);
			const documentContent = DocumentContent.of(longContent);

			// Act
			const result = documentContent.getTextForEmbedding();

			// Assert
			expect(result.length).toBe(defaultMaxLength);
		});

		it('应支持自定义最大长度', () => {
			// Arrange
			const customMaxLength = 500;
			const longContent = 'a'.repeat(1000);
			const documentContent = DocumentContent.of(longContent);

			// Act
			const result = documentContent.getTextForEmbedding(customMaxLength);

			// Assert
			expect(result.length).toBe(customMaxLength);
		});

		it('空内容应返回空字符串', () => {
			// Arrange
			const documentContent = DocumentContent.of('');

			// Act
			const result = documentContent.getTextForEmbedding(1000);

			// Assert
			expect(result).toBe('');
		});
	});

	describe('相等性比较', () => {
		it('相同值的两个 DocumentContent 应相等', () => {
			// Arrange
			const content1 = DocumentContent.of('测试内容');
			const content2 = DocumentContent.of('测试内容');

			// Act & Assert
			expect(content1.equals(content2)).toBe(true);
		});

		it('不同值的两个 DocumentContent 应不相等', () => {
			// Arrange
			const content1 = DocumentContent.of('内容一');
			const content2 = DocumentContent.of('内容二');

			// Act & Assert
			expect(content1.equals(content2)).toBe(false);
		});

		it('DocumentContent 应与自身相等', () => {
			// Arrange
			const content = DocumentContent.of('测试内容');

			// Act & Assert
			expect(content.equals(content)).toBe(true);
		});

		it('两个空内容的 DocumentContent 应相等', () => {
			// Arrange
			const content1 = DocumentContent.of('');
			const content2 = DocumentContent.of('');

			// Act & Assert
			expect(content1.equals(content2)).toBe(true);
		});

		it('null 和 undefined 创建的空内容应相等', () => {
			// Arrange
			const content1 = DocumentContent.of(null as any);
			const content2 = DocumentContent.of(undefined as any);

			// Act & Assert
			expect(content1.equals(content2)).toBe(true);
		});
	});

	describe('边界条件', () => {
		it('应支持超长内容', () => {
			// Arrange
			const longContent = 'a'.repeat(100000);

			// Act
			const documentContent = DocumentContent.of(longContent);

			// Assert
			expect(documentContent.getValue()).toBe(longContent);
			expect(documentContent.getLength()).toBe(100000);
		});

		it('应支持特殊字符内容', () => {
			// Arrange
			const specialContent = '内容 <script>alert("xss")</script> & "quotes" \'single\'';

			// Act
			const documentContent = DocumentContent.of(specialContent);

			// Assert
			expect(documentContent.getValue()).toBe(specialContent);
		});

		it('应支持 Unicode 字符', () => {
			// Arrange
			const unicodeContent = '测试 🎉 emoji 日本語 한국어';

			// Act
			const documentContent = DocumentContent.of(unicodeContent);

			// Assert
			expect(documentContent.getValue()).toBe(unicodeContent);
		});

		it('应保留内容中的空白字符', () => {
			// Arrange
			const contentWithSpaces = '  前导空格  中间空格  尾随空格  ';

			// Act
			const documentContent = DocumentContent.of(contentWithSpaces);

			// Assert
			expect(documentContent.getValue()).toBe(contentWithSpaces);
		});
	});
});
