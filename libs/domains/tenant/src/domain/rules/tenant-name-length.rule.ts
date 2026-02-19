import { IBusinessRule, DomainException } from '@oksai/kernel';

/**
 * @description 租户名称长度规则
 *
 * 业务规则：租户名称长度必须在 2-100 个字符之间
 */
export class TenantNameLengthRule implements IBusinessRule {
	/**
	 * 规则被违反时的错误对象
	 */
	readonly Error: DomainException;

	constructor(private readonly name: string) {
		this.Error = new DomainException(
			`租户名称长度必须在 2-100 个字符之间，当前长度：${this.name.length}`,
			'TENANT_NAME_LENGTH_INVALID',
			{ name: this.name, length: this.name.length }
		);
	}

	/**
	 * 判断规则是否被违反
	 *
	 * @returns true 表示规则被违反（长度不在 2-100 之间）
	 */
	isBroken(): boolean {
		return this.name.length < 2 || this.name.length > 100;
	}
}
