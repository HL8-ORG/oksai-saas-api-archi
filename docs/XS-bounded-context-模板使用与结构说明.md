# bounded context 可复制模板：使用与结构说明

> 适用路径：`tools/templates/bounded-context/`
>
> 本文用于解释模板的**使用方式**与**目录结构含义**，帮助你在本仓库的强约束（Clean Architecture + CQRS + ES + EDA + 多租户）下快速创建新的 `libs/domains/<context>/` 包。
>
> **最新更新（2026-02-18）**：模板已迁移到 CQRS 调度路径（`@oksai/cqrs`），用例通过 `CommandBus.execute()` 调用。

## 一、模板解决什么问题

该模板提供一个“最小可运行闭环”，用于把一个新的业务上下文（bounded context）快速落盘到 monorepo：

- **写侧（Command）**：聚合根记录领域事件 → EventStore 持久化 → Outbox 追加集成事件 Envelope
- **投影（Projection）**：消费集成事件（EventBus）→ Inbox 幂等 → 写入 Read Model（投影表）
- **读侧（Query）**：通过 ReadModel Port 查询投影表（按 tenantId 过滤）
- **装配（Nest Module）**：把应用层端口绑定到基础设施实现，提供 inMemory / eventStore 两种模式
- **端到端集成测试模板**：验证 `create -> outbox publish -> projection visible`

## 二、快速开始（复制 + 替换 + 装配）

### 2.1 复制模板目录

把模板包复制成新的 domain 包：

- 源：`tools/templates/bounded-context/libs/domains/__context__`
- 目标：`libs/domains/<your-context>`

其中 `<your-context>` 建议采用 **kebab-case**（例如：`inventory`、`billing`）。

### 2.2 全局替换占位符

模板中存在两类占位符：

- **`__context__`**：kebab-case（目录名、路由等）
- **`__CONTEXT__`**：PascalCase（类型名、聚合名等）

替换示例：

- `__context__` → `inventory`
- `__CONTEXT__` → `Inventory`

### 2.3 更新包名与 workspace 引用

复制后需更新：

- `libs/domains/<your-context>/package.json#name` → `@oksai/<your-context>`
- 根 `tsconfig.json` 的 `references`：加入 `./libs/domains/<your-context>/tsconfig.build.json`

### 2.4 在 app 中装配（platform-api 为例）

在 `apps/platform-api/src/app.module.ts` 中引入你的上下文模块：

- 参考 `TenantModule.init({ persistence: 'eventStore' })` 的模式
- 你的模块通常也会暴露类似 `__CONTEXT__Module.init({ persistence: 'inMemory' | 'eventStore' })`

> 注意：模板的 Nest 装配模块位于 `src/presentation/nest/__context__.module.ts`，它负责把端口绑定到实现（见后文“目录结构解释”）。

### 2.5 复制集成测试模板（推荐）

把模板测试复制到仓库集成测试目录：

- 源：`tools/templates/bounded-context/tests/integration/__context__-eventstore-outbox-projection.spec.ts`
- 目标：`tests/integration/<your-context>-eventstore-outbox-projection.spec.ts`

然后按 TODO 指引替换路径与断言。

## 三、目录结构解释（按 Clean Architecture 分层）

模板的核心目录结构如下：

```
libs/domains/<context>/src
├── domain/                 # 领域层（纯 TS，无 Nest/ORM 依赖）
│   ├── aggregates/         # 聚合根（记录领域事件、重建）
│   └── events/             # 领域事件定义（eventType/schemaVersion 等）
├── application/            # 应用层（Use-cases + Ports）
│   ├── commands/           # 写侧输入契约（Command DTO）
│   ├── handlers/           # 用例处理器（CommandHandler）
│   ├── ports/              # 端口：Repository / ReadModel（CQRS）
│   └── services/           # 应用服务（Facade：Controller 的入口）
├── infrastructure/         # 基础设施层（EventStore/DB/Projection 实现）
│   ├── persistence/        # 仓储实现（inMemory / eventStore）
│   ├── read-model/         # 读模型表实体 + 查询实现（PgReadModel）
│   └── projections/        # 投影订阅者（Inbox 幂等 + UoW 事务）
└── presentation/           # 表现层（Nest 装配模块、Controller 等）
    └── nest/               # DynamicModule：把端口绑定到实现
```

