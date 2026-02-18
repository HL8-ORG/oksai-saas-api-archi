# Oksai SAAS 平台架构设计方案（全局演进版）

> **版本**：v1.0.0
> **创建日期**：2026-02-18
> **状态**：规划中

---

## 一、文档摘要

本文档基于现有架构文档的全面回顾，结合 SAAS 平台未来发展目标（AI 嵌入、数据分析、异构系统数据仓接入），提出全局性的架构设计方案。

**核心价值**：
- 从架构层面为未来发展预留扩展能力
- 在聚合根基类层面考虑 AI、数据分析、数据同步的需求
- 确保架构演进的一致性和可持续性

---

## 二、平台发展目标与架构挑战

### 2.1 三大发展目标

| 目标 | 核心需求 | 架构影响 |
|------|----------|----------|
| **AI 嵌入** | 向量嵌入、AI 处理状态、模型版本追踪 | 需要元数据扩展能力 |
| **数据分析** | 数据分类、分析维度、数据质量标记 | 需要标签和分类系统 |
| **数据仓接入** | 外部系统标识、同步状态、数据来源追踪 | 需要外部引用和同步元数据 |

### 2.2 架构挑战

```
┌────────────────────────────────────────────────────────────────────┐
│                        架构挑战分析                                  │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  挑战 1：全局能力 vs 领域边界                                       │
│  ├── AI、分析、同步是跨领域的能力                                   │
│  ├── 如何在不破坏领域边界的前提下提供全局能力？                      │
│  └── 聚合根如何优雅地扩展这些能力？                                 │
│                                                                    │
│  挑战 2：核心基类 vs 未来扩展                                       │
│  ├── 预置能力会增加复杂度和维护成本                                 │
│  ├── 不预置可能导致后续重构困难                                     │
│  └── 如何平衡 YAGNI 和前瞻性？                                     │
│                                                                    │
│  挑战 3：统一标准 vs 灵活性                                         │
│  ├── 需要统一的元数据标准便于跨域查询                               │
│  ├── 不同领域可能需要不同的扩展能力                                 │
│  └── 如何提供统一接口同时保持灵活性？                               │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

---

## 三、架构设计原则

### 3.1 核心原则

| 原则 | 说明 |
|------|------|
| **分层扩展** | 核心基类保持精简，通过扩展基类提供额外能力 |
| **开闭原则** | 对扩展开放，对修改封闭 |
| **按需启用** | 领域根据自身需求选择合适的基类 |
| **统一接口** | 扩展能力通过统一接口暴露，便于跨域使用 |
| **渐进演进** | 先实现核心能力，后续按需扩展 |

### 3.2 与现有架构的兼容性

本方案完全兼容现有架构体系：

| 现有能力 | 兼容性 |
|----------|--------|
| Clean Architecture + CQRS + ES + EDA | ✅ 完全兼容 |
| Rich Model + ES 混合架构 | ✅ 完全兼容 |
| 多租户强约束（CLS） | ✅ 完全兼容 |
| Outbox/Inbox 可靠投递 | ✅ 完全兼容 |
| 事件溯源 + 投影 | ✅ 完全兼容 |

---

## 四、聚合根基类分层设计

### 4.1 分层架构

```
┌─────────────────────────────────────────────────────────────────────┐
│                    AggregateRoot (核心基类)                          │
│  ─────────────────────────────────────────────────────────────────  │
│  • 事件版本管理（committedVersion、version）                          │
│  • 领域事件管理（收集、提交、清空）                                    │
│  • 审计时间戳（createdAt、updatedAt）                                 │
│  • 审计追踪（createdBy、updatedBy）                                   │
│  • 软删除能力（deletedAt、deletedBy、isDeleted）                      │
│  • 基础查询方法（hasUncommittedEvents、getAuditInfo）                  │
│  • 事件溯源支持（abstract apply 方法）                                │
└─────────────────────────────────────────────────────────────────────┘
                              ▲
                              │ extends
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
┌───────┴───────┐    ┌────────┴────────┐   ┌──────┴──────┐
│ AIEnabled     │    │ Analyzable      │   │ Syncable    │
│ AggregateRoot │    │ AggregateRoot   │   │ AggregateRoot│
│ ─────────────  │    │ ──────────────  │   │ ───────────  │
│ • embedding    │    │ • tags          │   │ • externalId│
│   Status      │    │ • category      │   │ • dataSource│
│ • embedding    │    │ • analytics     │   │ • syncStatus│
│   Version     │    │   Dimensions    │   │ • syncVersion│
│ • embeddingId  │    │ • quality       │   │ • etlMetadata│
│ • aiMetadata   │    │   Score        │   │             │
│ • aiStatus     │    │                 │   │             │
└───────────────┘    └─────────────────┘   └─────────────┘
        ▲                     ▲                     ▲
        │                     │                     │
        └─────────────────────┼─────────────────────┘
                              │ 组合使用（Trait 模式，可选）
                    ┌─────────┴─────────┐
                    │  AIEnabled &       │
                    │  Analyzable &      │
                    │  Syncable          │
                    │  AggregateRoot     │
                    └────────────────────┘
