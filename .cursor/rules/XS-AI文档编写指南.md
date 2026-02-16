---
description: XS-AI 文档编写指南
globs:
alwaysApply: true
---
# XS-AI 文档编写指南

## 概述

本文档旨在指导开发者（包括 AI）如何编写高质量的开发文档，通过 BDD（行为驱动开发）和 SDD（规范驱动开发）相结合的方式，确保需求清晰、技术规范明确、AI 生成代码精确可靠。

**目标**：

- 降低需求歧义：用 BDD（Given/When/Then）明确行为边界与验收标准
- 锁定技术实现：用 SDD（规范驱动）把数据结构、接口契约、错误语义、多租户隔离与事件一致性写清楚
- 约束 AI 产出：让 AI 在"明确上下文 + 明确约束 + 明确验收"的框架下生成一致、可维护的代码与测试

**适用范围**：

- 适用于本仓库所有新增/改造功能（apps 与 libs）
- 尤其适用于：多租户数据、异步事件、通知/邮件、权限、安全、账单等高风险模块

---

## 核心概念

### BDD：行为驱动开发

**定义**：BDD（Behavior-Driven Development）是一种帮助更好地描述需求和行为的开发方法。

**核心要素**：

- **User Story**：从用户视角描述需求
- **Given-When-Then**：用结构化语言描述系统行为
- **Acceptance Criteria**：验收标准

**在 AI 开发中的优势**：

- 提供明确的上下文（Context），帮助 AI 理解需求
- 用自然语言描述行为，符合 AI 的理解模式
- 强迫开发者用结构化方式描述需求，减少歧义

### SDD：规范驱动开发

**定义**：SDD（Specification-Driven Development）是一份详细的需求规范文件。

**核心内容**：

- 数据结构：实体、表、索引、唯一约束
- 接口契约：API、DTO、返回结构、错误码
- 事件契约：事件信封、版本化、幂等键
- 技术规范：代码风格、命名规则、测试标准
- 非功能需求：性能、安全性、可扩展性

**在 AI 开发中的优势**：

- 定义技术细节，减少 AI 的猜测
- 确保生成代码风格统一
- 规范化代码减少潜在错误

### User Story：用户故事

**公式**：

```
我是 <角色>，我想要 <动作>，以达到 <目的>。
```

**示例**：

```
我是一个在线购物的使用者，我想要能够将商品加入购物车，以便我可以在结账时一次购买多个商品。
```

**优势**：

- 聚焦用户视角，理解使用者需求
- 提供明确的业务场景
- 易于沟通和讨论

---

## 开发流程

### 标准 4 步流程

#### 1）写需求（BDD）——先把行为说清楚

**输出物**：在项目目录下的 `docs/XS-<主题>.md` 中增加 BDD 验收章节

**文档位置规则**：

遵循文档跟项目的原则，文档放在相应项目目录下的 `docs/` 目录中，与 `src/` 同级

**必须包含**：

- User Story（使用者故事）
- 关键场景的 Given/When/Then（至少覆盖：成功路径、权限/隔离失败、幂等/重复、异常/边界）

**建议包含**：

- 场景优先级（P0/P1/P2）
- 非功能要求（SLA、延迟、吞吐、可观测性）

#### 2）写规范（SDD）——把"怎么做"约束到可实现

**输出物**：在项目目录下的 `docs/XS-<主题>.md` 新增或更新（文件名使用 XS 前缀）

**文档位置规则**：

- 与需求文档（BDD）放在同一个文件中，按章节组织
- 同样遵循文档跟项目的原则，文档放在相应项目目录下的 `docs/` 目录中，与 `src/` 同级

**规范至少覆盖**：

- 业务边界：归属哪个域（libs/domains/\*），谁负责什么，不负责什么
- 数据结构：实体/表/索引/唯一约束（多租户字段必须体现）
- 接口契约：API、DTO、返回结构、错误码/错误消息（中文）
- 事件契约：事件信封、版本化、幂等键、Outbox/Inbox 映射
- 安全与合规：PII 最小化、脱敏、权限再校验、重放安全
- 可观测性：日志字段、指标、追踪、告警点
- 测试策略：单元/集成/端到端的边界与最低覆盖要求

#### 3）让 AI 实现——用结构化 Prompt 驱动

**最重要的原则**：永远不要只给一句"帮我做 X"。必须把"上下文 + 约束 + 验收"一起交给 AI。

**推荐 Prompt 结构**：

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

#### 4）代码落地与自检——提交前检查清单

**隔离与安全**：

- tenantId 是否来源可信？是否存在"客户端可覆盖"的入口？
- 事件/Outbox payload 是否包含不必要的 PII？
- 消费侧是否先校验 tenant 信封，再恢复 CLS 上下文？

**可靠性**：

- Outbox：失败重试、`nextRetryAt`、错误截断、状态流转是否闭环？
- Inbox：是否按 `eventId + consumerName` 去重？是否允许重放？

**一致性**：

