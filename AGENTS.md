---
description: 项目宪章
globs:
alwaysApply: true
---

# oksai-saas-api-archi 项目宪章

本文档为在此代码库中工作的 AI 代理提供指南。

## 项目章程

### 项目目标

**本项目将基于`/home/arligle/odooseek-server/`项目重构**。

构建企业级多租户 SAAS 平台，支持 MCP、数据分析平台、AI 平台等业务场景，采用平台化 + 插件化架构设计。

### 四大核心目标

| 核心目标             | 关键技术                        | 预期价值                         |
| -------------------- | ------------------------------- | -------------------------------- |
| **数据分析平台**     | 事件溯源 + 投影 + ClickHouse    | 实时分析、历史回放、多维度统计   |
| **外部数据接口**     | Hexagonal Ports + 多种 Adapters | 统一接入、可插拔、健康监控       |
| **异构系统数据仓库** | Delta Lake + Schema Evolution   | ACID 事务、Schema 演进、时间旅行 |
| **AI 能力嵌入**      | 向量数据库 + AI 推理服务        | 智能分析、相似性搜索、自动化决策 |

### 架构选择

**DDD + Hexagonal Architecture + CQRS + Event Sourcing + EDA**

| 架构模式           | 解决的问题                       | 对应目标              |
| ------------------ | -------------------------------- | --------------------- |
| **DDD**            | 复杂业务领域建模                 | 所有目标              |
| **Hexagonal**      | 多适配器插拔能力                 | 外部数据接入、AI 嵌入 |
| **CQRS**           | 读写分离，分析查询优化           | 数据分析              |
| **Event Sourcing** | 完整审计，时间旅行，数据分析基础 | 数据分析、数据仓库    |
| **EDA**            | 松耦合跨域通信                   | 所有目标              |

### 功能目标

- 提供可组合的平台能力，支持按需装配功能
- 实现多租户行级隔离，确保数据安全
- 支持事件驱动架构，实现模块解耦
- 分离平台管理 API 和业务 API，便于独立演进
- 提供完整的认证授权体系（AuthN + AuthZ + RBAC）

## 核心原则

### 中文优先原则

- 所有代码注释、技术文档、错误消息、日志输出及用户界面文案**必须使用中文**
- Git 提交信息**必须使用英文描述**
- 代码变量命名**保持英文**，但必须配有中文注释说明业务语义

**理由**：统一中文语境提升团队沟通效率，确保业务认知一致，降低知识传递成本。

### 代码即文档原则

- 公共 API、类、方法、接口、枚举**必须编写完整 TSDoc 注释**
- TSDoc 必须覆盖：功能描述、业务规则、使用场景、前置条件、后置条件、异常抛出及注意事项
- 代码变更时**必须同步更新注释**，保持实现与文档一致

**理由**：通过高质量注释让代码自身成为权威业务文档，缩短交接时间并减少额外文档维护负担。

### 项目技术栈约束原则

- 全仓统一采用 Node.js + TypeScript
- 使用 pnpm 管理依赖并通过 monorepo 组织代码
- 模块系统与 TypeScript 配置策略（必读）：`.cursor/docs/XS-模块系统与TypeScript配置策略.md`
    - 默认以 **CommonJS（CJS）语义**运行服务端产物（当前各包未声明 `"type": "module"`）
    - 根 `tsconfig.base.json` 采用 `module/moduleResolution: nodenext`，用于更贴近 Node 的依赖解析（`package.json#exports`/条件导出）
    - 构建阶段（如 `nest build`）在 app 的 `tsconfig.build.json` 采用 `module/moduleResolution: node16`，确保编译与解析组合合法且稳定
    - `*.tsbuildinfo` 属于增量缓存，必须忽略，不得提交
- pnpm 配置（`.npmrc`）：
    - `shamefully-hoist=false` — 禁止将依赖提升到根 node_modules，保持严格的嵌套结构，防止"幽灵依赖"
    - `strict-peer-dependencies=false` — 关闭 peer dependencies 严格检查，未满足时仅警告而不中断安装
    - `auto-install-peers=true` — 自动安装 peer dependencies，无需手动逐个添加

### 测试要求原则

