import { APP_GUARD } from '@nestjs/core';
import { setupOksaiContextModule } from './setup-context-module';

describe('setupOksaiContextModule', () => {
	it('should include APP_GUARD(TenantRequiredGuard) by default', () => {
		const mod = setupOksaiContextModule();
		const providers = (mod.providers ?? []) as any[];

		expect(providers.some((p) => p && p.provide === APP_GUARD)).toBe(true);
	});

	it('should allow disabling tenantRequired guard', () => {
		const mod = setupOksaiContextModule({ tenantRequired: { enabled: false } });
		const providers = (mod.providers ?? []) as any[];

		expect(providers.some((p) => p && p.provide === APP_GUARD)).toBe(false);
	});
});
