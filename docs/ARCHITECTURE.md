# Oksai SaaS API 架构设计文档

## 概述

本项目采用**混合架构模式：Clean Architecture + CQRS + 事件溯源（Event Sourcing, ES）+ 事件驱动架构（Event-Driven Architecture, EDA）**。
本文档的目标是把这些模式落成**可执行的工程规范**（目录结构、依赖边界、事件与投影约束、多租户隔离约束等）。

补充说明（避免误解）：
- 本项目**不以 DDD 作为强制方法论**；仅在需要时借用 DDD 的部分概念（如：限界上下文、聚合、值对象、领域事件）来提升业务建模表达力。
- 当“DDD 建模建议”与“Clean/CQRS/ES/EDA 的工程约束”发生冲突时，以**工程约束**为准。

文档标识约定：
- **【强约束】**：必须遵守，用于设计评审与代码评审的硬性规则
- **【建议】**：推荐实践，可根据场景权衡取舍

---

## 一、架构愿景与目标

### 1.1 核心目标

- **业务价值驱动**：以领域模型为核心，确保业务逻辑的纯粹性和可维护性
- **技术解耦**：通过分层架构实现技术实现与业务逻辑的隔离
- **可扩展性**：支持横向扩展（模块化插件）和纵向扩展（服务拆分）
- **可观测性**：完整的事件追踪和审计能力
- **多租户隔离**：租户级的数据和上下文隔离

### 1.2 架构全景图

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         Presentation Layer                          │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐   │
│  │ Controllers  │    │  DTOs/Views │    │  Filters     │   │
│  └─────────────┘    └─────────────┘    └─────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
                              ↓ commands/queries
┌─────────────────────────────────────────────────────────────────────────────┐
│                        Application Layer                         │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐   │
│  │ Commands     │    │  Queries     │    │  Event Bus   │   │
│  │ Handlers     │    │  Handlers    │    │  Gateway     │   │
│  └─────────────┘    └─────────────┘    └─────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
                              ↓ uses
┌─────────────────────────────────────────────────────────────────────────────┐
│                         Domain Layer                             │
│  ┌─────────────────────────────────────────────────────────────┐     │
│  │                  Bounded Contexts                   │     │
│  │  ┌────────────┐ ┌────────────┐ ┌────────────┐ │     │
│  │  │  Aggregates │ │ Entities   │ │ Value Objs │ │     │
│  │  │  └────────────┘ └────────────┘ └────────────┘ │     │
│  │  ┌────────────┐ ┌────────────┐ ┌────────────┐ │     │
│  │  │ Repositories│ │ Domain Svc │ │ Events     │ │     │
│  │  └────────────┘ └────────────┘ └────────────┘ │     │
│  └─────────────────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────────────────────┘
                              ↓ implements
┌─────────────────────────────────────────────────────────────────────────────┐
│                      Infrastructure Layer                      │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐   │
│  │  Databases   │    │  Redis      │    │  Event Store │   │
│  │  Repositories│    │  Cache      │    │  Message Bus│   │
│  └─────────────┘    └─────────────┘    └─────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 二、领域建模参考（可选）

本章属于**【建议】**性质，主要用于统一团队的建模语言（限界上下文、聚合、值对象、领域事件）。
若与“六点五、落地约束（必须遵守）”等**【强约束】**冲突，以强约束为准。

### 2.1 核心原则

#### 2.1.1 战略设计（Strategic Design）

**限界上下文（Bounded Context）**

- 每个限界上下文对应一个独立的业务领域
- 上下文之间通过领域事件或 API 集成
- 避免共享模型，每个上下文拥有独立的领域模型

**限界上下文划分示例**

```
libs/domains/
├── tenant/              # 租户管理
├── user/                # 用户与认证
├── billing/             # 计费与订单
├── subscription/        # 订阅管理
├── notification/        # 通知服务
└── analytics/           # 数据分析
```

#### 2.1.2 战术设计（Tactical Design）

**领域模型层次**