- 单元测试与被测文件**同目录**（旁放），命名格式 `{filename}.spec.ts`
- 集成与端到端测试集中放置在 `tests/integration/` 与 `tests/e2e/`
- 采用分层测试策略：单元、集成、端到端各司其职，确保快速反馈与可维护性
- 核心业务逻辑测试覆盖率**须达到 80% 以上**，关键路径 90% 以上，所有公共 API 必须具备测试用例

**理由**：高标准测试体系保障关键功能可靠性，支持快速迭代并防止回归。

## 开发流程

### BDD/SDD 开发流程

参考 `.cursor/rules/XS-AI文档编写指南.md`：

1.  **写需求（BDD）**: User Story + Given/When/Then 场景
2.  **写规范（SDD）**: 数据结构、API 契约、事件契约、错误语义
3.  **AI 实现**: 使用结构化 Prompt，包含上下文、约束、验收标准
4.  **代码落地**: 隔离与安全、可靠性、一致性、可观测性、测试

**文档存放位置**：

- 项目特定文档应放在项目目录下的 `docs/` 目录中，与 `src/` 同级
- 全局技术文档放在 `docs/spec-plan/` 和 `.cursor/docs/`

---

## 领域模型设计规范（DDD）

### 聚合根基类

所有聚合根必须继承 `AggregateRoot` 基类，支持领域事件管理：

```typescript
// libs/shared/kernel/src/domain/aggregate-root.base.ts
export abstract class AggregateRoot<TEvent extends DomainEvent = DomainEvent> {
	protected readonly _domainEvents: TEvent[] = [];

	/**
	 * 添加领域事件
	 */
	protected addEvent(event: TEvent): void {
		this._domainEvents.push(event);
	}

	/**
	 * 获取并清除领域事件
	 */
	clearEvents(): TEvent[] {
		const events = [...this._domainEvents];
		this._domainEvents.length = 0;
		return events;
	}
}
```

### 值对象模式

所有值对象必须继承 `ValueObjectBase`，提供统一的验证和创建机制：

```typescript
// ✅ 正确 - 值对象模式
export class TenantName extends ValueObjectBase<{ value: string }> {
	private constructor(props: { value: string }) {
		super(props);
	}

	/**
	 * 创建租户名称值对象
	 *
	 * @param value - 租户名称字符串
	 * @returns Either<TenantName, ValidationError>
	 */
	public static create(value: string): Either<TenantName, ValidationError> {
		// 验证规则 1：长度检查
		if (value.length < 2 || value.length > 100) {
			return fail(
				new ValidationError(
					`租户名称长度必须在 2-100 个字符之间，当前长度：${value.length}`,
					'tenantName',
					value
				)
			);
		}

		// 验证规则 2：字符格式检查
		if (!/^[\u4e00-\u9fa5a-zA-Z0-9-]+$/.test(value)) {
			return fail(new ValidationError('租户名称只能包含中文、英文、数字和连字符', 'tenantName', value));
		}

		return ok(new TenantName({ value }));
	}

	/**
	 * 从持久化数据重建值对象（跳过验证）
	 * ⚠️ 仅用于从数据库加载已知合法数据
	 */
	public static fromPersistence(value: string): TenantName {
		return new TenantName({ value });
	}

	get value(): string {
		return this.props.value;
	}
}
```

**验收标准**：

- 所有值对象继承 `ValueObjectBase`
- 所有值对象提供 `create` 静态方法返回 `Either`
- 所有值对象提供 `fromPersistence` 方法
- 单元测试覆盖所有验证规则

### 业务规则封装

业务规则必须实现 `IBusinessRule` 接口，支持独立测试和复用：

