import { Email } from './email';
import { InvalidEmailException } from '../exceptions/domain-exceptions';

describe('Email', () => {
	describe('创建', () => {
		it('应成功创建有效邮箱', () => {
			const email = Email.of('user@example.com');

			expect(email.getValue()).toBe('user@example.com');
		});

		it('应自动转为小写', () => {
			const email = Email.of('User@Example.COM');

			expect(email.getValue()).toBe('user@example.com');
		});

		it('应自动去除前后空格', () => {
			const email = Email.of('  user@example.com  ');

			expect(email.getValue()).toBe('user@example.com');
		});

		it('应处理带 + 号的邮箱', () => {
			const email = Email.of('user+tag@example.com');

			expect(email.getValue()).toBe('user+tag@example.com');
		});

		it('应处理带数字的邮箱', () => {
			const email = Email.of('user123@example123.com');

			expect(email.getValue()).toBe('user123@example123.com');
		});

		it('应处理带短横线的域名', () => {
			const email = Email.of('user@my-domain.com');

			expect(email.getValue()).toBe('user@my-domain.com');
		});

		it('应处理带点的本地部分', () => {
			const email = Email.of('first.last@example.com');

			expect(email.getValue()).toBe('first.last@example.com');
		});

		it('应处理下划线', () => {
			const email = Email.of('user_name@example.com');

			expect(email.getValue()).toBe('user_name@example.com');
		});
	});

	describe('验证失败', () => {
		it('空字符串应抛出 InvalidEmailException', () => {
			expect(() => Email.of('')).toThrow(InvalidEmailException);
			expect(() => Email.of('')).toThrow('邮箱不能为空');
		});

		it('只有空格应抛出 InvalidEmailException', () => {
			expect(() => Email.of('   ')).toThrow(InvalidEmailException);
		});

		it('缺少 @ 应抛出 InvalidEmailException', () => {
			expect(() => Email.of('userexample.com')).toThrow(InvalidEmailException);
			expect(() => Email.of('userexample.com')).toThrow('缺少 @ 符号');
		});

		it('多个 @ 应抛出 InvalidEmailException', () => {
			expect(() => Email.of('user@@example.com')).toThrow(InvalidEmailException);
		});

		it('@ 开头应抛出 InvalidEmailException', () => {
			expect(() => Email.of('@example.com')).toThrow(InvalidEmailException);
		});

		it('@ 结尾应抛出 InvalidEmailException', () => {
			expect(() => Email.of('user@')).toThrow(InvalidEmailException);
		});

		it('缺少域名后缀应抛出 InvalidEmailException', () => {
			expect(() => Email.of('user@example')).toThrow(InvalidEmailException);
		});

		it('包含空格应抛出 InvalidEmailException', () => {
			expect(() => Email.of('user @example.com')).toThrow(InvalidEmailException);
		});

		it('null/undefined 应抛出 InvalidEmailException', () => {
			expect(() => Email.of(null as unknown as string)).toThrow(InvalidEmailException);
			expect(() => Email.of(undefined as unknown as string)).toThrow(InvalidEmailException);
		});
	});

	describe('相等性比较', () => {
		it('相同邮箱应相等', () => {
			const email1 = Email.of('user@example.com');
			const email2 = Email.of('user@example.com');

			expect(email1.equals(email2)).toBe(true);
		});

		it('不同大小写应相等（标准化后）', () => {
			const email1 = Email.of('USER@EXAMPLE.COM');
			const email2 = Email.of('user@example.com');

			expect(email1.equals(email2)).toBe(true);
		});

		it('不同邮箱应不相等', () => {
			const email1 = Email.of('user1@example.com');
			const email2 = Email.of('user2@example.com');

			expect(email1.equals(email2)).toBe(false);
		});

		it('与 null 比较应返回 false', () => {
			const email = Email.of('user@example.com');

			expect(email.equals(null as unknown as Email)).toBe(false);
		});

		it('与 undefined 比较应返回 false', () => {
			const email = Email.of('user@example.com');

			expect(email.equals(undefined as unknown as Email)).toBe(false);
		});
	});

	describe('辅助方法', () => {
		it('getDomain 应返回域名部分', () => {
			const email = Email.of('user@example.com');

			expect(email.getDomain()).toBe('example.com');
		});

		it('getLocalPart 应返回本地部分', () => {
			const email = Email.of('user@example.com');

			expect(email.getLocalPart()).toBe('user');
		});

		it('getDomain 应处理复杂域名', () => {
			const email = Email.of('user@sub.domain.example.com');

			expect(email.getDomain()).toBe('sub.domain.example.com');
		});

		it('getLocalPart 应处理带点的本地部分', () => {
			const email = Email.of('first.last@example.com');

			expect(email.getLocalPart()).toBe('first.last');
		});
	});

	describe('序列化', () => {
		it('toString 应返回邮箱字符串', () => {
			const email = Email.of('user@example.com');

			expect(email.toString()).toBe('user@example.com');
		});

		it('toJSON 应返回邮箱字符串', () => {
			const email = Email.of('user@example.com');

			expect(email.toJSON()).toBe('user@example.com');
		});

		it('JSON.stringify 应正确序列化', () => {
			const email = Email.of('user@example.com');

			expect(JSON.stringify(email)).toBe('"user@example.com"');
		});
	});

	describe('value 属性（兼容旧 API）', () => {
		it('value 属性应返回邮箱值', () => {
			const email = Email.of('user@example.com');

			expect(email.value).toBe('user@example.com');
		});
	});

	describe('不可变性', () => {
		it('对象应被冻结', () => {
			const email = Email.of('user@example.com');

			expect(Object.isFrozen(email)).toBe(true);
		});
	});
});