```
Entity（实体）
  ├─ Aggregate Root（聚合根）
  └─ Value Object（值对象）

Domain Service（领域服务）
  └─ 无状态的业务逻辑

Repository Interface（仓储接口）
  └─ 定义在领域层，实现在基础设施层

Domain Event（领域事件）
  └─ 领域内发生的重要业务事件
```

### 2.2 聚合设计规则

**聚合根（Aggregate Root）**

- 聚合根是唯一的访问入口，外部只能通过聚合根操作聚合
- 聚合根保证聚合内部的不变性约束
- 所有变更必须通过聚合根的方法执行

**聚合示例**

```typescript
// tenant 限界上下文
class TenantAggregate {
	constructor(
		private readonly id: TenantId,
		private readonly name: TenantName,
		private settings: TenantSettings,
		private _members: TenantMember[]
	) {}

	addMember(member: TenantMember): DomainEvent[] {
		// 业务规则：不能超过最大成员数
		if (this._members.length >= this.settings.maxMembers) {
			throw new DomainException('超过租户成员上限');
		}

		this._members.push(member);
		return [new TenantMemberAddedEvent(this.id, member.id)];
	}

	changeSettings(newSettings: TenantSettings): DomainEvent[] {
		// 业务规则：只能由管理员修改
		// ...验证逻辑
		this.settings = newSettings;
		return [new TenantSettingsChangedEvent(this.id, newSettings)];
	}
}
```

### 2.3 值对象（Value Object）

- 不可变，通过值相等性比较
- 封装业务概念，避免原始类型（Primitive Obsession）

**值对象示例**

```typescript
class TenantId {
	constructor(private readonly value: string) {
		if (!value || value.trim().length === 0) {
			throw new DomainException('租户ID不能为空');
		}
		if (!/^TENANT_[A-Z0-9]{10}$/.test(value)) {
			throw new DomainException('租户ID格式错误');
		}
	}

	equals(other: TenantId): boolean {
		return this.value === other.value;
	}

	toString(): string {
		return this.value;
	}
}
```

### 2.4 领域事件

- 描述领域内发生的重要业务事件
- 事件命名使用过去式（`UserCreated`, `OrderPaid`）
- 包含事件发生时间、聚合 ID、事件类型、负载

**领域事件示例**

```typescript
class TenantCreatedEvent implements DomainEvent {
	readonly eventType = 'TenantCreated';
	readonly occurredAt = new Date();
	readonly aggregateId: TenantId;
	readonly eventData: {
		name: string;
		adminId: string;
		initialPlan: string;
	};

	constructor(aggregateId: TenantId, eventData: TenantCreatedEvent['eventData']) {
		this.aggregateId = aggregateId;
		this.eventData = eventData;
	}
}
```

---

## 三、整洁架构（Clean Architecture）

### 3.1 【强约束】依赖规则

**依赖方向：外层依赖内层**

```
Presentation (API) ───────► Application ───────► Domain
Infrastructure     ───────► Application ───────► Domain

说明：
- 内层（Domain）不依赖外层（Application/Infrastructure/Presentation）
- Application 依赖 Domain 的抽象与模型（用例编排、端口接口）
- Infrastructure/Presentation 作为适配器层，只能依赖 Application/Domain，不能反向被依赖
```

**依赖反转（DIP）**

- 高层模块定义抽象接口（Repository、Domain Service）
- 低层模块实现接口
- 通过依赖注入实现解耦

### 3.2 分层职责

#### 3.2.1 表现层（Presentation Layer）

**职责**

- 接收 HTTP 请求
- 参数验证（DTO）
- 调用应用层
- 返回响应

**约束**

- 不包含业务逻辑
- 使用 DTO 隔离外部模型
- 全局异常处理和响应格式化

**目录结构**

```
apps/demo-api/src/
├── presentation/
│   ├── controllers/      # 控制器
│   ├── dto/             # 数据传输对象
│   ├── guards/           # 守卫
│   └── filters/          # 过滤器
```

#### 3.2.2 应用层（Application Layer）

**职责**

- 编排用例（Use Case）
- 协调聚合之间的交互
- 处理事务边界
- 发布领域事件

**约束**