```typescript
// libs/shared/kernel/src/domain/business-rule.base.ts
export interface IBusinessRule {
	readonly Error: DomainException;
	isBroken(): boolean | Promise<boolean>;
}

export class BusinessRuleValidator {
	static async validate(...rules: IBusinessRule[]): Promise<DomainException | null> {
		for (const rule of rules) {
			if (await rule.isBroken()) {
				return rule.Error;
			}
		}
		return null;
	}
}

// ✅ 正确 - 业务规则封装
export class TenantNameLengthRule extends BusinessRuleBase {
	constructor(private readonly name: string) {
		super('TenantNameLengthRule');
	}

	readonly Error = new DomainException(
		`租户名称长度必须在 2-100 个字符之间，当前长度：${this.name.length}`,
		'TENANT_NAME_LENGTH_INVALID'
	);

	isBroken(): boolean {
		return this.name.length < 2 || this.name.length > 100;
	}
}

// 在聚合根中使用
export class TenantAggregate extends AggregateRoot<TenantEvent> {
	public static async create(
		props: CreateTenantProps,
		tenantRepository: ITenantRepository
	): Promise<Either<TenantAggregate, DomainException>> {
		// 批量验证业务规则
		const ruleError = await BusinessRuleValidator.validate(
			new TenantNameLengthRule(props.name),
			new TenantSlugUniqueRule(props.slug, tenantRepository)
		);

		if (ruleError) {
			return fail(ruleError);
		}

		// 创建租户...
	}
}
```

### 领域事件设计

所有领域事件必须继承 `DomainEventBase`，包含完整元数据：

```typescript
// libs/shared/kernel/src/domain/domain-event.base.ts
export abstract class DomainEventBase<TPayload = unknown> {
	readonly eventId: string;
	abstract readonly eventName: string;
	readonly version: number = 1;
	readonly aggregateId: string;
	readonly aggregateType: string;
	readonly occurredAt: Date;
	readonly payload: TPayload;
	readonly metadata: {
		tenantId: string;
		userId: string;
		correlationId: string;
		causationId?: string;
	};
}

// ✅ 正确 - 领域事件
export class TenantCreatedEvent extends DomainEventBase<TenantCreatedPayload> {
	readonly eventName = 'tenant.created';
	readonly version = 1;

	constructor(aggregateId: string, payload: TenantCreatedPayload, metadata?: Partial<DomainEventBase['metadata']>) {
		super(aggregateId, 'Tenant', payload, metadata);
	}
}
```

---

## Hexagonal Architecture 规范

### 端口（Ports）设计

端口定义领域层与外部世界的交互契约：

```typescript
// ✅ 正确 - 数据源适配器端口
export interface IDataSourceAdapter {
	readonly type: DataSourceType;
	connect(): Promise<Either<void, ConnectionError>>;
	disconnect(): Promise<void>;
	testConnection(): Promise<Either<void, ConnectionError>>;
	fetchSchema(): Promise<Either<DataSchema, SchemaError>>;
	fetchData(query: DataQuery): Promise<Either<RawData[], QueryError>>;
	streamData(query: DataQuery): AsyncIterable<Either<RawData, QueryError>>;
	getHealthStatus(): Promise<DataSourceHealth>;
}

// ✅ 正确 - 向量数据库端口
export interface IVectorDatabase {
	insertVector(params: InsertVectorParams): Promise<Either<void, VectorDBError>>;
	searchSimilar(params: SearchSimilarParams): Promise<Either<SearchResult[], VectorDBError>>;
	deleteVector(id: string): Promise<Either<void, VectorDBError>>;
	updateVector(params: UpdateVectorParams): Promise<Either<void, VectorDBError>>;
}
```

### 适配器（Adapters）实现

适配器位于基础设施层，实现端口接口：

```typescript
// ✅ 正确 - PostgreSQL 适配器
export class PostgreSQLDataSourceAdapter implements IDataSourceAdapter {
	readonly type = DataSourceType.POSTGRESQL;

	async connect(): Promise<Either<void, ConnectionError>> {
		// 实现连接逻辑...
	}

	async fetchData(query: DataQuery): Promise<Either<RawData[], QueryError>> {
		// 实现查询逻辑...
	}
}
```

### 目录结构

```
libs/domains/tenant/
├── src/
│   ├── domain/                    # 领域层（核心）
│   │   ├── aggregates/           # 聚合根
│   │   ├── entities/             # 实体
│   │   ├── value-objects/        # 值对象
│   │   ├── events/               # 领域事件
│   │   ├── rules/                # 业务规则
│   │   └── ports/                # 端口接口（Driven Ports）
│   ├── application/              # 应用层
│   │   ├── commands/             # 命令
│   │   ├── handlers/             # 命令处理器
│   │   ├── queries/              # 查询
│   │   └── services/             # 应用服务
│   └── infrastructure/           # 基础设施层
│       ├── adapters/             # 适配器（Driven Adapters）
│       ├── projections/          # 投影
│       └── repositories/         # 仓储实现
└── tests/
    ├── __tests__/                # BDD 测试套件
    ├── builders/                 # 测试数据构建器
    └── mocks/                    # Mock 对象
```

