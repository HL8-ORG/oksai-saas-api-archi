/**
 * @description
 * 领域异常（业务规则违反 / 不变性破坏）。
 *
 * 使用场景：
 * - 值对象校验失败
 * - 聚合根不变性约束被破坏
 *
 * 注意事项：
 * - 领域异常不应携带技术细节（SQL、HTTP 状态码等）
 */
export class DomainException extends Error {
	readonly name = 'DomainException';

	/**
	 * @param message - 业务可读的错误信息
	 * @param code - 错误代码（可选）
	 * @param context - 错误上下文（可选）
	 */
	constructor(
		message: string,
		public readonly code?: string,
		public readonly context?: Record<string, unknown>
	) {
		super(message);
		Object.setPrototypeOf(this, DomainException.prototype);
	}

	/**
	 * @description 转换为 JSON 格式（用于日志和 API 响应）
	 */
	toJSON(): Record<string, unknown> {
		return {
			name: this.name,
			message: this.message,
			code: this.code,
			context: this.context,
		};
	}
}