- 不包含业务规则（委托给领域层）
- 不包含技术细节（委托给基础设施层）
- 薄层（Orchestrator），无状态

**命令处理器示例**

```typescript
@CommandHandler(CreateTenantCommand)
export class CreateTenantHandler implements ICommandHandler<CreateTenantCommand, TenantCreatedEvent> {
	constructor(
		private readonly tenantRepo: ITenantRepository,
		private readonly eventBus: IEventBus
	) {}

	async execute(command: CreateTenantCommand): Promise<TenantCreatedEvent> {
		// 验证（委托给领域）
		const tenantId = new TenantId(generateId());

		// 创建聚合
		const tenant = TenantAggregate.create(tenantId, command.name, command.settings);

		// 持久化
		await this.tenantRepo.save(tenant);

		// 发布事件
		const event = new TenantCreatedEvent(tenant.id, {
			name: tenant.name,
			adminId: command.adminId
		});
		await this.eventBus.publish(event);

		return event;
	}
}
```

#### 3.2.3 领域层（Domain Layer）

**职责**

- 定义业务规则和不变性
- 实现领域逻辑
- 定义仓储接口

**约束**

- 不依赖任何外部框架（NestJS、TypeORM 等）
- 纯粹的业务逻辑
- 可独立测试

**目录结构**

```
libs/domains/tenant/src/
├── domain/
│   ├── aggregates/        # 聚合根
│   ├── entities/          # 实体
│   ├── value-objects/     # 值对象
│   ├── services/          # 领域服务
│   ├── events/            # 领域事件
│   └── exceptions/        # 领域异常
├── application/
│   ├── commands/          # 命令定义
│   ├── queries/           # 查询定义
│   ├── handlers/          # 命令/查询处理器
│   └── ports/            # 应用层端口（仓储接口等）
└── infrastructure/
    ├── persistence/      # 持久化实现
    ├── messaging/        # 消息发布
    └── cache/           # 缓存实现
```

#### 3.2.4 基础设施层（Infrastructure Layer）

**职责**

- 实现仓储接口
- 与外部系统集成（数据库、Redis、消息队列）
- 技术细节封装

**约束**

- 通过接口与领域层交互
- 可替换实现
- 包含技术配置

---

## 四、事件驱动架构（EDA）

### 4.1 事件总线（Event Bus）

**职责**

- 发布和订阅领域事件
- 解耦事件生产者和消费者
- 支持跨服务通信

**事件总线接口**

```typescript
interface IEventBus {
	publish<T extends DomainEvent>(event: T): Promise<void>;
	subscribe<T extends DomainEvent>(eventType: string, handler: (event: T) => Promise<void>): Promise<Disposable>;
}
```

### 4.2 事件处理器（Event Handler）

**职责**

- 响应领域事件
- 执行副作用（发送通知、更新投影）
- 不修改原始聚合

**事件处理器示例**

```typescript
@EventHandler(TenantCreatedEvent)
export class SendWelcomeEmailHandler implements IEventHandler<TenantCreatedEvent> {
	constructor(private readonly emailService: EmailService) {}

	async handle(event: TenantCreatedEvent): Promise<void> {
		await this.emailService.sendWelcomeEmail(event.eventData.adminId, event.eventData.name);
	}
}
```

### 4.3 事件传播

**事件传播规则**

- 同步事件：同一服务内的事件处理（强一致性）
- 异步事件：跨服务的事件处理（最终一致性）
- 事件重试：处理失败事件

---

## 五、事件溯源（Event Sourcing）

### 5.1 核心概念

**事件流（Event Stream）**

- 每个聚合对应一个事件流
- 事件按时间顺序存储
- 可从事件流重建聚合状态

### 5.2 事件存储（Event Store）

**职责**

- 持久化领域事件
- 支持按聚合 ID 查询事件
- 支持快照（Snapshot）

**事件存储接口**

```typescript
interface IEventStore {
	appendEvents<T extends AggregateRoot>(
		aggregateId: string,
		expectedVersion: number,
		events: DomainEvent[]
	): Promise<void>;

	getEvents<T extends AggregateRoot>(aggregateId: string): Promise<DomainEvent[]>;

	getEventsFromVersion<T extends AggregateRoot>(aggregateId: string, fromVersion: number): Promise<DomainEvent[]>;
}
```