---

## 事件溯源与投影规范

### 事件存储接口

```typescript
// libs/shared/event-store/src/event-store.base.ts
export abstract class EventStoreBase {
	/**
	 * 追加事件到事件流
	 */
	abstract appendToStream(
		streamId: string,
		events: DomainEvent[],
		expectedVersion?: number
	): Promise<Either<void, ConcurrencyError>>;

	/**
	 * 从事件流加载事件
	 */
	abstract loadEvents(streamId: string, fromVersion?: number, toVersion?: number): Promise<DomainEvent[]>;

	/**
	 * 加载所有事件（用于分析）
	 */
	abstract loadAllEvents(filter?: EventFilter): Promise<AsyncIterable<DomainEvent>>;

	/**
	 * 保存快照
	 */
	abstract saveSnapshot(streamId: string, snapshot: Snapshot): Promise<void>;

	/**
	 * 加载快照
	 */
	abstract loadSnapshot(streamId: string): Promise<Snapshot | null>;
}
```

### 投影机制

投影将事件流转换为优化的读模型：

```typescript
// libs/shared/event-store/src/projections/projection.base.ts
export abstract class ProjectionBase<TReadModel = unknown> {
	abstract readonly name: string;
	abstract readonly subscribedEvents: string[];
	abstract handle(event: DomainEvent): Promise<void>;
	abstract rebuild(): Promise<void>;
	abstract getStatus(): Promise<ProjectionStatus>;
}

// ✅ 正确 - 租户分析投影
export class TenantAnalyticsProjection extends ProjectionBase<TenantAnalyticsReadModel> {
	readonly name = 'TenantAnalyticsProjection';
	readonly subscribedEvents = ['TenantCreatedEvent', 'TenantActivatedEvent', 'MemberAddedEvent'];

	async handle(event: DomainEvent): Promise<void> {
		switch (event.eventName) {
			case 'TenantCreatedEvent':
				await this.handleTenantCreated(event as TenantCreatedEvent);
				break;
			// ... 其他事件处理
		}
	}
}
```

---

## 集成事件版本控制

### 集成事件设计

集成事件支持多版本并存，确保向后兼容：

```typescript
// libs/shared/eda/src/integration-event.base.ts
export abstract class IntegrationEventBase<TPayload = unknown> {
	readonly eventId: string;
	abstract readonly eventName: string;
	readonly version: string;
	abstract readonly boundedContextId: string;
	readonly payload: TPayload;
	readonly metadata: {
		tenantId: string;
		userId: string;
		correlationId: string;
		causationId?: string;
		occurredAt: Date;
	};
}

// ✅ 正确 - 支持多版本的集成事件
export class TenantCreatedIntegrationEvent extends IntegrationEventBase<
	TenantCreatedPayloadV1 | TenantCreatedPayloadV2
> {
	static readonly versions = ['v1', 'v2'] as const;
	static readonly boundedContextId = 'Tenant';
	static readonly eventName = 'tenant.created';

	/**
	 * 从领域事件创建集成事件（包含所有版本）
	 */
	static create(event: TenantCreatedDomainEvent): TenantCreatedIntegrationEvent[] {
		return this.versions.map((version) => {
			const mapper = this.versionMappers[version];
			const data = mapper(event);
			return new TenantCreatedIntegrationEvent(data, version, event.metadata);
		});
	}

	static readonly versionMappers: Record<string, VersionMapper> = {
		v1: this.toIntegrationDataV1.bind(this),
		v2: this.toIntegrationDataV2.bind(this)
	};
}
```

### Schema 契约定义

所有集成事件必须有对应的 JSON Schema：

