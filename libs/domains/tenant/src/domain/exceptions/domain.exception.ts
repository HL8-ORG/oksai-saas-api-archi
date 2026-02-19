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
	 */
	constructor(message: string) {
		super(message);
	}
}