```

### 4.2 基类职责矩阵

| 基类 | 位置 | 适用场景 | 核心能力 |
|------|------|----------|----------|
| `AggregateRoot` | 核心 | 所有聚合根 | 事件管理、审计、软删除 |
| `AIEnabledAggregateRoot` | 扩展 | 文档、知识库、内容 | 向量嵌入、AI 处理状态 |
| `AnalyzableAggregateRoot` | 扩展 | 账单、订单、统计实体 | 标签、分类、分析维度 |
| `SyncableAggregateRoot` | 扩展 | 外部系统集成数据 | 外部标识、同步状态 |

### 4.3 使用场景映射

| 领域聚合 | 推荐基类 | 理由 |
|----------|----------|------|
| `UserAggregate` | `AggregateRoot` | 无特殊需求 |
| `TenantAggregate` | `AggregateRoot` | 无特殊需求 |
| `BillingAggregate` | `AnalyzableAggregateRoot` | 需要统计分析和分类 |
| `DocumentAggregate` | `AIEnabledAggregateRoot` | 需要向量检索 |
| `IntegrationDataAggregate` | `SyncableAggregateRoot` | 需要外部同步 |
| `ReportAggregate` | `AnalyzableAggregateRoot` + `SyncableAggregateRoot` | 需要多种能力组合 |

---

## 五、核心基类设计

### 5.1 AggregateRoot 接口

```typescript
/**
 * @description 聚合根基类
 *
 * 提供所有聚合根共享的基础能力：
 * - 领域事件管理（收集、提交、版本控制）
 * - 乐观并发控制（expectedVersion）
 * - 审计时间戳（createdAt、updatedAt）
 * - 审计追踪（createdBy、updatedBy）
 * - 软删除能力（deletedAt、deletedBy、isDeleted、softDelete、restore）
 *
 * 使用说明：
 * - 子类必须实现 abstract apply() 方法用于事件溯源重建
 * - 子类通过 addDomainEvent() 记录领域事件
 * - createdAt/createdBy 在首次添加事件时自动设置
 * - 软删除是可选能力，子类可通过 softDelete()/restore() 启用
 */
export abstract class AggregateRoot<TEvent extends EventStoreDomainEvent = EventStoreDomainEvent> {
	// ==================== 事件版本管理 ====================

	/** 已提交版本（用于乐观并发控制） */
	protected committedVersion = 0;

	/** 当前版本（包含未提交事件） */
	protected version = 0;

	// ==================== 领域事件管理 ====================

	/** 未提交的领域事件缓冲区 */
	private readonly _domainEvents: TEvent[] = [];

	// ==================== 审计时间戳 ====================

	/** 创建时间 */
	protected _createdAt!: Date;

	/** 最后更新时间 */
	protected _updatedAt!: Date;

	// ==================== 审计追踪 ====================

	/** 创建者 ID（用户或系统标识） */
	protected _createdBy?: string;

	/** 最后更新者 ID */
	protected _updatedBy?: string;

	// ==================== 软删除 ====================

	/** 删除时间（undefined 表示未删除） */
	protected _deletedAt?: Date;

	/** 删除者 ID */
	protected _deletedBy?: string;

	// ... 完整实现见 XS-聚合根基类重构方案.md
}
```

### 5.2 AuditInfo 接口

```typescript
/**
 * @description 审计信息结构
 *
 * 统一的审计信息格式，用于日志、审计报告、跨域查询
 */
