import { DomainException } from '../exceptions/domain.exception';

/**
 * @description
 * TenantSettings 值对象：租户配置（示例）。
 *
 * 注意事项：
 * - 这里仅提供最小字段用于演示聚合不变性约束
 * - 后续可扩展为更完整的订阅/配额模型
 */
export class TenantSettings {
	readonly maxMembers: number;

	/**
	 * @param maxMembers - 最大成员数（1-10000）
	 * @throws {DomainException} 当参数非法时抛出
	 */
	constructor(maxMembers: number) {
		const v = Number(maxMembers);
		if (!Number.isFinite(v) || v < 1 || v > 10000) {
			throw new DomainException('maxMembers 必须在 1-10000 之间');
		}
		this.maxMembers = v;
	}
}

