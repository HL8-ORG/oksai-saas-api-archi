# 自研 CQRS 包技术方案（基于 `forks/cqrs`）

## 一、背景与动机

当前仓库已经按 `docs/ARCHITECTURE.md` 落地了以下关键能力：

- **Clean Architecture 分层**：Domain / Application / Infrastructure / Presentation
- **CQRS 最小分离**：写侧（CommandHandler + Repository）与读侧（ReadModel Port + 投影表查询）分离
- **ES + EDA 强约束**：EventStore、Outbox/Inbox、Projection、平台内 `IEventBus`
- **多租户强约束**：tenantId 必须来自 CLS（`@oksai/context`），禁止客户端透传覆盖

但在早期阶段，团队会逐步遇到“框架化不足”的问题：

- 用例（Use-case）组织方式容易出现分歧（手写 new handler / 手工注入依赖 / 不同目录规范）
- 横切能力（日志、指标、鉴权、幂等、输入校验、审计）容易在各个 handler 中分散
- 对“命令/查询的调度入口”缺少统一抽象，导致 Controller/Service 层重复样板代码

你的意图不是引入外部的 `@nestjs/cqrs`，而是**参照 `forks/cqrs` 自研并内建本项目强约束**，形成团队可复用的框架基础组件。

## 二、总体结论（可行性与必要性）

- **可行性：高**
    - `forks/cqrs` 已包含成熟的 CommandBus/QueryBus、decorators、ExplorerService、AsyncContext 等核心能力。
    - 与 Nest 11 / rxjs / reflect-metadata 的兼容性高，工程集成风险可控。
- **必要性：中等偏高（建议先做 Phase A）**
    - 早期“框架化”能显著提升团队一致性与迭代速度。
    - 但必须严格处理与现有 `@oksai/messaging + Outbox/Inbox` 的边界，避免两套 EventBus 语义冲突。

## 三、设计目标与非目标

### 3.1 目标（Goals）

- **G1：统一用例调度入口**
    - Controller/Facade 通过 `CommandBus.execute()` / `QueryBus.execute()` 调用用例。
    - Use-case 的注册/路由由框架完成（基于 decorators + Explorer）。

- **G2：内建“强约束”**
    - tenantId/userId/requestId 必须来自 CLS
    - 禁止把“进程内事件总线”当作“集成事件通道”
    - 用例级别的日志字段规范、错误语义（中文）、可观测性埋点

- **G3：逐步扩展横切能力**
    - 在不破坏现有业务闭环（EventStore/Outbox/Projection）的前提下，逐步引入用例 pipeline（验证/鉴权/幂等/审计）。

### 3.2 非目标（Non-goals）

- **NG1：不替代 Outbox/Inbox**
    - 自研 CQRS 解决的是“用例调度与组织”，不解决可靠投递与幂等消费。
- **NG2：不在早期引入 Saga/Domain Event 全量能力**
    - Phase A 不引入 Saga/EventBus，以降低复杂度与概念冲突。
- **NG3：不改变现有领域模型与持久化闭环**
    - 现有 `@oksai/event-store`、`@oksai/messaging(-postgres)`、`@oksai/database` 继续作为主线能力。

## 四、边界与强约束（最重要）

### 4.1 “用例调度”与“集成事件”严格分离

- **@oksai/cqrs（自研）只负责：**
    - Command/Query 的调度与 handler 注册
    - 用例横切 pipeline（后续）

- **@oksai/messaging（既有）只负责：**
    - 集成事件 Envelope（`IntegrationEventEnvelope`）
    - Outbox append / Inbox 去重
    - OutboxPublisher 可靠投递
    - IEventBus 作为“平台内事件通道”（订阅投影、订阅插件等）

**强约束：集成事件发布必须走 Outbox。禁止在 CQRS 包里提供可被误用的 Integration Event 发布 API。**

### 4.2 CLS 强约束贯穿 CQRS

用例调度层必须默认把 CLS 视作“权威上下文”：

- tenantId/userId/requestId 只读来自 CLS
- pipeline 中的鉴权/审计/日志不允许从 command payload 覆盖 tenantId

## 五、包结构与命名建议

建议在 monorepo 中新增一个 shared 包：

- 位置：`libs/shared/cqrs/`
- 包名：`@oksai/cqrs`
- 使用方式：由 `@oksai/app-kit` 平台装配模块按需装配并导出

> 原则：shared 能力只提供“通用框架能力”，不依赖具体 domains；若需要 domain 数据，必须通过端口/注入实现。

## 六、核心模块设计（Phase A：最小可行）

### 6.1 核心能力清单

Phase A 仅实现：

- `OksaiCqrsModule`（DynamicModule）
- `CommandBus` / `QueryBus`
- `@CommandHandler` / `@QueryHandler`（或等价装饰器）
- `ExplorerService`：自动扫描 handler providers 并注册到 bus
- 错误语义与日志字段：对 execute 流程进行最小包装（不侵入业务）

**明确不实现/不导出：**

- `EventBus` / `Saga` / `AggregateRootStorage`（避免与 messaging 冲突）

