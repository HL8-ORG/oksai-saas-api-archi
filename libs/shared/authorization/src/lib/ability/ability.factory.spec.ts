import { Test, TestingModule } from '@nestjs/testing';
import { AbilityFactory } from './ability.factory';
import { OksaiRequestContextService } from '@oksai/context';
import { OKSAI_ROLE_RESOLVER_TOKEN, IRoleResolver } from '../ports/role-resolver.port';

describe('AbilityFactory', () => {
	let factory: AbilityFactory;
	let mockContext: jest.Mocked<OksaiRequestContextService>;
	let mockRoleResolver: jest.Mocked<IRoleResolver>;

	beforeEach(async () => {
		// 创建 mock 对象
		mockContext = {
			getUserId: jest.fn(),
			getTenantId: jest.fn()
		} as unknown as jest.Mocked<OksaiRequestContextService>;

		mockRoleResolver = {
			getPlatformRoles: jest.fn(),
			getTenantRoles: jest.fn()
		};

		const module: TestingModule = await Test.createTestingModule({
			providers: [
				AbilityFactory,
				{
					provide: OksaiRequestContextService,
					useValue: mockContext
				},
				{
					provide: OKSAI_ROLE_RESOLVER_TOKEN,
					useValue: mockRoleResolver
				}
			]
		}).compile();

		factory = module.get<AbilityFactory>(AbilityFactory);
	});

	describe('createForRequest', () => {
		it('当用户未登录时，应返回空权限 Ability', async () => {
			// Arrange
			mockContext.getUserId.mockReturnValue(undefined);

			// Act
			const ability = await factory.createForRequest();

			// Assert
			expect(ability.can('read', 'Platform')).toBe(false);
			expect(ability.can('manage', 'Tenant')).toBe(false);
			expect(mockRoleResolver.getPlatformRoles).not.toHaveBeenCalled();
			expect(mockRoleResolver.getTenantRoles).not.toHaveBeenCalled();
		});

		it('当用户登录但无任何角色时，应返回空权限 Ability', async () => {
			// Arrange
			const userId = 'user-123';
			const tenantId = 'tenant-456';
			mockContext.getUserId.mockReturnValue(userId);
			mockContext.getTenantId.mockReturnValue(tenantId);
			mockRoleResolver.getPlatformRoles.mockResolvedValue([]);
			mockRoleResolver.getTenantRoles.mockResolvedValue([]);

			// Act
			const ability = await factory.createForRequest();

			// Assert
			expect(ability.can('read', 'Platform')).toBe(false);
			expect(ability.can('manage', 'Tenant')).toBe(false);
		});

		describe('平台角色权限', () => {
			it('当用户是 PlatformAdmin 时，应有 manage Platform 权限', async () => {
				// Arrange
				const userId = 'admin-user';
				mockContext.getUserId.mockReturnValue(userId);
				mockContext.getTenantId.mockReturnValue(undefined);
				mockRoleResolver.getPlatformRoles.mockResolvedValue(['PlatformAdmin']);

				// Act
				const ability = await factory.createForRequest();

				// Assert
				expect(ability.can('manage', 'Platform')).toBe(true);
				expect(ability.can('read', 'Platform')).toBe(true);
				expect(ability.can('create', 'Platform')).toBe(true);
			});
		});

		describe('租户角色权限', () => {
			it('当用户是 TenantOwner 时，应有 manage Tenant 权限（绑定 tenantId）', async () => {
				// Arrange
				const userId = 'owner-user';
				const tenantId = 'tenant-789';
				mockContext.getUserId.mockReturnValue(userId);
				mockContext.getTenantId.mockReturnValue(tenantId);
				mockRoleResolver.getPlatformRoles.mockResolvedValue([]);
				mockRoleResolver.getTenantRoles.mockResolvedValue(['TenantOwner']);

				// Act
				const ability = await factory.createForRequest();

				// Assert
				const tenantSubject = { __caslSubjectType__: 'Tenant' as const, tenantId };
				expect(ability.can('manage', tenantSubject)).toBe(true);
				expect(ability.can('read', tenantSubject)).toBe(true);
			});

			it('当用户是 TenantAdmin 时，应有 manage Tenant 权限（绑定 tenantId）', async () => {
				// Arrange
				const userId = 'admin-user';
				const tenantId = 'tenant-789';
				mockContext.getUserId.mockReturnValue(userId);
				mockContext.getTenantId.mockReturnValue(tenantId);
				mockRoleResolver.getPlatformRoles.mockResolvedValue([]);
				mockRoleResolver.getTenantRoles.mockResolvedValue(['TenantAdmin']);

				// Act
				const ability = await factory.createForRequest();

				// Assert
				const tenantSubject = { __caslSubjectType__: 'Tenant' as const, tenantId };
				expect(ability.can('manage', tenantSubject)).toBe(true);
			});

			it('当用户是 TenantMember 时，应仅有 read Tenant 权限（绑定 tenantId）', async () => {
				// Arrange
				const userId = 'member-user';
				const tenantId = 'tenant-789';
				mockContext.getUserId.mockReturnValue(userId);
				mockContext.getTenantId.mockReturnValue(tenantId);
				mockRoleResolver.getPlatformRoles.mockResolvedValue([]);
				mockRoleResolver.getTenantRoles.mockResolvedValue(['TenantMember']);

				// Act
				const ability = await factory.createForRequest();

				// Assert
				const tenantSubject = { __caslSubjectType__: 'Tenant' as const, tenantId };
				expect(ability.can('read', tenantSubject)).toBe(true);
				expect(ability.can('manage', tenantSubject)).toBe(false);
				expect(ability.can('update', tenantSubject)).toBe(false);
			});

			it('租户权限应隔离，不同 tenantId 应无法访问', async () => {
				// Arrange
				const userId = 'owner-user';
				const tenantId = 'tenant-789';
				const otherTenantId = 'tenant-other';
				mockContext.getUserId.mockReturnValue(userId);
				mockContext.getTenantId.mockReturnValue(tenantId);
				mockRoleResolver.getPlatformRoles.mockResolvedValue([]);
				mockRoleResolver.getTenantRoles.mockResolvedValue(['TenantOwner']);

				// Act
				const ability = await factory.createForRequest();

				// Assert
				const tenantSubject = { __caslSubjectType__: 'Tenant' as const, tenantId };
				const otherTenantSubject = { __caslSubjectType__: 'Tenant' as const, tenantId: otherTenantId };
				expect(ability.can('manage', tenantSubject)).toBe(true);
				expect(ability.can('manage', otherTenantSubject)).toBe(false);
			});
		});

		it('当无 tenantId 时，不应查询租户角色', async () => {
			// Arrange
			const userId = 'user-123';
			mockContext.getUserId.mockReturnValue(userId);
			mockContext.getTenantId.mockReturnValue(undefined);
			mockRoleResolver.getPlatformRoles.mockResolvedValue([]);

			// Act
			await factory.createForRequest();

			// Assert
			expect(mockRoleResolver.getTenantRoles).not.toHaveBeenCalled();
		});
	});
});