### 5.3 聚合重建

**用途**

- 从事件流重建聚合状态
- 支持时态查询（Time Travel）
- 事件版本控制

**聚合仓库实现**

```typescript
class EventSourcedTenantRepository implements ITenantRepository {
	constructor(
		private readonly eventStore: IEventStore,
		private readonly snapshotStore: ISnapshotStore
	) {}

	async findById(id: TenantId): Promise<TenantAggregate> {
		// 1. 尝试从快照加载
		const snapshot = await this.snapshotStore.getLatest(id);
		let state = snapshot?.state ?? TenantAggregate.createEmpty();
		let fromVersion = snapshot?.version ?? 0;

		// 2. 从快照版本加载事件
		const events = await this.eventStore.getEventsFromVersion(id, fromVersion);

		// 3. 重放事件
		for (const event of events) {
			state = state.apply(event);
		}

		return state;
	}

	async save(aggregate: TenantAggregate): Promise<void> {
		const newEvents = aggregate.getUncommittedEvents();

		// 追加事件到事件存储
		await this.eventStore.appendEvents(aggregate.id.value, aggregate.version, newEvents);

		// 清除未提交事件
		aggregate.commitEvents();
	}
}
```

### 5.4 快照（Snapshot）

**快照策略**

- 每 N 个事件创建一个快照
- 大聚合必须快照
- 快照包含聚合状态和版本号

---

## 六、CQRS（命令查询职责分离）

### 6.1 核心原则

**命令（Command）**

- 改变系统状态
- 返回事件或结果
- 一次只能操作一个聚合

**查询（Query）**

- 读取系统状态
- 不改变状态
- 可优化读取路径

### 6.2 命令端（Command Side）

**职责**

- 处理写入操作
- 验证业务规则
- 发布领域事件

**命令示例**

```typescript
class CreateTenantCommand implements ICommand {
	readonly type = 'CreateTenant';
	readonly aggregateId?: string;
	readonly data: {
		name: string;
		adminId: string;
		settings: TenantSettings;
	};
}
```

### 6.3 查询端（Query Side）

**职责**

- 处理读取操作
- 使用投影（Projection）优化查询
- 可使用最终一致性读取

**投影（Projection）**

- 领域事件的转换视图
- 优化读模型
- 支持多投影同一事件流

**投影示例**

```typescript
@Projection(TenantCreatedEvent, TenantSettingsChangedEvent)
class TenantListProjection {
	constructor(private readonly readModel: ITenantReadModel) {}

	async handle(event: DomainEvent): Promise<void> {
		if (event instanceof TenantCreatedEvent) {
			await this.readModel.create({
				id: event.aggregateId.value,
				name: event.eventData.name,
				createdAt: event.occurredAt
			});
		}

		if (event instanceof TenantSettingsChangedEvent) {
			await this.readModel.updateSettings(event.aggregateId.value, event.eventData.newSettings);
		}
	}
}
```

### 6.4 查询处理器（Query Handler）

**查询示例**

```typescript
@QueryHandler(GetTenantListQuery)
export class GetTenantListHandler implements IQueryHandler<GetTenantListQuery, TenantDto[]> {
	constructor(private readonly readModel: ITenantReadModel) {}

	async execute(query: GetTenantListQuery): Promise<TenantDto[]> {
		return this.readModel.findByUserId(query.userId);
	}
}
```

---

## 六点五、落地约束（必须遵守）

本节把 ES/CQRS/EDA 的“概念”落成**项目级强约束**，用于设计评审与代码评审。

### 6.5.1 【强约束】领域事件（Domain Event）规范

- **事件不可变**：事件一旦发布/持久化，不允许修改；修正只能通过发布“新事件”表达。
- **事件必须自描述**：每个事件必须包含：
  - `eventType`：稳定的字符串（禁止随意改名）
  - `occurredAt`：事件发生时间
  - `aggregateId`：聚合标识
  - `eventData`：业务负载（禁止塞入技术对象/ORM 实体）
