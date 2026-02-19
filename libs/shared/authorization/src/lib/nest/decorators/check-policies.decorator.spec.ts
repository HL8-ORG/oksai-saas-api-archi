import { SetMetadata } from '@nestjs/common';
import { CheckPolicies, OKSAI_CHECK_POLICIES_KEY, PolicyHandler, PolicyContext } from './check-policies.decorator';
import type { AppAbility } from '../../ability/ability.types';

// Mock SetMetadata
jest.mock('@nestjs/common', () => ({
	...jest.requireActual('@nestjs/common'),
	SetMetadata: jest.fn()
}));

describe('check-policies.decorator', () => {
	describe('OKSAI_CHECK_POLICIES_KEY', () => {
		it('应定义正确的元数据键', () => {
			// Assert
			expect(OKSAI_CHECK_POLICIES_KEY).toBe('oksai:authorization:checkPolicies');
		});
	});

	describe('PolicyHandler 类型', () => {
		it('应接受 ability 和 context 参数并返回布尔值', () => {
			// Arrange
			const mockAbility = {} as AppAbility;
			const mockContext: PolicyContext = { userId: 'user-123', tenantId: 'tenant-456' };

			// Act
			const handler: PolicyHandler = (ability, context) => {
				return ability === mockAbility && context === mockContext;
			};

			// Assert
			expect(handler(mockAbility, mockContext)).toBe(true);
		});
	});

	describe('PolicyContext 接口', () => {
		it('应支持只有 userId 的上下文', () => {
			// Arrange & Act
			const context: PolicyContext = { userId: 'user-123' };

			// Assert
			expect(context.userId).toBe('user-123');
			expect(context.tenantId).toBeUndefined();
		});

		it('应支持只有 tenantId 的上下文', () => {
			// Arrange & Act
			const context: PolicyContext = { tenantId: 'tenant-456' };

			// Assert
			expect(context.tenantId).toBe('tenant-456');
			expect(context.userId).toBeUndefined();
		});

		it('应支持同时包含 userId 和 tenantId 的上下文', () => {
			// Arrange & Act
			const context: PolicyContext = { userId: 'user-123', tenantId: 'tenant-456' };

			// Assert
			expect(context.userId).toBe('user-123');
			expect(context.tenantId).toBe('tenant-456');
		});
	});

	describe('CheckPolicies 装饰器', () => {
		beforeEach(() => {
			jest.clearAllMocks();
		});

		it('应调用 SetMetadata 并传入正确的键和处理器数组', () => {
			// Arrange
			const handler1: PolicyHandler = jest.fn();
			const handler2: PolicyHandler = jest.fn();

			// Act
			CheckPolicies(handler1, handler2);

			// Assert
			expect(SetMetadata).toHaveBeenCalledWith(OKSAI_CHECK_POLICIES_KEY, [handler1, handler2]);
		});

		it('应支持单个策略处理器', () => {
			// Arrange
			const handler: PolicyHandler = jest.fn();

			// Act
			CheckPolicies(handler);

			// Assert
			expect(SetMetadata).toHaveBeenCalledWith(OKSAI_CHECK_POLICIES_KEY, [handler]);
		});

		it('应支持多个策略处理器', () => {
			// Arrange
			const handlers: PolicyHandler[] = [jest.fn(), jest.fn(), jest.fn()];

			// Act
			CheckPolicies(...handlers);

			// Assert
			expect(SetMetadata).toHaveBeenCalledWith(OKSAI_CHECK_POLICIES_KEY, handlers);
		});

		it('策略处理器应能正确执行并返回布尔结果', () => {
			// Arrange
			const mockAbility = {
				can: jest.fn().mockReturnValue(true)
			} as unknown as AppAbility;
			const context: PolicyContext = { userId: 'user-123' };

			const handler: PolicyHandler = (ability) => ability.can('manage', 'Platform');

			// Act
			const result = handler(mockAbility, context);

			// Assert
			expect(result).toBe(true);
			expect(mockAbility.can).toHaveBeenCalledWith('manage', 'Platform');
		});

		it('策略处理器应能访问上下文信息', () => {
			// Arrange
			const mockAbility = {} as AppAbility;
			const context: PolicyContext = { userId: 'user-123', tenantId: 'tenant-456' };

			const handler: PolicyHandler = (_, ctx) => {
				return ctx.userId === 'user-123' && ctx.tenantId === 'tenant-456';
			};

			// Act
			const result = handler(mockAbility, context);

			// Assert
			expect(result).toBe(true);
		});
	});
});
