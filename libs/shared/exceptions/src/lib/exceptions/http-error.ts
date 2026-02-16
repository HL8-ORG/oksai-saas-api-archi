import { AppException } from './app-exception';

/**
 * @description HTTP 语义错误（不依赖 Nest）
 *
 * 用于在业务/应用层表达"应返回某个 HTTP 状态"的错误，并由 Nest Filter 统一转换为 RFC7807。
 */
export class HttpError<DATA extends object = object> extends AppException<DATA> {
	public readonly status: number;
	public readonly title: string;
	public readonly detail: string;

	/**
	 * @description 文档链接或错误类型 URI（RFC7807 的 `type` 字段）
	 *
	 * 当前默认使用 `about:blank`，后续可接入"错误码 → 文档链接"的映射。
	 */
	public readonly type: string;

	constructor(input: {
		status: number;
		title: string;
		detail: string;
		errorCode?: string;
		data?: DATA | DATA[];
		cause?: unknown;
		type?: string;
	}) {
		super(`${input.title}: ${input.detail}`, {
			errorCode: input.errorCode,
			data: input.data,
			cause: input.cause
		});
		this.status = input.status;
		this.title = input.title;
		this.detail = input.detail;
		this.type = input.type ?? 'about:blank';
	}
}

/**
 * @description 类型守卫：判断是否为 HttpError
 *
 * @param err - 任意错误
 * @returns 是否为 HttpError
 */
export function isHttpError(err: unknown): err is HttpError {
	return typeof err === 'object' && err !== null && 'status' in err && 'title' in err && 'detail' in err;
}
