import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { Inject, Injectable } from '@nestjs/common';
import { I18N_LOADER_OPTIONS } from 'nestjs-i18n';
import type { I18nLoader, I18nTranslation } from 'nestjs-i18n';

export interface MultiPathJsonLoaderOptions {
	/**
	 * @description 需要加载的目录列表（每个目录下应包含语言子目录，例如 `en/`, `zh/`）
	 */
	paths: string[];

	/**
	 * @description 是否监听文件变化（默认 false）
	 *
	 * 当前实现不提供 watch；若需要可在后续引入 chokidar。
	 */
	watch?: boolean;
}

/**
 * @description 多目录 JSON Loader（用于合并多个 i18n 目录）
 *
 * 目录约定：
 *
 * - `<base>/en/*.json`
 * - `<base>/zh/*.json`
 *
 * 合并策略：
 * - 后加载的目录覆盖前加载的同名 key
 */
@Injectable()
export class MultiPathJsonLoader implements I18nLoader {
	private readonly paths: string[];

	constructor(
		@Inject(I18N_LOADER_OPTIONS)
		options: Partial<MultiPathJsonLoaderOptions> | undefined
	) {
		// nestjs-i18n 会通过 DI 注入 I18N_LOADER_OPTIONS，而不是通过构造函数参数传递
		this.paths = Array.isArray(options?.paths) ? options.paths : [];
	}

	async languages(): Promise<string[]> {
		const langs = new Set<string>();
		for (const p of this.paths) {
			const entries = await safeReadDir(p);
			for (const e of entries) {
				if (e.isDirectory()) langs.add(e.name);
			}
		}
		return [...langs];
	}

	async load(): Promise<I18nTranslation> {
		const result: I18nTranslation = {};
		for (const base of this.paths) {
			const langDirs = await safeReadDir(base);
			for (const langDir of langDirs) {
				if (!langDir.isDirectory()) continue;
				const lang = langDir.name;
				const langPath = path.join(base, lang);
				const jsonFiles = (await safeReadDir(langPath)).filter((f) => f.isFile() && f.name.endsWith('.json'));

				const current = (result[lang] ?? {}) as Record<string, unknown>;
				for (const file of jsonFiles) {
					const content = await fs.readFile(path.join(langPath, file.name), 'utf8');
					const parsed = JSON.parse(content) as Record<string, unknown>;
					Object.assign(current, parsed);
				}
				(result as unknown as Record<string, unknown>)[lang] = current;
			}
		}
		return result;
	}
}

async function safeReadDir(dir: string): Promise<import('node:fs').Dirent[]> {
	try {
		return await fs.readdir(dir, { withFileTypes: true });
	} catch {
		return [];
	}
}
