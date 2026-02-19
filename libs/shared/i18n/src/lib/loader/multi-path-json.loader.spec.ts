import { MultiPathJsonLoader, MultiPathJsonLoaderOptions } from './multi-path-json.loader';
import * as fsPromises from 'node:fs/promises';
import type { Dirent } from 'node:fs';

// 模拟 fs/promises 模块
jest.mock('node:fs/promises', () => ({
	readdir: jest.fn(),
	readFile: jest.fn()
}));

describe('MultiPathJsonLoader', () => {
	let loader: MultiPathJsonLoader;
	const mockReaddir = fsPromises.readdir as jest.Mock;
	const mockReadFile = fsPromises.readFile as jest.Mock;

	// 创建模拟的 Dirent 对象
	const createMockDirent = (name: string, isDirectory: boolean): Dirent => {
		return {
			name,
			isDirectory: () => isDirectory,
			isFile: () => !isDirectory,
			isBlockDevice: () => false,
			isCharacterDevice: () => false,
			isSymbolicLink: () => false,
			isFIFO: () => false,
			isSocket: () => false
		} as Dirent;
	};

	beforeEach(() => {
		jest.clearAllMocks();
	});

	// 测试构造函数和选项解析
	describe('构造函数', () => {
		it('应正确解析有效的 paths 选项', () => {
			const options: MultiPathJsonLoaderOptions = {
				paths: ['/path/one', '/path/two']
			};
			loader = new MultiPathJsonLoader(options);

			expect(loader).toBeDefined();
		});

		it('当 options 为 undefined 时，应使用空数组作为默认值', () => {
			loader = new MultiPathJsonLoader(undefined);

			expect(loader).toBeDefined();
		});

		it('当 options.paths 不存在时，应使用空数组作为默认值', () => {
			loader = new MultiPathJsonLoader({});

			expect(loader).toBeDefined();
		});

		it('当 options.paths 不是数组时，应使用空数组作为默认值', () => {
			loader = new MultiPathJsonLoader({ paths: 'invalid' as unknown as string[] });

			expect(loader).toBeDefined();
		});
	});

	// 测试 languages() 方法
	describe('languages', () => {
		it('应返回所有目录中的语言列表', async () => {
			const options: MultiPathJsonLoaderOptions = {
				paths: ['/i18n/common', '/i18n/modules']
			};
			loader = new MultiPathJsonLoader(options);

			// 模拟第一个目录
			mockReaddir.mockResolvedValueOnce([
				createMockDirent('en', true),
				createMockDirent('zh', true),
				createMockDirent('some-file.txt', false)
			]);

			// 模拟第二个目录
			mockReaddir.mockResolvedValueOnce([createMockDirent('en', true), createMockDirent('ja', true)]);

			const languages = await loader.languages();

			// 验证结果包含所有语言且去重
			expect(languages.sort()).toEqual(['en', 'ja', 'zh'].sort());
			expect(mockReaddir).toHaveBeenCalledTimes(2);
		});

		it('当目录不存在时应返回空数组', async () => {
			loader = new MultiPathJsonLoader({ paths: ['/nonexistent'] });

			mockReaddir.mockRejectedValueOnce(new Error('ENOENT'));

			const languages = await loader.languages();

			expect(languages).toEqual([]);
		});

		it('当 paths 为空数组时应返回空数组', async () => {
			loader = new MultiPathJsonLoader({ paths: [] });

			const languages = await loader.languages();

			expect(languages).toEqual([]);
			expect(mockReaddir).not.toHaveBeenCalled();
		});

		it('应忽略非目录条目', async () => {
			loader = new MultiPathJsonLoader({ paths: ['/i18n'] });

			mockReaddir.mockResolvedValueOnce([
				createMockDirent('en.json', false),
				createMockDirent('README.md', false)
			]);

			const languages = await loader.languages();

			expect(languages).toEqual([]);
		});
	});

	// 测试 load() 方法
	describe('load', () => {
		it('应加载并合并多个目录的翻译文件', async () => {
			loader = new MultiPathJsonLoader({ paths: ['/i18n/common'] });

			// 模拟目录结构
			mockReaddir.mockResolvedValueOnce([createMockDirent('en', true), createMockDirent('zh', true)]);

			// 模拟 en 目录下的 JSON 文件
			mockReaddir.mockResolvedValueOnce([createMockDirent('common.json', false)]);

			// 模拟 zh 目录下的 JSON 文件
			mockReaddir.mockResolvedValueOnce([createMockDirent('common.json', false)]);

			// 模拟文件内容
			mockReadFile
				.mockResolvedValueOnce(JSON.stringify({ hello: 'Hello', world: 'World' }))
				.mockResolvedValueOnce(JSON.stringify({ hello: '你好', world: '世界' }));

			const result = await loader.load();

			expect(result).toEqual({
				en: { hello: 'Hello', world: 'World' },
				zh: { hello: '你好', world: '世界' }
			});
		});

		it('后加载的目录应覆盖先加载的同名 key', async () => {
			loader = new MultiPathJsonLoader({ paths: ['/i18n/base', '/i18n/override'] });

			// 模拟 base 目录
			mockReaddir.mockResolvedValueOnce([createMockDirent('en', true)]);
			mockReaddir.mockResolvedValueOnce([createMockDirent('common.json', false)]);

			// 模拟 override 目录
			mockReaddir.mockResolvedValueOnce([createMockDirent('en', true)]);
			mockReaddir.mockResolvedValueOnce([createMockDirent('override.json', false)]);

			mockReadFile
				.mockResolvedValueOnce(JSON.stringify({ key1: 'base-value', key2: 'base-key2' }))
				.mockResolvedValueOnce(JSON.stringify({ key1: 'override-value', key3: 'new-key' }));

			const result = await loader.load();

			expect(result).toEqual({
				en: {
					key1: 'override-value',
					key2: 'base-key2',
					key3: 'new-key'
				}
			});
		});

		it('应跳过非 JSON 文件', async () => {
			loader = new MultiPathJsonLoader({ paths: ['/i18n'] });

			mockReaddir.mockResolvedValueOnce([createMockDirent('en', true)]);
			mockReaddir.mockResolvedValueOnce([
				createMockDirent('valid.json', false),
				createMockDirent('readme.txt', false),
				createMockDirent('config.yaml', false)
			]);

			mockReadFile.mockResolvedValueOnce(JSON.stringify({ test: 'value' }));

			const result = await loader.load();

			expect(result).toEqual({
				en: { test: 'value' }
			});
			expect(mockReadFile).toHaveBeenCalledTimes(1);
		});

		it('应跳过非目录条目（文件直接放在 base 目录）', async () => {
			loader = new MultiPathJsonLoader({ paths: ['/i18n'] });

			mockReaddir.mockResolvedValueOnce([createMockDirent('en.json', false), createMockDirent('zh', true)]);

			// 模拟 zh 目录内容
			mockReaddir.mockResolvedValueOnce([createMockDirent('test.json', false)]);

			mockReadFile.mockResolvedValueOnce(JSON.stringify({ key: 'value' }));

			const result = await loader.load();

			expect(result).toEqual({
				zh: { key: 'value' }
			});
		});

		it('当目录读取失败时应返回空对象', async () => {
			loader = new MultiPathJsonLoader({ paths: ['/nonexistent'] });

			mockReaddir.mockRejectedValue(new Error('Permission denied'));

			const result = await loader.load();

			expect(result).toEqual({});
		});

		it('当 paths 为空数组时应返回空对象', async () => {
			loader = new MultiPathJsonLoader({ paths: [] });

			const result = await loader.load();

			expect(result).toEqual({});
		});

		it('应正确加载多个 JSON 文件并合并', async () => {
			loader = new MultiPathJsonLoader({ paths: ['/i18n'] });

			mockReaddir.mockResolvedValueOnce([createMockDirent('en', true)]);
			mockReaddir.mockResolvedValueOnce([
				createMockDirent('common.json', false),
				createMockDirent('errors.json', false)
			]);

			mockReadFile
				.mockResolvedValueOnce(JSON.stringify({ greeting: 'Hello' }))
				.mockResolvedValueOnce(JSON.stringify({ notFound: 'Not Found' }));

			const result = await loader.load();

			expect(result).toEqual({
				en: {
					greeting: 'Hello',
					notFound: 'Not Found'
				}
			});
		});
	});
});
