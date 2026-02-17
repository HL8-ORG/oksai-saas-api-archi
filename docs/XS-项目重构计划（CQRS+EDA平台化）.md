# 项目重构计划（CQRS + EDA 平台化）

> 本文为下一步开发的**引导性文件**，用于把现有代码逐步重构为“平台内核 + 可复制 bounded context 模板”的稳定形态。
>
> 方案依据：
> - `docs/XS-自研CQRS包技术方案（基于forks-cqrs）.md`
> - `docs/XS-自研EDA包技术方案（基于现有messaging-outbox-inbox）.md`

## 一、重构总目标（What）

在不破坏当前可运行闭环（EventStore/Outbox/Inbox/Projection/Auth/AuthZ）的前提下，完成两项平台化重构：

1. **自研 CQRS 包（@oksai/cqrs）**：框架化“命令/查询用例调度”，统一用例注册与调用入口。
2. **自研 EDA 包（@oksai/eda）**：框架化“集成事件可靠投递与幂等消费”，并将强约束（Outbox/Inbox/CLS）内建为默认行为。

最终产出：

- 平台装配层（`@oksai/app-kit`）只负责“能力矩阵装配”，不再承载 EDA 细节
- bounded context 模板（`tools/templates/bounded-context`）升级为“默认正确姿势”
- 现有业务上下文（至少 `tenant`、`identity`）迁移到框架化调用路径，但业务逻辑不重写

## 二、重构原则（How）

### 2.1 【强约束】不破坏既有一致性策略

- 集成事件发布必须走 Outbox（禁止绕过）
- 消费必须走 Inbox 幂等（messageId 去重）
- tenantId/userId/requestId 必须来自 CLS（禁止客户端透传覆盖）

### 2.2 渐进式重构（可回滚）

- 先做“门面化/装配收敛”（影响最小）
- 再做“模板与核心上下文迁移”（收益最大）
- 每一阶段都必须提供回滚开关（config 级别或装配级别）

### 2.3 边界清晰：CQRS ≠ EDA

- `@oksai/cqrs`：只做 Command/Query 调度（Use-case 入口）
- `@oksai/eda`：只做 Integration Event 的发布/投递/消费幂等（跨边界通信）
- 禁止两套 EventBus 概念混用（集成事件不使用 CQRS EventBus）

## 三、里程碑与阶段计划（Phases）

> 建议按周/双周节奏推进，每个阶段结束必须“可运行、可测试、可回滚”。

### Phase 0：基线冻结与验收清单（1-2 天）✅ 已完成

**目标**：确保重构期间有稳定基线可对照，避免“改着改着不知道坏没坏”。

**工作项**：

- 固化当前关键 E2E/集成测试清单（应至少包含）：
  - tenant：EventStore + Outbox + Projection E2E
  - admin：BetterAuth + CASL（依赖角色投影）E2E
- 明确环境约束与默认 env（test/dev）
- 为关键 strong constraints 补充“失败应报什么中文错误/日志字段”

**验收标准**：

- 基线测试全绿
- `docs/ARCHITECTURE.md` 与现状无明显偏差（仅校验，不强制修改）

**回滚**：无（仅准备阶段）。

---

### Phase 1：EDA 门面化（@oksai/eda）+ 装配收敛（3-5 天）✅ 已完成

**目标**：不改业务代码，先把 EDA 约束层从 app-kit 中“收敛”成可复用平台能力。

**工作项**：

- 新增 `libs/shared/eda`（`@oksai/eda`）：
  - 提供 `setupEdaModule()` 作为统一装配入口（transport=inproc，persistence=inMemory/postgres）
  - 迁移或封装 ContextAware 约束层：
    - ContextAwareOutbox（tenantId 来自 CLS，禁止覆盖）
    - ContextAwareEventBus（发布时补齐 CLS 元数据）
  - 明确对外导出的 tokens/ports（最小集合）
  - 编写中文 TSDoc，声明强约束与禁止事项
- 改造 `@oksai/app-kit`：
  - `OksaiPlatformModule.init()` 内部调用 `setupEdaModule()`，不再自己拼装 messaging overrides
  - 保持现有 tokens 不变（兼容 bounded contexts）

**验收标准**：

- `platform-api` / `platform-admin-api` 启动与现有 E2E 不回归
- 仍满足强约束：OutboxPublisher 必须拿到被覆盖后的 `OKSAI_OUTBOX_TOKEN`

**回滚策略**：

- `@oksai/app-kit` 保留旧装配路径的 feature flag（例如 `EDA_FACADE_ENABLED`），出现问题可切回旧路径

---

### Phase 2：EDA 订阅者框架化（减少样板）（3-5 天）✅ 已完成

**目标**：把“订阅 + inbox 幂等 + UoW 事务 + 可观测字段”标准化，降低漏用风险。