export interface AuditInfo {
	/** 创建时间 */
	createdAt: Date;
	/** 创建者 ID */
	createdBy?: string;
	/** 最后更新时间 */
	updatedAt: Date;
	/** 最后更新者 ID */
	updatedBy?: string;
	/** 删除时间 */
	deletedAt?: Date;
	/** 删除者 ID */
	deletedBy?: string;
	/** 是否已删除 */
	isDeleted: boolean;
}
```

---

## 六、扩展基类设计

### 6.1 AIEnabledAggregateRoot

```typescript
/**
 * @description AI 能力扩展聚合根基类
 *
 * 适用于需要 AI 嵌入、智能处理的聚合根
 *
 * 使用场景：
 * - 文档、知识库（需要向量化检索）
 * - 内容生成（AI 辅助创作）
 * - 智能推荐（需要特征提取）
 */
export abstract class AIEnabledAggregateRoot<
	TEvent extends EventStoreDomainEvent = EventStoreDomainEvent
> extends AggregateRoot<TEvent> {
	// ==================== AI 元数据 ====================

	/** 向量嵌入状态 */
	protected _embeddingStatus: EmbeddingStatus = EmbeddingStatus.PENDING;

	/** 嵌入向量版本（模型版本） */
	protected _embeddingVersion?: string;

	/** 嵌入向量 ID（外部向量库引用） */
	protected _embeddingId?: string;

	/** AI 处理元数据 */
	protected _aiMetadata?: AIProcessingMetadata;

	// ==================== AI 状态管理 ====================

	/**
	 * @description 标记需要重新生成嵌入
	 */
	markEmbeddingStale(): void {
		this._embeddingStatus = EmbeddingStatus.STALE;
	}

	/**
	 * @description 更新嵌入信息
	 */
	updateEmbedding(embeddingId: string, version: string): void {
		this._embeddingStatus = EmbeddingStatus.SYNCED;
		this._embeddingId = embeddingId;
		this._embeddingVersion = version;
	}

	/**
	 * @description 检查是否需要重新嵌入
	 */
	needsReembedding(): boolean {
		return this._embeddingStatus === EmbeddingStatus.STALE ||
			   this._embeddingStatus === EmbeddingStatus.PENDING;
	}
}
```

### 6.2 AnalyzableAggregateRoot

```typescript
/**
 * @description 数据分析能力扩展聚合根基类
 *
 * 适用于需要数据分析、报表聚合的聚合根
 *
 * 使用场景：
 * - 业务实体（需要统计分析）
 * - 报表数据（需要维度分类）
 * - 指标数据（需要聚合计算）
 */
export abstract class AnalyzableAggregateRoot<
	TEvent extends EventStoreDomainEvent = EventStoreDomainEvent
> extends AggregateRoot<TEvent> {
	// ==================== 分析元数据 ====================

	/** 数据分类标签 */
	protected _tags: string[] = [];

	/** 业务分类 */
	protected _category?: string;

	/** 分析维度 */
	protected _analyticsDimensions?: Record<string, string | number>;

	/** 数据质量分数 */
	protected _qualityScore?: number;

	/** 是否参与统计分析 */
	protected _includeInAnalytics: boolean = true;

	// ==================== 标签管理 ====================

	/**
	 * @description 添加标签
	 */
	addTag(tag: string): void {
		if (!this._tags.includes(tag)) {
			this._tags.push(tag);
		}
	}

	/**
	 * @description 设置分析维度
	 */
	setAnalyticsDimension(key: string, value: string | number): void {
		if (!this._analyticsDimensions) {
			this._analyticsDimensions = {};
		}
		this._analyticsDimensions[key] = value;
	}
}
```

### 6.3 SyncableAggregateRoot

```typescript
/**
 * @description 数据仓同步能力扩展聚合根基类
 *
 * 适用于需要与外部系统/数据仓同步的聚合根
 *
 * 使用场景：
 * - 异构系统对接
 * - 数据仓库同步
 * - 第三方平台集成
 */
export abstract class SyncableAggregateRoot<
	TEvent extends EventStoreDomainEvent = EventStoreDomainEvent