下面逐层解释“它们各自应该做什么”。

## 四、domain（领域层）：聚合根 + 领域事件

领域层强调“纯业务规则”，禁止依赖 Nest/ORM。

### 4.1 聚合根（Aggregate）

聚合根的职责（模板示例 `__CONTEXT__Aggregate`）：

- 暴露工厂方法（例如 `create`）表达业务意图
- **记录领域事件**表达状态变更（`record`）
- 支持从事件流重建（`rehydrate`）
- 维护版本号以支持 **乐观并发**（`getExpectedVersion()`）

> 约束：聚合的状态变更应通过“应用事件”完成，避免跨层直接修改数据库模型。

### 4.2 领域事件（DomainEvent）

领域事件的职责：

- 自描述：`eventType`
- 不可变：字段只读（或语义上不可变）
- 可版本化：`schemaVersion`

## 五、application（应用层）：Use-cases + Ports（命令/查询边界）

应用层是“用例层”（Use-cases），它负责把请求编排为可执行的业务流程，并通过端口访问基础设施。

### 5.1 命令与查询是否需要区分？

模板体现的是 **最小 CQRS**：

- 写侧：`commands/* + handlers/*CommandHandler`
- 读侧：`ports/*ReadModel`（直接查询投影表）

是否要再建立 `queries/` 目录？

- **不强制**：简单查询可以直接在应用服务中调用 ReadModel Port
- **建议**：当查询规则复杂、需要组合多个 read model、或需要缓存/分页等策略时，引入 `queries/ + query-handlers/`

### 5.2 Use-cases 在代码中如何体现？

模板已迁移到 **CQRS 调度路径**（`@oksai/cqrs`）：

**输入契约（Command）**：

```typescript
import type { ICommand } from '@oksai/cqrs';

export const CREATE___CONTEXT___COMMAND_TYPE = 'Create__CONTEXT__' as const;

export interface Create__CONTEXT__Command extends ICommand<typeof CREATE___CONTEXT___COMMAND_TYPE> {
	name: string;
}
```

**用例处理器（CommandHandler）**：

```typescript
@Injectable()
@CommandHandler(CREATE___CONTEXT___COMMAND_TYPE)
export class Create__CONTEXT__CommandHandler implements ICommandHandler<Create__CONTEXT__Command, { id: string }> {
	constructor(
		private readonly repo: I__CONTEXT__Repository,
		private readonly outbox: IOutbox,
		private readonly ctx: OksaiRequestContextService,
		private readonly uow?: DatabaseUnitOfWork
	) {}

	async execute(command: Create__CONTEXT__Command): Promise<{ id: string }> {
		// 用例逻辑...
	}
}
```

**入口 facade（ApplicationService）**：

```typescript
@Injectable()
export class __CONTEXT__ApplicationService {
	constructor(private readonly commandBus: CommandBus) {}

	async create(command: Create__CONTEXT__Command): Promise<{ id: string }> {
		return await this.commandBus.execute<{ id: string }>(command);
	}
}
```

这种形式的好处：

- 用例边界清晰（一个 handler 一个用例）
- Handler 通过 `@CommandHandler` 装饰器自动注册到 `CommandBus`
- 单元测试容易（handler 只依赖端口接口）
- 基础设施可替换（inMemory / eventStore / pg read model）
- 统一调度入口（所有用例通过 `CommandBus.execute()` 调用）

### 5.3 tenantId 强约束（必须来自 CLS）

模板在 command handler 中演示了：

- tenantId 必须来自 `OksaiRequestContextService`（CLS）
- 事件 envelope 的 `tenantId/userId/requestId` 应由 outbox/平台层补齐（ContextAwareOutbox）

> 注意：模板里有“把 tenantId 设置为新生成 id”的演示代码，仅用于说明 CLS 写入位置；真实业务中 tenantId 的生命周期与来源应按架构约束实现，禁止直接信任客户端透传。

## 六、infrastructure（基础设施层）：EventStore / ReadModel / Projection

### 6.1 persistence：仓储实现

模板提供两种仓储实现：

- **InMemory 仓储**：用于 demo/早期验证
- **EventSourced 仓储**：基于 `IEventStore` 的事件溯源仓储

事件溯源仓储的关键点：

