import { UserId } from './user-id';
import { InvalidUserIdException } from '../exceptions/domain-exceptions';

describe('UserId', () => {
	describe('创建', () => {
		it('应成功创建有效的用户 ID', () => {
			const userId = UserId.of('user-123');

			expect(userId.getValue()).toBe('user-123');
		});

		it('应成功创建 UUID 格式的用户 ID', () => {
			const uuid = '123e4567-e89b-12d3-a456-426614174000';
			const userId = UserId.of(uuid);

			expect(userId.getValue()).toBe(uuid);
		});

		it('应自动去除前后空格', () => {
			const userId = UserId.of('  user-123  ');

			expect(userId.getValue()).toBe('user-123');
		});

		it('create 应生成有效的用户 ID', () => {
			const userId = UserId.create();

			expect(userId.getValue()).toBeDefined();
			expect(typeof userId.getValue()).toBe('string');
			expect(userId.getValue().length).toBeGreaterThan(0);
		});

		it('create 应生成唯一的用户 ID', () => {
			const userId1 = UserId.create();
			const userId2 = UserId.create();

			expect(userId1.getValue()).not.toBe(userId2.getValue());
		});

		it('create 应生成 UUID 格式的用户 ID', () => {
			const userId = UserId.create();

			expect(UserId.isValidUUID(userId.getValue())).toBe(true);
		});
	});

	describe('验证失败', () => {
		it('空字符串应抛出 InvalidUserIdException', () => {
			expect(() => UserId.of('')).toThrow(InvalidUserIdException);
			expect(() => UserId.of('')).toThrow('用户 ID 不能为空');
		});

		it('只有空格应抛出 InvalidUserIdException', () => {
			expect(() => UserId.of('   ')).toThrow(InvalidUserIdException);
		});

		it('null/undefined 应抛出 InvalidUserIdException', () => {
			expect(() => UserId.of(null as unknown as string)).toThrow(InvalidUserIdException);
			expect(() => UserId.of(undefined as unknown as string)).toThrow(InvalidUserIdException);
		});
	});

	describe('相等性比较', () => {
		it('相同用户 ID 应相等', () => {
			const userId1 = UserId.of('user-123');
			const userId2 = UserId.of('user-123');

			expect(userId1.equals(userId2)).toBe(true);
		});

		it('不同用户 ID 应不相等', () => {
			const userId1 = UserId.of('user-123');
			const userId2 = UserId.of('user-456');

			expect(userId1.equals(userId2)).toBe(false);
		});

		it('与 null 比较应返回 false', () => {
			const userId = UserId.of('user-123');

			expect(userId.equals(null as unknown as UserId)).toBe(false);
		});

		it('与 undefined 比较应返回 false', () => {
			const userId = UserId.of('user-123');

			expect(userId.equals(undefined as unknown as UserId)).toBe(false);
		});
	});

	describe('isValidUUID', () => {
		it('有效的 UUID v1 应返回 true', () => {
			expect(UserId.isValidUUID('123e4567-e89b-12d3-a456-426614174000')).toBe(true);
		});

		it('有效的 UUID v4 应返回 true', () => {
			expect(UserId.isValidUUID('123e4567-e89b-42d3-a456-426614174000')).toBe(true);
		});

		it('大写 UUID 应返回 true', () => {
			expect(UserId.isValidUUID('123E4567-E89B-12D3-A456-426614174000'.toUpperCase())).toBe(true);
		});

		it('非 UUID 格式应返回 false', () => {
			expect(UserId.isValidUUID('not-a-uuid')).toBe(false);
		});

		it('空字符串应返回 false', () => {
			expect(UserId.isValidUUID('')).toBe(false);
		});

		it('格式错误的 UUID 应返回 false', () => {
			expect(UserId.isValidUUID('123e4567-e89b-12d3-a456')).toBe(false);
			expect(UserId.isValidUUID('123e4567e89b12d3a456426614174000')).toBe(false);
		});
	});

	describe('序列化', () => {
		it('toString 应返回用户 ID 字符串', () => {
			const userId = UserId.of('user-123');

			expect(userId.toString()).toBe('user-123');
		});

		it('toJSON 应返回用户 ID 字符串', () => {
			const userId = UserId.of('user-123');

			expect(userId.toJSON()).toBe('user-123');
		});

		it('JSON.stringify 应正确序列化', () => {
			const userId = UserId.of('user-123');

			expect(JSON.stringify(userId)).toBe('"user-123"');
		});
	});

	describe('value 属性（兼容旧 API）', () => {
		it('value 属性应返回用户 ID 值', () => {
			const userId = UserId.of('user-123');

			expect(userId.value).toBe('user-123');
		});
	});

	describe('不可变性', () => {
		it('对象应被冻结', () => {
			const userId = UserId.of('user-123');

			expect(Object.isFrozen(userId)).toBe(true);
		});
	});
});
