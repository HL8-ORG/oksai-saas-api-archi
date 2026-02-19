# Phase 8: 事件溯源和投影机制 - 实施计划

> **版本**：v1.1.0
> **创建日期**：2026-02-19
> **最后更新**：2026-02-19
> **状态**：进行中（核心任务已完成）
> **前置依赖**：Phase 7（领域模型增强）已完成
> **预计工时**：6 天

---

## 一、阶段目标

构建完整的事件溯源和投影机制，为**数据分析平台**提供数据基础。

### 核心价值

| 价值       | 描述                       | 关联目标           |
| ---------- | -------------------------- | ------------------ |
| 完整审计   | 所有数据变更完整记录       | 数据分析           |
| 时间旅行   | 支持状态回放和历史查询     | 数据分析、数据仓库 |
| 灵活读模型 | 多维度投影支持各种分析场景 | 数据分析           |
| 实时同步   | ETL 基础设施               | 数据仓库           |

---

## 二、任务分解

### 8.1 事件存储优化（2 天）

#### 任务 8.1.1: 事件存储接口设计 (0.5 天)

**优先级**：P0
**依赖**：Phase 7 完成

**交付物**：

- `libs/shared/event-store/src/interfaces/event-store.interface.ts`
- `libs/shared/event-store/src/interfaces/event-filter.interface.ts`
- `libs/shared/event-store/src/interfaces/snapshot.interface.ts`

**验收标准**：

- [x] 定义 `IEventStore` 接口
- [x] 定义 `IEventFilter` 过滤器接口
- [x] 定义 `ISnapshotStore` 快照接口
- [x] 类型定义完整且通过类型检查

---

#### 任务 8.1.2: 事件存储基类实现 (0.5 天)

**优先级**：P0
**依赖**：任务 8.1.1

**交付物**：

- `libs/shared/event-store/src/event-store.base.ts`

**实现要点**：

```typescript
export abstract class EventStoreBase implements IEventStore {
	abstract appendToStream(
		streamId: string,
		events: DomainEvent[],
		expectedVersion?: number
	): Promise<Either<void, ConcurrencyError>>;

	abstract loadEvents(streamId: string, fromVersion?: number, toVersion?: number): Promise<DomainEvent[]>;

	abstract loadAllEvents(filter?: EventFilter): Promise<AsyncIterable<DomainEvent>>;

	abstract saveSnapshot(streamId: string, snapshot: Snapshot): Promise<void>;

	abstract loadSnapshot(streamId: string): Promise<Snapshot | null>;
}
```

**验收标准**：

- [x] 抽象类定义完整（通过 PgEventStoreEnhanced 实现）
- [x] 支持乐观锁（expectedVersion）
- [x] 支持流式加载大量事件（streamAllEvents）
- [x] 快照机制接口完整

---

#### 任务 8.1.3: PostgreSQL 事件存储实现 (0.5 天)

**优先级**：P0
**依赖**：任务 8.1.2

**交付物**：

- `libs/shared/event-store/src/lib/postgres/pg-event-store-enhanced.ts`
- `libs/shared/event-store/src/lib/projections/interfaces/snapshot.interface.ts`
- `libs/shared/event-store/src/lib/postgres/migrations/001_create_snapshots_table.sql`

**数据库表设计**：

```sql
CREATE TABLE event_store (
  event_id UUID PRIMARY KEY,
  stream_id VARCHAR(255) NOT NULL,
  event_name VARCHAR(255) NOT NULL,
  event_version INTEGER NOT NULL,
  aggregate_type VARCHAR(100) NOT NULL,
  aggregate_id VARCHAR(255) NOT NULL,
  payload JSONB NOT NULL,
  metadata JSONB NOT NULL,
  occurred_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_event_store_stream_id ON event_store(stream_id, event_version);
CREATE INDEX idx_event_store_aggregate ON event_store(aggregate_type, aggregate_id);
CREATE INDEX idx_event_store_occurred_at ON event_store(occurred_at);
```

**验收标准**：

- [x] PostgreSQL 适配器实现 `IEventStore` + `ISnapshotStore`
- [x] 事件持久化正确（15 个单元测试通过）
- [x] 支持并发控制（ConcurrencyError）
- [x] 索引优化查询性能
- [x] 快照存储和加载正常

---

#### 任务 8.1.4: 事件序列化器实现 (0.5 天)

**优先级**：P0
**依赖**：任务 8.1.3

**交付物**：

- `libs/shared/event-store/src/serializers/event.serializer.ts`
- `libs/shared/event-store/src/serializers/event-deserializer.ts`

**实现要点**：

- 事件名称到类映射（EventRegistry）
- JSON 序列化/反序列化
- 版本兼容性处理

**验收标准**：

- [ ] 事件正确序列化为 JSON
- [ ] JSON 正确反序列化为事件对象
- [ ] 支持事件版本升级
- [ ] 单元测试覆盖率 > 80%

---

### 8.2 分析投影实现（3 天）

#### 任务 8.2.1: 投影基类设计 (0.5 天)

**优先级**：P0
**依赖**：任务 8.1.4

**交付物**：

