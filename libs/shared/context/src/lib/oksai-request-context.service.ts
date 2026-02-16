import { Injectable } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { getOksaiRequestContext, OKSAI_REQUEST_CONTEXT_KEYS, type OksaiRequestContext } from './oksai-request-context';

/**
 * @description Oksai 请求上下文服务（基于 CLS）
 *
 * 使用场景：
 * - 多租户：统一读取/写入 tenantId
 * - 日志维度：读取 requestId/tenantId/locale
 * - 认证链路：登录后写入 userId
 *
 * 注意：
 * - 该服务仅封装"上下文存取"，不做权限/认证判断
 * - 需要配合 `setupOksaiClsModule()` 或 `setupOksaiContextModule()` 才能在请求链路中生效
 */
@Injectable()
export class OksaiRequestContextService {
	constructor(private readonly cls: ClsService) {}

	/**
	 * @description 获取当前请求上下文快照
	 */
	get(): OksaiRequestContext {
		return getOksaiRequestContext(this.cls);
	}

	/**
	 * @description 获取 requestId
	 */
	getRequestId(): string | undefined {
		return this.cls.get(OKSAI_REQUEST_CONTEXT_KEYS.requestId);
	}

	/**
	 * @description 设置 requestId
	 */
	setRequestId(requestId: string): void {
		this.cls.set(OKSAI_REQUEST_CONTEXT_KEYS.requestId, requestId);
	}

	/**
	 * @description 获取 tenantId
	 */
	getTenantId(): string | undefined {
		return this.cls.get(OKSAI_REQUEST_CONTEXT_KEYS.tenantId);
	}

	/**
	 * @description 设置 tenantId
	 */
	setTenantId(tenantId: string): void {
		this.cls.set(OKSAI_REQUEST_CONTEXT_KEYS.tenantId, tenantId);
	}

	/**
	 * @description 获取 userId
	 */
	getUserId(): string | undefined {
		return this.cls.get(OKSAI_REQUEST_CONTEXT_KEYS.userId);
	}

	/**
	 * @description 设置 userId
	 */
	setUserId(userId: string): void {
		this.cls.set(OKSAI_REQUEST_CONTEXT_KEYS.userId, userId);
	}

	/**
	 * @description 获取 locale
	 */
	getLocale(): string | undefined {
		return this.cls.get(OKSAI_REQUEST_CONTEXT_KEYS.locale);
	}

	/**
	 * @description 设置 locale
	 */
	setLocale(locale: string): void {
		this.cls.set(OKSAI_REQUEST_CONTEXT_KEYS.locale, locale);
	}
}
