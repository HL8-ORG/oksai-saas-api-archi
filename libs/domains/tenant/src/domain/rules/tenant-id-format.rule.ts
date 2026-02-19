import { IBusinessRule, DomainException } from '@oksai/kernel';

/**
 * @description 租户 ID 格式规则
 *
 * 业务规则：租户 ID 必须符合格式要求
 * - 非空
 * - 允许字母/数字/短横线/下划线
 * - 长度 3-64 个字符
 */
export class TenantIdFormatRule implements IBusinessRule {
	/**
	 * 规则被违反时的错误对象
	 */
	readonly Error: DomainException;

	constructor(private readonly tenantId: string) {
		this.Error = new DomainException(
			'租户 ID 格式非法（允许 a-zA-Z0-9_-，长度 3-64）',
			'TENANT_ID_FORMAT_INVALID',
			{ tenantId: this.tenantId }
		);
	}

	/**
	 * 判断规则是否被违反
	 *
	 * @returns true 表示规则被违反（格式不正确）
	 */
	isBroken(): boolean {
		const v = String(this.tenantId ?? '').trim();

		// 非空检查
		if (!v) {
			return true;
		}

		// 格式检查
		if (!/^[a-zA-Z0-9_-]{3,64}$/.test(v)) {
			return true;
		}

		return false;
	}
}