- `libs/shared/event-store/src/projections/projection.base.ts`
- `libs/shared/event-store/src/projections/interfaces/projection.interface.ts`

**实现要点**：

```typescript
export abstract class ProjectionBase<TReadModel = unknown> {
	abstract readonly name: string;
	abstract readonly subscribedEvents: string[];

	abstract handle(event: DomainEvent): Promise<void>;
	abstract rebuild(): Promise<void>;
	abstract getStatus(): Promise<ProjectionStatus>;
}
```

**验收标准**：

- [ ] 抽象基类定义完整
- [ ] 支持订阅指定事件
- [ ] 支持投影重建
- [ ] 支持状态查询

---

#### 任务 8.2.2: 租户分析投影实现 (1 天)

**优先级**：P0
**依赖**：任务 8.2.1

**交付物**：

- `libs/domains/tenant/src/infrastructure/projections/tenant-analytics.projection.ts`
- `libs/domains/tenant/src/infrastructure/read-models/tenant-analytics.read-model.ts`
- `libs/domains/tenant/src/infrastructure/repositories/tenant-analytics.repository.ts`

**投影事件订阅**：

- `TenantCreatedEvent`
- `TenantActivatedEvent`
- `TenantSuspendedEvent`
- `MemberAddedEvent`
- `MemberRemovedEvent`

**读模型结构**：

```typescript
export interface TenantAnalyticsReadModel {
	tenantId: string;
	name: string;
	type: TenantType;
	status: string;
	memberCount: number;
	activeUserCount: number;
	dataImportCount: number;
	analysisCount: number;
	createdAt: Date;
	updatedAt: Date;
	lastActiveAt?: Date;
}
```

**验收标准**：

- [x] 投影正确处理所有订阅事件（12 测试通过）
- [x] 读模型数据准确
- [x] 支持投影重建
- [x] 单元测试覆盖所有事件处理

---

#### 任务 8.2.3: 数据源使用统计投影 (0.5 天)

**优先级**：P1
**依赖**：任务 8.2.1

**交付物**：

- `libs/domains/data-ingestion/src/infrastructure/projections/data-source-stats.projection.ts`
- `libs/domains/data-ingestion/src/infrastructure/read-models/data-source-stats.read-model.ts`

**投影事件订阅**：

- `DataSourceCreatedEvent`
- `DataSourceConnectedEvent`
- `DataSyncStartedEvent`
- `DataSyncCompletedEvent`
- `DataSyncFailedEvent`

**验收标准**：

- [ ] 统计数据源使用次数
- [ ] 统计同步成功/失败率
- [ ] 支持按租户聚合
- [ ] 单元测试通过

---

#### 任务 8.2.4: ClickHouse 读模型存储适配器 (1 天)

**优先级**：P0
**依赖**：任务 8.2.2

**交付物**：

- `libs/shared/analytics/src/adapters/clickhouse.adapter.ts`
- `libs/shared/analytics/src/interfaces/analytics-store.interface.ts`

**ClickHouse 表设计**：

```sql
CREATE TABLE tenant_analytics (
  tenant_id String,
  name String,
  type String,
  status String,
  member_count UInt32,
  active_user_count UInt32,
  data_import_count UInt64,
  analysis_count UInt64,
  created_at DateTime,
  updated_at DateTime,
  last_active_at Nullable(DateTime)
) ENGINE = ReplacingMergeTree(updated_at)
ORDER BY (tenant_id, created_at);
```

**验收标准**：

- [ ] ClickHouse 连接正常
- [ ] 批量写入优化
- [ ] 查询性能 < 200ms
- [ ] 集成测试通过

---

### 8.3 实时数据同步（1 天）

#### 任务 8.3.1: 投影编排器实现 (0.5 天)

**优先级**：P0
**依赖**：任务 8.2.4

**交付物**：

- `libs/shared/event-store/src/projections/projection-orchestrator.ts`

**实现要点**：

```typescript
export class ProjectionOrchestrator {
	private projections: Map<string, ProjectionBase> = new Map();

	registerProjection(projection: ProjectionBase): void;
	startRealtimeSync(): Promise<void>;
	stopRealtimeSync(): Promise<void>;
	dispatchEvent(event: DomainEvent): Promise<void>;
	rebuildAll(): Promise<void>;
	getProjectionStatus(name: string): Promise<ProjectionStatus>;
}
```

**验收标准**：

- [ ] 投影注册机制正常
- [ ] 实时同步延迟 < 100ms
- [ ] 失败事件有重试机制
- [ ] 单元测试通过

---

#### 任务 8.3.2: 事件分发器与 NestJS 集成 (0.5 天)

**优先级**：P0
**依赖**：任务 8.3.1

**交付物**：

- `libs/shared/event-store/src/projections/event-dispatcher.module.ts`
- `libs/shared/event-store/src/projections/projection.registry.ts`

**实现要点**：

- NestJS 模块封装
- 依赖注入集成
- 健康检查端点

**验收标准**：

- [ ] NestJS 模块正确注册
- [ ] 投影自动发现和注册
- [ ] 健康检查端点可用
- [ ] 集成测试通过

