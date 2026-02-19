import { DomainException } from './domain-exception';

/**
 * @description 业务规则接口
 *
 * 所有业务规则都应实现此接口。
 * 业务规则用于封装领域中的不变性约束和验证逻辑。
 *
 * 特性：
 * - 单一职责：每个规则封装一个业务规则
 * - 可复用：规则可以在多个地方使用
 * - 可测试：独立测试每个规则
 * - 支持异步：支持需要查询数据库的规则
 *
 * @example
 * ```typescript
 * // 实现业务规则
 * export class TenantNameLengthRule implements IBusinessRule {
 *   constructor(private readonly name: string) {}
 *
 *   readonly Error = new DomainException(
 *     `租户名称长度必须在 2-100 个字符之间，当前长度：${this.name.length}`,
 *     'TENANT_NAME_LENGTH_INVALID'
 *   );
 *
 *   isBroken(): boolean {
 *     return this.name.length < 2 || this.name.length > 100;
 *   }
 * }
 *
 * // 使用规则
 * const rule = new TenantNameLengthRule(name);
 * if (rule.isBroken()) {
 *   throw rule.Error;
 * }
 * ```
 */
export interface IBusinessRule {
	/**
	 * 规则被违反时的错误对象
	 *
	 * 当 isBroken() 返回 true 时，应使用此错误
	 */
	readonly Error: DomainException;

	/**
	 * 判断规则是否被违反
	 *
	 * @returns true 表示规则被违反，false 表示规则通过
	 */
	isBroken(): boolean | Promise<boolean>;
}

/**
 * @description 业务规则基类
 *
 * 提供业务规则的基础实现
 */
export abstract class BusinessRuleBase implements IBusinessRule {
	/**
	 * @param context - 规则上下文（用于日志和调试）
	 */
	constructor(protected readonly context?: string) {}

	/**
	 * 规则被违反时的错误对象
	 *
	 * 子类必须实现此属性
	 */
	abstract readonly Error: DomainException;

	/**
	 * 判断规则是否被违反
	 *
	 * 子类必须实现此方法
	 */
	abstract isBroken(): boolean | Promise<boolean>;
}

/**
 * @description 业务规则验证器
 *
 * 用于批量验证多个业务规则
 *
 * @example
 * ```typescript
 * // 批量验证规则
 * const ruleError = await BusinessRuleValidator.validate(
 *   new TenantNameLengthRule(name),
 *   new TenantSlugUniqueRule(slug, repository),
 *   new TenantMemberLimitRule(memberCount, settings),
 * );
 *
 * if (ruleError) {
 *   return fail(ruleError);
 * }
 * ```
 */
export class BusinessRuleValidator {
	/**
	 * @description 批量验证业务规则
	 *
	 * 按顺序验证每个规则，一旦发现违反立即返回错误
	 *
	 * @param rules - 业务规则数组
	 * @returns 第一个被违反的规则的错误，如果没有违反则返回 null
	 */
	static async validate(...rules: IBusinessRule[]): Promise<DomainException | null> {
		for (const rule of rules) {
			if (await rule.isBroken()) {
				return rule.Error;
			}
		}
		return null;
	}

	/**
	 * @description 验证所有规则并收集所有错误
	 *
	 * 与 validate() 不同，此方法会验证所有规则并返回所有错误
	 *
	 * @param rules - 业务规则数组
	 * @returns 所有被违反规则的错误数组，如果没有违反则返回空数组
	 */
	static async validateAll(...rules: IBusinessRule[]): Promise<DomainException[]> {
		const errors: DomainException[] = [];

		for (const rule of rules) {
			if (await rule.isBroken()) {
				errors.push(rule.Error);
			}
		}

		return errors;
	}
}
