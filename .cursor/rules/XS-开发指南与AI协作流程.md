---
description: XS-开发指南与 AI 协作流程（BDD + SDD）
globs:
alwaysApply: true
---
## XS-开发指南与 AI 协作流程（BDD + SDD）

### 概述

本文档基于 `docs/bdd-sdd/ai-coding-guide.md` 的方法论，在本仓库（NestJS + TypeScript + pnpm monorepo + MikroORM + PostgreSQL + Redis + 多租户行级隔离 + EDA）约束下，给出一份**可执行**的开发文档与协作流程，用于：

- **降低需求歧义**：用 BDD（Given/When/Then）明确行为边界与验收标准。
- **锁定技术实现**：用 SDD（规范驱动）把数据结构、接口契约、错误语义、多租户隔离与事件一致性写清楚。
- **约束 AI 产出**：让 AI 在“明确上下文 + 明确约束 + 明确验收”的框架下生成一致、可维护的代码与测试。

### 适用范围

- 适用于本仓库所有新增/改造功能（apps 与 libs）。
- 尤其适用于：多租户数据、异步事件、通知/邮件、权限、安全、账单等高风险模块。

### 本仓库的“强制约束”（开发者必须遵守）

- **中文优先**：代码注释、技术文档、错误消息、日志输出必须为中文；变量/类型命名使用英文。
- **代码即文档**：公共 API、类、方法、接口、枚举必须补齐 TSDoc（中文），并在代码变更时同步更新。
- **技术栈不漂移**：Node.js + TypeScript；pnpm；monorepo；服务端产物按 CJS 语义运行。
- **多租户隔离**：任何写库/查库/事件生产/事件消费必须绑定 `tenantId`，并且 `tenantId` 必须来自**可信服务端上下文**，禁止客户端透传覆盖。
- **事件可靠性**：跨模块/跨进程协作优先采用 **Outbox/Inbox + 至少一次投递 + 幂等消费**。

> 相关规范文档（建议先读）：
>
> - `docs/bdd-sdd/XS-多租户事件驱动机制.md`
> - `docs/bdd-sdd/XS-消息与邮件通知技术方案.md`
> - `.cursor/docs/XS-模块系统与TypeScript配置策略.md`
> - `docs/bdd-sdd/XS-MikroORM迁移与数据库连接（培训教程）.md`

---

## 开发流程（推荐标准路径）

### 1) 写需求（BDD）——先把行为说清楚

输出物：在项目目录下的 `docs/XS-<主题>.md` 中增加 **BDD 验收**章节。

**文档位置规则**：

- 基础设施包（`libs/infrastructures/*`）：文档放在 `libs/<package-name>/docs/`
- 共享包（`libs/shared/*`）：文档放在 `libs/<package-name>/docs/`
- 领域包（`libs/domains/*`）：文档放在 `libs/<package-name>/docs/`
- 应用（`apps/*`）：文档放在 `apps/<app-name>/docs/`

- **必须包含**：
    - User Story（使用者故事）
    - 关键场景的 Given/When/Then（至少覆盖：成功路径、权限/隔离失败、幂等/重复、异常/边界）
- **建议包含**：
    - 场景优先级（P0/P1/P2）
    - 非功能要求（SLA、延迟、吞吐、可观测性）

### 2) 写规范（SDD）——把"怎么做"约束到可实现

输出物：在项目目录下的 `docs/XS-<主题>.md` 新增或更新规范章节（与 BDD 放在同一文件中）。

**文档位置规则**：

- 与需求文档（BDD）放在同一个文件中，按章节组织
- 同样遵循项目目录下的 `docs/` 放置规则

规范至少覆盖：

- **业务边界**：归属哪个域（`libs/domains/*`），谁负责什么，不负责什么。
- **数据结构**：实体/表/索引/唯一约束（多租户字段必须体现）。
- **接口契约**：API、DTO、返回结构、错误码/错误消息（中文）。
- **事件契约**：事件信封、版本化、幂等键、Outbox/Inbox 映射。
- **安全与合规**：PII 最小化、脱敏、权限再校验、重放安全。
- **可观测性**：日志字段、指标、追踪、告警点。
- **测试策略**：单元/集成/端到端的边界与最低覆盖要求。

### 3) 让 AI 实现——用结构化 Prompt 驱动

最重要的原则：**永远不要只给一句“帮我做 X”**。必须把“上下文 + 约束 + 验收”一起交给 AI。

推荐 Prompt 结构（复制即用）：