---

## 三、技术决策

### 3.1 事件存储选型

| 选项         | 优点                   | 缺点           | 决策                |
| ------------ | ---------------------- | -------------- | ------------------- |
| PostgreSQL   | 成熟稳定、已有基础设施 | 大规模性能受限 | ✅ 首选（Phase 8）  |
| EventStoreDB | 专业 ES 数据库         | 引入新依赖     | 🔲 备选（未来优化） |

### 3.2 读模型存储选型

| 选项       | 用途       | 决策            |
| ---------- | ---------- | --------------- |
| PostgreSQL | 事务型查询 | ✅ 保留现有     |
| ClickHouse | 分析型查询 | ✅ Phase 8 引入 |
| Redis      | 缓存层     | 🔲 后续优化     |

### 3.3 快照策略

- **触发条件**：事件数量 > 100 或 聚合版本 > 50
- **存储位置**：与事件存储同库（`snapshots` 表）
- **压缩**：使用 gzip 压缩快照数据

---

## 四、依赖关系图

```
Phase 7 (已完成)
    │
    ▼
┌─────────────────────────────────────────────────────────┐
│                     Phase 8                              │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  8.1 事件存储优化 (2 天)                                  │
│  ├── 8.1.1 接口设计 ─────────────────────────────────────┤
│  ├── 8.1.2 基类实现 ◄────────────────────────────────────┤
│  ├── 8.1.3 PostgreSQL 实现 ◄─────────────────────────────┤
│  └── 8.1.4 序列化器 ◄────────────────────────────────────┤
│                                                          │
│  8.2 分析投影实现 (3 天)                                  │
│  ├── 8.2.1 投影基类 ◄────────────────────────────────────┤
│  ├── 8.2.2 租户分析投影 ◄────────────────────────────────┤
│  ├── 8.2.3 数据源统计投影 ◄──────────────────────────────┤
│  └── 8.2.4 ClickHouse 适配器 ◄───────────────────────────┤
│                                                          │
│  8.3 实时数据同步 (1 天)                                  │
│  ├── 8.3.1 投影编排器 ◄──────────────────────────────────┤
│  └── 8.3.2 NestJS 集成 ◄─────────────────────────────────┤
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

## 五、风险管理

| 风险                | 影响 | 概率 | 缓解措施                   |
| ------------------- | ---- | ---- | -------------------------- |
| ClickHouse 学习曲线 | 中   | 中   | 提前技术调研，准备示例代码 |
| 事件重放性能        | 高   | 中   | 实现增量快照，并行处理     |
| 投影数据不一致      | 高   | 低   | 幂等处理，定期校验         |
| 实时同步延迟        | 中   | 低   | 异步队列，背压控制         |

---

## 六、验收检查清单

### 6.1 功能验收

- [x] 所有领域事件正确持久化到 Event Store
- [x] 事件流查询支持分页和过滤（EventFilter、EventLoadOptions）
- [x] 快照机制正常工作（ISnapshotStore + SQL 迁移脚本）
- [x] 租户分析投影正确处理所有事件
- [ ] 数据源统计投影数据准确（待实现）
- [ ] ClickHouse 存储和查询正常（待实现）
- [x] 投影编排器实时同步机制（ProjectionOrchestrator + NestJS 模块）
- [x] 投影重建机制正常（ProjectionBase.rebuild）

### 6.2 性能验收

- [ ] 事件追加吞吐量 > 1000 events/s
- [ ] 事件流查询响应时间 < 50ms（1 万条事件内）
- [ ] 分析查询响应时间 < 200ms（100 万条记录内）
- [ ] 投影更新延迟 < 100ms

### 6.3 质量验收

- [ ] 所有代码通过 Lint 检查
- [ ] 所有代码通过类型检查
- [ ] 单元测试覆盖率 > 80%
- [ ] 集成测试通过
- [ ] 完整的中文 TSDoc 注释

---

## 七、下一步行动

1. **立即执行**：任务 8.1.1（事件存储接口设计）
2. **并行准备**：ClickHouse 环境搭建
3. **文档更新**：更新架构文档中的事件溯源部分

---

## 八、变更历史

| 版本   | 日期       | 变更内容                                                                                                                                                                                                                                                                                                                                                                                               | 作者         |
| ------ | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------ |
| v1.0.0 | 2026-02-19 | 初始版本                                                                                                                                                                                                                                                                                                                                                                                               | AI Assistant |
| v1.1.0 | 2026-02-19 | **核心任务完成**：<br>1. ✅ 事件存储接口增强（IEventStore + loadAllEvents）<br>2. ✅ 事件过滤器接口（EventFilter、EventLoadOptions）<br>3. ✅ 快照接口（ISnapshotStore、AggregateSnapshot）<br>4. ✅ PostgreSQL 增强实现（PgEventStoreEnhanced，15 测试通过）<br>5. ✅ 投影基类（ProjectionBase，14 测试通过）<br>6. ✅ 投影编排器（ProjectionOrchestrator，21 测试通过）<br>7. ✅ 快照表 SQL 迁移脚本 | AI Assistant |
