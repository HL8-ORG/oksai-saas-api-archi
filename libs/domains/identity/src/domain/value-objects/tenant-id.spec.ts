import { TenantId } from './tenant-id';
import { InvalidTenantIdException } from '../exceptions/domain-exceptions';

describe('TenantId', () => {
	describe('创建', () => {
		it('应成功创建有效的租户 ID', () => {
			const tenantId = TenantId.of('tenant-123');

			expect(tenantId.getValue()).toBe('tenant-123');
		});

		it('应成功创建 UUID 格式的租户 ID', () => {
			const uuid = '123e4567-e89b-12d3-a456-426614174000';
			const tenantId = TenantId.of(uuid);

			expect(tenantId.getValue()).toBe(uuid);
		});

		it('应自动去除前后空格', () => {
			const tenantId = TenantId.of('  tenant-123  ');

			expect(tenantId.getValue()).toBe('tenant-123');
		});

		it('create 应生成有效的租户 ID', () => {
			const tenantId = TenantId.create();

			expect(tenantId.getValue()).toBeDefined();
			expect(typeof tenantId.getValue()).toBe('string');
			expect(tenantId.getValue().length).toBeGreaterThan(0);
		});

		it('create 应生成唯一的租户 ID', () => {
			const tenantId1 = TenantId.create();
			const tenantId2 = TenantId.create();

			expect(tenantId1.getValue()).not.toBe(tenantId2.getValue());
		});

		it('create 应生成 UUID 格式的租户 ID', () => {
			const tenantId = TenantId.create();

			expect(TenantId.isValidUUID(tenantId.getValue())).toBe(true);
		});
	});

	describe('验证失败', () => {
		it('空字符串应抛出 InvalidTenantIdException', () => {
			expect(() => TenantId.of('')).toThrow(InvalidTenantIdException);
			expect(() => TenantId.of('')).toThrow('租户 ID 不能为空');
		});

		it('只有空格应抛出 InvalidTenantIdException', () => {
			expect(() => TenantId.of('   ')).toThrow(InvalidTenantIdException);
		});

		it('null/undefined 应抛出 InvalidTenantIdException', () => {
			expect(() => TenantId.of(null as unknown as string)).toThrow(InvalidTenantIdException);
			expect(() => TenantId.of(undefined as unknown as string)).toThrow(InvalidTenantIdException);
		});
	});

	describe('相等性比较', () => {
		it('相同租户 ID 应相等', () => {
			const tenantId1 = TenantId.of('tenant-123');
			const tenantId2 = TenantId.of('tenant-123');

			expect(tenantId1.equals(tenantId2)).toBe(true);
		});

		it('不同租户 ID 应不相等', () => {
			const tenantId1 = TenantId.of('tenant-123');
			const tenantId2 = TenantId.of('tenant-456');

			expect(tenantId1.equals(tenantId2)).toBe(false);
		});

		it('与 null 比较应返回 false', () => {
			const tenantId = TenantId.of('tenant-123');

			expect(tenantId.equals(null as unknown as TenantId)).toBe(false);
		});

		it('与 undefined 比较应返回 false', () => {
			const tenantId = TenantId.of('tenant-123');

			expect(tenantId.equals(undefined as unknown as TenantId)).toBe(false);
		});
	});

	describe('isValidUUID', () => {
		it('有效的 UUID v1 应返回 true', () => {
			expect(TenantId.isValidUUID('123e4567-e89b-12d3-a456-426614174000')).toBe(true);
		});

		it('有效的 UUID v4 应返回 true', () => {
			expect(TenantId.isValidUUID('123e4567-e89b-42d3-a456-426614174000')).toBe(true);
		});

		it('大写 UUID 应返回 true', () => {
			expect(TenantId.isValidUUID('123E4567-E89B-12D3-A456-426614174000'.toUpperCase())).toBe(true);
		});

		it('非 UUID 格式应返回 false', () => {
			expect(TenantId.isValidUUID('not-a-uuid')).toBe(false);
		});

		it('空字符串应返回 false', () => {
			expect(TenantId.isValidUUID('')).toBe(false);
		});

		it('格式错误的 UUID 应返回 false', () => {
			expect(TenantId.isValidUUID('123e4567-e89b-12d3-a456')).toBe(false);
			expect(TenantId.isValidUUID('123e4567e89b12d3a456426614174000')).toBe(false);
		});
	});

	describe('序列化', () => {
		it('toString 应返回租户 ID 字符串', () => {
			const tenantId = TenantId.of('tenant-123');

			expect(tenantId.toString()).toBe('tenant-123');
		});

		it('toJSON 应返回租户 ID 字符串', () => {
			const tenantId = TenantId.of('tenant-123');

			expect(tenantId.toJSON()).toBe('tenant-123');
		});

		it('JSON.stringify 应正确序列化', () => {
			const tenantId = TenantId.of('tenant-123');

			expect(JSON.stringify(tenantId)).toBe('"tenant-123"');
		});
	});

	describe('value 属性（兼容旧 API）', () => {
		it('value 属性应返回租户 ID 值', () => {
			const tenantId = TenantId.of('tenant-123');

			expect(tenantId.value).toBe('tenant-123');
		});
	});

	describe('不可变性', () => {
		it('对象应被冻结', () => {
			const tenantId = TenantId.of('tenant-123');

			expect(Object.isFrozen(tenantId)).toBe(true);
		});
	});
});
