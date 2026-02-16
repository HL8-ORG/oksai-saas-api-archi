import { setupRedisModule, SetupRedisModuleOptions } from './redis.module';

describe('setupRedisModule', () => {
	it('should return a DynamicModule', () => {
		const module = setupRedisModule();

		expect(module).toBeDefined();
	});

	it('should use default options when not provided', () => {
		const module = setupRedisModule();

		expect(module).toBeDefined();
	});

	it('should use custom url when provided', () => {
		const options: SetupRedisModuleOptions = {
			url: 'redis://localhost:6379'
		};

		const module = setupRedisModule(options);

		expect(module).toBeDefined();
	});

	it('should use custom keyPrefix when provided', () => {
		const options: SetupRedisModuleOptions = {
			keyPrefix: 'test:'
		};

		const module = setupRedisModule(options);

		expect(module).toBeDefined();
	});

	it('should use custom lazyConnect when provided', () => {
		const options: SetupRedisModuleOptions = {
			lazyConnect: true
		};

		const module = setupRedisModule(options);

		expect(module).toBeDefined();
	});

	it('should work with empty options', () => {
		const module = setupRedisModule({});

		expect(module).toBeDefined();
	});
});
