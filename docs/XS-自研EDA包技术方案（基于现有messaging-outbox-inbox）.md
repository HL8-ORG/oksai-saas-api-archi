# 自研 EDA 包技术方案（基于现有 `@oksai/messaging` / Outbox / Inbox）

## 一、背景

目前仓库中“事件驱动架构（EDA）”相关能力已经基本齐备，且落地了关键强约束：

- **集成事件标准化**：`IntegrationEventEnvelope`（包含 `messageId/eventType/occurredAt/schemaVersion/payload` + 上下文元数据）
- **可靠投递闭环**：Outbox（生产侧）+ Publisher（轮询投递）+ Inbox（消费侧幂等）
- **多租户强约束**：`tenantId/userId/requestId` 来自 CLS（`@oksai/context`），并由 ContextAware 包装/装配层强制
- **运行时形态**：当前 event bus 为同进程实现（InProc），可靠性边界在 PostgreSQL（event store/outbox/inbox/projection）

但现状存在“框架化不足”的问题：

- 能力分散在多个包中（`@oksai/messaging`、`@oksai/messaging-postgres`、`@oksai/app-kit` 的 ContextAware 包装与装配）
- 对外 API 仍偏“组件拼装”，应用侧需要理解较多细节（token、publisher 注册位置、何时使用 inbox/outbox）
- 难以对团队实施“强约束的默认正确姿势”（例如禁止绕过 outbox 发布集成事件）

因此需要把 EDA 能力**封装成一个自研包**，作为平台内核能力之一。

## 二、目标与非目标

### 2.1 目标（Goals）

- **G1：对外形成一个“平台级 EDA 能力包”**
    - 应用侧只需装配一个模块/能力矩阵即可启用 EDA
    - bounded context 按统一规范订阅/投影，减少重复样板

- **G2：把强约束内建为默认行为（Fail-fast + 不可绕过）**
    - 集成事件发布必须走 Outbox（禁止直接 publish 作为跨边界投递）
    - 消费必须走 Inbox（messageId 幂等）
    - tenantId/userId/requestId 必须来自 CLS，禁止客户端覆盖

- **G3：保持可替换性**
    - InProc -> MQ（Kafka/Rabbit/Redis Streams）替换时，业务代码尽量不变
    - Postgres 实现（PgOutbox/PgInbox）作为可插拔 adapter

### 2.2 非目标（Non-goals）

- **NG1：不替代 CQRS**
    - EDA 只关注“集成事件的发布与消费”，不处理命令/查询调度（该能力由未来 `@oksai/cqrs` 承担）
- **NG2：不改变已落地的一致性策略**
    - 仍坚持“写侧先落库（EventStore/Outbox）→ publisher 异步投递 → 消费侧 inbox 幂等 → 投影写入读模型”

## 三、包边界与命名建议

建议新增一个 shared 包作为“门面（Facade）+ 约束层（Constraints）”：

- 位置：`libs/shared/eda/`
- 包名：`@oksai/eda`
- 定位：**平台内核能力**（Platform Kernel Capability）

它可以采用两种组织策略（二选一）：

### 3.1 策略 A：门面包（推荐，迁移成本最低）

保留并继续维护现有组件包：

- `@oksai/messaging`：InProc event bus、Envelope、Outbox/Inbox 接口与默认实现、Publisher
- `@oksai/messaging-postgres`：PgOutbox/PgInbox
- `@oksai/app-kit`：平台装配

新增 `@oksai/eda` 作为门面层：

- 统一导出装配 API：`setupEdaModule()` / `setupEdaPostgresAdapter()` 等
- 内建 ContextAware 包装（迁移自 app-kit）
- 约束：对外只暴露“正确姿势”的入口，减少 token 直接暴露

### 3.2 策略 B：合并重组（长期更整洁，但迁移成本高）

将 `@oksai/messaging` / `@oksai/messaging-postgres` 的代码物理合并到 `@oksai/eda` 下，再按子模块分层：

- `@oksai/eda-core`（Envelope/Contracts）
- `@oksai/eda-transport-inproc`（InProc Bus）
- `@oksai/eda-outbox-inbox`（Ports + 默认实现）
- `@oksai/eda-adapter-postgres`（PgOutbox/PgInbox）

> 早期建议先采用策略 A，待 API 与边界稳定后再做策略 B。

## 四、现有能力盘点（当前仓库的事实）

### 4.1 `@oksai/messaging`

- `setupMessagingModule()`：提供 `OKSAI_EVENT_BUS_TOKEN/OKSAI_INBOX_TOKEN/OKSAI_OUTBOX_TOKEN` 默认 InMemory 实现（可用于闭环演示）
- `OutboxPublisherService`：轮询 outbox pending，publish 到 event bus，并 markPublished/markFailed
- `IntegrationEventEnvelope`：集成事件统一结构

### 4.2 `@oksai/messaging-postgres`

- `setupMessagingPostgresModule()`：提供 `PgOutbox/PgInbox` + MikroORM entities

### 4.3 `@oksai/app-kit`

- 平台装配 `OksaiPlatformModule`：
    - 用 `ContextAwareOutbox` 包装 outbox，禁止覆盖 tenantId，并注入 CLS 元数据
    - 用 `ContextAwareEventBus` 包装 event bus（发布时补齐 CLS 元数据）
    - 将 `OutboxPublisherService` 注册在装配层上下文中（强约束：确保注入的是覆盖后的 outbox）

