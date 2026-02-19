import { TenantSettings } from './tenant-settings.value-object';
import { DomainException } from '../exceptions/domain.exception';

describe('TenantSettings 值对象', () => {
	describe('of 静态方法', () => {
		it('应该使用有效参数创建 TenantSettings', () => {
			// Arrange
			const maxMembers = 100;

			// Act
			const settings = TenantSettings.of({ maxMembers });

			// Assert
			expect(settings.getMaxMembers()).toBe(maxMembers);
		});

		it('应该接受最小值 1', () => {
			// Arrange
			const minMembers = 1;

			// Act
			const settings = TenantSettings.of({ maxMembers: minMembers });

			// Assert
			expect(settings.getMaxMembers()).toBe(minMembers);
		});

		it('应该接受最大值 10000', () => {
			// Arrange
			const maxMembersLimit = 10000;

			// Act
			const settings = TenantSettings.of({ maxMembers: maxMembersLimit });

			// Assert
			expect(settings.getMaxMembers()).toBe(maxMembersLimit);
		});

		it('应该拒绝小于 1 的值', () => {
			// Arrange & Act & Assert
			expect(() => TenantSettings.of({ maxMembers: 0 })).toThrow(DomainException);
			expect(() => TenantSettings.of({ maxMembers: 0 })).toThrow('maxMembers 必须在 1-10000 之间');
		});

		it('应该拒绝负数值', () => {
			// Arrange & Act & Assert
			expect(() => TenantSettings.of({ maxMembers: -1 })).toThrow(DomainException);
			expect(() => TenantSettings.of({ maxMembers: -1 })).toThrow('maxMembers 必须在 1-10000 之间');
		});

		it('应该拒绝大于 10000 的值', () => {
			// Arrange & Act & Assert
			expect(() => TenantSettings.of({ maxMembers: 10001 })).toThrow(DomainException);
			expect(() => TenantSettings.of({ maxMembers: 10001 })).toThrow('maxMembers 必须在 1-10000 之间');
		});

		it('应该拒绝 Infinity', () => {
			// Arrange & Act & Assert
			expect(() => TenantSettings.of({ maxMembers: Infinity })).toThrow(DomainException);
			expect(() => TenantSettings.of({ maxMembers: Infinity })).toThrow('maxMembers 必须在 1-10000 之间');
		});

		it('应该拒绝 -Infinity', () => {
			// Arrange & Act & Assert
			expect(() => TenantSettings.of({ maxMembers: -Infinity })).toThrow(DomainException);
			expect(() => TenantSettings.of({ maxMembers: -Infinity })).toThrow('maxMembers 必须在 1-10000 之间');
		});

		it('应该拒绝 NaN', () => {
			// Arrange & Act & Assert
			expect(() => TenantSettings.of({ maxMembers: NaN })).toThrow(DomainException);
			expect(() => TenantSettings.of({ maxMembers: NaN })).toThrow('maxMembers 必须在 1-10000 之间');
		});

		it('应该处理字符串数字并转换为数字', () => {
			// Arrange
			const strValue = '50';

			// Act
			const settings = TenantSettings.of({ maxMembers: strValue as unknown as number });

			// Assert
			expect(settings.getMaxMembers()).toBe(50);
		});
	});

	describe('default 静态方法', () => {
		it('应该创建默认配置（maxMembers 为 50）', () => {
			// Act
			const settings = TenantSettings.default();

			// Assert
			expect(settings.getMaxMembers()).toBe(50);
		});

		it('多次调用应该返回相等但不相同的对象', () => {
			// Act
			const settings1 = TenantSettings.default();
			const settings2 = TenantSettings.default();

			// Assert
			expect(settings1.equals(settings2)).toBe(true);
			expect(settings1).not.toBe(settings2);
		});
	});

	describe('getMaxMembers 方法', () => {
		it('应该返回最大成员数', () => {
			// Arrange
			const settings = TenantSettings.of({ maxMembers: 100 });

			// Act
			const maxMembers = settings.getMaxMembers();

			// Assert
			expect(maxMembers).toBe(100);
		});
	});

	describe('maxMembers getter', () => {
		it('应该兼容旧 API 返回最大成员数', () => {
			// Arrange
			const settings = TenantSettings.of({ maxMembers: 100 });

			// Act
			const maxMembers = settings.maxMembers;

			// Assert
			expect(maxMembers).toBe(100);
		});
	});

	describe('equals 方法', () => {
		it('相同 maxMembers 应该返回 true', () => {
			// Arrange
			const settings1 = TenantSettings.of({ maxMembers: 100 });
			const settings2 = TenantSettings.of({ maxMembers: 100 });

			// Act & Assert
			expect(settings1.equals(settings2)).toBe(true);
			expect(settings2.equals(settings1)).toBe(true);
		});

		it('不同 maxMembers 应该返回 false', () => {
			// Arrange
			const settings1 = TenantSettings.of({ maxMembers: 100 });
			const settings2 = TenantSettings.of({ maxMembers: 200 });

			// Act & Assert
			expect(settings1.equals(settings2)).toBe(false);
			expect(settings2.equals(settings1)).toBe(false);
		});

		it('传入 null 应该返回 false', () => {
			// Arrange
			const settings = TenantSettings.of({ maxMembers: 100 });

			// Act & Assert
			expect(settings.equals(null as unknown as TenantSettings)).toBe(false);
		});

		it('传入 undefined 应该返回 false', () => {
			// Arrange
			const settings = TenantSettings.of({ maxMembers: 100 });

			// Act & Assert
			expect(settings.equals(undefined as unknown as TenantSettings)).toBe(false);
		});
	});

	describe('toJSON 方法', () => {
		it('应该返回包含 maxMembers 的对象', () => {
			// Arrange
			const settings = TenantSettings.of({ maxMembers: 100 });

			// Act
			const json = settings.toJSON();

			// Assert
			expect(json).toEqual({ maxMembers: 100 });
		});

		it('应该能够正确序列化和反序列化', () => {
			// Arrange
			const settings = TenantSettings.of({ maxMembers: 100 });

			// Act
			const serialized = JSON.stringify({ settings });
			const parsed = JSON.parse(serialized);

			// Assert
			expect(parsed.settings.maxMembers).toBe(100);
		});
	});
});
