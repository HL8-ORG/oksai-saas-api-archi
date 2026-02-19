import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PoliciesGuard } from './policies.guard';
import { AbilityFactory } from '../../ability/ability.factory';
import { OksaiRequestContextService } from '@oksai/context';
import { OKSAI_CHECK_POLICIES_KEY, PolicyHandler } from '../decorators/check-policies.decorator';
import { AbilityBuilder, createMongoAbility } from '@casl/ability';
import type { AppAbility } from '../../ability/ability.types';

describe('PoliciesGuard', () => {
	let guard: PoliciesGuard;
	let mockReflector: jest.Mocked<Reflector>;
	let mockAbilityFactory: jest.Mocked<AbilityFactory>;
	let mockContext: jest.Mocked<OksaiRequestContextService>;

	beforeEach(async () => {
		mockReflector = {
			getAllAndOverride: jest.fn()
		} as unknown as jest.Mocked<Reflector>;

		mockAbilityFactory = {
			createForRequest: jest.fn()
		} as unknown as jest.Mocked<AbilityFactory>;

		mockContext = {
			getUserId: jest.fn(),
			getTenantId: jest.fn()
		} as unknown as jest.Mocked<OksaiRequestContextService>;

		const module: TestingModule = await Test.createTestingModule({
			providers: [
				PoliciesGuard,
				{
					provide: Reflector,
					useValue: mockReflector
				},
				{
					provide: AbilityFactory,
					useValue: mockAbilityFactory
				},
				{
					provide: OksaiRequestContextService,
					useValue: mockContext
				}
			]
		}).compile();

		guard = module.get<PoliciesGuard>(PoliciesGuard);
	});

	const createMockExecutionContext = (): ExecutionContext => {
		return {
			getHandler: jest.fn(),
			getClass: jest.fn()
		} as unknown as ExecutionContext;
	};

	describe('canActivate', () => {
		it('当未声明策略时，应默认放行', async () => {
			// Arrange
			const ctx = createMockExecutionContext();
			mockReflector.getAllAndOverride.mockReturnValue(undefined);

			// Act
			const result = await guard.canActivate(ctx);

			// Assert
			expect(result).toBe(true);
			expect(mockContext.getUserId).not.toHaveBeenCalled();
		});

		it('当声明空策略数组时，应默认放行', async () => {
			// Arrange
			const ctx = createMockExecutionContext();
			mockReflector.getAllAndOverride.mockReturnValue([]);

			// Act
			const result = await guard.canActivate(ctx);

			// Assert
			expect(result).toBe(true);
		});

		it('当用户未登录时，应抛出 UnauthorizedException', async () => {
			// Arrange
			const ctx = createMockExecutionContext();
			const handler: PolicyHandler = jest.fn();
			mockReflector.getAllAndOverride.mockReturnValue([handler]);
			mockContext.getUserId.mockReturnValue(undefined);

			// Act & Assert
			await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
			await expect(guard.canActivate(ctx)).rejects.toThrow('未登录，无法访问该资源。');
		});

		it('当所有策略都通过时，应返回 true', async () => {
			// Arrange
			const ctx = createMockExecutionContext();
			const userId = 'user-123';
			const tenantId = 'tenant-456';

			const builder = new AbilityBuilder<AppAbility>(createMongoAbility);
			builder.can('manage', 'Platform');
			const mockAbility = builder.build();

			mockReflector.getAllAndOverride.mockReturnValue([(ability) => ability.can('manage', 'Platform')]);
			mockContext.getUserId.mockReturnValue(userId);
			mockContext.getTenantId.mockReturnValue(tenantId);
			mockAbilityFactory.createForRequest.mockResolvedValue(mockAbility);

			// Act
			const result = await guard.canActivate(ctx);

			// Assert
			expect(result).toBe(true);
		});

		it('当任一策略不通过时，应抛出 ForbiddenException', async () => {
			// Arrange
			const ctx = createMockExecutionContext();
			const userId = 'user-123';

			const builder = new AbilityBuilder<AppAbility>(createMongoAbility);
			// 不添加任何权限
			const mockAbility = builder.build();

			mockReflector.getAllAndOverride.mockReturnValue([(ability) => ability.can('manage', 'Platform')]);
			mockContext.getUserId.mockReturnValue(userId);
			mockContext.getTenantId.mockReturnValue(undefined);
			mockAbilityFactory.createForRequest.mockResolvedValue(mockAbility);

			// Act & Assert
			await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
			await expect(guard.canActivate(ctx)).rejects.toThrow('权限不足，无法访问该资源。');
		});

		it('应将 PolicyContext 正确传递给处理器', async () => {
			// Arrange
			const ctx = createMockExecutionContext();
			const userId = 'user-123';
			const tenantId = 'tenant-456';

			const builder = new AbilityBuilder<AppAbility>(createMongoAbility);
			builder.can('manage', 'Tenant', { tenantId });
			const mockAbility = builder.build();

			const handler: PolicyHandler = jest.fn().mockReturnValue(true);
			mockReflector.getAllAndOverride.mockReturnValue([handler]);
			mockContext.getUserId.mockReturnValue(userId);
			mockContext.getTenantId.mockReturnValue(tenantId);
			mockAbilityFactory.createForRequest.mockResolvedValue(mockAbility);

			// Act
			await guard.canActivate(ctx);

			// Assert
			expect(handler).toHaveBeenCalledWith(mockAbility, {
				userId,
				tenantId
			});
		});

		it('当策略处理器抛出异常时，应视为权限不足', async () => {
			// Arrange
			const ctx = createMockExecutionContext();
			const userId = 'user-123';

			const builder = new AbilityBuilder<AppAbility>(createMongoAbility);
			const mockAbility = builder.build();

			const errorHandler: PolicyHandler = () => {
				throw new Error('策略检查出错');
			};
			const normalHandler: PolicyHandler = jest.fn().mockReturnValue(true);

			mockReflector.getAllAndOverride.mockReturnValue([errorHandler, normalHandler]);
			mockContext.getUserId.mockReturnValue(userId);
			mockContext.getTenantId.mockReturnValue(undefined);
			mockAbilityFactory.createForRequest.mockResolvedValue(mockAbility);

			// Act & Assert
			await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
		});

		it('应使用 Reflector 从 handler 和 class 获取元数据', async () => {
			// Arrange
			const ctx = createMockExecutionContext();
			const mockHandler = jest.fn();
			const mockClass = jest.fn();

			(ctx.getHandler as jest.Mock).mockReturnValue(mockHandler);
			(ctx.getClass as jest.Mock).mockReturnValue(mockClass);
			mockReflector.getAllAndOverride.mockReturnValue([]);

			// Act
			await guard.canActivate(ctx);

			// Assert
			expect(mockReflector.getAllAndOverride).toHaveBeenCalledWith(OKSAI_CHECK_POLICIES_KEY, [
				mockHandler,
				mockClass
			]);
		});

		it('多个策略应全部通过才能放行', async () => {
			// Arrange
			const ctx = createMockExecutionContext();
			const userId = 'user-123';
			const tenantId = 'tenant-456';

			const builder = new AbilityBuilder<AppAbility>(createMongoAbility);
			builder.can('manage', 'Platform');
			builder.can('manage', 'Tenant', { tenantId });
			const mockAbility = builder.build();

			mockReflector.getAllAndOverride.mockReturnValue([
				(ability) => ability.can('manage', 'Platform'),
				(ability) => ability.can('manage', { __caslSubjectType__: 'Tenant' as const, tenantId })
			]);
			mockContext.getUserId.mockReturnValue(userId);
			mockContext.getTenantId.mockReturnValue(tenantId);
			mockAbilityFactory.createForRequest.mockResolvedValue(mockAbility);

			// Act
			const result = await guard.canActivate(ctx);

			// Assert
			expect(result).toBe(true);
		});
	});
});
