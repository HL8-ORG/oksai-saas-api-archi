import {
	registerPlugins,
	getRegisteredPluginNames,
	clearPluginRegistry,
	resolvePluginsFromEnv,
	type RegisterPluginsOptions,
	type ResolvePluginsFromEnvOptions
} from './plugin-registry';

/**
 * @description PluginRegistry 单元测试
 *
 * 测试覆盖：
 * - 插件注册（registerPlugins）
 * - 插件发现（getRegisteredPluginNames）
 * - 生命周期（clearPluginRegistry）
 * - 环境变量解析（resolvePluginsFromEnv）
 */

// 创建 mock 插件
class MockPluginA {}
class MockPluginB {}
class MockPluginC {}

describe('PluginRegistry', () => {
	// 在每个测试前后清空注册表，确保测试隔离
	beforeEach(() => {
		clearPluginRegistry();
	});

	afterEach(() => {
		clearPluginRegistry();
	});

	describe('registerPlugins', () => {
		describe('基本注册功能', () => {
			it('应成功注册单个插件', () => {
				// Arrange
				const plugins = { 'plugin-a': MockPluginA };

				// Act
				registerPlugins(plugins);

				// Assert
				expect(getRegisteredPluginNames()).toContain('plugin-a');
			});

			it('应成功注册多个插件', () => {
				// Arrange
				const plugins = {
					'plugin-a': MockPluginA,
					'plugin-b': MockPluginB,
					'plugin-c': MockPluginC
				};

				// Act
				registerPlugins(plugins);

				// Assert
				const names = getRegisteredPluginNames();
				expect(names).toContain('plugin-a');
				expect(names).toContain('plugin-b');
				expect(names).toContain('plugin-c');
				expect(names).toHaveLength(3);
			});

			it('应忽略空字符串插件名', () => {
				// Arrange
				const plugins = {
					'': MockPluginA,
					'plugin-a': MockPluginB
				};

				// Act
				registerPlugins(plugins);

				// Assert
				expect(getRegisteredPluginNames()).toEqual(['plugin-a']);
			});

			it('应忽略仅包含空白字符的插件名', () => {
				// Arrange
				const plugins = {
					'   ': MockPluginA,
					'plugin-a': MockPluginB
				};

				// Act
				registerPlugins(plugins);

				// Assert
				expect(getRegisteredPluginNames()).toEqual(['plugin-a']);
			});

			it('应忽略 null/undefined 插件名', () => {
				// Arrange
				const plugins = {
					'plugin-a': MockPluginA
				} as Record<string, any>;

				// Act
				registerPlugins(plugins);

				// Assert
				expect(getRegisteredPluginNames()).toEqual(['plugin-a']);
			});
		});

		describe('覆盖行为', () => {
			it('默认情况下重复注册应抛出错误', () => {
				// Arrange
				registerPlugins({ 'plugin-a': MockPluginA });

				// Act & Assert
				expect(() => {
					registerPlugins({ 'plugin-a': MockPluginB });
				}).toThrow('重复注册插件：plugin-a。如需覆盖请设置 allowOverride=true。');
			});

			it('设置 allowOverride=true 时应允许覆盖', () => {
				// Arrange
				registerPlugins({ 'plugin-a': MockPluginA });
				const options: RegisterPluginsOptions = { allowOverride: true };

				// Act
				registerPlugins({ 'plugin-a': MockPluginB }, options);

				// Assert - 不应抛出错误，且插件应被更新
				expect(getRegisteredPluginNames()).toEqual(['plugin-a']);
			});

			it('allowOverride=false 时应抛出错误', () => {
				// Arrange
				registerPlugins({ 'plugin-a': MockPluginA });
				const options: RegisterPluginsOptions = { allowOverride: false };

				// Act & Assert
				expect(() => {
					registerPlugins({ 'plugin-a': MockPluginB }, options);
				}).toThrow('重复注册插件：plugin-a');
			});
		});

		describe('选项处理', () => {
			it('不传 options 时应使用默认值', () => {
				// Arrange
				registerPlugins({ 'plugin-a': MockPluginA });

				// Act & Assert
				expect(() => {
					registerPlugins({ 'plugin-a': MockPluginB });
				}).toThrow();
			});

			it('传空 options 时应使用默认值', () => {
				// Arrange
				registerPlugins({ 'plugin-a': MockPluginA });

				// Act & Assert
				expect(() => {
					registerPlugins({ 'plugin-a': MockPluginB }, {});
				}).toThrow();
			});
		});
	});

	describe('getRegisteredPluginNames', () => {
		it('应返回已注册插件的名称列表', () => {
			// Arrange
			registerPlugins({
				'plugin-c': MockPluginC,
				'plugin-a': MockPluginA,
				'plugin-b': MockPluginB
			});

			// Act
			const names = getRegisteredPluginNames();

			// Assert
			expect(names).toEqual(['plugin-a', 'plugin-b', 'plugin-c']);
		});

		it('应返回排序后的名称列表', () => {
			// Arrange
			registerPlugins({
				zebra: MockPluginA,
				alpha: MockPluginB,
				beta: MockPluginC
			});

			// Act
			const names = getRegisteredPluginNames();

			// Assert
			expect(names).toEqual(['alpha', 'beta', 'zebra']);
		});

		it('当注册表为空时应返回空数组', () => {
			// Arrange - 清空注册表

			// Act
			const names = getRegisteredPluginNames();

			// Assert
			expect(names).toEqual([]);
		});
	});

	describe('clearPluginRegistry', () => {
		it('应清空所有已注册的插件', () => {
			// Arrange
			registerPlugins({
				'plugin-a': MockPluginA,
				'plugin-b': MockPluginB
			});
			expect(getRegisteredPluginNames()).toHaveLength(2);

			// Act
			clearPluginRegistry();

			// Assert
			expect(getRegisteredPluginNames()).toEqual([]);
		});

		it('重复清空不应报错', () => {
			// Arrange
			clearPluginRegistry();

			// Act & Assert
			expect(() => clearPluginRegistry()).not.toThrow();
		});
	});

	describe('resolvePluginsFromEnv', () => {
		let originalEnv: NodeJS.ProcessEnv;

		beforeEach(() => {
			originalEnv = { ...process.env };
		});

		afterEach(() => {
			process.env = originalEnv;
		});

		describe('基本解析功能', () => {
			it('应从环境变量解析启用的插件', () => {
				// Arrange
				registerPlugins({
					demo: MockPluginA,
					auth: MockPluginB
				});
				process.env.PLUGINS_ENABLED = 'demo,auth';

				// Act
				const plugins = resolvePluginsFromEnv();

				// Assert
				expect(plugins).toHaveLength(2);
				expect(plugins).toContain(MockPluginA);
				expect(plugins).toContain(MockPluginB);
			});

			it('应支持单个插件', () => {
				// Arrange
				registerPlugins({ demo: MockPluginA });
				process.env.PLUGINS_ENABLED = 'demo';

				// Act
				const plugins = resolvePluginsFromEnv();

				// Assert
				expect(plugins).toEqual([MockPluginA]);
			});

			it('当环境变量为空时应返回空数组', () => {
				// Arrange
				registerPlugins({ demo: MockPluginA });
				delete process.env.PLUGINS_ENABLED;

				// Act
				const plugins = resolvePluginsFromEnv();

				// Assert
				expect(plugins).toEqual([]);
			});

			it('当环境变量为空白字符串时应返回空数组', () => {
				// Arrange
				registerPlugins({ demo: MockPluginA });
				process.env.PLUGINS_ENABLED = '   ';

				// Act
				const plugins = resolvePluginsFromEnv();

				// Assert
				expect(plugins).toEqual([]);
			});

			it('应忽略空白的插件名', () => {
				// Arrange
				registerPlugins({
					demo: MockPluginA,
					auth: MockPluginB
				});
				process.env.PLUGINS_ENABLED = 'demo,,auth,  ';

				// Act
				const plugins = resolvePluginsFromEnv();

				// Assert
				expect(plugins).toHaveLength(2);
			});

			it('应处理带空格的插件名', () => {
				// Arrange
				registerPlugins({ demo: MockPluginA });
				process.env.PLUGINS_ENABLED = '  demo  ';

				// Act
				const plugins = resolvePluginsFromEnv();

				// Assert
				expect(plugins).toEqual([MockPluginA]);
			});
		});

		describe('strict 模式', () => {
			it('默认 strict=true 时遇到未知插件应抛出错误', () => {
				// Arrange
				registerPlugins({ demo: MockPluginA });
				process.env.PLUGINS_ENABLED = 'demo,unknown-plugin';

				// Act & Assert
				expect(() => resolvePluginsFromEnv()).toThrow(/存在未知插件：unknown-plugin/);
			});

			it('错误消息应包含可用插件列表', () => {
				// Arrange
				registerPlugins({
					demo: MockPluginA,
					auth: MockPluginB
				});
				process.env.PLUGINS_ENABLED = 'unknown-plugin';

				// Act & Assert
				expect(() => resolvePluginsFromEnv()).toThrow(/已注册插件：auth, demo/);
			});

			it('strict=false 时应忽略未知插件', () => {
				// Arrange
				registerPlugins({ demo: MockPluginA });
				process.env.PLUGINS_ENABLED = 'demo,unknown-plugin';
				const options: ResolvePluginsFromEnvOptions = { strict: false };

				// Act
				const plugins = resolvePluginsFromEnv(options);

				// Assert
				expect(plugins).toEqual([MockPluginA]);
			});

			it('strict=false 时应忽略所有未知插件', () => {
				// Arrange
				registerPlugins({ demo: MockPluginA });
				process.env.PLUGINS_ENABLED = 'unknown1,demo,unknown2';
				const options: ResolvePluginsFromEnvOptions = { strict: false };

				// Act
				const plugins = resolvePluginsFromEnv(options);

				// Assert
				expect(plugins).toEqual([MockPluginA]);
			});
		});

		describe('自定义选项', () => {
			it('应支持自定义环境变量名', () => {
				// Arrange
				registerPlugins({ demo: MockPluginA });
				delete process.env.PLUGINS_ENABLED;
				process.env.CUSTOM_PLUGINS = 'demo';
				const options: ResolvePluginsFromEnvOptions = { envName: 'CUSTOM_PLUGINS' };

				// Act
				const plugins = resolvePluginsFromEnv(options);

				// Assert
				expect(plugins).toEqual([MockPluginA]);
			});

			it('应支持自定义分隔符', () => {
				// Arrange
				registerPlugins({
					demo: MockPluginA,
					auth: MockPluginB
				});
				process.env.PLUGINS_ENABLED = 'demo;auth';
				const options: ResolvePluginsFromEnvOptions = { separator: ';' };

				// Act
				const plugins = resolvePluginsFromEnv(options);

				// Assert
				expect(plugins).toHaveLength(2);
			});

			it('应同时支持自定义环境变量名和分隔符', () => {
				// Arrange
				registerPlugins({
					demo: MockPluginA,
					auth: MockPluginB
				});
				process.env.MY_PLUGINS = 'demo|auth';
				const options: ResolvePluginsFromEnvOptions = {
					envName: 'MY_PLUGINS',
					separator: '|'
				};

				// Act
				const plugins = resolvePluginsFromEnv(options);

				// Assert
				expect(plugins).toHaveLength(2);
			});
		});

		describe('边界情况', () => {
			it('当没有注册任何插件且环境变量有值时 strict 模式应报错', () => {
				// Arrange
				process.env.PLUGINS_ENABLED = 'any-plugin';

				// Act & Assert
				expect(() => resolvePluginsFromEnv()).toThrow(/已注册插件：\(none\)/);
			});

			it('当没有注册任何插件且环境变量有值时非 strict 模式应返回空数组', () => {
				// Arrange
				process.env.PLUGINS_ENABLED = 'any-plugin';
				const options: ResolvePluginsFromEnvOptions = { strict: false };

				// Act
				const plugins = resolvePluginsFromEnv(options);

				// Assert
				expect(plugins).toEqual([]);
			});
		});
	});
});
