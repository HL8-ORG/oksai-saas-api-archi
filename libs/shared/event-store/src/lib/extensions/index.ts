/**
 * @description 扩展基类模块
 *
 * 提供面向未来发展需求的扩展聚合根基类：
 * - AIEnabledAggregateRoot：AI 能力扩展（向量嵌入、AI 处理状态）
 * - AnalyzableAggregateRoot：数据分析能力扩展（标签、分类、分析维度）
 * - SyncableAggregateRoot：数据仓同步能力扩展（外部标识、同步状态）
 */

// 枚举和接口
export * from './enums-and-interfaces';

// 扩展基类
export * from './ai-enabled.aggregate-root';
export * from './analyzable.aggregate-root';
export * from './syncable.aggregate-root';