**工作项**：

- 在 `@oksai/eda` 中提供两类能力（先 A 后 B）：
  - A：`subscribeIntegrationEvent()` helper（内部强制 inbox 幂等与事务包装）
  - B：`@IntegrationEventHandler()` 装饰器 + Explorer（自动注册订阅者）
- 统一错误语义（中文）与日志字段：
  - `tenantId/userId/requestId/messageId/eventType/eventId`
- 选择 1-2 个订阅者迁移为示例（建议：TenantProjectionSubscriber、IdentityRoleProjectionSubscriber）

**验收标准**：

- 迁移后的订阅者不再手写 inbox+transaction 样板
- 重放/重复投递下仍幂等

**回滚策略**：

- helper/装饰器为“可选增强”，订阅者仍可退回旧写法

---

### Phase 3：CQRS Phase A（@oksai/cqrs 最小可行）（5-8 天）✅ 已完成（骨架）

**目标**：框架化“命令/查询调度”，统一用例入口，但不引入 EventBus/Saga。

**工作项**：

- 新增 `libs/shared/cqrs`（`@oksai/cqrs`）：
  - 参考 `forks/cqrs` 提取：CommandBus/QueryBus、decorators、ExplorerService
  - 明确不导出/不启用：EventBus/Saga（避免与 EDA 冲突）
  - 统一用例日志字段（从 CLS 读取）
  - 统一中文错误包装（最小）
- 在 `@oksai/app-kit` 增加 `cqrs` 能力装配选项并导出 CommandBus/QueryBus

**验收标准**：

- app 启用 cqrs 后可自动注册 handler
- 不影响现有 EDA/Outbox/Inbox 流程
- `@oksai/cqrs` 不提供可被误用的 integration event 发布入口

**回滚策略**：

- `@oksai/app-kit` 提供 `cqrs.enabled` 开关；关闭后业务仍可用“手工 handler”路径运行

---

### Phase 4：模板与核心上下文迁移（5-10 天）

**目标**：把 bounded context 模板升级为“默认正确姿势”，并迁移至少一个真实上下文验证收益。

**工作项**：

- 升级 `tools/templates/bounded-context`：
  - 用例调用：从 `new CommandHandler()` 迁移到 `commandBus.execute()`
  - 查询侧：按需引入 QueryHandler 或保持 ReadModel Port（明确约定）
  - 投影订阅：改用 `@oksai/eda` helper/装饰器（若 Phase 2 已完成）
- 迁移 `libs/domains/tenant`（建议优先）：
  - CreateTenant 走 CommandBus
  - 若存在复杂查询，再引入 QueryBus；否则保持 read model port
- 迁移 `libs/domains/identity`（其次）：
  - 注册/角色投影与授权链路确保不回归

**验收标准**：

- `tenant` 仍通过 E2E（EventStore + Outbox + Projection）
- 代码重复样板显著减少（对比迁移前后）
- 新增 context 可以通过模板快速落盘并跑通闭环

**回滚策略**：

- handler 保持可直接调用 `execute()`，允许兼容期双路径（bus 调度/手工调用）

---

### Phase 5：CQRS Phase B（pipeline 横切能力）（可选，按需）

**目标**：把鉴权/幂等/审计/指标等横切能力“用例化”，减少散落。

**工作项**：

- 在 `@oksai/cqrs` 引入用例 pipeline（中间件链）
- 与 `@oksai/authorization` 集成（用例级别 CASL）
- 幂等策略：仅针对“命令调度层幂等”，与 Inbox/Outbox 的幂等分层

**验收标准**：

- 横切能力不侵入业务 handler
- 错误语义与日志字段统一

---

### Phase 6：统一文档与规范（持续）

**目标**：让架构落地可持续，降低新人上手成本。

**工作项**：

- 在 `docs/ARCHITECTURE.md`：
  - 更新平台能力矩阵：新增 `@oksai/cqrs`、`@oksai/eda`
  - 强约束章节明确：集成事件只走 outbox，订阅只走 inbox
- 补充模板文档：
  - `docs/XS-bounded-context-模板使用与结构说明.md` 更新为最新实践

## 四、依赖关系图（简化）

- Phase 1（EDA 门面化）是后续一切“框架化订阅”与“统一装配”的基础
- Phase 3（CQRS Phase A）可以与 Phase 2 并行，但建议在 Phase 1 稳定后开始
- Phase 4（迁移模板/tenant）依赖 Phase 1 与 Phase 3 至少完成其一（优先完成 Phase 1）

## 五、风险与对策

- **R1：两套 EventBus 概念冲突**
  - **对策**：`@oksai/cqrs` Phase A 不引入 EventBus；`@oksai/eda` 作为集成事件唯一通道
