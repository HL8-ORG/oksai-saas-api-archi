import type { DynamicModule, Type } from '@nestjs/common';
import { PLUGIN_METADATA } from './plugin-metadata';
import type { PluginInput, PluginLifecycleMethods, PluginMetadata } from './plugin.interface';

/**
 * @description 从插件输入中提取“模块类”（用于生命周期与元数据聚合）
 *
 * 说明：
 * - PluginInput 支持 Type 或 DynamicModule
 * - DynamicModule 的 module 字段必须为模块类
 */
export function getPluginModules(plugins: PluginInput[]): Array<Type<unknown>> {
	const out: Array<Type<unknown>> = [];
	for (const p of plugins ?? []) {
		if (!p) continue;
		if (isDynamicModule(p)) {
			out.push(p.module);
		} else {
			out.push(p);
		}
	}
	return out;
}

/**
 * @description 判断实例是否包含指定生命周期方法
 */
export function hasLifecycleMethod(
	instance: unknown,
	method: keyof PluginLifecycleMethods
): instance is PluginLifecycleMethods {
	return !!instance && typeof (instance as any)[method] === 'function';
}

/**
 * @description 从插件聚合 entities（如 ORM entity）
 */
export function getEntitiesFromPlugins(plugins: PluginInput[]): Array<Type<unknown>> {
	return resolveLazyArrayFromPlugins(plugins, PLUGIN_METADATA.ENTITIES);
}

/**
 * @description 从插件聚合 subscribers（如 ORM subscribers）
 */
export function getSubscribersFromPlugins(plugins: PluginInput[]): Array<Type<unknown>> {
	return resolveLazyArrayFromPlugins(plugins, PLUGIN_METADATA.SUBSCRIBERS);
}

/**
 * @description 从插件聚合集成事件订阅者
 */
export function getIntegrationEventSubscribersFromPlugins(plugins: PluginInput[]): Array<Type<unknown>> {
	return resolveLazyArrayFromPlugins(plugins, PLUGIN_METADATA.INTEGRATION_EVENT_SUBSCRIBERS);
}

function resolveLazyArrayFromPlugins(
	plugins: PluginInput[],
	metadataKey: symbol
): Array<Type<unknown>> {
	const modules = getPluginModules(plugins);
	const out: Array<Type<unknown>> = [];

	for (const m of modules) {
		const raw = Reflect.getMetadata(metadataKey, m) as PluginMetadata[keyof PluginMetadata] | undefined;
		if (!raw) continue;
		const value = typeof raw === 'function' ? (raw as any)() : raw;
		if (Array.isArray(value)) out.push(...(value as Array<Type<unknown>>));
	}
	return out;
}

function isDynamicModule(v: unknown): v is DynamicModule {
	return !!v && typeof v === 'object' && 'module' in (v as any);
}

