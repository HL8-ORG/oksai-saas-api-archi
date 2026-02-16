/**
 * 统一的环境变量解析器（轻量实现）
 *
 * 设计原则：
 * - 不引入额外校验库（zod/joi/class-validator），降低依赖复杂度
 * - 解析失败直接抛错，阻止应用在错误配置下启动
 * - 错误信息使用中文，便于快速定位
 */

export class ConfigEnvError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'ConfigEnvError';
	}
}

export interface EnvStringOptions {
	defaultValue?: string;
	trim?: boolean;
}

export interface EnvIntOptions {
	defaultValue?: number;
	min?: number;
	max?: number;
}

export interface EnvBoolOptions {
	defaultValue?: boolean;
}

export interface EnvEnumOptions<T extends string> {
	defaultValue?: T;
}

export interface EnvUrlOptions {
	defaultValue?: string;
	/**
	 * 允许的协议列表（例如 ['http:', 'https:']）
	 */
	allowedProtocols?: string[];
}

export interface EnvJsonOptions<T> {
	defaultValue?: T;
}

export interface EnvListOptions {
	defaultValue?: string[];
	separator?: string;
	trim?: boolean;
}

export interface EnvDurationMsOptions {
	defaultValue?: number;
	min?: number;
	max?: number;
}

export const env = {
	/**
	 * 读取字符串环境变量
	 */
	string(name: string, options: EnvStringOptions = {}): string {
		const raw = process.env[name];
		if (raw === undefined || raw === '') {
			if (options.defaultValue !== undefined) return options.defaultValue;
			throw new ConfigEnvError(`缺少必需的环境变量：${name}`);
		}
		const v = options.trim === false ? raw : raw.trim();
		if (v.length === 0) {
			if (options.defaultValue !== undefined) return options.defaultValue;
			throw new ConfigEnvError(`环境变量 ${name} 为空字符串`);
		}
		return v;
	},

	/**
	 * 读取整数环境变量
	 */
	int(name: string, options: EnvIntOptions = {}): number {
		const raw = process.env[name];
		if (raw === undefined || raw === '') {
			if (options.defaultValue !== undefined) return options.defaultValue;
			throw new ConfigEnvError(`缺少必需的环境变量：${name}`);
		}
		const n = Number.parseInt(raw, 10);
		if (Number.isNaN(n)) {
			throw new ConfigEnvError(`环境变量 ${name} 不是有效整数：${raw}`);
		}
		if (options.min !== undefined && n < options.min) {
			throw new ConfigEnvError(`环境变量 ${name} 不能小于 ${options.min}：${n}`);
		}
		if (options.max !== undefined && n > options.max) {
			throw new ConfigEnvError(`环境变量 ${name} 不能大于 ${options.max}：${n}`);
		}
		return n;
	},

	/**
	 * 读取布尔环境变量（true/false/1/0）
	 */
	bool(name: string, options: EnvBoolOptions = {}): boolean {
		const raw = process.env[name];
		if (raw === undefined || raw === '') {
			if (options.defaultValue !== undefined) return options.defaultValue;
			throw new ConfigEnvError(`缺少必需的环境变量：${name}`);
		}
		const v = raw.trim().toLowerCase();
		if (v === 'true' || v === '1') return true;
		if (v === 'false' || v === '0') return false;
		throw new ConfigEnvError(`环境变量 ${name} 不是有效布尔值（true/false/1/0）：${raw}`);
	},

	/**
	 * 读取枚举环境变量
	 *
	 * @example
	 * ```ts
	 * const mode = env.enum('MODE', ['dev', 'prod'] as const, { defaultValue: 'dev' });
	 * ```
	 */
	enum<const T extends readonly string[]>(
		name: string,
		allowed: T,
		options: EnvEnumOptions<T[number]> = {}
	): T[number] {
		const raw = process.env[name];
		if (raw === undefined || raw === '') {
			if (options.defaultValue !== undefined) return options.defaultValue;
			throw new ConfigEnvError(`缺少必需的环境变量：${name}`);
		}
		const v = raw.trim();
		if ((allowed as readonly string[]).includes(v)) return v as T[number];
		throw new ConfigEnvError(`环境变量 ${name} 的值不合法：${v}，允许值为：${allowed.join(', ')}`);
	},

	/**
	 * 读取 URL 环境变量
	 */
	url(name: string, options: EnvUrlOptions = {}): string {
		const raw = process.env[name];
		if (raw === undefined || raw === '') {
			if (options.defaultValue !== undefined) return options.defaultValue;
			throw new ConfigEnvError(`缺少必需的环境变量：${name}`);
		}
		const v = raw.trim();
		let u: URL;
		try {
			u = new URL(v);
		} catch {
			throw new ConfigEnvError(`环境变量 ${name} 不是有效 URL：${v}`);
		}
		if (options.allowedProtocols?.length) {
			if (!options.allowedProtocols.includes(u.protocol)) {
				throw new ConfigEnvError(
					`环境变量 ${name} 的协议不被允许：${u.protocol}，允许协议：${options.allowedProtocols.join(', ')}`
				);
			}
		}
		return v;
	},

	/**
	 * 读取 JSON 环境变量
	 */
	json<T>(name: string, options: EnvJsonOptions<T> = {}): T {
		const raw = process.env[name];
		if (raw === undefined || raw === '') {
			if (options.defaultValue !== undefined) return options.defaultValue;
			throw new ConfigEnvError(`缺少必需的环境变量：${name}`);
		}
		try {
			return JSON.parse(raw) as T;
		} catch {
			throw new ConfigEnvError(`环境变量 ${name} 不是有效 JSON：${raw}`);
		}
	},

	/**
	 * 读取列表环境变量（默认以逗号分隔）
	 */
	list(name: string, options: EnvListOptions = {}): string[] {
		const raw = process.env[name];
		if (raw === undefined || raw === '') {
			if (options.defaultValue !== undefined) return options.defaultValue;
			throw new ConfigEnvError(`缺少必需的环境变量：${name}`);
		}
		const sep = options.separator ?? ',';
		const trim = options.trim ?? true;
		return raw
			.split(sep)
			.map((s) => (trim ? s.trim() : s))
			.filter((s) => s.length > 0);
	},

	/**
	 * 读取时长环境变量并转换为毫秒
	 *
	 * 支持格式：
	 * - 纯数字：`1500`（毫秒）
	 * - 带单位：`2s`、`5m`、`1h`、`1d`
	 */
	durationMs(name: string, options: EnvDurationMsOptions = {}): number {
		const raw = process.env[name];
		if (raw === undefined || raw === '') {
			if (options.defaultValue !== undefined) return options.defaultValue;
			throw new ConfigEnvError(`缺少必需的环境变量：${name}`);
		}
		const v = raw.trim().toLowerCase();
		const m = /^(\d+)(ms|s|m|h|d)?$/.exec(v);
		if (!m) throw new ConfigEnvError(`环境变量 ${name} 不是有效时长：${raw}（示例：1500/2s/5m/1h/1d）`);
		const n = Number.parseInt(m[1] ?? '', 10);
		const unit = m[2] ?? 'ms';
		const ms =
			unit === 'ms'
				? n
				: unit === 's'
					? n * 1000
					: unit === 'm'
						? n * 60_000
						: unit === 'h'
							? n * 3_600_000
							: n * 86_400_000;

		if (options.min !== undefined && ms < options.min)
			throw new ConfigEnvError(`环境变量 ${name} 不能小于 ${options.min}ms：${ms}`);
		if (options.max !== undefined && ms > options.max)
			throw new ConfigEnvError(`环境变量 ${name} 不能大于 ${options.max}ms：${ms}`);
		return ms;
	}
};