- **事件版本**：必须支持 schema 演进：
  - 事件负载应包含 `schemaVersion`（或通过 `eventType@vN` 体现版本）
  - 新版本通过“向前兼容”方式扩展字段（尽量只新增字段，避免删除/重命名）
- **幂等键**：跨进程/跨服务消费必须可幂等（建议字段：`eventId`/`messageId` + `aggregateId` + `version`）。

### 6.5.2 【强约束】事件存储（Event Store）与并发控制

- **单聚合事件流**：一个聚合对应一个事件流（append-only）。
- **乐观并发**：写入事件必须带 `expectedVersion`，不匹配则失败（禁止 silent overwrite）。
- **顺序性**：同一聚合内事件必须保持严格顺序（version 单调递增）。

### 6.5.3 【强约束】发布一致性（Outbox/Inbox）

为避免“事件已入库但消息未发布 / 消息发布但事件未入库”的不一致，必须采用一致性方案之一：

- **推荐：Outbox 模式**（同一数据库事务内落事件 + 落 outbox 记录；后台 publisher 轮询/订阅发布到消息总线）
- **跨服务消费：Inbox/去重表**（消费端以 `messageId` 去重，保证至少一次投递下的幂等）

> 说明：在 Outbox/Inbox 未实现前，跨服务事件一律标记为“最终一致性（不保证实时）”，并在用例层写明补偿策略。

### 6.5.4 【强约束】投影（Projection）与读模型重建

- **投影只做读优化**：投影处理器禁止修改原聚合；只能更新读模型/缓存/搜索索引等。
- **可重放**：所有投影必须支持从事件流重建（replay）：
  - 读模型需要记录 `lastProcessedEventId` 或 `(aggregateId, version)` 水位
  - 支持“重置投影”并从 0 重新追赶
- **一致性声明**：每个查询必须标注读取一致性级别（强一致/最终一致）与允许的延迟窗口。

### 6.5.5 【强约束】重试、死信与可观测性

- **重试策略**：异步处理失败必须重试（指数退避 + 最大次数），超过阈值进入死信/待处理队列。
- **可观测性字段**：日志/事件/消息必须携带：
  - `requestId`（或 traceId）
  - `tenantId`
  - `userId`（如可得）

### 6.5.6 【强约束】多租户隔离

- **上下文来源**：`tenantId` 必须从入口层（HTTP/Gateway）进入上下文（如 CLS），并贯穿应用层与基础设施层。
- **数据访问隔离**：所有仓储/读模型查询必须强制带 `tenantId` 过滤；禁止默认“全局”查询。
- **审计**：跨租户访问尝试必须记录安全日志（至少包含 requestId、tenantId、目标资源、操作者）。

---

## 七、【强约束】代码组织规范

### 7.1 Monorepo 结构

```
oksai-saas-api-archi/
├── apps/
│   └── demo-api/                          # 表现层入口（HTTP/Fastify）
│       ├── src/
│       │   ├── main.ts                    # 启动、全局管道/拦截器/过滤器装配
│       │   ├── app.module.ts              # 组合各 bounded context 的 module
│       │   ├── presentation/              # 【强约束】表现层（不含业务逻辑）
│       │   │   ├── controllers/
│       │   │   ├── dto/
│       │   │   ├── guards/
│       │   │   └── filters/
│       │   └── bootstrap/                 # 【建议】装配/初始化（如 swagger、health）
│       └── package.json
│
├── libs/
│   ├── shared/                             # 基础设施横切能力（可复用）
│   │   ├── logger/                         # @oksai/logger：结构化日志
│   │   ├── config/                         # @oksai/config：配置加载与校验
│   │   ├── exceptions/                     # @oksai/exceptions：统一异常/错误码
│   │   ├── context/                        # @oksai/context：CLS(tenantId/requestId/userId)
│   │   ├── messaging/                      # @oksai/messaging：事件总线/Outbox(规划/开发中)
│   │   ├── redis/                          # @oksai/redis：缓存/分布式锁
│   │   └── i18n/                           # @oksai/i18n：国际化
│   │
│   └── domains/                            # 业务域（每个 context 可独立演进/拆服务）
│       ├── tenant/                         # bounded context 示例
│       │   ├── src/
│       │   │   ├── index.ts                # 公共导出
│       │   │   ├── domain/                 # 领域层（纯业务，不依赖 Nest/ORM）
│       │   │   ├── application/            # 应用层（用例编排、事务边界、端口）
│       │   │   ├── infrastructure/         # 适配器实现（DB/EventStore/Outbox/Projection）
│       │   │   └── presentation/           # 【可选】该 context 的 controller/DTO（如想内聚）
│       │   ├── package.json
│       │   └── tsconfig.json
│       └── user/ ... billing/ ...
├── pnpm-workspace.yaml
├── turbo.json
└── package.json
```