```typescript
// libs/contracts/src/tenant/tenant-created.v1.schema.ts
export const TenantCreatedV1Schema = {
	$id: 'tenant.created.v1',
	type: 'object',
	required: ['tenantId', 'name', 'slug', 'createdAt'],
	properties: {
		tenantId: { type: 'string', format: 'uuid', description: '租户唯一标识' },
		name: { type: 'string', minLength: 2, maxLength: 100, description: '租户名称' },
		slug: { type: 'string', pattern: '^[a-z0-9-]+$', description: '租户标识' },
		createdAt: { type: 'string', format: 'date-time', description: '创建时间' }
	},
	additionalProperties: false
} as const;
```

---

## BDD 测试规范

### 测试目录结构

```
libs/domains/tenant/src/tests/
├── __tests__/                    # BDD 测试套件
│   ├── create-tenant/           # 创建租户用例
│   │   ├── create-tenant.steps.ts
│   │   ├── create-tenant.mock.ts
│   │   └── create-tenant-write-repo.mock.ts
│   └── activate-tenant/         # 激活租户用例
├── builders/                     # 测试数据构建器
│   ├── tenant-props.builder.ts
│   └── tenant-aggregate.builder.ts
└── mocks/                        # Mock 对象
    ├── tenant-write-repo.mock.ts
    └── tenant-read-repo.mock.ts
```

### BDD 测试用例编写

```typescript
// ✅ 正确 - BDD 测试模式
describe('Create tenant feature test', () => {
	/**
	 * 成功场景：创建租户成功
	 */
	it('Tenant created successfully', async () => {
		// given - 准备
		const mockTenantRepo = new MockTenantWriteRepo();
		const createTenantCommand = new CreateTenantCommand({
			name: '测试租户',
			slug: 'test-tenant',
			type: TenantType.ORGANIZATION
		});

		// when - 执行
		const createTenantHandler = new CreateTenantHandler(mockTenantRepo.getMock());
		const result = await createTenantHandler.execute(createTenantCommand);

		// then - 验证
		expect(result.isOk()).toBe(true);
		expect(mockTenantRepo.mockSaveMethod).toHaveBeenCalledWith(expect.any(TenantAggregate));

		const savedTenant = mockTenantRepo.mockSaveMethod.mock.calls[0][0];
		expect(savedTenant.domainEvents[0]).toBeInstanceOf(TenantCreatedEvent);
	});

	/**
	 * 失败场景：租户标识已存在
	 */
	it('Tenant creation failed, slug already exists', async () => {
		// given
		const mockTenantRepo = new MockTenantWriteRepo();
		mockTenantRepo.setupExistingTenant({ slug: 'test-tenant' });

		// when
		const result = await createTenantHandler.execute(createTenantCommand);

		// then
		expect(result.isFail()).toBe(true);
		expect(result.value).toBeInstanceOf(DomainException);
		expect(result.value.message).toContain('租户标识已存在');
	});
});
```

### 测试 Builder 模式

```typescript
// ✅ 正确 - Builder 模式构建测试数据
export class TenantPropsBuilder {
	private name: string = '测试租户';
	private slug: string = 'test-tenant';
	private type: TenantType = TenantType.ORGANIZATION;
	private status: TenantStatus = TenantStatus.ACTIVE;

	withName(name: string): TenantPropsBuilder {
		this.name = name;
		return this;
	}

	withSlug(slug: string): TenantPropsBuilder {
		this.slug = slug;
		return this;
	}

	build(): TenantProps {
		return {
			name: TenantName.create(this.name).value as TenantName,
			slug: TenantSlug.create(this.slug).value as TenantSlug,
			type: this.type,
			status: this.status
		};
	}
}

// 使用
const props = new TenantPropsBuilder().withName('自定义名称').withSlug('custom-slug').build();
```

---

## TypeScript 类型定义

### 类型定义

- 使用接口表示公共契约
- 使用类表示实现
- 使用类型别名表示复杂类型
- 始终使用严格类型（避免使用 `any`）

```typescript
// ✅ 正确 - DTO 接口
export interface CreateUserDto {
	email: string;
	password: string;
	firstName: string;
	lastName: string;
}

// ✅ 正确 - 类型别名
export type UserId = string;

// ❌ 错误 - 使用 any
async findUser(id: any): Promise<any> {
	return await this.userRepo.findOne({ id });
}

// ✅ 正确 - 正确的类型
async findUser(id: string): Promise<User | null> {
	return await this.userRepo.findOne({ id });
}
```

