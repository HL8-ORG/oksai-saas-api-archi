/**
 * @description 验证错误
 *
 * 用于值对象和实体验证时的错误封装
 */
export class ValidationError extends Error {
	readonly name = 'ValidationError';

	constructor(
		message: string,
		public readonly field: string,
		public readonly value?: unknown,
		public readonly code?: string
	) {
		super(message);
		Object.setPrototypeOf(this, ValidationError.prototype);
	}

	/**
	 * @description 转换为 JSON 格式（用于 API 响应）
	 */
	toJSON(): Record<string, unknown> {
		return {
			name: this.name,
			message: this.message,
			field: this.field,
			value: this.value,
			code: this.code
		};
	}
}

/**
 * @description 批量验证错误
 *
 * 用于聚合多个验证错误
 */
export class ValidationErrors extends Error {
	readonly name = 'ValidationErrors';
	readonly errors: ValidationError[];

	constructor(errors: ValidationError[]) {
		super(`验证失败：${errors.map((e) => e.message).join('; ')}`);
		this.errors = errors;
		Object.setPrototypeOf(this, ValidationErrors.prototype);
	}

	/**
	 * @description 添加错误
	 */
	add(error: ValidationError): void {
		this.errors.push(error);
	}

	/**
	 * @description 是否有错误
	 */
	hasErrors(): boolean {
		return this.errors.length > 0;
	}

	/**
	 * @description 转换为 JSON 格式
	 */
	toJSON(): Record<string, unknown> {
		return {
			name: this.name,
			message: this.message,
			errors: this.errors.map((e) => e.toJSON())
		};
	}
}