> extends AggregateRoot<TEvent> {
	// ==================== 同步元数据 ====================

	/** 外部系统标识列表 */
	protected _externalIds: Map<string, string> = new Map();

	/** 数据来源 */
	protected _dataSource?: string;

	/** 同步状态 */
	protected _syncStatus: SyncStatus = SyncStatus.SYNCED;

	/** 最后同步时间 */
	protected _lastSyncedAt?: Date;

	/** 同步版本（用于增量同步） */
	protected _syncVersion: number = 1;

	/** ETL 元数据 */
	protected _etlMetadata?: ETLMetadata;

	// ==================== 外部标识管理 ====================

	/**
	 * @description 设置外部系统 ID
	 */
	setExternalId(system: string, externalId: string): void {
		this._externalIds.set(system, externalId);
	}

	/**
	 * @description 标记需要同步
	 */
	markSyncRequired(): void {
		this._syncStatus = SyncStatus.PENDING;
		this._syncVersion += 1;
	}
}
```

---

## 七、跨域查询能力设计

### 7.1 统一元数据接口

为了支持跨域数据分析和查询，定义统一的元数据接口：

```typescript
/**
 * @description 聚合根元数据接口
 *
 * 所有聚合根应实现此接口，以便跨域查询和分析
 */
export interface IAggregateMetadata {
	/** 聚合类型 */
	readonly aggregateType: string;
	/** 聚合 ID */
	readonly aggregateId: string;
	/** 租户 ID */
	readonly tenantId: string;
	/** 审计信息 */
	readonly auditInfo: AuditInfo;
	/** 创建时间（索引字段） */
	readonly createdAt: Date;
	/** 更新时间（索引字段） */
	readonly updatedAt: Date;
	/** 是否已删除 */
	readonly isDeleted: boolean;
}

/**
 * @description 可分析聚合根接口
 *
 * AnalyzableAggregateRoot 实现此接口
 */
export interface IAnalyzableMetadata extends IAggregateMetadata {
	/** 标签列表 */
	readonly tags: string[];
	/** 分类 */
	readonly category?: string;
	/** 分析维度 */
	readonly analyticsDimensions?: Record<string, string | number>;
	/** 数据质量分数 */
	readonly qualityScore?: number;
}

/**
 * @description 可同步聚合根接口
 *
 * SyncableAggregateRoot 实现此接口
 */
export interface ISyncableMetadata extends IAggregateMetadata {
	/** 外部系统标识 */
	readonly externalIds: Record<string, string>;
	/** 数据来源 */
	readonly dataSource?: string;
	/** 同步状态 */
	readonly syncStatus: SyncStatus;
	/** 同步版本 */
	readonly syncVersion: number;
}
```

### 7.2 元数据投影设计

```typescript
/**
 * @description 聚合元数据投影表
 *
 * 用于跨域查询和数据分析
 * 
 * 表名：aggregate_metadata
 */
@Entity({ tableName: 'aggregate_metadata' })
export class AggregateMetadataReadModel {
	@PrimaryKey()
	id!: string;

	@Property({ index: true })
	aggregateType!: string;

	@Property({ index: true })
	aggregateId!: string;

	@Property({ index: true })
	tenantId!: string;

	@Property({ index: true })
	createdAt!: Date;

	@Property({ index: true })
	updatedAt!: Date;

	@Property()
	isDeleted!: boolean;

	@Property({ type: 'json', nullable: true })
	tags?: string[];

	@Property({ nullable: true })
	category?: string;

	@Property({ type: 'json', nullable: true })
	analyticsDimensions?: Record<string, string | number>;

	@Property({ nullable: true })
	qualityScore?: number;

	@Property({ type: 'json', nullable: true })
	externalIds?: Record<string, string>;

	@Property({ nullable: true })
	syncStatus?: string;

	@Property({ type: 'json', nullable: true })
	auditInfo?: any;
}
```

---

## 八、AI 能力集成设计

### 8.1 向量嵌入集成

```typescript
/**
 * @description 向量嵌入服务接口
 */
export interface IEmbeddingService {
	/**
	 * @description 生成文本嵌入向量
	 */
	generateEmbedding(text: string): Promise<number[]>;

	/**
	 * @description 批量生成嵌入向量
	 */
	generateEmbeddings(texts: string[]): Promise<number[][]>;
}