### Either 模式

使用 `Either` 模式处理可能失败的操作：

```typescript
// ✅ 正确 - Either 模式
import { Either, ok, fail } from '@oksai/shared';

async createTenant(props: CreateTenantProps): Promise<Either<TenantAggregate, DomainException>> {
	// 验证
	const ruleError = await BusinessRuleValidator.validate(
		new TenantNameLengthRule(props.name),
	);
	if (ruleError) {
		return fail(ruleError);
	}

	// 创建
	const tenant = TenantAggregate.create(props);
	return ok(tenant);
}

// 使用
const result = await tenantService.createTenant(props);
if (result.isOk()) {
	const tenant = result.value;
	// 成功处理
} else {
	const error = result.value;
	// 错误处理
}
```

---

## 注释和文档规范

### TSDoc 注释

公共 API、类、方法、接口、枚举**必须编写完整 TSDoc 注释**：

````typescript
// ✅ 正确 - 完整的 TSDoc 注释
/**
 * 认证服务
 *
 * 提供用户认证、JWT 令牌管理、密码重置等功能
 */
@Injectable()
export class AuthService {
	/**
	 * 用户登录
	 *
	 * 验证用户凭证并生成 JWT 访问令牌和刷新令牌
	 *
	 * @param credentials - 登录凭证（邮箱和密码）
	 * @returns 包含访问令牌、刷新令牌和用户信息的响应
	 * @throws UnauthorizedException 当凭证无效时
	 * @throws BadRequestException 当密码错误时
	 *
	 * @example
	 * ```typescript
	 * const result = await authService.login({
	 *   email: 'user@example.com',
	 *   password: 'password123'
	 * });
	 * ```
	 */
	async login(credentials: LoginDto): Promise<LoginResponse> {
		// 实现...
	}
}
````

### TSDoc 标签说明

- `@param` - 参数说明（必须包含）
- `@returns` - 返回值说明（必须包含）
- `@throws` - 抛出的异常（如有）
- `@example` - 使用示例（推荐添加）
- `@see` - 相关文档链接（如有）

### 业务语义注释

所有代码变量和业务逻辑必须配备中文注释说明：

```typescript
// ✅ 正确 - 配备中文业务语义注释
async createTenant(data: CreateTenantDto): Promise<Tenant> {
	// 检查租户标识是否已存在
	const existing = await this.tenantRepo.findOne({ slug: data.slug });
	if (existing) {
		throw new BadRequestException('租户标识已存在');
	}

	// 创建新租户并设置默认状态
	const tenant = this.tenantRepo.create({
		...data,
		status: TenantStatus.ACTIVE,
		type: TenantType.ORGANIZATION
	});

	await this.em.persistAndFlush(tenant);
	return tenant;
}
```

---

## 命名规范

### 文件

- `kebab-case.ts` - 普通文件
- `kebab-case.spec.ts` - 测试文件（与被测文件同目录）
- `kebab-case.dto.ts` - DTO 文件
- `kebab-case.entity.ts` - 实体文件
- `kebab-case.aggregate.ts` - 聚合根文件
- `kebab-case.value-object.ts` - 值对象文件
- `kebab-case.event.ts` - 领域事件文件
- `kebab-case.rule.ts` - 业务规则文件
- `kebab-case.port.ts` - 端口接口文件
- `kebab-case.adapter.ts` - 适配器文件
- `kebab-case.projection.ts` - 投影文件

### 类

- `PascalCase` - 用于类、接口、类型
- `camelCase` - 用于函数、变量、属性
- `UPPER_SNAKE_CASE` - 用于常量

### 包

- 使用 `@oksai/kebab-case` 表示包名
- 包名必须小写

```typescript
// ✅ 正确
import { JwtPayload } from '@oksai/contracts';
import { TenantAggregate } from '@oksai/tenant-domain';
import { PostgreSQLDataSourceAdapter } from '@oksai/data-ingestion';
```

---

## 错误处理

### 领域异常

使用领域异常封装业务规则违反：