- DTO/实体/迁移字段是否一致？
- 文档与实现是否一致？（XS 文档必须同步）

**可观测性**：

- 日志是否包含 `tenantId/eventId/eventName/requestId/correlationId` 等关键字段？
- 不记录敏感信息（正文/令牌/密钥等）

**测试**：

- P0 行为是否有对应测试用例？边界与异常是否覆盖？

---

## 文档模板

### BDD 需求模板

把需求写成"AI 可执行的行为清单"：

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

### SDD 规范模板

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

````

---

## 示例：完整的开发文档

### 示例 1：购物车功能

```markdown
## XS-购物车功能

### 1. 概述
- **背景**：电商平台需要提供购物车功能，让用户可以临时保存商品
- **目标**：实现商品加入购物车、查看购物车、移除商品等核心功能
- **非目标**：不包含优惠券、结算支付等功能

### 2. 术语
- **Cart**：购物车，保存用户选购的商品
- **CartItem**：购物车项目，包含商品和数量
- **Product**：商品，包含价格、库存等信息

### 3. 业务边界
- **所属域**：`libs/domains/shopping-cart`
- **上游**：商品服务、用户服务
- **下游**：订单服务、库存服务
- **不做什么**：不涉及支付、物流等后续流程

### 4. 关键约束
- **多租户隔离**：购物车数据必须按租户隔离，tenantId 来自服务端上下文
- **数据一致性**：购物车操作必须在事务内完成，保证库存和购物车数据一致
- **幂等性**：重复添加同一商品应更新数量，而不是创建新记录

### 5. 数据结构

#### Cart 实体
```typescript
interface Cart {
	id: string;
	tenantId: string;  // 租户 ID
	userId: string;     // 用户 ID
	items: CartItem[];
	totalAmount: number;
	createdAt: Date;
	updatedAt: Date;
}
````

#### CartItem 实体

```typescript
interface CartItem {
	id: string;
	cartId: string;
	productId: string;
	productName: string;
	quantity: number;
	price: number;
	addedAt: Date;
}
```

### 6. API 契约

#### POST /cart/items

**描述**：添加商品到购物车

**请求体**：

```typescript
interface AddToCartDto {
	productId: string;
	quantity: number;
}
```

**返回**：

```typescript
interface CartResponse {
	id: string;
	items: CartItem[];
	totalAmount: number;
}
```

**错误语义**：

- 400：商品数量必须大于 0
- 404：商品不存在
- 409：库存不足

### 7. BDD 验收

```gherkin
Feature: 购物车功能

  Background:
    Given 当前用户已登录
    And 当前请求上下文 tenantId="<t-001>"

  Scenario: 成功添加商品到购物车
    Given 商品 "P-001" 库存为 10
    When 用户添加 2 件商品 "P-001" 到购物车
    Then 购物车应包含商品 "P-001"
    And 商品数量应为 2
    And 总金额应正确计算

  Scenario: 重复添加同一商品
    Given 购物车已包含 2 件商品 "P-001"
    When 用户再次添加 1 件商品 "P-001" 到购物车
    Then 购物车应只包含 1 条商品 "P-001" 记录
    And 商品数量应为 3

  Scenario: 库存不足时拒绝添加
    Given 商品 "P-001" 库存为 5
    When 用户尝试添加 10 件商品 "P-001" 到购物车
    Then 系统应返回 409 错误
    And 错误消息应为 "库存不足"

  Scenario: 多租户隔离
    Given 租户 A 的购物车包含商品 "P-001"
    When 租户 B 查看购物车
    Then 租户 B 的购物车不应包含商品 "P-001"
```

````

### 示例 2：租户用户邀请（事件驱动）

```markdown
## XS-租户用户邀请功能

### 1. 概述
- **背景**：租户管理员需要邀请用户加入租户，协作完成业务
- **目标**：实现租户用户邀请功能，通过事件驱动完成通知发送
- **非目标**：不包含邀请链接生成、邀请码管理等功能

### 2. 术语
- **TenantMembership**：租户成员关系
- **Invitation**：邀请记录
- **Outbox**：事件发送箱
- **Inbox**：事件接收箱

### 3. 业务边界
- **所属域**：`libs/domains/iam/tenant`
- **上游**：用户服务、权限服务
- **下游**：通信服务（邮件、短信）
- **不做什么**：不处理邀请链接点击、邀请过期等

### 4. 关键约束
- **多租户隔离**：tenantId 必须来自服务端上下文，禁止客户端覆盖
- **事件可靠性**：使用 Outbox 模式，确保至少一次投递
- **幂等消费**：使用 Inbox 去重（`eventId + consumerName`）
- **安全合规**：事件 payload 不包含敏感信息（如密码、令牌）

### 5. 数据结构

#### TenantMembership 实体
```typescript
interface TenantMembership {
	id: string;
	tenantId: string;
	userId: string;
	status: 'PENDING' | 'ACTIVE' | 'INACTIVE';
	createdAt: Date;
}
````