- `appendToStream` 必须带 `expectedVersion`（来自聚合 committedVersion）
- `findById` 通过加载事件流并 `rehydrate`

### 6.2 read-model：读模型实体 + 查询实现

模板提供：

- `__CONTEXT__ReadModelEntity`：投影表实体（必须有 tenantId）
- `Pg__CONTEXT__ReadModel`：实现 ReadModel Port，按 tenantId 查询

强约束：

- 所有查询必须显式按 tenantId 过滤

### 6.3 projections：投影订阅者（Inbox 幂等 + UoW 事务）

投影订阅者的职责：

- 订阅集成事件（`IEventBus.subscribe`）
- 用 Inbox 对 `messageId` 去重，保证幂等
- 在 UoW 事务内写入 read model 并标记 inbox

> 说明：模板订阅的事件名（如 `__CONTEXT__Created`）需要与你的领域事件/集成事件命名保持一致。

## 七、presentation（表现层）：Nest 装配模块（端口绑定）

`src/presentation/nest/__context__.module.ts` 是模板的"装配入口"，它负责：

- 导入 `OksaiCqrsModule`（启用 CQRS 调度）
- 注册 Handler provider（`@CommandHandler` 装饰器会自动注册到 `CommandBus`）
- 把 **端口接口**绑定到**基础设施实现**
- 支持 `inMemory` / `eventStore` 两条装配路径

**典型装配内容**：

```typescript
@Module({
	imports: [OksaiCqrsModule],
	providers: [
		InMemory__CONTEXT__Repository,
		Create__CONTEXT__CommandHandler, // CQRS Handler
		__CONTEXT__ApplicationService // 注入 CommandBus
	],
	exports: [__CONTEXT__ApplicationService]
})
export class __CONTEXT__Module {
	static init(options: { persistence?: 'inMemory' | 'eventStore' } = {}): DynamicModule {
		// 根据 persistence 选择仓储实现...
	}
}
```

**强约束**：

- 必须在 `@oksai/app-kit` 中启用 `cqrs.enabled: true`，或在模块内自行导入 `OksaiCqrsModule`
- Handler 必须使用 `@Injectable` + `@CommandHandler` 装饰器

## 八、测试模板：如何验证闭环

模板测试通过以下步骤验证闭环：

1. 启动 `platform-api`（使用 test DB + 开启 outbox publisher）
2. 调用创建 API（写侧命令）
3. 轮询查询 API（读侧投影表），等待投影追上

使用建议：

- 把测试放入 `tests/integration/`（仓库级集成测试）
- 测试内尽量设置 `OUTBOX_PUBLISH_INTERVAL_MS` 较小值加速
- 如果引入鉴权（401/403），需要先建立会话（Better Auth）并在轮询时允许短暂的 403/400 直至投影/授权链路完成

## 九、常见问题（FAQ）

### 9.1 为什么既有 Repository 又有 ReadModel？

这是 CQRS 的基本分离：

- Repository：面向聚合（写侧），实现可能是 EventStore
- ReadModel：面向查询（读侧），实现是投影表/索引表

### 9.2 为什么投影要用 Inbox？

跨进程或异步投递通常是“至少一次”，同一 messageId 可能重复到达，必须用 Inbox 去重保证幂等。

### 9.3 为什么写侧要写 Outbox 而不是直接 publish？

强约束：先落库（EventStore/Outbox）再异步投递，避免“业务已提交但消息丢失/反之”的一致性问题。

### 9.4 为什么使用 CommandBus 调度而不是直接调用 Handler？

使用 `CommandBus.execute()` 调度的好处：

- **统一入口**：所有用例通过同一入口调用，便于添加横切能力（日志、指标、鉴权等）
- **自动注册**：Handler 通过 `@CommandHandler` 装饰器自动注册，减少装配样板代码
- **解耦**：Controller/Service 只依赖 `CommandBus`，不直接依赖具体 Handler
- **可扩展**：后续可通过 pipeline 机制添加用例级横切能力（Phase 5）

### 9.5 Command 的 type 字段有什么作用？

`type` 字段是 `CommandBus` 路由的依据：

- 用于将 Command 绑定到对应的 Handler
- 用于可观测性（日志、指标中记录用例名称）
- 必须是稳定字符串，避免随意改名