### 6.2 API 形态（建议）

#### 6.2.1 命令/查询的类型约束

建议把命令/查询定义为“纯数据结构”，避免引入过重的 class 体系：

- `type Command<TName extends string, TPayload extends object> = { type: TName; payload: TPayload }`
- 或保持现状：各 domain 自定义 `interface CreateTenantCommand { ... }`

> 重点在“调度入口与 handler 注册方式一致”，而不是强制 class。

#### 6.2.2 Handler 约定

每个用例一个 handler：

- `CreateTenantCommandHandler`：写侧用例
- `GetTenantQueryHandler`：读侧用例（如有复杂查询）

Controller/Facade 的调用方式统一为：

- `await commandBus.execute(command)`
- `await queryBus.execute(query)`

### 6.3 与 `@oksai/app-kit` 的集成

在 `OksaiPlatformModule.init()` 的装配能力矩阵中新增可选项：

- `cqrs?: SetupCqrsModuleOptions`

并导出：

- `CommandBus`
- `QueryBus`

这样各 app（platform-api/platform-admin-api）无需自行装配 CQRS。

## 七、用例横切能力（Phase B：pipeline）

Phase B 的目标是把“横切能力”框架化，避免散落在 handler 中。

建议引入 **UseCase Pipeline** 概念（类似中间件链）：

- 输入：`ExecutionContext`（含 CLS、command/query、requestId）
- 输出：`result`

可选内置管道（按需开启）：

- **Validation**：输入校验（class-validator 或 zod，按项目规范选择）
- **Authorization**：统一调用 `@oksai/authorization`（CASL）进行用例级鉴权
- **Idempotency**：对“命令”提供可选幂等键处理（注意：与 Inbox/Outbox 是不同层面的幂等）
- **Audit**：记录审计日志（包含 tenantId/userId/requestId/useCaseName）
- **Metrics/Tracing**：统计耗时、成功率、错误分类

> 强约束：pipeline 读取 CLS，但不得把 CLS 信息写回到 command payload（防止污染）。

## 八、Saga/Domain Event（Phase C：可选）

只有在确有需要时才引入：

- Saga：用于进程内流程编排（例如把多个 command 串联）
- Domain Event：用于领域内部通知（只在同进程，禁止当作集成事件）

关键约束：

- **集成事件仍必须走 Outbox/Inbox**（跨边界/跨服务）
- Domain Event 只用于“同 bounded context 内”的内部协调（且应避免滥用）

## 九、迁移策略（从模板与 Tenant 开始）

### 9.1 迁移原则

- 先做 **“不破坏现有闭环”** 的迁移：仅替换调度入口，不改变用例本身逻辑。
- 保持 handler 内依赖端口不变（Repo/Outbox/UoW/ReadModel）。

### 9.2 优先迁移对象

1. `tools/templates/bounded-context`：
    - 把 `ApplicationService` 内的 `new CommandHandler(...)` 改为注入 `CommandBus` 并 `execute()`
2. `libs/domains/tenant`：
    - 将 `CreateTenantCommandHandler` 通过 decorator 注册到 CQRS
    - `TenantApplicationService` 改为 `commandBus.execute(CreateTenantCommand)`

### 9.3 兼容期策略

兼容期允许：

- 部分 context 仍使用“手工 new handler”
- 新 context 使用 `@oksai/cqrs`

但应在文档中明确目标状态，并逐步统一。

## 十、测试策略与可观测性

### 10.1 单元测试

- CQRS 包本身需要覆盖：
    - handler 注册与路由
    - CLS 透传（若涉及）
    - pipeline 执行顺序（Phase B）

### 10.2 集成测试

- bounded context 的 E2E 测试保持不变：`create -> outbox publish -> projection visible`
- 新增用例调度的 E2E：验证 Controller → CommandBus → Handler 的链路

### 10.3 可观测性

- 统一在 pipeline 或 bus 层记录：
    - useCaseName、tenantId、userId、requestId、duration、status
- 错误消息必须中文（与项目宪章一致）

## 十一、风险清单与回滚方案

### 11.1 风险

- 框架内核维护成本增加（Nest/rxjs 升级适配）
- 边界不清导致 EventBus/Outbox 概念混用
- 过早引入 Saga 导致复杂度激增

### 11.2 回滚

Phase A 的回滚策略应简单：

- 业务 handler 保持“可直接 new 并调用 execute”的形式（兼容旧路径）
- CQRS 调度层只是“入口替换”，可在 app-kit 配置中关闭

## 十二、验收标准（建议）

- **A1**：`@oksai/cqrs` 可在 `platform-api` 中装配并工作（CommandBus/QueryBus）
- **A2**：bounded-context 模板迁移后仍可跑通 E2E（EventStore + Outbox + Projection）
- **A3**：在文档与代码层面明确并防止“绕过 Outbox 发布集成事件”
- **A4**：提供最小可用的用例日志字段（tenantId/userId/requestId/useCaseName）

---

> 备注：本文为技术方案，后续实施时应拆分为阶段性里程碑（Phase A/B/C）并在代码中以强约束注释与 fail-fast 校验落地。
