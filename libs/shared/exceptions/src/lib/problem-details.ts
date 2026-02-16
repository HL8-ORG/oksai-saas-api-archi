/**
 * @description RFC7807 Problem Details 扩展模型
 *
 * 本项目统一采用 Problem Details 格式返回 HTTP 错误，便于前端统一处理与日志检索。
 * 在标准字段基础上扩展 `errorCode`/`data` 以承载业务错误码与附加信息。
 *
 * @see https://www.rfc-editor.org/rfc/rfc7807
 */
export interface ProblemDetails<DATA extends object = object> {
	/**
	 * @description 指向错误文档的链接（或错误类型的唯一 URI）。
	 */
	type: string;

	/**
	 * @description 错误标题（短描述）。
	 */
	title: string;

	/**
	 * @description HTTP 状态码。
	 */
	status: number;

	/**
	 * @description 面向用户或开发者的详细错误信息。
	 */
	detail: string;

	/**
	 * @description 本次错误实例标识，通常使用 requestId/traceId。
	 */
	instance: string;

	/**
	 * @description 业务错误码（非 RFC7807 标准字段，为扩展）。
	 */
	errorCode?: string;

	/**
	 * @description 附加数据（非 RFC7807 标准字段，为扩展）。
	 */
	data?: DATA | DATA[];
}

/**
 * @description 构建 Problem Details
 *
 * @param input - Problem Details 输入
 * @returns ProblemDetails
 */
export function buildProblemDetails<DATA extends object = object>(input: ProblemDetails<DATA>): ProblemDetails<DATA> {
	return input;
}