### 6. API 契约

#### POST /tenant/invitations

**描述**：邀请用户加入当前租户

**请求体**：

```typescript
interface InviteUserDto {
	invitedUserId: string;
}
```

**返回**：

```typescript
interface InvitationResponse {
	membershipId: string;
	status: string;
}
```

### 7. 事件契约

#### TenantUserInvitedEvent

```typescript
interface TenantUserInvitedEvent {
	// 事件信封
	eventId: string;
	eventName: 'TenantUserInvited';
	version: '1.0.0';
	occurredAt: Date;
	correlationId?: string;

	// 租户信封（必须校验）
	tenantId: string;

	// 事件负载
	payload: {
		tenantId: string;
		invitedUserId: string;
		invitedByUserId: string;
	};
}
```

**Outbox/Inbox 映射**：

- **生产者**：`TenantService.inviteUser()` 在事务内写 Outbox
- **消费者**：`CommunicationOutboxWorker` 消费 Outbox 事件
- **幂等键**：`eventId + 'CommunicationOutboxWorker'`

### 8. 流程

**生产侧流程**：

1. 从 CLS 读取 tenantId（服务端上下文）
2. 在事务内：
    - 创建/更新 TenantMembership 记录
    - 写入 Outbox 事件（包含 tenantId）
3. 提交事务

**消费侧流程**：

1. 从队列获取 Outbox 事件
2. 校验事件信封（tenantId 必须匹配）
3. 使用 `eventId + consumerName` 检查 Inbox，确保幂等
4. 恢复 CLS 上下文（tenantId, userId 等）
5. 执行副作用（发送邮件/短信）
6. 更新 Inbox 状态

### 9. BDD 验收

```gherkin
Feature: 租户用户邀请

  Background:
    Given 当前用户已登录
    And 当前请求上下文 tenantId="<t-001>"
    And 当前用户具有邀请权限

  Scenario: 成功邀请用户
    When 用户邀请用户 "u-002" 加入租户
    Then 应创建租户成员关系
    And 状态应为 "PENDING"
    And 应写入 Outbox 事件
    And 事件应包含 tenantId="<t-001>"

  Scenario: 多租户隔离
    Given 租户 A 邀请用户 "u-002"
    When 租户 B 查看租户成员
    Then 租户 B 的成员列表不应包含用户 "u-002"

  Scenario: 事件消费幂等
    Given 已发送邀请事件 eventId="e-123"
    When Worker 收到 3 次相同的事件
    Then 只应发送 1 次通知邮件

  Scenario: 事件租户校验失败
    Given 事件 tenantId="<t-002>"
    And 当前 Worker 的租户上下文 tenantId="<t-001>"
    When Worker 处理该事件
    Then 应拒绝处理
    And 应记录安全告警
```

```

---

## 本仓库的"强制约束"

### 中文优先
- 所有代码注释、技术文档、错误消息、日志输出及用户界面文案**必须使用中文**
- Git 提交信息**必须使用英文描述**
- 代码变量命名**保持英文**，但必须配有中文注释说明业务语义

### 代码即文档
- 公共 API、类、方法、接口、枚举**必须编写完整 TSDoc 注释**
- TSDoc 必须覆盖：功能描述、业务规则、使用场景、前置条件、后置条件、异常抛出及注意事项
- 代码变更时**必须同步更新注释**，保持实现与文档一致

### 技术栈约束
- 全仓统一采用 Node.js + TypeScript
- 使用 pnpm 管理依赖并通过 monorepo 组织代码
- 服务端产物按 CJS 语义运行

### 多租户隔离
- 任何写库/查库/事件生产/事件消费必须绑定 `tenantId`
- `tenantId` 必须来自**可信服务端上下文**，禁止客户端透传覆盖

### 事件可靠性
- 跨模块/跨进程协作优先采用 **Outbox/Inbox + 至少一次投递 + 幂等消费**

---

## 常见工作项"落地清单"

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

## 结语：如何判断"文档足够好"

当你把需求与规范写到以下程度，就能显著提升 AI 与团队协作效率：

- **新同学只读 XS 文档即可理解**："做什么、为什么、怎么做、怎么验收"
- **AI 只读 XS 文档即可产出**：与仓库一致的代码结构、错误语义、测试位置与命名
- **发生线上问题时**：可以从"BDD 场景 → 事件/日志字段 → 数据结构/幂等键"快速定位根因

---

## 参考资料

- `docs/bdd-sdd/ai-coding-guide.md`：AI 辅助 Coding 的正确途径
- `docs/bdd-sdd/XS-多租户事件驱动机制.md`：事件驱动架构
- `docs/bdd-sdd/XS-消息与邮件通知技术方案.md`：消息通知
- `.cursor/docs/XS-模块系统与TypeScript配置策略.md`：模块系统与 TS 配置
- `docs/bdd-sdd/XS-MikroORM迁移与数据库连接（培训教程）.md`：MikroORM 迁移教程
```
