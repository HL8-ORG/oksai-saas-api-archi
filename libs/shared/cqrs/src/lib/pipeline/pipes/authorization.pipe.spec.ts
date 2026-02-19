import 'reflect-metadata';
import { ForbiddenException } from '@nestjs/common';
import {
	AuthorizationPipe,
	DefaultPermissionChecker,
	RequirePermission,
	CQRS_PERMISSION_ACTION_KEY
} from './authorization.pipe';
import type { IPermissionChecker } from './authorization.pipe';
import { createCqrsContext } from '../pipeline';
import type { ICommand } from '../../interfaces';

describe('AuthorizationPipe', () => {
	let authorizationPipe: AuthorizationPipe;
	let mockPermissionChecker: IPermissionChecker;

	beforeEach(() => {
		mockPermissionChecker = {
			checkPermission: jest.fn()
		};
		authorizationPipe = new AuthorizationPipe(mockPermissionChecker);
	});

	describe('基本属性', () => {
		it('应该有正确的管道名称', () => {
			expect(authorizationPipe.name).toBe('AuthorizationPipe');
		});
	});

	describe('execute', () => {
		it('当没有 @RequirePermission 装饰器时应该跳过权限检查', async () => {
			const command: ICommand = { type: 'TestCommand' };
			const context = createCqrsContext('TestCommand', command, {
				userId: 'user-001',
				tenantId: 'tenant-001'
			});
			const next = jest.fn().mockResolvedValue('result');

			const result = await authorizationPipe.execute(context, next);

			expect(result).toBe('result');
			expect(next).toHaveBeenCalled();
			expect(mockPermissionChecker.checkPermission).not.toHaveBeenCalled();
		});

		it('当有权限时应该允许执行', async () => {
			@RequirePermission('user:create')
			class CreateUserCommand implements ICommand {
				type = 'CreateUser' as const;
				name!: string;
			}

			const command = new CreateUserCommand();
			const context = createCqrsContext('CreateUser', command, {
				userId: 'user-001',
				tenantId: 'tenant-001'
			});
			const next = jest.fn().mockResolvedValue('result');

			mockPermissionChecker.checkPermission = jest.fn().mockResolvedValue(true);

			const result = await authorizationPipe.execute(context, next);

			expect(result).toBe('result');
			expect(mockPermissionChecker.checkPermission).toHaveBeenCalledWith({
				userId: 'user-001',
				tenantId: 'tenant-001',
				commandType: 'CreateUser'
			});
		});

		it('当没有权限时应该抛出 ForbiddenException', async () => {
			@RequirePermission('admin:delete')
			class DeleteUserCommand implements ICommand {
				type = 'DeleteUser' as const;
				userId!: string;
			}

			const command = new DeleteUserCommand();
			const context = createCqrsContext('DeleteUser', command, {
				userId: 'user-001',
				tenantId: 'tenant-001'
			});
			const next = jest.fn().mockResolvedValue('result');

			mockPermissionChecker.checkPermission = jest.fn().mockResolvedValue(false);

			await expect(authorizationPipe.execute(context, next)).rejects.toThrow(ForbiddenException);
			await expect(authorizationPipe.execute(context, next)).rejects.toThrow('您没有权限执行此操作');
			expect(next).not.toHaveBeenCalled();
		});

		it('应该正确传递上下文参数给权限检查器', async () => {
			@RequirePermission('tenant:update')
			class UpdateTenantCommand implements ICommand {
				type = 'UpdateTenant' as const;
				name!: string;
			}

			const command = new UpdateTenantCommand();
			const context = createCqrsContext('UpdateTenant', command, {
				userId: 'admin-001',
				tenantId: 'tenant-999'
			});
			const next = jest.fn().mockResolvedValue('result');

			mockPermissionChecker.checkPermission = jest.fn().mockResolvedValue(true);

			await authorizationPipe.execute(context, next);

			expect(mockPermissionChecker.checkPermission).toHaveBeenCalledWith({
				userId: 'admin-001',
				tenantId: 'tenant-999',
				commandType: 'UpdateTenant'
			});
		});

		it('当没有 userId 时也应该调用权限检查器', async () => {
			@RequirePermission('public:access')
			class PublicCommand implements ICommand {
				type = 'PublicCommand' as const;
			}

			const command = new PublicCommand();
			const context = createCqrsContext('PublicCommand', command, {
				tenantId: 'tenant-001'
			});
			const next = jest.fn().mockResolvedValue('result');

			mockPermissionChecker.checkPermission = jest.fn().mockResolvedValue(true);

			await authorizationPipe.execute(context, next);

			expect(mockPermissionChecker.checkPermission).toHaveBeenCalledWith({
				userId: undefined,
				tenantId: 'tenant-001',
				commandType: 'PublicCommand'
			});
		});
	});
});

describe('DefaultPermissionChecker', () => {
	let permissionChecker: DefaultPermissionChecker;

	beforeEach(() => {
		permissionChecker = new DefaultPermissionChecker();
	});

	it('应该始终返回 true', async () => {
		const result = await permissionChecker.checkPermission({
			userId: 'user-001',
			tenantId: 'tenant-001',
			commandType: 'AnyCommand'
		});

		expect(result).toBe(true);
	});

	it('即使没有上下文也应该返回 true', async () => {
		const result = await permissionChecker.checkPermission({
			commandType: 'AnyCommand'
		});

		expect(result).toBe(true);
	});
});

describe('RequirePermission', () => {
	it('应该在目标类上设置权限操作元数据', () => {
		@RequirePermission('user:create')
		class CreateUserCommand implements ICommand {
			type = 'CreateUser' as const;
			name!: string;
		}

		const metadata = Reflect.getMetadata(CQRS_PERMISSION_ACTION_KEY, CreateUserCommand);

		expect(metadata).toBe('user:create');
	});

	it('应该支持不同的权限操作', () => {
		@RequirePermission('tenant:read')
		class GetTenantCommand implements ICommand {
			type = 'GetTenant' as const;
		}

		@RequirePermission('tenant:delete')
		class DeleteTenantCommand implements ICommand {
			type = 'DeleteTenant' as const;
		}

		const readMetadata = Reflect.getMetadata(CQRS_PERMISSION_ACTION_KEY, GetTenantCommand);
		const deleteMetadata = Reflect.getMetadata(CQRS_PERMISSION_ACTION_KEY, DeleteTenantCommand);

		expect(readMetadata).toBe('tenant:read');
		expect(deleteMetadata).toBe('tenant:delete');
	});

	it('应该支持复合权限操作', () => {
		@RequirePermission('admin:users:manage')
		class ManageUsersCommand implements ICommand {
			type = 'ManageUsers' as const;
		}

		const metadata = Reflect.getMetadata(CQRS_PERMISSION_ACTION_KEY, ManageUsersCommand);

		expect(metadata).toBe('admin:users:manage');
	});
});
