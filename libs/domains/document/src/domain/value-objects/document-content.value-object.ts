/**
 * @description 文档内容值对象
 */
export class DocumentContent {
	private constructor(private readonly _value: string) {}

	static of(value: string): DocumentContent {
		return new DocumentContent(value ?? '');
	}

	getValue(): string {
		return this._value;
	}

	/**
	 * @description 获取内容长度
	 */
	getLength(): number {
		return this._value.length;
	}

	/**
	 * @description 获取用于嵌入的文本（截断或分段）
	 */
	getTextForEmbedding(maxLength: number = 8000): string {
		if (this._value.length <= maxLength) {
			return this._value;
		}
		return this._value.substring(0, maxLength);
	}

	equals(other: DocumentContent): boolean {
		return this._value === other._value;
	}
}
