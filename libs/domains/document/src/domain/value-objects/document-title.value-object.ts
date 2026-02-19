/**
 * @description 文档标题值对象
 */
export class DocumentTitle {
	private constructor(private readonly _value: string) {
		if (!_value || _value.trim().length === 0) {
			throw new Error('DocumentTitle 不能为空');
		}
		if (_value.length > 200) {
			throw new Error('DocumentTitle 长度不能超过 200 字符');
		}
	}

	static of(value: string): DocumentTitle {
		return new DocumentTitle(value.trim());
	}

	getValue(): string {
		return this._value;
	}

	equals(other: DocumentTitle): boolean {
		return this._value === other._value;
	}
}