### 7.1.1 【强约束】快速对齐规则

- **依赖方向**：`apps` / `libs/**/infrastructure` 只能依赖 `application/domain`；`domain` 不依赖任何框架实现。
- **按上下文切分**：每个 `libs/domains/<context>` 必须可独立演进（未来可拆微服务）。
- **横切能力沉淀**：日志/配置/上下文/异常/消息等统一放在 `libs/shared/*`，禁止在各上下文重复造轮子与口径。

### 7.2 命名约定

**目录命名**

- 限界上下文：`libs/domains/<context-name>/`
- 聚合根：`<Name>Aggregate`
- 值对象：`<Name>ValueObject`
- 命令：`<Verb><Noun>Command`
- 查询：`Get<PluralNoun>Query`
- 事件：`<Noun><PastVerb>Event`

**文件命名**

- 实现文件：`*.ts`
- 测试文件：`*.spec.ts`
- 接口文件：`*.interface.ts` 或 `*.types.ts`

### 7.3 包结构

**领域包结构**

```
libs/domains/<context>/
├── src/
│   ├── index.ts                          # 公共导出
│   ├── domain/                           # 领域层
│   │   ├── index.ts
│   │   ├── aggregates/
│   │   ├── entities/
│   │   ├── value-objects/
│   │   ├── services/
│   │   ├── events/
│   │   │   └── *.event.ts
│   │   └── exceptions/
│   ├── application/                      # 应用层
│   │   ├── index.ts
│   │   ├── commands/
│   │   │   └── *.command.ts
│   │   ├── queries/
│   │   │   └── *.query.ts
│   │   ├── handlers/
│   │   │   ├── *.command.handler.ts
│   │   │   └── *.query.handler.ts
│   │   └── ports/
│   │       └── *.repository.interface.ts
│   ├── infrastructure/                    # 基础设施层
│   │   ├── index.ts
│   │   ├── persistence/
│   │   │   ├── repositories/
│   │   │   └── event-store/
│   │   ├── messaging/
│   │   │   └── handlers/
│   │   └── cache/
│   └── presentation/                    # 表现层（可选）
│       └── controllers/
├── package.json
├── tsconfig.json
└── README.md
```

---

## 八、开发规范和约束

### 8.1 【强约束】依赖规则

**禁止的依赖**

- ❌ 领域层依赖 NestJS 框架
- ❌ 领域层依赖基础设施层
- ❌ 应用层直接访问数据库
- ❌ 控制器直接调用领域服务

**允许的依赖**

- ✅ 领域层定义仓储接口
- ✅ 基础设施层实现领域接口
- ✅ 应用层使用领域模型
- ✅ 所有层使用值对象

### 8.2 【强约束】测试策略

**测试金字塔**

```
        /\
       /  \
      /    \   E2E Tests（少量）
     /      \
    /        \   Integration Tests（适量）
   /          \
  /            \ Unit Tests（大量）
```

**单元测试**

- 测试独立的业务逻辑
- Mock 所有外部依赖
- 测试覆盖率 ≥ 80%

**集成测试**

- 测试仓储实现
- 测试事件总线
- 测试消息发布/订阅

### 8.3 【强约束】错误处理

**错误层次**