```markdown
请基于以下约束实现功能，并严格对齐仓库规范：

## Context（上下文）

- 项目：NestJS + TypeScript + MikroORM + PostgreSQL + pnpm monorepo
- 多租户：tenantId 只能来自服务端上下文（禁止客户端透传覆盖）
- 事件驱动：Outbox/Inbox（至少一次投递 + 幂等消费）

## Requirements（BDD）

### User Story

我是 <角色>，我想要 <动作>，以达到 <目的>。

### Acceptance Criteria（Gherkin）

Scenario 1: ...
Given ...
When ...
Then ...

Scenario 2: ...

## Specifications（SDD）

- 数据结构：...
- API 契约：...
- 事件契约：...
- 错误语义（中文）：...
- 可观测性：...
- 测试要求：单元测试与被测文件同目录，命名 {filename}.spec.ts

## Implementation Notes（落地提示）

- 需要修改/新增的文件路径建议：...
```

### 4) 代码落地与自检——提交前检查清单

- **隔离与安全**：
    - tenantId 是否来源可信？是否存在“客户端可覆盖”的入口？
    - 事件/Outbox payload 是否包含不必要的 PII？
    - 消费侧是否先校验 tenant 信封，再恢复 CLS 上下文？
- **可靠性**：
    - Outbox：失败重试、`nextRetryAt`、错误截断、状态流转是否闭环？
    - Inbox：是否按 `eventId + consumerName` 去重？是否允许重放？
- **一致性**：
    - DTO/实体/迁移字段是否一致？
    - 文档与实现是否一致？（XS 文档必须同步）
- **可观测性**：
    - 日志是否包含 `tenantId/eventId/eventName/requestId/correlationId` 等关键字段？
    - 不记录敏感信息（正文/令牌/密钥等）。
- **测试**：
    - P0 行为是否有对应测试用例？边界与异常是否覆盖？

---

## 文档模板：需求（BDD）

把需求写成“AI 可执行的行为清单”：

```gherkin
Feature: <模块/能力名称>

  Background:
    Given 当前请求上下文 tenantId="<t-001>"

  Scenario: 成功路径（P0）
    Given ...
    When ...
    Then ...

  Scenario: 多租户隔离失败（P0）
    Given 事件缺少 tenantId
    When 消费者进行信封校验
    Then 必须拒绝处理并记录安全告警

  Scenario: 重复投递幂等（P0）
    Given eventId="<e-123>" 的事件被重复投递 3 次
    When 消费者处理事件
    Then 副作用只发生一次
```

---

## 文档模板：规范（SDD / XS）

建议每个 XS 至少包含以下章节（可复制作为骨架）：

````markdown
## XS-<主题名称>

### 1. 概述

- 背景：
- 目标：
- 非目标：

### 2. 术语

### 3. 业务边界（职责划分）

- 所属域/模块：
- 上游/下游：
- 不做什么：

### 4. 关键约束（必须）

- 多租户隔离：
- 安全与合规：
- 可靠性与幂等：
- 可观测性：

### 5. 数据结构

- 表/实体：
- 字段与索引：
- 唯一约束：

### 6. API 契约（如有）

- 路径：
- DTO：
- 返回结构：
- 错误语义（中文）：

### 7. 事件契约（如有）

- 事件信封：
- 事件命名：
- 版本策略：
- Outbox/Inbox 映射：
- 幂等键：

### 8. 流程（文字 + 时序/伪代码）

### 9. 测试策略

- 单元测试：
- 集成测试：
- 端到端测试：

### 10. BDD 验收

```gherkin
...
```
````

```

---

## 常见工作项“落地清单”（按仓库实践）

### 新增一个领域能力（libs/domains/*）

- **新建包**：`libs/domains/<domain>`（若已存在则在其内新增模块/用例）
- **导出入口**：`src/index.ts` 暴露公共模块/服务
- **装配**：在对应 app 的 `AppModule` 中按条件装配（例如 `dbEnabled`）
- **TSDoc**：对外导出的公共 API 必须补齐中文 TSDoc
- **测试**：单元测试与被测文件同目录，`*.spec.ts`

### 新增 DB 迁移（MikroORM）

- **迁移统一放在**：`libs/infrastructures/db/src/lib/migrations/`
- **命名**：`MigrationYYYYMMDDHHmmss_<Meaning>.ts`
- **多租户字段**：tenantId 字段 + 索引/唯一约束按访问模式设计
- **回滚**：必须提供 `down()`

### 新增事件驱动副作用（Outbox/Inbox）

- **生产侧**：业务事务内写 Outbox（tenantId 必须来自 CLS/鉴权）
- **消费侧**：
	- 先校验 tenant 信封
	- 恢复 CLS 上下文
	- Inbox 去重（`eventId + consumerName`）
	- 再执行副作用，最后 ack/回写状态

---

## 结语：如何判断“文档足够好”

当你把需求与规范写到以下程度，就能显著提升 AI 与团队协作效率：

- 新同学只读 XS 文档即可理解“做什么、为什么、怎么做、怎么验收”。
- AI 只读 XS 文档即可产出与仓库一致的代码结构、错误语义、测试位置与命名。
- 发生线上问题时，可以从“BDD 场景 → 事件/日志字段 → 数据结构/幂等键”快速定位根因。
```
