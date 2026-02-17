/**
 * @description 租户 ID 值对象（最小实现）
 */
export class TenantId {
	private constructor(readonly value: string) {}

	static of(value: string): TenantId {
		const v = String(value ?? '').trim();
		if (!v) throw new Error('租户 ID 不能为空。');
		return new TenantId(v);
	}
}