- **R2：装配层复杂度上升**
  - **对策**：把复杂度向 `@oksai/eda`、`@oksai/cqrs` 内聚，`@oksai/app-kit` 只做能力矩阵装配
- **R3：迁移导致回归**
  - **对策**：每 Phase 结束必须跑基线 E2E；提供 feature flag 快速回滚

## 六、验收总清单（Definition of Done）

### 已完成（Phase 0-3）

- ✅ **Phase 0：基线冻结**
  - 创建 `docs/XS-重构基线验收清单（Phase0）.md`
  - 修复 `platform-admin-api` E2E 非确定性超时问题
  - 基线测试全绿（`apps/platform-api`、`apps/platform-admin-api`）

- ✅ **Phase 1：EDA 门面化**
  - 新增 `@oksai/eda` 包，提供 `setupEdaModule()` 统一装配入口
  - 实现 `ContextAwareOutbox`（强约束：tenantId 来自 CLS，禁止覆盖）
  - 实现 `ContextAwareEventBus`（发布时补齐 CLS 元数据）
  - `@oksai/app-kit` 支持 `EDA_FACADE_ENABLED` feature flag（默认关闭）

- ✅ **Phase 2：EDA 订阅者框架化**
  - 新增 `BaseIntegrationEventSubscriber` 基类，封装：
    - 订阅 + inbox 幂等 + UoW 事务 + 统一日志字段
  - 迁移 `TenantProjectionSubscriber`、`IdentityRoleProjectionSubscriber` 继承基类
  - 样板代码显著减少（移除 OnModuleInit/OnModuleDestroy、inbox 重复检查、事务包装等）

- ✅ **Phase 3：CQRS Phase A（骨架）**
  - 新增 `@oksai/cqrs` 包，提供：
    - `CommandBus` / `QueryBus`
    - `@CommandHandler(type)` / `@QueryHandler(type)` + 自动扫描注册
    - **明确不提供** EventBus/Saga（避免与 `@oksai/eda` 冲突）
  - `@oksai/app-kit` 增加 `cqrs?: { enabled?: boolean }` 预留装配入口（默认关闭）
  - **待完成**：尚未在真实上下文中落地使用（Phase 4）

### 待完成（Phase 4-6）

- 🚧 **Phase 4：模板与核心上下文迁移**
  - 升级 `tools/templates/bounded-context` 为 CQRS 调度路径
  - 迁移 `libs/domains/tenant` 的 `CreateTenantCommandHandler` 到 CommandBus 调度
  - 迁移 `libs/domains/identity` 相关用例（可选）

- ⏳ **Phase 5：CQRS Phase B（pipeline 横切能力）**（可选）
  - 用例级鉴权、幂等、审计、指标等横切能力

- ⏳ **Phase 6：统一文档与规范**
  - 更新 `docs/ARCHITECTURE.md` 反映平台化后的能力矩阵
  - 更新模板文档为最新实践

## 七、实施进度总览

| Phase | 名称 | 状态 | 完成时间 | 关键产出 |
|-------|------|------|----------|----------|
| Phase 0 | 基线冻结与验收清单 | ✅ 已完成 | 2026-02-18 | 基线文档、修复 admin E2E、测试全绿 |
| Phase 1 | EDA 门面化 + 装配收敛 | ✅ 已完成 | 2026-02-18 | `@oksai/eda` 包、feature flag 接入 |
| Phase 2 | EDA 订阅者框架化 | ✅ 已完成 | 2026-02-18 | `BaseIntegrationEventSubscriber`、迁移两个订阅者 |
| Phase 3 | CQRS Phase A（骨架） | ✅ 已完成 | 2026-02-18 | `@oksai/cqrs` 包、预留装配入口 |
| Phase 4 | 模板与核心上下文迁移 | 🚧 待开始 | - | - |
| Phase 5 | CQRS Phase B（pipeline） | ⏳ 可选 | - | - |
| Phase 6 | 统一文档与规范 | ⏳ 持续 | - | - |

**下一步建议**：进入 Phase 4，升级 `tools/templates/bounded-context` 并迁移 `libs/domains/tenant` 到 CQRS 调度路径。

### 强约束验收

- ✅ 集成事件发布必须走 Outbox（禁止绕过）
- ✅ 消费必须走 Inbox 幂等（messageId 去重）
- ✅ tenantId/userId/requestId 必须来自 CLS（禁止客户端透传覆盖）
- ✅ 中文错误语义与统一日志字段（tenantId/userId/requestId/messageId/eventType）

---

## 八、文档元信息

- **版本**：v1.1.0
- **最后更新**：2026-02-18
- **变更记录**：
  - v1.1.0 (2026-02-18): 完成 Phase 0-3，更新实施进度与验收清单
  - v1.0.0 (2026-02-17): 初始版本

