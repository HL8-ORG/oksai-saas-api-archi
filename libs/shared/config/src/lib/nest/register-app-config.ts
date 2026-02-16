import { registerAs } from '@nestjs/config';

/**
 * 统一注册应用配置（基于 @nestjs/config 的 registerAs）
 *
 * @param namespace - 配置命名空间（例如 "app"、"logger"）
 * @param factory - 配置工厂
 * @returns registerAs 的返回值，可被 setupConfigModule({ load: [...] }) 使用
 */
export function registerAppConfig<T extends object>(namespace: string, factory: () => T) {
	// registerAs 的类型定义要求工厂函数返回 Record 结构；这里允许业务侧返回强类型对象，并在边界做一次"运行时轻校验 + 类型收敛"。
	const wrappedFactory = () => {
		const value = factory();
		if (value === null || typeof value !== 'object' || Array.isArray(value)) {
			throw new Error(
				`配置工厂 "${namespace}" 必须返回对象（Record），但收到：${Object.prototype.toString.call(value)}`
			);
		}
		return value as unknown as Record<string, unknown>;
	};
	return registerAs(namespace, wrappedFactory);
}
