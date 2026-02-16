import { setupRedisLockModule, SetupRedisLockModuleOptions } from './redis-lock.module';

describe('setupRedisLockModule', () => {
	it('should return a DynamicModule', () => {
		const module = setupRedisLockModule();

		expect(module).toBeDefined();
	});

	it('should use default options when not provided', () => {
		const module = setupRedisLockModule();

		expect(module).toBeDefined();
	});

	it('should use custom defaultTtlMs when provided', () => {
		const options: SetupRedisLockModuleOptions = {
			defaultTtlMs: 60000
		};

		const module = setupRedisLockModule(options);

		expect(module).toBeDefined();
	});

	it('should work with empty options', () => {
		const module = setupRedisLockModule({});

		expect(module).toBeDefined();
	});
});
