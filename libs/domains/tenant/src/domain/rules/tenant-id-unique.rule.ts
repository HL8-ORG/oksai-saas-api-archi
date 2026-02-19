import { IBusinessRule, DomainException } from '@oksai/kernel';

/**
 * @description 租户 ID 唯一性规则
 *
 * 业务规则：租户 ID 在系统中必须唯一
 *
 * 注意：此规则需要访问仓储来检查唯一性，因此是异步规则
 */
export class TenantIdUniqueRule implements IBusinessRule {
	/**
	 * 规则被违反时的错误对象
	 */
	readonly Error: DomainException;

	constructor(
		private readonly tenantId: string,
		private readonly tenantExistsFn: (tenantId: string) => Promise<boolean>
	) {
		this.Error = new DomainException(
			`租户 ID "${this.tenantId}" 已存在`,
			'TENANT_ID_DUPLICATE',
			{ tenantId: this.tenantId }
		);
	}

	/**
	 * 判断规则是否被违反
	 *
	 * @returns true 表示规则被违反（租户 ID 已存在）
	 */
	async isBroken(): Promise<boolean> {
		const exists = await this.tenantExistsFn(this.tenantId);
		return exists;
	}
}