> 这部分是自研 EDA 包最重要的“约束层”，应迁移到 `@oksai/eda`，避免 app-kit 承担过多 EDA 细节。

## 五、`@oksai/eda` 的对外 API 设计（建议）

### 5.1 装配入口：`setupEdaModule()`

目标：应用侧只需做一次装配即可启用 EDA。

建议 options（示例）：

- `transport`: `'inproc'`（未来扩展 `'kafka' | 'rabbitmq' | ...`）
- `persistence`: `'inMemory' | 'postgres'`
- `publisher`: `{ enabled?: boolean; intervalMs?: number }`
- `context`: `{ enforceTenantFromCls?: true }`

输出：

- 统一导出 tokens：`OKSAI_EVENT_BUS_TOKEN/OKSAI_OUTBOX_TOKEN/OKSAI_INBOX_TOKEN`
- 统一导出服务：`OutboxPublisherService`（或更名为 `IntegrationEventPublisherService`）

### 5.2 发布端 API：只暴露“Outbox append”

强约束：集成事件发布必须走 outbox。

对业务暴露：

- `IOutbox.append(envelope)`
- `createIntegrationEventEnvelope(eventType, payload, meta?)`

对业务**不暴露**（或文档强约束禁止）：

- 直接把 integration event publish 到 event bus 的方法（否则会绕过 outbox）

### 5.3 订阅端 API：统一约束“必须 Inbox 幂等 + UoW 事务”

建议提供两种方式（二选一或同时支持）：

- **方式 A（轻量）**：提供一个 helper 函数/基类
    - `subscribeIntegrationEvent(eventType, handler)`：内部自动做 inbox 幂等与事务包装
- **方式 B（框架化）**：提供装饰器与扫描器
    - `@IntegrationEventHandler('TenantCreated')` 标注订阅者
    - `EdaExplorerService` 在启动时自动注册所有订阅者

> 早期可从方式 A 起步，后续再演进到方式 B。

## 六、与 `@oksai/cqrs` 的边界

必须在文档与代码层面明确：

- **`@oksai/cqrs`**：Command/Query 调度（Use-case 入口）
- **`@oksai/eda`**：Integration Event 的可靠投递与幂等消费（跨边界通信）

强约束：

- `@oksai/cqrs` 不得提供 Integration EventBus（避免绕开 outbox）
- `@oksai/eda` 不处理命令/查询，不承担应用用例调度

## 七、分阶段实施路线（建议）

### Phase A：门面化与约束迁移（推荐先做）

目标：把“正确姿势”封装成 `@oksai/eda`，尽量不改业务代码。

- 新增 `@oksai/eda` 包
- 从 `@oksai/app-kit` 迁移：
    - `ContextAwareOutbox`
    - `ContextAwareEventBus`
    - Publisher 的强约束注册说明（可通过 `setupEdaModule` 内部完成）
- `@oksai/eda` 提供 `setupEdaModule()` 统一装配
- `@oksai/app-kit` 改为“只做平台装配”，调用 `setupEdaModule()` 而不是自己拼装 messaging 细节

验收标准：

- platform-api/platform-admin-api 启动不变
- 现有 E2E（tenant 端到端、authz）不回归

### Phase B：订阅者框架化（减少样板）

目标：把“订阅 + inbox 幂等 + 事务 + 错误语义”标准化，减少重复代码。

- 引入 `subscribeIntegrationEvent()` helper 或 `@IntegrationEventHandler` 装饰器
- 统一错误语义（中文）与可观测字段（tenantId/userId/requestId/eventId/messageId）

### Phase C：多 transport adapter（可选）

目标：提供 MQ 适配层，而不破坏业务用例代码。

- 定义 `IIntegrationEventTransport` 或 `IMessageSource` 类似抽象
- Kafka/Rabbit/Redis Streams 作为 adapter 实现（未来）

## 八、迁移策略与回滚

### 8.1 迁移策略

- 首先迁移 `app-kit` 的 EDA 装配细节到 `@oksai/eda`
- 保持 `@oksai/messaging`/`@oksai/messaging-postgres` 现有 API 稳定（Phase A 仅做门面）
- bounded context 模板逐步改为依赖 `@oksai/eda` 的装配与订阅 helper（Phase B）

### 8.2 回滚

- Phase A 的回滚应只需切回 `app-kit` 直接装配 messaging
- 业务侧依赖的 ports（Outbox/Inbox/Envelope）保持不变，确保可快速切换

## 九、验收标准（建议）

- **E1**：应用侧可通过单一装配入口启用 EDA（`setupEdaModule`）
- **E2**：集成事件发布强制走 Outbox（文档 + 代码约束）
- **E3**：消费端必须 Inbox 幂等（提供 helper/装饰器减少漏用）
- **E4**：可观测字段统一（tenantId/userId/requestId/messageId/eventType）
- **E5**：不与 CQRS 概念冲突（边界清晰、命名清晰）

---

> 备注：本方案遵循项目宪章的中文优先与强约束原则；落地时应在 `docs/ARCHITECTURE.md` 的能力矩阵与实施路线图中同步更新（如需）。
