/**
 * @description Oksai Kernel - 领域驱动设计核心基础设施
 *
 * 此包提供 DDD 战术模式的基础实现：
 * - Either 模式（函数式错误处理）
 * - 值对象基类
 * - 业务规则接口和验证器
 * - 领域异常
 * - 验证错误
 */

// ==================== Either 模式 ====================
export {
	left,
	right,
	ok,
	fail,
	isLeft,
	isRight,
} from './result/either';

// 导出类型
export type { Either, Left, Right } from './result/either';

// ==================== 值对象 ====================
export { ValueObjectBase } from './domain/value-object.base';

// 导出类型
export type { ValueObjectResult } from './domain/value-object.base';

// ==================== 业务规则 ====================
export { BusinessRuleBase, BusinessRuleValidator } from './domain/business-rule.base';

// 导出类型
export type { IBusinessRule } from './domain/business-rule.base';

// ==================== 领域异常 ====================
export {
	DomainException,
	ConcurrencyException,
	EntityNotFoundException,
	InvalidOperationException,
} from './domain/domain-exception';

// ==================== 验证错误 ====================
export { ValidationError, ValidationErrors } from './domain/validation.error';
