/**
 * @description 领域异常
 *
 * 用于封装业务规则违反时的错误
 * 所有领域层抛出的异常都应使用此类型或其子类
 *
 * @example
 * ```typescript
 * // 抛出领域异常
 * if (this._status === DataSourceStatus.CONNECTING) {
 *   throw new DomainException('数据源正在连接中', 'DATA_SOURCE_CONNECTING');
 * }
 *
 * // 使用错误码
 * throw new DomainException(
 *   `租户名称长度必须在 2-100 个字符之间，当前长度：${name.length}`,
 *   'TENANT_NAME_LENGTH_INVALID',
 *   { name, length: name.length }
 * );
 * ```
 */
export class DomainException extends Error {
	readonly name = 'DomainException';

	constructor(
		message: string,
		public readonly code: string,
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
			context: this.context
		};
	}

	/**
	 * @description 创建业务规则违反异常
	 */
	static ruleBroken(ruleName: string, message: string, context?: Record<string, unknown>): DomainException {
		return new DomainException(message, `RULE_BROKEN_${ruleName.toUpperCase()}`, context);
	}
}

/**
 * @description 并发冲突异常
 *
 * 当乐观锁版本不匹配时抛出
 */
export class ConcurrencyException extends DomainException {
	constructor(
		message: string = '并发冲突，请重试操作',
		public readonly expectedVersion?: number,
		public readonly actualVersion?: number
	) {
		super(message, 'CONCURRENCY_CONFLICT', { expectedVersion, actualVersion });
		Object.setPrototypeOf(this, ConcurrencyException.prototype);
	}
}

/**
 * @description 实体未找到异常
 */
export class EntityNotFoundException extends DomainException {
	constructor(entityType: string, entityId: string) {
		super(`${entityType} 未找到：${entityId}`, 'ENTITY_NOT_FOUND', { entityType, entityId });
		Object.setPrototypeOf(this, EntityNotFoundException.prototype);
	}
}

/**
 * @description 无效操作异常
 *
 * 当在当前状态下执行不允许的操作时抛出
 */
export class InvalidOperationException extends DomainException {
	constructor(message: string, context?: Record<string, unknown>) {
		super(message, 'INVALID_OPERATION', context);
		Object.setPrototypeOf(this, InvalidOperationException.prototype);
	}
}
