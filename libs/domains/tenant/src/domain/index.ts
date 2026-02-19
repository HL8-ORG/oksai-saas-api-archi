/**
 * @description 租户领域层导出
 */

// 例外
export * from './exceptions/domain.exception';

// 事件
export * from './events';

// 值对象
export * from './value-objects/tenant-id.value-object';
export * from './value-objects/tenant-name.value-object';
export * from './value-objects/tenant-settings.value-object';

// 业务规则
export * from './rules';

// 规格
export * from './specifications';

// 聚合根
export * from './aggregates/tenant.aggregate';
