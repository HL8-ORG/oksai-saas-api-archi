import { BadRequestException } from '@nestjs/common';
import { TenantRequiredGuard } from './tenant-required.guard';
import { OKSAI_TENANT_REQUIRED_METADATA_KEY } from '../decorators/tenant-required.decorator';

describe('TenantRequiredGuard', () => {
	it('should allow when route is not marked as tenant-required', () => {
		const ctx = { getTenantId: jest.fn(() => undefined) };
		const reflector = { getAllAndOverride: jest.fn(() => undefined) };
		const guard = new TenantRequiredGuard(ctx as any, reflector as any, {});

		const context = {
			getHandler: () => ({}),
			getClass: () => ({}),
			switchToHttp: () => ({ getRequest: () => ({ url: '/x' }) })
		} as any;

		expect(guard.canActivate(context)).toBe(true);
		expect(reflector.getAllAndOverride).toHaveBeenCalledWith(OKSAI_TENANT_REQUIRED_METADATA_KEY, [
			context.getHandler(),
			context.getClass()
		]);
	});

	it('should throw BadRequestException when tenant-required route has no tenantId', () => {
		const ctx = { getTenantId: jest.fn(() => undefined) };
		const reflector = { getAllAndOverride: jest.fn(() => true) };
		const guard = new TenantRequiredGuard(ctx as any, reflector as any, {});

		const context = {
			getHandler: () => ({}),
			getClass: () => ({}),
			switchToHttp: () => ({ getRequest: () => ({ url: '/x' }) })
		} as any;

		expect(() => guard.canActivate(context)).toThrow(BadRequestException);
	});

	it('should allow when tenant-required route has tenantId', () => {
		const ctx = { getTenantId: jest.fn(() => 't-001') };
		const reflector = { getAllAndOverride: jest.fn(() => true) };
		const guard = new TenantRequiredGuard(ctx as any, reflector as any, {});

		const context = {
			getHandler: () => ({}),
			getClass: () => ({}),
			switchToHttp: () => ({ getRequest: () => ({ url: '/x' }) })
		} as any;

		expect(guard.canActivate(context)).toBe(true);
	});

	it('should allow when route is explicitly marked as tenant-optional (metadata=false)', () => {
		const ctx = { getTenantId: jest.fn(() => undefined) };
		const reflector = { getAllAndOverride: jest.fn(() => false) };
		const guard = new TenantRequiredGuard(ctx as any, reflector as any, { defaultRequired: true });

		const context = {
			getHandler: () => ({}),
			getClass: () => ({}),
			switchToHttp: () => ({ getRequest: () => ({ url: '/api/orders' }) })
		} as any;

		expect(guard.canActivate(context)).toBe(true);
	});

	it('should require tenantId when defaultRequired=true and path is not ignored', () => {
		const ctx = { getTenantId: jest.fn(() => undefined) };
		const reflector = { getAllAndOverride: jest.fn(() => undefined) };
		const guard = new TenantRequiredGuard(ctx as any, reflector as any, {
			defaultRequired: true,
			ignoredPaths: ['/health']
		});

		const context = {
			getHandler: () => ({}),
			getClass: () => ({}),
			switchToHttp: () => ({ getRequest: () => ({ url: '/api/orders?x=1' }) })
		} as any;

		expect(() => guard.canActivate(context)).toThrow(BadRequestException);
	});

	it('should allow when defaultRequired=true but path is ignored', () => {
		const ctx = { getTenantId: jest.fn(() => undefined) };
		const reflector = { getAllAndOverride: jest.fn(() => undefined) };
		const guard = new TenantRequiredGuard(ctx as any, reflector as any, {
			defaultRequired: true,
			ignoredPaths: ['/health']
		});

		const context = {
			getHandler: () => ({}),
			getClass: () => ({}),
			switchToHttp: () => ({ getRequest: () => ({ url: '/health/readiness' }) })
		} as any;

		expect(guard.canActivate(context)).toBe(true);
	});

	it('should require tenantId when path matches requiredPaths', () => {
		const ctx = { getTenantId: jest.fn(() => undefined) };
		const reflector = { getAllAndOverride: jest.fn(() => undefined) };
		const guard = new TenantRequiredGuard(ctx as any, reflector as any, { requiredPaths: ['/api'] });

		const context = {
			getHandler: () => ({}),
			getClass: () => ({}),
			switchToHttp: () => ({ getRequest: () => ({ url: '/api/users' }) })
		} as any;

		expect(() => guard.canActivate(context)).toThrow(BadRequestException);
	});
});
