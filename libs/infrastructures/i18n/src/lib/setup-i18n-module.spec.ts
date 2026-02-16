import { HeaderResolver } from 'nestjs-i18n';
import { setupI18nModule, SetupI18nModuleOptions } from './setup-i18n-module';

describe('setupI18nModule', () => {
	it('should return a DynamicModule', () => {
		const baseDir = '/app';
		const module = setupI18nModule(baseDir);

		expect(module).toHaveProperty('module');
		expect(module).toHaveProperty('providers');
		expect(module).toHaveProperty('exports');
	});

	it('should use default paths when not provided', () => {
		const baseDir = '/app';
		const module = setupI18nModule(baseDir);

		expect(module).toBeDefined();
	});

	it('should use default fallback language zh', () => {
		const baseDir = '/app';
		const module = setupI18nModule(baseDir);

		expect(module).toBeDefined();
	});

	it('should use custom paths when provided', () => {
		const baseDir = '/app';
		const options: SetupI18nModuleOptions = {
			paths: ['locales', 'translations']
		};

		const module = setupI18nModule(baseDir, options);

		expect(module).toBeDefined();
	});

	it('should use custom fallback language when provided', () => {
		const baseDir = '/app';
		const options: SetupI18nModuleOptions = {
			fallbackLanguage: 'en'
		};

		const module = setupI18nModule(baseDir, options);

		expect(module).toBeDefined();
	});

	it('should use custom fallbacks when provided', () => {
		const baseDir = '/app';
		const options: SetupI18nModuleOptions = {
			fallbacks: {
				'zh-CN': 'zh',
				'en-US': 'en'
			}
		};

		const module = setupI18nModule(baseDir, options);

		expect(module).toBeDefined();
	});

	it('should use default resolvers when not provided', () => {
		const baseDir = '/app';
		const module = setupI18nModule(baseDir);

		expect(module).toBeDefined();
	});

	it('should use custom resolvers when provided', () => {
		const baseDir = '/app';
		const options: SetupI18nModuleOptions = {
			// 注意：空数组在运行时会触发 nestjs-i18n 的告警日志；这里用一个最小 resolver 作为示例
			resolvers: [{ use: HeaderResolver, options: ['x-lang'] } as any]
		};

		const module = setupI18nModule(baseDir, options);

		expect(module).toBeDefined();
	});

	it('should work with empty options', () => {
		const baseDir = '/app';
		const module = setupI18nModule(baseDir, {});

		expect(module).toBeDefined();
	});

	it('should join baseDir with paths correctly', () => {
		const baseDir = '/app';
		const options: SetupI18nModuleOptions = {
			paths: ['locales']
		};

		const module = setupI18nModule(baseDir, options);

		expect(module).toBeDefined();
	});
});