/**
 * @description 向量存储接口
 */
export interface IVectorStore {
	/**
	 * @description 存储向量
	 */
	upsert(id: string, vector: number[], metadata: Record<string, any>): Promise<void>;

	/**
	 * @description 相似度搜索
	 */
	similaritySearch(vector: number[], k: number, filter?: Record<string, any>): Promise<VectorSearchResult[]>;

	/**
	 * @description 删除向量
	 */
	delete(id: string): Promise<void>;
}

/**
 * @description 向量搜索结果
 */
export interface VectorSearchResult {
	id: string;
	score: number;
	metadata: Record<string, any>;
}
```

### 8.2 AI 处理状态枚举

```typescript
/**
 * @description 嵌入状态枚举
 */
export enum EmbeddingStatus {
	/** 待处理 */
	PENDING = 'PENDING',
	/** 已同步 */
	SYNCED = 'SYNCED',
	/** 已过期（内容变更后需要重新嵌入） */
	STALE = 'STALE',
	/** 处理失败 */
	FAILED = 'FAILED'
}

/**
 * @description AI 处理元数据
 */
export interface AIProcessingMetadata {
	/** 处理时间 */
	processedAt?: Date;
	/** 使用的模型 */
	modelName?: string;
	/** 置信度分数 */
	confidenceScore?: number;
	/** AI 生成标记 */
	isAIGenerated?: boolean;
	/** 人工审核状态 */
	reviewStatus?: 'PENDING' | 'APPROVED' | 'REJECTED';
}
```

---

## 九、数据分析能力集成设计

### 9.1 分析维度定义

```typescript
/**
 * @description 分析维度类型
 */
export type AnalyticsDimensionValue = string | number | boolean | Date;

/**
 * @description 分析维度映射
 */
export type AnalyticsDimensions = Record<string, AnalyticsDimensionValue>;

/**
 * @description 常用分析维度键
 */
export const CommonAnalyticsDimensions = {
	/** 时间维度 */
	TIME_YEAR: 'time_year',
	TIME_MONTH: 'time_month',
	TIME_WEEK: 'time_week',
	TIME_DAY: 'time_day',
	
	/** 地理维度 */
	GEO_COUNTRY: 'geo_country',
	GEO_REGION: 'geo_region',
	GEO_CITY: 'geo_city',
	
	/** 业务维度 */
	BUSINESS_TYPE: 'business_type',
	BUSINESS_STATUS: 'business_status',
	BUSINESS_AMOUNT_RANGE: 'business_amount_range',
} as const;
```

### 9.2 数据质量评分

```typescript
/**
 * @description 数据质量评分器接口
 */
export interface IDataQualityScorer {
	/**
	 * @description 计算数据质量分数
	 */
	calculateScore(aggregate: IAnalyzableMetadata): number;
}

/**
 * @description 默认数据质量评分器
 */
export class DefaultDataQualityScorer implements IDataQualityScorer {
	calculateScore(aggregate: IAnalyzableMetadata): number {
		let score = 100;
		
		// 检查必填字段
		if (!aggregate.tags || aggregate.tags.length === 0) {
			score -= 20;
		}
		if (!aggregate.category) {
			score -= 15;
		}
		
		// 检查分析维度
		if (!aggregate.analyticsDimensions || Object.keys(aggregate.analyticsDimensions).length === 0) {
			score -= 25;
		}
		
		// 检查审计完整性
		if (!aggregate.auditInfo.createdBy) {
			score -= 10;
		}
		
		return Math.max(0, score);
	}
}
```

---

## 十、数据仓同步能力集成设计

### 10.1 同步状态枚举

```typescript
/**
 * @description 同步状态枚举
 */
export enum SyncStatus {
	/** 待同步 */
	PENDING = 'PENDING',
	/** 已同步 */
	SYNCED = 'SYNCED',
	/** 同步失败 */
	FAILED = 'FAILED',
	/** 同步中 */
	IN_PROGRESS = 'IN_PROGRESS'
}

/**
 * @description ETL 元数据
 */
export interface ETLMetadata {
	/** ETL 作业 ID */
	jobId?: string;
	/** 最后处理时间 */
	processedAt?: Date;
	/** 错误信息 */
	lastError?: string;
	/** 重试次数 */
	retryCount?: number;
}
```

### 10.2 外部系统集成接口

```typescript
/**
 * @description 外部系统连接器接口
 */