```
DomainException（领域异常）
  ├─ 业务规则违反
  └─ 领域不变性破坏

AppException（应用异常）
  ├─ 用例执行失败
  └─ 编排错误

InfrastructureException（基础设施异常）
  ├─ 数据库错误
  ├─ 消息队列错误
  └─ 外部服务错误
```

---

## 九、最佳实践

### 9.1 聚合设计

- **单一聚合根**：每个聚合只有一个聚合根
- **不变性封装**：聚合内部的不变性由聚合根保证
- **事务边界**：聚合即事务边界

### 9.2 事件设计

- **不可变性**：事件创建后不可修改
- **自描述**：事件包含所有必要信息
- **业务意义**：事件名反映业务语义

### 9.3 读写优化

- **写操作**：使用事件溯源保证审计和可追溯性
- **读操作**：使用投影优化查询性能
- **最终一致性**：读写分离，接受短暂的不一致

### 9.4 多租户隔离

- **上下文传递**：通过 CLS 传递租户上下文
- **数据隔离**：每个租户独立的数据空间
- **租户守卫**：确保租户上下文存在

---

## 十、技术选型

### 10.1 框架和库

- **Web 框架**：NestJS + Fastify
- **语言**：TypeScript
- **ORM**：MikroORM（支持事件溯源）
- **数据库**：PostgreSQL（主库）+ Redis（缓存）
- **消息队列**：Redis Streams / RabbitMQ（待定）
- **事件存储**：PostgreSQL 事件表

### 10.2 基础设施包

- `@oksai/config`：配置管理
- `@oksai/logger`：结构化日志
- `@oksai/exceptions`：统一异常
- `@oksai/i18n`：国际化
- `@oksai/context`：请求上下文
- `@oksai/redis`：Redis 客户端和分布式锁
- `@oksai/messaging`：事件总线（待开发）

---

## 十一、实施路线图

### 阶段一：基础设施搭建 ✅

- [x] 配置管理
- [x] 日志服务
- [x] 异常处理
- [x] 国际化
- [x] 请求上下文
- [x] Redis 客户端

### 阶段二：领域建模（进行中）

- [ ] 核心限界上下文识别
- [ ] 聚合设计
- [ ] 值对象设计
- [ ] 领域事件定义

### 阶段三：应用层开发（待开始）

- [ ] 命令处理器
- [ ] 查询处理器
- [ ] 用例定义

### 阶段四：基础设施实现（待开始）

- [ ] 仓储实现
- [ ] 事件存储实现
- [ ] 投影实现
- [ ] 事件总线实现

### 阶段五：表现层开发（待开始）

- [ ] REST API 控制器
- [ ] GraphQL Resolver（可选）
- [ ] WebSocket Gateway（可选）

---

## 十二、参考资源

### 书籍

- 《Domain-Driven Design》- Eric Evans
- 《Implementing Domain-Driven Design》- Vaughn Vernon
- 《Clean Architecture》- Robert C. Martin
- 《Building Event-Driven Microservices》- Adam Bellemare

### 文章

- Martin Fowler - Event Sourcing
- Microsoft - CQRS Pattern
- Microsoft - Event Sourcing and CQRS
- Event Store - Documentation

---

## 附录：术语表

| 术语       | 英文                                     | 定义                             |
| ---------- | ---------------------------------------- | -------------------------------- |
| 限界上下文 | Bounded Context                          | 领域模型的边界，内部有一致的语言 |
| 聚合       | Aggregate                                | 一致性边界，由聚合根控制访问     |
| 聚合根     | Aggregate Root                           | 聚合的唯一入口，保证不变性       |
| 值对象     | Value Object                             | 不可变的业务概念，按值比较       |
| 领域事件   | Domain Event                             | 领域内发生的业务事件             |
| 事件溯源   | Event Sourcing                           | 通过事件流重建聚合状态           |
| 投影       | Projection                               | 事件流的优化读取视图             |
| CQRS       | Command Query Responsibility Segregation | 命令和查询分离                   |

---

**文档版本**: v1.0.4  
**最后更新**: 2026-02-17  
**维护者**: Oksai Team
