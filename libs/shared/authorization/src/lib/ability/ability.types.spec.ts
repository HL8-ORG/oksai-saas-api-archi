import type { AppAction, AppSubject, AppSubjects, AppAbilityTuple, TenantScopedResource } from './ability.types';

describe('ability.types', () => {
	describe('AppAction 类型', () => {
		it('应支持 manage 动作', () => {
			// Arrange & Act
			const action: AppAction = 'manage';

			// Assert
			expect(action).toBe('manage');
		});

		it('应支持 read 动作', () => {
			// Arrange & Act
			const action: AppAction = 'read';

			// Assert
			expect(action).toBe('read');
		});

		it('应支持 create 动作', () => {
			// Arrange & Act
			const action: AppAction = 'create';

			// Assert
			expect(action).toBe('create');
		});

		it('应支持 update 动作', () => {
			// Arrange & Act
			const action: AppAction = 'update';

			// Assert
			expect(action).toBe('update');
		});

		it('应支持 delete 动作', () => {
			// Arrange & Act
			const action: AppAction = 'delete';

			// Assert
			expect(action).toBe('delete');
		});
	});

	describe('AppSubject 类型', () => {
		it('应支持 Platform 资源类型', () => {
			// Arrange & Act
			const subject: AppSubject = 'Platform';

			// Assert
			expect(subject).toBe('Platform');
		});

		it('应支持 Tenant 资源类型', () => {
			// Arrange & Act
			const subject: AppSubject = 'Tenant';

			// Assert
			expect(subject).toBe('Tenant');
		});

		it('应支持 Any 资源类型（扩展占位）', () => {
			// Arrange & Act
			const subject: AppSubject = 'Any';

			// Assert
			expect(subject).toBe('Any');
		});
	});

	describe('TenantScopedResource 接口', () => {
		it('应包含 tenantId 字段', () => {
			// Arrange & Act
			const resource: TenantScopedResource = {
				tenantId: 'tenant-123'
			};

			// Assert
			expect(resource.tenantId).toBe('tenant-123');
		});
	});

	describe('AppSubjects 联合类型', () => {
		it('应支持字符串形式的 AppSubject', () => {
			// Arrange & Act
			const subject: AppSubjects = 'Platform';

			// Assert
			expect(subject).toBe('Platform');
		});

		it('应支持带 tenantId 的 Tenant 资源', () => {
			// Arrange & Act
			const subject: AppSubjects = {
				__caslSubjectType__: 'Tenant' as const,
				tenantId: 'tenant-456'
			};

			// Assert
			expect(subject).toEqual({
				__caslSubjectType__: 'Tenant',
				tenantId: 'tenant-456'
			});
		});
	});

	describe('AppAbilityTuple 类型', () => {
		it('应正确表示动作与资源的元组', () => {
			// Arrange & Act
			const tuple: AppAbilityTuple = ['manage', 'Platform'];

			// Assert
			expect(tuple[0]).toBe('manage');
			expect(tuple[1]).toBe('Platform');
		});

		it('应支持 read 动作与 Tenant 资源的元组', () => {
			// Arrange & Act
			const tuple: AppAbilityTuple = ['read', 'Tenant'];

			// Assert
			expect(tuple[0]).toBe('read');
			expect(tuple[1]).toBe('Tenant');
		});
	});
});