export interface IExternalSystemConnector {
	/** 系统标识 */
	readonly systemId: string;
	
	/**
	 * @description 从外部系统拉取数据
	 */
	pullData(since?: Date): Promise<ExternalDataBatch>;
	
	/**
	 * @description 推送数据到外部系统
	 */
	pushData(aggregates: ISyncableMetadata[]): Promise<void>;
}

/**
 * @description 外部数据批次
 */
export interface ExternalDataBatch {
	/** 数据记录 */
	records: any[];
	/** 是否有更多数据 */
	hasMore: boolean;
	/** 下次拉取游标 */
	nextCursor?: string;
}
```

---

## 十一、实施路线图

### 11.1 阶段划分

```
┌─────────────────────────────────────────────────────────────────────┐
│                         实施路线图                                    │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Phase 1：核心基类实现（2-3 周）                                      │
│  ├── 实现 AggregateRoot 核心基类                                     │
│  ├── 迁移现有聚合根（UserAggregate、TenantAggregate、BillingAggregate）│
│  └── 验证基础能力（事件管理、审计、软删除）                             │
│                                                                     │
│  Phase 2：扩展基类设计（2-3 周）                                      │
│  ├── 实现 AIEnabledAggregateRoot                                    │
│  ├── 实现 AnalyzableAggregateRoot                                   │
│  ├── 实现 SyncableAggregateRoot                                     │
│  └── 编写单元测试                                                    │
│                                                                     │
│  Phase 3：元数据投影（2-3 周）                                        │
│  ├── 实现 AggregateMetadataReadModel                                │
│  ├── 实现元数据投影订阅者                                             │
│  └── 验证跨域查询能力                                                │
│                                                                     │
│  Phase 4：AI 能力集成（3-4 周）                                       │
│  ├── 集成向量嵌入服务                                                │
│  ├── 实现向量存储适配器                                              │
│  └── 实现文档聚合根（使用 AIEnabledAggregateRoot）                     │
│                                                                     │
│  Phase 5：数据分析能力（3-4 周）                                      │
│  ├── 实现数据质量评分器                                              │
│  ├── 实现分析维度计算器                                              │
│  └── 创建分析报表读模型                                              │
│                                                                     │
│  Phase 6：数据仓同步（3-4 周）                                        │
│  ├── 实现外部系统连接器接口                                          │
│  ├── 实现 ETL 作业框架                                              │
│  └── 集成测试                                                       │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 11.2 里程碑验收标准

| 里程碑 | 验收标准 |
|--------|----------|
| Phase 1 | 所有现有聚合根迁移到 AggregateRoot 基类 |
| Phase 2 | 三个扩展基类可用，单元测试覆盖率 ≥ 80% |
| Phase 3 | 跨域元数据查询可用 |
| Phase 4 | 文档向量检索功能可用 |
| Phase 5 | 数据分析报表可用 |
| Phase 6 | 外部系统数据同步可用 |

---

## 十二、风险与对策

| 风险 | 等级 | 缓解措施 |
|------|------|----------|
| 基类设计过度复杂 | 中 | 保持核心基类精简，扩展能力按需添加 |
| 迁移导致回归 | 高 | 渐进式迁移，保持回滚能力 |
| 性能影响 | 低 | 扩展字段为可选，不影响核心性能 |
| 团队学习曲线 | 中 | 提供示例代码和文档 |

---

## 十三、相关文档索引

- `docs/ARCHITECTURE.md` - 主架构文档
- `docs/XS-项目重构计划（CQRS+EDA平台化）.md` - 重构计划
- `docs/XS-领域模型增强计划（Rich Model + ES 混合架构）.md` - 领域模型增强
- `docs/XS-聚合根基类重构方案.md` - 聚合根基类详细设计
- `docs/XS-自研CQRS包技术方案（基于forks-cqrs）.md` - CQRS 方案
- `docs/XS-自研EDA包技术方案（基于现有messaging-outbox-inbox）.md` - EDA 方案

---

**文档版本**: v1.0.0
**最后更新**: 2026-02-18
**维护者**: Oksai Team
