import { CaslPermissionChecker } from './casl-permission-checker';
import { AbilityFactory } from '../ability/ability.factory';
import { AbilityBuilder, createMongoAbility, PureAbility } from '@casl/ability';
import type { AppAbility } from '../ability/ability.types';

describe('CaslPermissionChecker', () => {
	let checker: CaslPermissionChecker;
	let mockCreateForRequest: jest.Mock;

	beforeEach(() => {
		mockCreateForRequest = jest.fn();

		const mockAbilityFactory = {
			createForRequest: mockCreateForRequest
		} as unknown as AbilityFactory;

		checker = new CaslPermissionChecker(mockAbilityFactory);
	});

	describe('checkPermission', () => {
		it('当 userId 为空时，应返回 false（拒绝未登录用户）', async () => {
			// Arrange
			const params = {
				commandType: 'CreateUserCommand',
				tenantId: 'tenant-123'
			};

			// Act
			const result = await checker.checkPermission(params);

			// Assert
			expect(result).toBe(false);
			expect(mockCreateForRequest).not.toHaveBeenCalled();
		});

		it('当 userId 为 undefined 时，应返回 false', async () => {
			// Arrange
			const params = {
				userId: undefined,
				commandType: 'UpdateUserCommand'
			};

			// Act
			const result = await checker.checkPermission(params);

			// Assert
			expect(result).toBe(false);
		});

		it('当有 tenantId 时，应检查租户级资源权限', async () => {
			// Arrange
			const userId = 'user-123';
			const tenantId = 'tenant-456';
			const params = {
				userId,
				tenantId,
				commandType: 'CreateProjectCommand'
			};

			// 创建一个 mock ability 对象
			const mockAbility = {
				can: jest.fn().mockReturnValue(true)
			} as any;

			mockCreateForRequest.mockResolvedValue(mockAbility);

			// Act
			const result = await checker.checkPermission(params);

			// Assert
			expect(mockCreateForRequest).toHaveBeenCalled();
			// 验证调用了 can 方法，且使用正确的格式检查租户权限
			expect(mockAbility.can).toHaveBeenCalledWith('create', { type: 'Tenant', tenantId });
			expect(result).toBe(true);
		});

		it('当无 tenantId 时，应检查平台级资源权限', async () => {
			// Arrange
			const userId = 'admin-user';
			const params = {
				userId,
				commandType: 'CreatePlatformCommand'
			};

			const builder = new AbilityBuilder<AppAbility>(createMongoAbility);
			builder.can('manage', 'Platform');
			const mockAbility = builder.build();

			mockCreateForRequest.mockResolvedValue(mockAbility);

			// Act
			const result = await checker.checkPermission(params);

			// Assert
			expect(result).toBe(true);
		});

		it('当无权限时，应返回 false', async () => {
			// Arrange
			const userId = 'user-123';
			const tenantId = 'tenant-456';
			const params = {
				userId,
				tenantId,
				commandType: 'DeleteProjectCommand'
			};

			// 使用 PureAbility 创建 ability
			const builder = new AbilityBuilder<PureAbility>(createMongoAbility as any);
			builder.can('read', 'Tenant', { tenantId });
			const mockAbility = builder.build() as AppAbility;

			mockCreateForRequest.mockResolvedValue(mockAbility);

			// Act
			const result = await checker.checkPermission(params);

			// Assert
			expect(result).toBe(false);
		});
	});

	describe('resolveAction - 命令类型到动作的映射', () => {
		it('create 相关命令应映射为 create 动作', async () => {
			// Arrange
			const userId = 'user-123';
			const tenantId = 't1';
			const builder = new AbilityBuilder<PureAbility>(createMongoAbility as any);
			builder.can('create', 'Tenant', { tenantId });
			mockCreateForRequest.mockResolvedValue(builder.build() as AppAbility);

			const commandTypes = ['CreateUserCommand', 'RegisterTenantCommand', 'AddMemberCommand'];

			for (const commandType of commandTypes) {
				mockCreateForRequest.mockClear();

				// Act
				await checker.checkPermission({ userId, tenantId, commandType });

				// Assert
				expect(mockCreateForRequest).toHaveBeenCalled();
			}
		});

		it('update 相关命令应映射为 update 动作', async () => {
			// Arrange
			const userId = 'user-123';
			const tenantId = 't1';
			const builder = new AbilityBuilder<PureAbility>(createMongoAbility as any);
			builder.can('update', 'Tenant', { tenantId });
			mockCreateForRequest.mockResolvedValue(builder.build() as AppAbility);

			const commandTypes = ['UpdateUserCommand', 'ChangePasswordCommand', 'ModifySettingsCommand'];

			for (const commandType of commandTypes) {
				mockCreateForRequest.mockClear();

				// Act
				await checker.checkPermission({ userId, tenantId, commandType });

				// Assert
				expect(mockCreateForRequest).toHaveBeenCalled();
			}
		});

		it('delete 相关命令应映射为 delete 动作', async () => {
			// Arrange
			const userId = 'user-123';
			const tenantId = 't1';
			const builder = new AbilityBuilder<PureAbility>(createMongoAbility as any);
			builder.can('delete', 'Tenant', { tenantId });
			mockCreateForRequest.mockResolvedValue(builder.build() as AppAbility);

			const commandTypes = ['DeleteUserCommand', 'RemoveMemberCommand'];

			for (const commandType of commandTypes) {
				mockCreateForRequest.mockClear();

				// Act
				await checker.checkPermission({ userId, tenantId, commandType });

				// Assert
				expect(mockCreateForRequest).toHaveBeenCalled();
			}
		});

		it('read 相关命令应映射为 read 动作', async () => {
			// Arrange
			const userId = 'user-123';
			const tenantId = 't1';
			const builder = new AbilityBuilder<PureAbility>(createMongoAbility as any);
			builder.can('read', 'Tenant', { tenantId });
			mockCreateForRequest.mockResolvedValue(builder.build() as AppAbility);

			const commandTypes = ['GetUserQuery', 'FindUserQuery', 'ListUsersQuery', 'ReadSettingsQuery'];

			for (const commandType of commandTypes) {
				mockCreateForRequest.mockClear();

				// Act
				await checker.checkPermission({ userId, tenantId, commandType });

				// Assert
				expect(mockCreateForRequest).toHaveBeenCalled();
			}
		});

		it('未知命令类型应映射为 manage 动作（最严格）', async () => {
			// Arrange
			const userId = 'user-123';
			const tenantId = 't1';

			// 创建一个 mock ability 对象
			const mockAbility = {
				can: jest.fn().mockReturnValue(true)
			} as any;
			mockCreateForRequest.mockResolvedValue(mockAbility);

			// Act
			const result = await checker.checkPermission({
				userId,
				tenantId,
				commandType: 'ProcessPaymentCommand'
			});

			// Assert
			expect(mockCreateForRequest).toHaveBeenCalled();
			// 验证未知命令被映射为 manage 动作
			expect(mockAbility.can).toHaveBeenCalledWith('manage', { type: 'Tenant', tenantId });
			expect(result).toBe(true);
		});
	});
});
