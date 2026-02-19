/**
 * @description Either 模式
 *
 * 函数式编程的错误处理模式，用于替代异常抛出。
 * Either<L, R> 表示一个值可能是 Left<L>（失败）或 Right<R>（成功）。
 *
 * @template L - Left 类型（通常表示错误）
 * @template R - Right 类型（通常表示成功值）
 *
 * @example
 * ```typescript
 * // 创建成功结果
 * const success = ok(new Tenant('test'));
 *
 * // 创建失败结果
 * const failure = fail(new ValidationError('名称无效'));
 *
 * // 使用结果
 * const result = createTenant(props);
 * if (result.isOk()) {
 *   console.log(result.value); // Tenant 实例
 * } else {
 *   console.log(result.value); // DomainException
 * }
 * ```
 */

export type Either<L, R> = Left<L> | Right<R>;

export class Left<L> {
	readonly tag = 'left' as const;
	constructor(readonly value: L) {}

	isLeft(): this is Left<L> {
		return true;
	}

	isRight(): this is Right<never> {
		return false;
	}

	isOk(): this is Right<never> {
		return false;
	}

	isFail(): this is Left<L> {
		return true;
	}

	map<M, R>(_fn: (value: R) => M): Either<L, M> {
		return this as unknown as Either<L, M>;
	}

	flatMap<M, R>(_fn: (value: R) => Either<L, M>): Either<L, M> {
		return this as unknown as Either<L, M>;
	}

	mapLeft<M, R>(fn: (value: L) => M): Either<M, R> {
		return left(fn(this.value)) as unknown as Either<M, R>;
	}

	getOrElse<R>(defaultValue: R): R {
		return defaultValue;
	}

	getOrThrow(): never {
		throw this.value;
	}
}

export class Right<R> {
	readonly tag = 'right' as const;
	constructor(readonly value: R) {}

	isLeft(): this is Left<never> {
		return false;
	}

	isRight(): this is Right<R> {
		return true;
	}

	isOk(): this is Right<R> {
		return true;
	}

	isFail(): this is Left<never> {
		return false;
	}

	map<M>(fn: (value: R) => M): Either<never, M> {
		return right(fn(this.value));
	}

	flatMap<L, M>(fn: (value: R) => Either<L, M>): Either<L, M> {
		return fn(this.value);
	}

	mapLeft<M>(_fn: (value: never) => M): Either<M, R> {
		return this as unknown as Either<M, R>;
	}

	getOrElse(_defaultValue: R): R {
		return this.value;
	}

	getOrThrow(): R {
		return this.value;
	}
}

/**
 * @description 创建 Left（失败）结果
 *
 * @param value - 错误值
 * @returns Left<L, never>
 */
export function left<L>(value: L): Left<L> {
	return new Left(value);
}

/**
 * @description 创建 Right（成功）结果
 *
 * @param value - 成功值
 * @returns Right<never, R>
 */
export function right<R>(value: R): Right<R> {
	return new Right(value);
}

/**
 * @description 创建成功结果的别名（语义化）
 *
 * @param value - 成功值
 * @returns Right<never, R>
 */
export function ok<R>(value: R): Right<R> {
	return right(value);
}

/**
 * @description 创建失败结果的别名（语义化）
 *
 * @param value - 错误值
 * @returns Left<L, never>
 */
export function fail<L>(value: L): Left<L> {
	return left(value);
}

/**
 * @description 类型守卫：检查是否为 Left
 */
export function isLeft<L, R>(either: Either<L, R>): either is Left<L> {
	return either.isLeft();
}

/**
 * @description 类型守卫：检查是否为 Right
 */
export function isRight<L, R>(either: Either<L, R>): either is Right<R> {
	return either.isRight();
}
