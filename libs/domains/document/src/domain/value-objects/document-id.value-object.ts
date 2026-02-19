/**
 * @description 文档 ID 值对象
 */
export class DocumentId {
	private constructor(private readonly _value: string) {
		if (!_value || _value.trim().length === 0) {
			throw new Error('DocumentId 不能为空');
		}
	}

	static of(value: string): DocumentId {
		return new DocumentId(value);
	}

	getValue(): string {
		return this._value;
	}

	toString(): string {
		return this._value;
	}

	equals(other: DocumentId): boolean {
		return this._value === other._value;
	}
}