```typescript
// ✅ 正确 - 领域异常
export class DomainException extends Error {
	constructor(
		message: string,
		public readonly code: string,
		public readonly context?: Record<string, unknown>
	) {
		super(message);
		this.name = 'DomainException';
	}
}

// 使用
if (this._status === DataSourceStatus.CONNECTING) {
	throw new DomainException('数据源正在连接中', 'DATA_SOURCE_CONNECTING');
}
```

### NestJS 异常

在应用层和基础设施层使用 NestJS 内置异常：

- `NotFoundException` - 404 Not Found
- `BadRequestException` - 400 Bad Request
- `UnauthorizedException` - 401 Unauthorized
- `ForbiddenException` - 403 Forbidden
- `ConflictException` - 409 Conflict
- `InternalServerErrorException` - 500 Internal Server Error

### 错误消息规范

**重要**：错误消息**必须使用中文**，并遵循以下规范：

- 使用清晰、用户友好的中文错误消息
- 包含相关详细信息（id、email、slug 等）
- 首字母大写、句末加标点

```typescript
// ✅ 正确 - 中文错误消息
throw new NotFoundException(`未找到 ID 为 ${id} 的用户`);
throw new BadRequestException('此邮箱已被使用');
throw new DomainException('租户标识已存在', 'TENANT_SLUG_DUPLICATE');
```

---

## 依赖注入

使用构造函数注入并配合 `readonly` 修饰符：

```typescript
// ✅ 正确
@Injectable()
export class AuthService {
	constructor(
		@InjectRepository(User)
		private readonly userRepo: EntityRepository<User>,
		private readonly jwtService: JwtService
	) {}
}
```

---

## 最佳实践

1. **始终对数据库操作使用 async/await**
2. **使用 DTO 进行输入验证**（配合 class-validator）
3. **对多步骤操作使用事务**
4. **处理边界情况** - null 检查、空数组等
5. **绝不记录敏感数据** - 密码、令牌等
6. **使用环境变量进行配置**
7. **保持方法简洁专注** - 单一职责
8. **使用有意义的变量名** - 避免单字母（循环除外），并添加中文注释说明业务语义
9. **为公共 API 添加完整的 TSDoc 注释**
10. **Git 提交信息使用英文描述**
11. **核心业务逻辑测试覆盖率达到 80% 以上**
12. **优先重用 `@oksai` 项目的代码，不要重复造轮子**
13. **多租户安全**: tenantId 必须来自服务端上下文（CLS），禁止客户端透传覆盖
14. **使用 Either 模式处理领域层错误**
15. **跨模块协作优先使用 Outbox/Inbox 模式**
16. **日志必须包含 tenantId、userId、requestId、eventId 等关键字段**

---

## 重要提示

- 绝不使用 `any` 类型 - 如果类型不确定，使用 `unknown`
- 始终对注入的依赖使用 `readonly`
- 始终对实体的非空属性使用 `!`
- 始终对可选属性使用 `?`
- 绝不提交 `.env` 文件
- 提交前始终运行类型检查
- 严格遵循导入顺序
- 所有注释、错误消息、日志输出使用中文
- 公共 API 必须编写完整 TSDoc 注释
- Git 提交信息使用英文描述
- 核心业务逻辑测试覆盖率须达到 80% 以上
- 优先重用 `@oksai` 项目的代码，不要重复造轮子
- tenantId 必须来自服务端上下文（CLS），禁止客户端透传覆盖
- 跨模块协作优先使用 Outbox/Inbox 模式，确保至少一次投递 + 幂等消费
- 日志必须包含 tenantId、userId、requestId、eventId 等关键字段，不记录敏感信息
- 所有值对象使用 Either 模式返回创建结果
- 所有业务规则封装为独立的 Rule 类
- 所有领域事件包含完整的元数据
- 集成事件支持版本控制，保持向后兼容

---

## 参考文档

- [XS-基于ddd-hexagonal-cqrs-es-eda项目的重构方案.md](./docs/XS-基于ddd-hexagonal-cqrs-es-eda项目的重构方案.md)
- [XS-SAAS平台架构设计方案（全局演进版）.md](./docs/XS-SAAS平台架构设计方案（全局演进版）.md)
- [XS-模块系统与TypeScript配置策略.md](./.cursor/docs/XS-模块系统与TypeScript配置策略.md)
