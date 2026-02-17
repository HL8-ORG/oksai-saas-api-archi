/**
 * @description 用户 ID 值对象（模板最小实现）
 */
export class UserId {
	private constructor(readonly value: string) {}

	static of(value: string): UserId {
		const v = String(value ?? '').trim();
		if (!v) throw new Error('用户 ID 不能为空。');
		return new UserId(v);
	}
}

