/**
 * @description 应用异常基类（不依赖 Nest）
 *
 * 说明：
 * - 本异常用于表达"业务/应用层错误"，不强制绑定 HTTP 语义
 * - 若需要映射到 HTTP 响应，请使用 `HttpError` 或在 app 层进行映射
 */
export class AppException<DATA extends object = object> extends Error {
	/**
	 * @description 业务错误码（用于客户端/日志/监控归类）
	 */
	public readonly errorCode?: string;

	/**
	 * @description 附加数据（用于 i18n 参数、调试上下文、字段错误等）
	 */
	public readonly data?: DATA | DATA[];

	/**
	 * @description 根因（可选）
	 */
	public readonly cause?: unknown;

	constructor(message: string, options?: { errorCode?: string; data?: DATA | DATA[]; cause?: unknown }) {
		super(message);
		this.name = this.constructor.name;
		this.errorCode = options?.errorCode;
		this.data = options?.data;
		this.cause = options?.cause;
	}
}
