/**
 * @description 邮箱值对象（最小实现）
 *
 * 注意：此处仅做基础格式校验；更严格校验可在应用层通过 DTO + class-validator 完成。
 */
export class Email {
	private constructor(readonly value: string) {}

	static of(value: string): Email {
		const v = String(value ?? '').trim().toLowerCase();
		if (!v) throw new Error('邮箱不能为空。');
		if (!v.includes('@')) throw new Error('邮箱格式不正确。');
		return new Email(v);
	}
}

