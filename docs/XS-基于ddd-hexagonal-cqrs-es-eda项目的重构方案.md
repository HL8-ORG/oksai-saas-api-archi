# 基于ddd-hexagonal-cqrs-es-eda项目的重构技术方案

> **版本**：v2.0.0
> **创建日期**：2026-02-19
> **最后更新**：2026-02-19
> **参考项目**：/forks/ddd-hexagonal-cqrs-es-eda
> **状态**：待执行

---

## 一、方案摘要

本文档基于对 `ddd-hexagonal-cqrs-es-eda` 项目的深度分析，结合当前项目（oksai-saas-api-archi）的**四大核心目标**，制定一份**可执行、可验证、可回滚**的重构技术方案。

### 平台四大核心目标

1. 🎯 **数据分析平台**：为租户提供强大的数据分析能力
2. 🎯 **对接多种外部数据接口**：支持多种数据源的无缝接入
3. 🎯 **构建异构系统数据仓库**：为外部系统提供统一的数据仓库
4. 🎯 **嵌入 AI 能力**：在平台中嵌入 AI 增强功能

### 架构重构目标

1. ✅ **吸收优秀实践**：借鉴 DDD、CQRS、事件驱动、测试模式
2. ✅ **保持架构兼容**：与现有的 Clean Architecture + CQRS + ES + EDA 架构兼容
3. ✅ **增强领域模型**：提升领域层的表达能力和业务规则封装
4. ✅ **完善测试体系**：建立 BDD 测试框架和测试覆盖
5. ✅ **支持数据分析**：构建事件溯源 + 投影机制的分析能力
6. ✅ **支持外部数据接入**：设计灵活的数据接入适配器体系
7. ✅ **支持数据仓库**：构建多租户数据湖和 Schema 管理系统
8. ✅ **支持 AI 嵌入**：集成向量数据库和 AI 推理服务
9. ❌ **不引入外部依赖**：不采用 Bitloops 框架，使用自研基础设施

---

## 二、价值吸收优先级矩阵

基于对参考项目的分析和**平台四大核心目标**，确定以下吸收优先级：

### 2.1 核心架构价值（P0 - 立即实施）

| 价值点 | 实用性 | 实施难度 | 当前状态 | 优先级 | 预计工时 | 关联目标 |
|--------|--------|----------|----------|--------|----------|----------|
| **1. 领域模型设计模式** | ⭐⭐⭐⭐⭐ | 中 | 部分实现 | **P0** | 5 天 | 所有目标 |
| **2. 聚合根事件驱动** | ⭐⭐⭐⭐⭐ | 中 | 已实现 | **P0** | 优化 3 天 | 数据分析、数据仓库 |
| **3. 模块化组织** | ⭐⭐⭐⭐ | 低 | 已实现 | **P0** | 优化 2 天 | 所有目标 |
| **4. 领域规则封装** | ⭐⭐⭐⭐⭐ | 低 | 缺失 | **P0** | 4 天 | 所有目标 |
| **5. 事件溯源完善** | ⭐⭐⭐⭐⭐ | 中 | 部分实现 | **P0** | 5 天 | 数据分析、数据仓库 |
| **6. 投影机制设计** | ⭐⭐⭐⭐⭐ | 高 | 未实现 | **P0** | 6 天 | 数据分析 |

**小计**：25 天（约 5 周）

### 2.2 数据平台价值（P1 - 核心能力）

| 价值点 | 实用性 | 实施难度 | 当前状态 | 优先级 | 预计工时 | 关联目标 |
|--------|--------|----------|----------|--------|----------|----------|
| **7. BDD 测试模式** | ⭐⭐⭐⭐ | 中 | 部分实现 | **P1** | 5 天 | 所有目标 |
| **8. 端口适配器接口** | ⭐⭐⭐⭐ | 低 | 已实现 | **P1** | 优化 2 天 | 外部数据接入、AI 嵌入 |
| **9. 数据源适配器模式** | ⭐⭐⭐⭐⭐ | 高 | 未实现 | **P1** | 8 天 | 外部数据接入 |
| **10. 数据转换管道** | ⭐⭐⭐⭐⭐ | 高 | 未实现 | **P1** | 6 天 | 外部数据接入、数据仓库 |
| **11. Schema 管理系统** | ⭐⭐⭐⭐⭐ | 高 | 未实现 | **P1** | 7 天 | 数据仓库 |

**小计**：28 天（约 5.5 周）

### 2.3 高级能力价值（P2 - 扩展能力）

| 价值点 | 实用性 | 实施难度 | 当前状态 | 优先级 | 预计工时 | 关联目标 |
|--------|--------|----------|----------|--------|----------|----------|
| **12. 集成事件版本控制** | ⭐⭐⭐⭐ | 高 | 未实现 | **P2** | 6 天 | 所有目标 |
| **13. AI 服务适配器** | ⭐⭐⭐⭐⭐ | 高 | 未实现 | **P2** | 8 天 | AI 嵌入 |
| **14. 向量数据库集成** | ⭐⭐⭐⭐⭐ | 高 | 未实现 | **P2** | 6 天 | AI 嵌入 |
| **15. 数据湖架构** | ⭐⭐⭐⭐⭐ | 高 | 未实现 | **P2** | 10 天 | 数据仓库 |
| **16. 实时流处理** | ⭐⭐⭐⭐ | 高 | 未实现 | **P2** | 8 天 | 数据分析 |

**小计**：38 天（约 7.5 周）

---

**总工时预估**：91 天（约 18 周，4.5 个月）

---

## 三、重构分阶段计划（基于四大核心目标）

> **架构选择**：DDD + Hexagonal Architecture + CQRS + Event Sourcing + EDA
> 
> **选择理由**：
> - ✅ **DDD**：复杂业务领域需要领域模型
> - ✅ **Hexagonal**：多适配器需求（数据源、AI 服务）
> - ✅ **CQRS**：分析查询不阻塞事务操作
> - ✅ **Event Sourcing**：完整审计 + 数据分析基础
> - ✅ **EDA**：松耦合的跨域通信

### Phase 7：领域模型增强（5 天）【P0 优先级】

**目标**：借鉴参考项目的优秀实践，增强领域模型的表达能力和业务规则封装，为四大核心目标奠定基础。

#### 7.1 值对象模式增强（2 天）

**当前问题**：
- 值对象缺少完整的自验证机制
- 缺少 Either 模式的错误处理
- 业务规则未封装在专门的 Rules 类中

**参考项目模式**：
```typescript
// 参考项目的优秀实践
export class TitleVO extends Domain.ValueObject<TitleProps> {
  private constructor(props: TitleProps) {
    super(props);
  }

  public static create(props: TitleProps): Either<TitleVO, DomainErrors.TitleOutOfBoundsError> {
    const res = Domain.applyRules([new Rules.TitleOutOfBounds(props.title)]);
    if (res) return fail(res);
    return ok(new TitleVO(props));
  }
}
```

**重构方案**：

```typescript
// libs/shared/kernel/src/domain/value-object.base.ts
/**
 * 值对象基类
 * 
 * 所有值对象都应继承此类，提供统一的验证和创建机制
 */
export abstract class ValueObjectBase<T> {
	protected constructor(protected readonly props: T) {}

	/**
	 * 值对象相等性比较
	 */
	equals(other: ValueObjectBase<T>): boolean {
		if (other.constructor !== this.constructor) {
			return false;
		}
		return JSON.stringify(this.props) === JSON.stringify(other.props);
	}

	/**
	 * 获取值对象属性（只读）
	 */
	get value(): Readonly<T> {
		return Object.freeze({ ...this.props });
	}
}

// libs/domains/tenant/src/domain/value-objects/tenant-name.value-object.ts
/**
 * 租户名称值对象
 * 
 * 业务规则：
 * - 长度在 2-100 个字符之间
 * - 仅允许中文、英文、数字和连字符
 * - 不能以连字符开头或结尾
 */
export class TenantName extends ValueObjectBase<{ value: string }> {
	private constructor(props: { value: string }) {
		super(props);
	}

	/**
	 * 创建租户名称值对象
	 * 
	 * @param value - 租户名称字符串
	 * @returns Either<TenantName, ValidationError>
	 * 
	 * @example
	 * ```typescript
	 * const result = TenantName.create('测试租户');
	 * if (result.isOk()) {
	 *   console.log(result.value.value); // '测试租户'
	 * }
	 * ```
	 */
	public static create(value: string): Either<TenantName, ValidationError> {
		// 验证规则 1：长度检查
		if (value.length < 2 || value.length > 100) {
			return fail(new ValidationError(
				`租户名称长度必须在 2-100 个字符之间，当前长度：${value.length}`,
				'tenantName',
				value
			));
		}

		// 验证规则 2：字符格式检查
		if (!/^[\u4e00-\u9fa5a-zA-Z0-9-]+$/.test(value)) {
			return fail(new ValidationError(
				'租户名称只能包含中文、英文、数字和连字符',
				'tenantName',
				value
			));
		}

		// 验证规则 3：连字符位置检查
		if (value.startsWith('-') || value.endsWith('-')) {
			return fail(new ValidationError(
				'租户名称不能以连字符开头或结尾',
				'tenantName',
				value
			));
		}

		return ok(new TenantName({ value }));
	}

	/**
	 * 从持久化数据重建值对象（跳过验证）
	 * 
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
- ✅ 所有值对象继承 `ValueObjectBase`
- ✅ 所有值对象提供 `create` 静态方法返回 `Either`
- ✅ 所有值对象提供 `fromPersistence` 方法
- ✅ 单元测试覆盖所有验证规则

**回滚策略**：
- 保留原有值对象定义，新基类作为可选方案
- 通过 feature flag 控制是否启用新模式

---

#### 7.2 业务规则封装模式（2 天）

**当前问题**：
- 业务规则分散在聚合根方法中
- 规则难以复用和独立测试
- 规则错误信息不统一

**参考项目模式**：
```typescript
// 参考项目的规则封装
export class TitleOutOfBoundsRule implements Domain.IRule {
  constructor(private title: string) {}

  public Error = new DomainErrors.TitleOutOfBoundsError(this.title);

  public isBrokenIf(): boolean {
    return this.title.length > 150 || this.title.length < 4;
  }
}

// 使用方式
const res = Domain.applyRules([
  new Rules.TodoAlreadyCompleted(this.props.completed, this.id.toString()),
]);
if (res) return fail(res);
```

**重构方案**：

```typescript
// libs/shared/kernel/src/domain/business-rule.base.ts
/**
 * 业务规则接口
 * 
 * 所有业务规则都应实现此接口
 */
export interface IBusinessRule {
	/**
	 * 规则被违反时的错误对象
	 */
	readonly Error: DomainException;

	/**
	 * 判断规则是否被违反
	 * 
	 * @returns true 表示规则被违反，false 表示规则通过
	 */
	isBroken(): boolean | Promise<boolean>;
}

/**
 * 业务规则基类
 * 
 * 提供业务规则的基础实现
 */
export abstract class BusinessRuleBase implements IBusinessRule {
	constructor(protected readonly context?: string) {}

	abstract readonly Error: DomainException;
	abstract isBroken(): boolean | Promise<boolean>;
}

/**
 * 业务规则验证器
 */
export class BusinessRuleValidator {
	/**
	 * 批量验证业务规则
	 * 
	 * @param rules - 业务规则数组
	 * @returns 第一个被违反的规则的错误，如果没有违反则返回 null
	 */
	static async validate(...rules: IBusinessRule[]): Promise<DomainException | null> {
		for (const rule of rules) {
			if (await rule.isBroken()) {
				return rule.Error;
			}
		}
		return null;
	}
}

// libs/domains/tenant/src/domain/rules/tenant-name-length.rule.ts
/**
 * 租户名称长度规则
 * 
 * 业务规则：租户名称长度必须在 2-100 个字符之间
 */
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

// libs/domains/tenant/src/domain/rules/tenant-slug-unique.rule.ts
/**
 * 租户标识唯一性规则
 * 
 * 业务规则：同一租户标识在系统中必须唯一
 */
export class TenantSlugUniqueRule extends BusinessRuleBase {
	constructor(
		private readonly slug: string,
		private readonly tenantRepository: ITenantRepository,
	) {
		super('TenantSlugUniqueRule');
	}

	readonly Error = new DomainException(
		`租户标识 "${this.slug}" 已存在`,
		'TENANT_SLUG_DUPLICATE'
	);

	async isBroken(): Promise<boolean> {
		const existingTenant = await this.tenantRepository.findBySlug(this.slug);
		return existingTenant !== null;
	}
}

// libs/domains/tenant/src/domain/rules/index.ts
/**
 * 租户领域规则导出
 */
export * from './tenant-name-length.rule';
export * from './tenant-slug-unique.rule';
export * from './tenant-member-limit.rule';

// 在聚合根中使用
export class TenantAggregate extends AggregateRoot<TenantEvent> {
	/**
	 * 创建新租户
	 */
	public static async create(
		props: CreateTenantProps,
		tenantRepository: ITenantRepository,
	): Promise<Either<TenantAggregate, DomainException>> {
		// 批量验证业务规则
		const ruleError = await BusinessRuleValidator.validate(
			new TenantNameLengthRule(props.name),
			new TenantSlugFormatRule(props.slug),
			new TenantSlugUniqueRule(props.slug, tenantRepository),
		);

		if (ruleError) {
			return fail(ruleError);
		}

		// 创建租户
		const tenant = new TenantAggregate(
			TenantId.generate(),
			TenantName.create(props.name).value as TenantName,
			TenantSettings.createDefault(),
		);

		// 添加领域事件
		tenant.addEvent(new TenantCreatedEvent({
			tenantId: tenant.id.value,
			name: tenant.name.value,
			slug: props.slug,
			createdAt: new Date(),
		}));

		return ok(tenant);
	}
}
```

**验收标准**：
- ✅ 所有业务规则实现 `IBusinessRule` 接口
- ✅ 业务规则可独立测试
- ✅ 聚合根方法使用 `BusinessRuleValidator` 批量验证
- ✅ 错误信息使用统一的 `DomainException`

**回滚策略**：
- 保留原有验证逻辑作为注释
- 通过 config 开关控制是否使用新的规则验证器

---

#### 7.3 领域事件增强（1 天）

**当前问题**：
- 领域事件缺少完整的事件版本控制
- 事件内容不够完整
- 缺少事件元数据（correlationId、causationId）

**参考项目模式**：
```typescript
// 参考项目的事件设计
export class TodoCompletedDomainEvent extends Domain.DomainEvent {
  constructor(props: TodoCompletedProps) {
    super('Todo', props.aggregateId, props);
  }

  static readonly eventName = 'TodoCompleted';
  get eventName() {
    return TodoCompletedDomainEvent.eventName;
  }
}
```

**重构方案**：

```typescript
// libs/shared/kernel/src/domain/domain-event.base.ts
/**
 * 领域事件基类
 * 
 * 所有领域事件都应继承此类
 */
export abstract class DomainEventBase<TPayload = unknown> {
	/**
	 * 事件 ID（全局唯一）
	 */
	readonly eventId: string;

	/**
	 * 事件名称（用于序列化和路由）
	 */
	abstract readonly eventName: string;

	/**
	 * 事件版本（用于事件溯源和版本控制）
	 */
	readonly version: number = 1;

	/**
	 * 聚合根 ID
	 */
	readonly aggregateId: string;

	/**
	 * 聚合根类型
	 */
	readonly aggregateType: string;

	/**
	 * 事件时间戳
	 */
	readonly occurredAt: Date;

	/**
	 * 事件载荷
	 */
	readonly payload: TPayload;

	/**
	 * 事件元数据（用于追踪和关联）
	 */
	readonly metadata: {
		tenantId: string;
		userId: string;
		correlationId: string;
		causationId?: string;
	};

	constructor(
		aggregateId: string,
		aggregateType: string,
		payload: TPayload,
		metadata: Partial<DomainEventBase['metadata']> = {},
	) {
		this.eventId = randomUUID();
		this.aggregateId = aggregateId;
		this.aggregateType = aggregateType;
		this.payload = payload;
		this.occurredAt = new Date();
		this.metadata = {
			tenantId: metadata.tenantId || '',
			userId: metadata.userId || '',
			correlationId: metadata.correlationId || randomUUID(),
			causationId: metadata.causationId,
		};
	}

	/**
	 * 序列化为 JSON
	 */
	toJSON(): Record<string, unknown> {
		return {
			eventId: this.eventId,
			eventName: this.eventName,
			version: this.version,
			aggregateId: this.aggregateId,
			aggregateType: this.aggregateType,
			occurredAt: this.occurredAt.toISOString(),
			payload: this.payload,
			metadata: this.metadata,
		};
	}
}

// libs/domains/tenant/src/domain/events/tenant-created.event.ts
/**
 * 租户创建领域事件
 * 
 * 当租户被成功创建时触发此事件
 */
export class TenantCreatedEvent extends DomainEventBase<TenantCreatedPayload> {
	readonly eventName = 'tenant.created';
	readonly version = 1;

	constructor(
		aggregateId: string,
		payload: TenantCreatedPayload,
		metadata?: Partial<DomainEventBase['metadata']>,
	) {
		super(aggregateId, 'Tenant', payload, metadata);
	}
}

export interface TenantCreatedPayload {
	tenantId: string;
	name: string;
	slug: string;
	type: TenantType;
	createdAt: Date;
}
```

**验收标准**：
- ✅ 所有领域事件继承 `DomainEventBase`
- ✅ 所有事件包含完整的元数据
- ✅ 事件可序列化和反序列化
- ✅ 事件支持版本控制

**回滚策略**：
- 保持现有事件格式兼容
- 通过适配器模式处理新旧事件格式

---

### Phase 8：事件溯源和投影机制（6 天）【P0 优先级 - 支持数据分析】

**目标**：构建完整的事件溯源和投影机制，为数据分析平台提供数据基础。

**核心价值**：
- ✅ 完整的数据变更历史（审计需求）
- ✅ 时间旅行能力（状态回放）
- ✅ 灵活的分析读模型（多维度分析）
- ✅ 实时数据同步（ETL 基础）

#### 8.1 事件存储优化（2 天）

**当前问题**：
- 事件存储缺少完整的元数据
- 事件查询性能不够优化
- 缺少事件快照机制

**重构方案**：

```typescript
// libs/shared/event-store/src/event-store.base.ts
/**
 * 事件存储基类
 * 
 * 为数据分析提供完整的事件历史
 */
export abstract class EventStoreBase {
	/**
	 * 追加事件到事件流
	 * 
	 * @param streamId - 事件流 ID（通常是聚合根 ID）
	 * @param events - 领域事件数组
	 * @param expectedVersion - 期望版本（乐观锁）
	 */
	abstract appendToStream(
		streamId: string,
		events: DomainEvent[],
		expectedVersion?: number,
	): Promise<Either<void, ConcurrencyError>>;

	/**
	 * 从事件流加载事件
	 * 
	 * @param streamId - 事件流 ID
	 * @param fromVersion - 起始版本号（用于增量加载）
	 * @param toVersion - 结束版本号
	 */
	abstract loadEvents(
		streamId: string,
		fromVersion?: number,
		toVersion?: number,
	): Promise<DomainEvent[]>;

	/**
	 * 加载所有事件（用于分析）
	 * 
	 * ⚠️ 仅用于分析场景，不用于业务逻辑
	 */
	abstract loadAllEvents(
		filter?: EventFilter,
	): Promise<AsyncIterable<DomainEvent>>;

	/**
	 * 保存快照
	 * 
	 * 优化聚合根重建性能
	 */
	abstract saveSnapshot(streamId: string, snapshot: Snapshot): Promise<void>;

	/**
	 * 加载快照
	 */
	abstract loadSnapshot(streamId: string): Promise<Snapshot | null>;
}

// libs/shared/event-store/src/projections/projection.base.ts
/**
 * 投影基类
 * 
 * 将事件流转换为优化的读模型
 */
export abstract class ProjectionBase<TReadModel = unknown> {
	/**
	 * 投影名称（用于标识和日志）
	 */
	abstract readonly name: string;

	/**
	 * 订阅的事件类型
	 */
	abstract readonly subscribedEvents: string[];

	/**
	 * 处理事件并更新读模型
	 */
	abstract handle(event: DomainEvent): Promise<void>;

	/**
	 * 重建整个投影（用于初始化或修复）
	 */
	abstract rebuild(): Promise<void>;

	/**
	 * 获取投影状态
	 */
	abstract getStatus(): Promise<ProjectionStatus>;
}
```

**验收标准**：
- ✅ 事件存储支持完整的元数据
- ✅ 事件查询支持分页和过滤
- ✅ 快照机制正常工作
- ✅ 事件流支持并发控制

---

#### 8.2 分析投影实现（3 天）

**重构方案**：

```typescript
// libs/domains/tenant/src/infrastructure/projections/tenant-analytics.projection.ts
/**
 * 租户分析投影
 * 
 * 为数据分析提供优化的读模型
 */
export class TenantAnalyticsProjection extends ProjectionBase<TenantAnalyticsReadModel> {
	readonly name = 'TenantAnalyticsProjection';
	readonly subscribedEvents = [
		'TenantCreatedEvent',
		'TenantActivatedEvent',
		'TenantSuspendedEvent',
		'MemberAddedEvent',
		'MemberRemovedEvent',
	];

	constructor(
		private readonly analyticsRepo: ITenantAnalyticsRepository,
		private readonly logger: ILogger,
	) {
		super();
	}

	async handle(event: DomainEvent): Promise<void> {
		switch (event.eventName) {
			case 'TenantCreatedEvent':
				await this.handleTenantCreated(event as TenantCreatedEvent);
				break;
			case 'MemberAddedEvent':
				await this.handleMemberAdded(event as MemberAddedEvent);
				break;
			// ... 其他事件处理
		}
	}

	private async handleTenantCreated(event: TenantCreatedEvent): Promise<void> {
		const readModel: TenantAnalyticsReadModel = {
			tenantId: event.payload.tenantId,
			name: event.payload.name,
			type: event.payload.type,
			status: 'ACTIVE',
			memberCount: 0,
			createdAt: event.occurredAt,
			updatedAt: event.occurredAt,
			metadata: {
				tenantId: event.metadata.tenantId,
				userId: event.metadata.userId,
				correlationId: event.metadata.correlationId,
			},
		};

		await this.analyticsRepo.upsert(readModel);
		this.logger.info('租户分析投影已更新', { tenantId: event.payload.tenantId });
	}

	private async handleMemberAdded(event: MemberAddedEvent): Promise<void> {
		await this.analyticsRepo.incrementMemberCount(
			event.payload.tenantId,
			1,
		);
	}

	async rebuild(): Promise<void> {
		// 清空现有投影
		await this.analyticsRepo.clear();

		// 重新处理所有事件
		const events = await this.eventStore.loadAllEvents({
			eventNames: this.subscribedEvents,
		});

		for await (const event of events) {
			await this.handle(event);
		}
	}
}

// libs/domains/tenant/src/infrastructure/read-models/tenant-analytics.read-model.ts
/**
 * 租户分析读模型
 * 
 * 优化的分析查询结构（存储在 ClickHouse）
 */
export interface TenantAnalyticsReadModel {
	// 基本信息
	tenantId: string;
	name: string;
	type: TenantType;
	status: string;

	// 统计信息
	memberCount: number;
	activeUserCount: number;
	dataImportCount: number;
	analysisCount: number;

	// 时间信息
	createdAt: Date;
	updatedAt: Date;
	lastActiveAt?: Date;

	// 元数据
	metadata: {
		tenantId: string;
		userId: string;
		correlationId: string;
	};
}
```

**验收标准**：
- ✅ 至少实现 3 个分析投影
- ✅ 投影支持重建
- ✅ 投影支持增量更新
- ✅ 投影数据存储在 ClickHouse

---

#### 8.3 实时数据同步（1 天）

**重构方案**：

```typescript
// libs/shared/event-store/src/projections/projection-orchestrator.ts
/**
 * 投影编排器
 * 
 * 管理所有投影的生命周期和实时同步
 */
export class ProjectionOrchestrator {
	private projections: Map<string, ProjectionBase> = new Map();
	private isRunning = false;

	/**
	 * 注册投影
	 */
	registerProjection(projection: ProjectionBase): void {
		this.projections.set(projection.name, projection);
	}

	/**
	 * 启动实时同步
	 */
	async startRealtimeSync(): Promise<void> {
		if (this.isRunning) {
			throw new Error('投影编排器已在运行');
		}

		this.isRunning = true;

		// 订阅事件总线
		await this.eventBus.subscribe('*', async (event: DomainEvent) => {
			await this.dispatchEvent(event);
		});

		this.logger.info('投影实时同步已启动', {
			projectionCount: this.projections.size,
		});
	}

	/**
	 * 分发事件到订阅的投影
	 */
	private async dispatchEvent(event: DomainEvent): Promise<void> {
		for (const [name, projection] of this.projections) {
			if (projection.subscribedEvents.includes(event.eventName)) {
				try {
					await projection.handle(event);
				} catch (error) {
					this.logger.error('投影处理事件失败', {
						projectionName: name,
						eventName: event.eventName,
						error: error.message,
					});
				}
			}
		}
	}

	/**
	 * 重建所有投影
	 */
	async rebuildAll(): Promise<void> {
		this.logger.info('开始重建所有投影');

		for (const [name, projection] of this.projections) {
			try {
				await projection.rebuild();
				this.logger.info('投影重建完成', { projectionName: name });
			} catch (error) {
				this.logger.error('投影重建失败', {
					projectionName: name,
					error: error.message,
				});
			}
		}
	}
}
```

**验收标准**：
- ✅ 投影编排器正常工作
- ✅ 实时同步延迟 < 100ms
- ✅ 失败事件有重试机制
- ✅ 监控和告警完善

---

### Phase 9：BDD 测试框架建立（5 天）【P1 优先级】

**目标**：借鉴参考项目的 BDD 测试模式，建立完善的测试体系，确保四大核心功能的质量。

#### 8.1 测试目录结构（1 天）

**参考项目结构**：
```
bounded-contexts/todo/todo/tests/
├── __tests__/           # BDD 测试套件
│   ├── add-todo/
│   ├── complete-todo/
│   └── modify-title-todo/
├── builders/            # 测试数据构建器
│   ├── todo-props.builder.ts
│   └── context.builder.ts
└── mocks/               # Mock 对象
    └── mockAsyncLocalStorageGet.mock.ts
```

**重构方案**：

```
libs/domains/tenant/src/tests/
├── __tests__/                    # BDD 测试套件
│   ├── create-tenant/           # 创建租户用例
│   │   ├── create-tenant.steps.ts
│   │   ├── create-tenant.mock.ts
│   │   └── create-tenant-write-repo.mock.ts
│   ├── activate-tenant/         # 激活租户用例
│   │   ├── activate-tenant.steps.ts
│   │   └── activate-tenant.mock.ts
│   └── add-member/              # 添加成员用例
│       ├── add-member.steps.ts
│       └── add-member.mock.ts
├── builders/                     # 测试数据构建器
│   ├── tenant-props.builder.ts
│   ├── tenant-aggregate.builder.ts
│   └── context.builder.ts
└── mocks/                        # Mock 对象
    ├── tenant-write-repo.mock.ts
    ├── tenant-read-repo.mock.ts
    └── async-local-storage.mock.ts
```

**验收标准**：
- ✅ 每个用例有独立的测试目录
- ✅ Builder 模式构建测试数据
- ✅ Mock 对象隔离外部依赖

---

#### 8.2 BDD 测试用例编写（3 天）

**参考项目模式**：
```typescript
// 参考项目的测试模式
describe('Complete todo feature test', () => {
  it('Todo completed successfully', async () => {
    // given - 准备
    const mockRepo = new MockCompleteTodoWriteRepo();
    const command = new CompleteTodoCommand({ todoId });

    // when - 执行
    const handler = new CompleteTodoHandler(mockRepo);
    const result = await handler.execute(command);

    // then - 验证
    expect(result.isOk()).toBe(true);
    expect(mockRepo.mockUpdateMethod).toHaveBeenCalledWith(expect.any(TodoEntity));
    expect(aggregate.domainEvents[0]).toBeInstanceOf(TodoCompletedDomainEvent);
  });

  it('Todo completed failed, todo already completed', async () => {
    // 测试业务规则失败场景
    expect(result.value).toBeInstanceOf(DomainErrors.TodoAlreadyCompletedError);
  });

  it('Todo failed to be completed, repository error', async () => {
    // 测试技术错误场景
    expect(result.value).toBeInstanceOf(Application.Repo.Errors.Unexpected);
  });
});
```

**重构方案**：

```typescript
// libs/domains/tenant/src/tests/__tests__/create-tenant/create-tenant.steps.ts
import { CreateTenantHandler } from '@src/application/handlers/create-tenant.handler';
import { CreateTenantCommand } from '@src/application/commands/create-tenant.command';
import { TenantCreatedEvent } from '@src/domain/events/tenant-created.event';
import { TenantAggregate } from '@src/domain/aggregates/tenant.aggregate';
import { DomainException } from '@src/domain/exceptions/domain.exception';
import { InfrastructureException } from '@src/infrastructure/exceptions/infrastructure.exception';
import { TenantPropsBuilder } from '../../builders/tenant-props.builder';
import { MockTenantWriteRepo } from './create-tenant-write-repo.mock';
import {
	CREATE_TENANT_SUCCESS_CASE,
	CREATE_TENANT_SLUG_DUPLICATE_CASE,
	CREATE_TENANT_INVALID_NAME_CASE,
	CREATE_TENANT_REPO_ERROR_CASE,
} from './create-tenant.mock';

describe('Create tenant feature test', () => {
	/**
	 * 成功场景：创建租户成功
	 */
	it('Tenant created successfully', async () => {
		// given - 准备
		const mockTenantRepo = new MockTenantWriteRepo();
		const createTenantCommand = new CreateTenantCommand({
			name: CREATE_TENANT_SUCCESS_CASE.name,
			slug: CREATE_TENANT_SUCCESS_CASE.slug,
			type: CREATE_TENANT_SUCCESS_CASE.type,
		});

		// when - 执行
		const createTenantHandler = new CreateTenantHandler(mockTenantRepo.getMock());
		const result = await createTenantHandler.execute(createTenantCommand);

		// then - 验证
		expect(result.isOk()).toBe(true);
		expect(mockTenantRepo.mockSaveMethod).toHaveBeenCalledWith(
			expect.any(TenantAggregate),
		);

		const savedTenant = mockTenantRepo.mockSaveMethod.mock.calls[0][0];
		expect(savedTenant.name.value).toBe(CREATE_TENANT_SUCCESS_CASE.name);
		expect(savedTenant.status).toBe(TenantStatus.ACTIVE);
		expect(savedTenant.domainEvents[0]).toBeInstanceOf(TenantCreatedEvent);
	});

	/**
	 * 失败场景：租户标识已存在
	 */
	it('Tenant creation failed, slug already exists', async () => {
		// given
		const mockTenantRepo = new MockTenantWriteRepo();
		mockTenantRepo.setupExistingTenant({
			slug: CREATE_TENANT_SLUG_DUPLICATE_CASE.slug,
		});

		const createTenantCommand = new CreateTenantCommand({
			name: CREATE_TENANT_SLUG_DUPLICATE_CASE.name,
			slug: CREATE_TENANT_SLUG_DUPLICATE_CASE.slug,
		});

		// when
		const createTenantHandler = new CreateTenantHandler(mockTenantRepo.getMock());
		const result = await createTenantHandler.execute(createTenantCommand);

		// then
		expect(result.isFail()).toBe(true);
		expect(result.value).toBeInstanceOf(DomainException);
		expect(result.value.message).toContain('租户标识已存在');
		expect(mockTenantRepo.mockSaveMethod).not.toHaveBeenCalled();
	});

	/**
	 * 失败场景：租户名称验证失败
	 */
	it('Tenant creation failed, invalid name length', async () => {
		// given
		const createTenantCommand = new CreateTenantCommand({
			name: CREATE_TENANT_INVALID_NAME_CASE.name, // 长度不足
			slug: CREATE_TENANT_INVALID_NAME_CASE.slug,
		});

		// when
		const createTenantHandler = new CreateTenantHandler(mockTenantRepo.getMock());
		const result = await createTenantHandler.execute(createTenantCommand);

		// then
		expect(result.isFail()).toBe(true);
		expect(result.value).toBeInstanceOf(DomainException);
		expect(result.value.message).toContain('租户名称长度必须在 2-100 个字符之间');
	});

	/**
	 * 失败场景：仓储层错误
	 */
	it('Tenant creation failed, repository error', async () => {
		// given
		const mockTenantRepo = new MockTenantWriteRepo();
		mockTenantRepo.setupError(new Error('Database connection failed'));

		const createTenantCommand = new CreateTenantCommand({
			name: CREATE_TENANT_REPO_ERROR_CASE.name,
			slug: CREATE_TENANT_REPO_ERROR_CASE.slug,
		});

		// when
		const createTenantHandler = new CreateTenantHandler(mockTenantRepo.getMock());
		const result = await createTenantHandler.execute(createTenantCommand);

		// then
		expect(result.isFail()).toBe(true);
		expect(result.value).toBeInstanceOf(InfrastructureException);
	});
});
```

**验收标准**：
- ✅ 每个用例覆盖成功场景 + 业务规则失败 + 技术错误
- ✅ 使用 Given-When-Then 结构
- ✅ 验证领域事件的产生
- ✅ 测试覆盖率 > 80%

---

#### 8.3 测试 Builder 模式（1 天）

**参考项目模式**：
```typescript
// 参考项目的 Builder 模式
export class TodoPropsBuilder {
  private title: string = 'Default title';
  private completed: boolean = false;
  private userId: string = 'user-123';

  withTitle(title: string): TodoPropsBuilder {
    this.title = title;
    return this;
  }

  withCompleted(completed: boolean): TodoPropsBuilder {
    this.completed = completed;
    return this;
  }

  build(): TodoProps {
    return {
      title: TitleVO.create({ title: this.title }).value,
      completed: this.completed,
      userId: UserIdVO.create({ id: this.userId }).value,
    };
  }
}
```

**重构方案**：

```typescript
// libs/domains/tenant/src/tests/builders/tenant-props.builder.ts
/**
 * 租户属性构建器
 * 
 * 用于测试中快速构建租户属性对象
 */
export class TenantPropsBuilder {
	private name: string = '测试租户';
	private slug: string = 'test-tenant';
	private type: TenantType = TenantType.ORGANIZATION;
	private status: TenantStatus = TenantStatus.ACTIVE;
	private members: TenantMember[] = [];

	withName(name: string): TenantPropsBuilder {
		this.name = name;
		return this;
	}

	withSlug(slug: string): TenantPropsBuilder {
		this.slug = slug;
		return this;
	}

	withType(type: TenantType): TenantPropsBuilder {
		this.type = type;
		return this;
	}

	withStatus(status: TenantStatus): TenantPropsBuilder {
		this.status = status;
		return this;
	}

	withMembers(members: TenantMember[]): TenantPropsBuilder {
		this.members = members;
		return this;
	}

	build(): TenantProps {
		return {
			name: TenantName.create(this.name).value as TenantName,
			slug: TenantSlug.create(this.slug).value as TenantSlug,
			type: this.type,
			status: this.status,
			members: this.members,
			createdAt: new Date(),
			updatedAt: new Date(),
		};
	}
}

// libs/domains/tenant/src/tests/builders/tenant-aggregate.builder.ts
/**
 * 租户聚合根构建器
 * 
 * 用于测试中快速构建租户聚合根
 */
export class TenantAggregateBuilder {
	private props: TenantProps;

	constructor() {
		this.props = new TenantPropsBuilder().build();
	}

	withName(name: string): TenantAggregateBuilder {
		this.props = { ...this.props, name: TenantName.create(name).value as TenantName };
		return this;
	}

	withStatus(status: TenantStatus): TenantAggregateBuilder {
		this.props = { ...this.props, status };
		return this;
	}

	build(): TenantAggregate {
		return TenantAggregate.fromPersistence(
			TenantId.generate(),
			this.props,
		);
	}
}
```

**验收标准**：
- ✅ 所有测试使用 Builder 构建数据
- ✅ Builder 提供链式调用
- ✅ Builder 提供默认值

---

### Phase 10：数据源适配器体系（8 天）【P1 优先级 - 支持外部数据接入】

**目标**：构建灵活的数据源适配器体系，支持多种外部数据源的无缝接入。

**核心价值**：
- ✅ 统一的数据接入接口（Driven Port）
- ✅ 可插拔的数据源适配器（Driven Adapters）
- ✅ 数据源健康监控
- ✅ 连接池和性能优化

#### 10.1 数据接入领域建模（2 天）

**重构方案**：

```typescript
// libs/domains/data-ingestion/src/domain/aggregates/data-source.aggregate.ts
/**
 * 数据源聚合根
 * 
 * 管理外部数据源的配置和状态
 */
export class DataSourceAggregate extends AggregateRoot<DataSourceEvent> {
	private constructor(
		private readonly _id: DataSourceId,
		private _name: DataSourceName,
		private _type: DataSourceType,
		private _config: DataSourceConfig,
		private _status: DataSourceStatus,
		private _lastSyncAt?: Date,
		private _syncStrategy?: SyncStrategy,
	) {
		super();
	}

	/**
	 * 创建新数据源
	 */
	public static create(
		props: CreateDataSourceProps,
	): Either<DataSourceAggregate, DomainException> {
		// 验证业务规则
		const ruleError = BusinessRuleValidator.validate(
			new DataSourceNameLengthRule(props.name),
			new DataSourceConfigValidRule(props.type, props.config),
		);

		if (ruleError) {
			return fail(ruleError);
		}

		const dataSource = new DataSourceAggregate(
			DataSourceId.generate(),
			DataSourceName.create(props.name).value as DataSourceName,
			props.type,
			props.config,
			DataSourceStatus.INACTIVE,
		);

		dataSource.addEvent(new DataSourceCreatedEvent({
			dataSourceId: dataSource.id.value,
			name: dataSource.name.value,
			type: dataSource.type,
			status: dataSource.status,
		}));

		return ok(dataSource);
	}

	/**
	 * 测试数据源连接
	 */
	public async testConnection(
		adapter: IDataSourceAdapter,
	): Promise<Either<void, DomainException>> {
		if (this._status === DataSourceStatus.CONNECTING) {
			return fail(new DomainException('数据源正在连接中'));
		}

		this._status = DataSourceStatus.CONNECTING;

		try {
			await adapter.connect();
			this._status = DataSourceStatus.ACTIVE;
			
			this.addEvent(new DataSourceConnectedEvent({
				dataSourceId: this.id.value,
				connectedAt: new Date(),
			}));

			return ok();
		} catch (error) {
			this._status = DataSourceStatus.ERROR;
			return fail(new DomainException(`连接失败：${error.message}`));
		}
	}

	/**
	 * 执行数据同步
	 */
	public async syncData(
		adapter: IDataSourceAdapter,
		syncStrategy: SyncStrategy,
	): Promise<Either<SyncResult, DomainException>> {
		if (this._status !== DataSourceStatus.ACTIVE) {
			return fail(new DomainException('数据源未激活'));
		}

		this.addEvent(new DataSyncStartedEvent({
			dataSourceId: this.id.value,
			syncStrategy: syncStrategy.type,
			startedAt: new Date(),
		}));

		// 执行同步逻辑...
	}
}

// libs/domains/data-ingestion/src/domain/value-objects/data-source-type.vo.ts
/**
 * 数据源类型
 */
export enum DataSourceType {
	// 关系型数据库
	POSTGRESQL = 'POSTGRESQL',
	MYSQL = 'MYSQL',
	ORACLE = 'ORACLE',
	SQLSERVER = 'SQLSERVER',

	// NoSQL 数据库
	MONGODB = 'MONGODB',
	CASSANDRA = 'CASSANDRA',
	REDIS = 'REDIS',

	// 云服务
	AWS_RDS = 'AWS_RDS',
	AWS_DYNAMODB = 'AWS_DYNAMODB',
	AWS_S3 = 'AWS_S3',
	AZURE_SQL = 'AZURE_SQL',
	GCP_BIGQUERY = 'GCP_BIGQUERY',

	// SaaS 服务
	SALESFORCE = 'SALESFORCE',
	SAP = 'SAP',
	SERVICENOW = 'SERVICENOW',

	// API 和文件
	REST_API = 'REST_API',
	GRAPHQL = 'GRAPHQL',
	CSV = 'CSV',
	JSON = 'JSON',
	EXCEL = 'EXCEL',
}
```

**验收标准**：
- ✅ 数据源聚合根完整实现
- ✅ 支持至少 5 种数据源类型
- ✅ 业务规则完整验证
- ✅ 领域事件正常触发

---

#### 10.2 数据源适配器端口设计（2 天）

**重构方案**：

```typescript
// libs/domains/data-ingestion/src/application/ports/data-source-adapter.port.ts
/**
 * 数据源适配器端口
 * 
 * Hexagonal Architecture 的 Driven Port
 */
export interface IDataSourceAdapter {
	/**
	 * 数据源类型
	 */
	readonly type: DataSourceType;

	/**
	 * 连接数据源
	 */
	connect(): Promise<Either<void, ConnectionError>>;

	/**
	 * 断开连接
	 */
	disconnect(): Promise<void>;

	/**
	 * 测试连接
	 */
	testConnection(): Promise<Either<void, ConnectionError>>;

	/**
	 * 获取数据源 Schema
	 */
	fetchSchema(): Promise<Either<DataSchema, SchemaError>>;

	/**
	 * 查询数据（批量）
	 */
	fetchData(query: DataQuery): Promise<Either<RawData[], QueryError>>;

	/**
	 * 流式查询数据（大数据量）
	 */
	streamData(query: DataQuery): AsyncIterable<Either<RawData, QueryError>>;

	/**
	 * 获取数据源健康状态
	 */
	getHealthStatus(): Promise<DataSourceHealth>;
}

/**
 * 数据查询对象
 */
export interface DataQuery {
	/**
	 * 表名或集合名
	 */
	table?: string;

	/**
	 * 字段列表
	 */
	fields?: string[];

	/**
	 * 过滤条件
	 */
	filter?: Record<string, unknown>;

	/**
	 * 排序规则
	 */
	orderBy?: Array<{ field: string; direction: 'ASC' | 'DESC' }>;

	/**
	 * 分页参数
	 */
	limit?: number;
	offset?: number;

	/**
	 * 增量查询参数
	 */
	since?: Date;
	until?: Date;
	incrementalField?: string;
}

/**
 * 原始数据（统一格式）
 */
export interface RawData {
	/**
	 * 数据源 ID
	 */
	_sourceId: string;

	/**
	 * 数据 ID（如果有）
	 */
	_id?: string;

	/**
	 * 数据时间戳
	 */
	_timestamp: Date;

	/**
	 * 实际数据（JSON 格式）
	 */
	_data: Record<string, unknown>;

	/**
	 * 元数据
	 */
	_metadata: {
		tenantId: string;
		correlationId: string;
		sourceType: DataSourceType;
		syncBatchId?: string;
	};
}
```

**验收标准**：
- ✅ 端口接口定义完整
- ✅ 支持批量查询和流式查询
- ✅ 支持增量查询
- ✅ 错误处理完善

---

#### 10.3 核心适配器实现（3 天）

**重构方案**：

```typescript
// libs/domains/data-ingestion/src/infrastructure/adapters/postgresql-data-source.adapter.ts
/**
 * PostgreSQL 数据源适配器
 * 
 * Hexagonal Architecture 的 Driven Adapter
 */
export class PostgreSQLDataSourceAdapter implements IDataSourceAdapter {
	readonly type = DataSourceType.POSTGRESQL;
	
	private pool?: Pool;

	constructor(
		private readonly config: PostgreSQLConfig,
		private readonly logger: ILogger,
	) {}

	async connect(): Promise<Either<void, ConnectionError>> {
		try {
			this.pool = new Pool({
				host: this.config.host,
				port: this.config.port,
				database: this.config.database,
				user: this.config.user,
				password: this.config.password,
				max: this.config.connectionLimit || 10,
			});

			// 测试连接
			await this.pool.query('SELECT 1');

			this.logger.info('PostgreSQL 连接成功', {
				host: this.config.host,
				database: this.config.database,
			});

			return ok();
		} catch (error) {
			this.logger.error('PostgreSQL 连接失败', {
				error: error.message,
				host: this.config.host,
			});
			return fail(new ConnectionError(`连接失败：${error.message}`));
		}
	}

	async fetchSchema(): Promise<Either<DataSchema, SchemaError>> {
		if (!this.pool) {
			return fail(new SchemaError('未连接到数据库'));
		}

		try {
			// 查询所有表
			const tablesResult = await this.pool.query(`
				SELECT table_name, table_type
				FROM information_schema.tables
				WHERE table_schema = 'public'
			`);

			const schema: DataSchema = {
				tables: [],
			};

			// 查询每个表的字段
			for (const table of tablesResult.rows) {
				const columnsResult = await this.pool.query(`
					SELECT column_name, data_type, is_nullable, column_default
					FROM information_schema.columns
					WHERE table_schema = 'public' AND table_name = $1
					ORDER BY ordinal_position
				`, [table.table_name]);

				schema.tables.push({
					name: table.table_name,
					type: table.table_type,
					columns: columnsResult.rows.map(col => ({
						name: col.column_name,
						type: col.data_type,
						nullable: col.is_nullable === 'YES',
						default: col.column_default,
					})),
				});
			}

			this.logger.info('Schema 获取成功', {
				tableCount: schema.tables.length,
			});

			return ok(schema);
		} catch (error) {
			this.logger.error('Schema 获取失败', { error: error.message });
			return fail(new SchemaError(`Schema 获取失败：${error.message}`));
		}
	}

	async fetchData(query: DataQuery): Promise<Either<RawData[], QueryError>> {
		if (!this.pool) {
			return fail(new QueryError('未连接到数据库'));
		}

		try {
			// 构建 SQL 查询
			let sql = `SELECT ${query.fields?.join(', ') || '*'}`;
			sql += ` FROM ${query.table}`;

			const params: unknown[] = [];
			let paramIndex = 1;

			// WHERE 条件
			if (query.filter) {
				const whereClauses = Object.entries(query.filter).map(([key, value]) => {
					params.push(value);
					return `${key} = $${paramIndex++}`;
				});
				sql += ` WHERE ${whereClauses.join(' AND ')}`;
			}

			// 增量查询
			if (query.since && query.incrementalField) {
				params.push(query.since);
				sql += query.filter ? ' AND' : ' WHERE';
				sql += ` ${query.incrementalField} > $${paramIndex++}`;
			}

			// 排序
			if (query.orderBy) {
				sql += ` ORDER BY ${query.orderBy.map(o => `${o.field} ${o.direction}`).join(', ')}`;
			}

			// 分页
			if (query.limit) {
				sql += ` LIMIT $${paramIndex++}`;
				params.push(query.limit);
			}
			if (query.offset) {
				sql += ` OFFSET $${paramIndex++}`;
				params.push(query.offset);
			}

			const result = await this.pool.query(sql, params);

			// 转换为统一格式
			const rawData: RawData[] = result.rows.map(row => ({
				_sourceId: this.config.id,
				_id: row.id?.toString(),
				_timestamp: new Date(),
				_data: row,
				_metadata: {
					tenantId: this.config.tenantId,
					correlationId: randomUUID(),
					sourceType: this.type,
				},
			}));

			this.logger.info('数据查询成功', {
				table: query.table,
				rowCount: rawData.length,
			});

			return ok(rawData);
		} catch (error) {
			this.logger.error('数据查询失败', {
				table: query.table,
				error: error.message,
			});
			return fail(new QueryError(`查询失败：${error.message}`));
		}
	}

	async *streamData(query: DataQuery): AsyncIterable<Either<RawData, QueryError>> {
		if (!this.pool) {
			yield fail(new QueryError('未连接到数据库'));
			return;
		}

		const batchSize = 1000;
		let offset = 0;

		while (true) {
			const batchResult = await this.fetchData({
				...query,
				limit: batchSize,
				offset,
			});

			if (batchResult.isFail()) {
				yield batchResult;
				return;
			}

			const batch = batchResult.value;
			if (batch.length === 0) {
				break;
			}

			for (const row of batch) {
				yield ok(row);
			}

			offset += batchSize;

			// 如果批次数据少于批次大小，说明已经读取完毕
			if (batch.length < batchSize) {
				break;
			}
		}
	}
}
```

**验收标准**：
- ✅ 至少实现 3 种适配器（PostgreSQL、MySQL、REST API）
- ✅ 连接池正常工作
- ✅ 流式查询支持大数据量
- ✅ 错误处理和重试机制

---

#### 10.4 数据源健康监控（1 天）

**重构方案**：

```typescript
// libs/domains/data-ingestion/src/application/services/data-source-health.service.ts
/**
 * 数据源健康监控服务
 */
export class DataSourceHealthService {
	constructor(
		private readonly adapterRegistry: IDataSourceAdapterRegistry,
		private readonly healthRepo: IDataSourceHealthRepository,
		private readonly logger: ILogger,
	) {}

	/**
	 * 定期健康检查
	 */
	async startHealthCheck(intervalMs: number = 60000): Promise<void> {
		setInterval(async () => {
			await this.checkAllDataSources();
		}, intervalMs);
	}

	/**
	 * 检查所有数据源健康状态
	 */
	async checkAllDataSources(): Promise<void> {
		const dataSources = await this.adapterRegistry.getAllDataSources();

		for (const dataSource of dataSources) {
			try {
				const adapter = this.adapterRegistry.getAdapter(dataSource.type);
				const health = await adapter.getHealthStatus();

				await this.healthRepo.save({
					dataSourceId: dataSource.id,
					status: health.status,
					latency: health.latency,
					checkedAt: new Date(),
					errorMessage: health.errorMessage,
				});

				this.logger.info('数据源健康检查完成', {
					dataSourceId: dataSource.id,
					status: health.status,
					latency: health.latency,
				});
			} catch (error) {
				this.logger.error('数据源健康检查失败', {
					dataSourceId: dataSource.id,
					error: error.message,
				});
			}
		}
	}
}
```

**验收标准**：
- ✅ 健康检查定时执行
- ✅ 健康状态持久化
- ✅ 告警机制完善
- ✅ 监控面板显示

#### 9.1 集成事件基类设计（2 天）

**参考项目模式**：
```typescript
// 参考项目的集成事件设计
export class TodoCompletedIntegrationEvent extends Infra.EventBus
  .IntegrationEvent<IntegrationSchemas> {
  static versions = ['v1'];
  static versionMappers: Record<string, ToIntegrationDataMapper> = {
    v1: TodoCompletedIntegrationEvent.toIntegrationDataV1,
  };

  static create(event: TodoCompletedDomainEvent): TodoCompletedIntegrationEvent[] {
    return TodoCompletedIntegrationEvent.versions.map((version) => {
      const mapper = TodoCompletedIntegrationEvent.versionMappers[version];
      const data = mapper(event);
      return new TodoCompletedIntegrationEvent(data, version);
    });
  }

  static toIntegrationDataV1(event: TodoCompletedDomainEvent): IntegrationSchemaV1 {
    return {
      todoId: event.payload.aggregateId,
      userId: event.payload.userId,
    };
  }
}
```

**重构方案**：

```typescript
// libs/shared/eda/src/integration-event.base.ts
/**
 * 集成事件基类
 * 
 * 用于跨限界上下文通信的事件，支持版本控制
 */
export abstract class IntegrationEventBase<TPayload = unknown> {
	/**
	 * 事件 ID（全局唯一）
	 */
	readonly eventId: string;

	/**
	 * 事件名称
	 */
	abstract readonly eventName: string;

	/**
	 * 事件版本
	 */
	readonly version: string;

	/**
	 * 限界上下文 ID
	 */
	abstract readonly boundedContextId: string;

	/**
	 * 事件载荷
	 */
	readonly payload: TPayload;

	/**
	 * 事件元数据
	 */
	readonly metadata: {
		tenantId: string;
		userId: string;
		correlationId: string;
		causationId?: string;
		occurredAt: Date;
	};

	constructor(
		payload: TPayload,
		version: string,
		metadata: Partial<IntegrationEventBase['metadata']> = {},
	) {
		this.eventId = randomUUID();
		this.version = version;
		this.payload = payload;
		this.metadata = {
			tenantId: metadata.tenantId || '',
			userId: metadata.userId || '',
			correlationId: metadata.correlationId || randomUUID(),
			causationId: metadata.causationId,
			occurredAt: metadata.occurredAt || new Date(),
		};
	}

	/**
	 * 序列化为 JSON
	 */
	toJSON(): Record<string, unknown> {
		return {
			eventId: this.eventId,
			eventName: this.eventName,
			version: this.version,
			boundedContextId: this.boundedContextId,
			payload: this.payload,
			metadata: this.metadata,
		};
	}
}

// libs/domains/tenant/src/contracts/integration-events/tenant-created.integration-event.ts
/**
 * 租户创建集成事件
 * 
 * 用于跨限界上下文通知租户创建事件
 * 支持多版本以保持向后兼容
 */
export class TenantCreatedIntegrationEvent extends IntegrationEventBase<TenantCreatedPayloadV1 | TenantCreatedPayloadV2> {
	static readonly versions = ['v1', 'v2'] as const;
	static readonly boundedContextId = 'Tenant';
	static readonly eventName = 'tenant.created';

	readonly boundedContextId = TenantCreatedIntegrationEvent.boundedContextId;
	readonly eventName = TenantCreatedIntegrationEvent.eventName;

	/**
	 * 从领域事件创建集成事件（可能包含多个版本）
	 */
	static create(
		event: TenantCreatedDomainEvent,
	): TenantCreatedIntegrationEvent[] {
		return this.versions.map((version) => {
			const mapper = this.versionMappers[version];
			const data = mapper(event);
			return new TenantCreatedIntegrationEvent(
				data,
				version,
				event.metadata,
			);
		});
	}

	/**
	 * V1 版本：基础信息
	 */
	static toIntegrationDataV1(event: TenantCreatedDomainEvent): TenantCreatedPayloadV1 {
		return {
			tenantId: event.payload.tenantId,
			name: event.payload.name,
			slug: event.payload.slug,
			createdAt: event.payload.createdAt.toISOString(),
		};
	}

	/**
	 * V2 版本：增加租户类型和配额信息
	 */
	static toIntegrationDataV2(event: TenantCreatedDomainEvent): TenantCreatedPayloadV2 {
		return {
			...this.toIntegrationDataV1(event),
			type: event.payload.type,
			quota: event.payload.quota || {
				maxMembers: 10,
				maxStorage: 1024 * 1024 * 1024, // 1GB
			},
		};
	}

	static readonly versionMappers: Record<string, VersionMapper> = {
		v1: this.toIntegrationDataV1.bind(this),
		v2: this.toIntegrationDataV2.bind(this),
	};
}

export interface TenantCreatedPayloadV1 {
	tenantId: string;
	name: string;
	slug: string;
	createdAt: string;
}

export interface TenantCreatedPayloadV2 extends TenantCreatedPayloadV1 {
	type: TenantType;
	quota: {
		maxMembers: number;
		maxStorage: number;
	};
}
```

**验收标准**：
- ✅ 所有集成事件继承 `IntegrationEventBase`
- ✅ 支持多版本并存
- ✅ 从领域事件自动生成集成事件
- ✅ 集成事件只包含简单类型

---

#### 9.2 事件处理器转换（2 天）

**重构方案**：

```typescript
// libs/domains/tenant/src/application/handlers/events/tenant-created.handler.ts
/**
 * 租户创建事件处理器
 * 
 * 负责将领域事件转换为集成事件并发布
 */
export class TenantCreatedEventHandler {
	constructor(private readonly eventBus: IntegrationEventBus) {}

	@OnEvent(TenantCreatedDomainEvent.eventName)
	async handle(event: TenantCreatedDomainEvent): Promise<void> {
		// 将领域事件转换为集成事件（可能包含多个版本）
		const integrationEvents = TenantCreatedIntegrationEvent.create(event);

		// 发布所有版本的集成事件
		for (const integrationEvent of integrationEvents) {
			await this.eventBus.publish(integrationEvent);
		}

		this.logger.info('租户创建集成事件已发布', {
			tenantId: event.payload.tenantId,
			eventId: event.eventId,
			versions: integrationEvents.map((e) => e.version),
		});
	}
}

// libs/domains/identity/src/application/handlers/events/tenant-created.handler.ts
/**
 * Identity 限界上下文订阅租户创建事件
 * 
 * 当租户创建时，在 Identity 上下文中创建对应的身份配置
 */
export class TenantCreatedIntegrationEventHandler {
	constructor(
		private readonly identityConfigRepository: IIdentityConfigRepository,
	) {}

	@OnEvent('tenant.created')
	async handle(event: TenantCreatedIntegrationEvent): Promise<void> {
		// 根据版本选择不同的处理逻辑
		switch (event.version) {
			case 'v1':
				await this.handleV1(event as TenantCreatedPayloadV1);
				break;
			case 'v2':
				await this.handleV2(event as TenantCreatedPayloadV2);
				break;
			default:
				this.logger.warn('未知的集成事件版本', {
					version: event.version,
					eventId: event.eventId,
				});
		}
	}

	private async handleV1(payload: TenantCreatedPayloadV1): Promise<void> {
		// V1 版本处理逻辑
		const config = IdentityConfig.create({
			tenantId: payload.tenantId,
			authProvider: 'local', // 默认使用本地认证
			createdAt: new Date(payload.createdAt),
		});

		await this.identityConfigRepository.save(config);
	}

	private async handleV2(payload: TenantCreatedPayloadV2): Promise<void> {
		// V2 版本处理逻辑（包含配额信息）
		const config = IdentityConfig.create({
			tenantId: payload.tenantId,
			authProvider: 'local',
			quota: payload.quota,
			createdAt: new Date(payload.createdAt),
		});

		await this.identityConfigRepository.save(config);
	}
}
```

**验收标准**：
- ✅ 所有领域事件都有对应的集成事件
- ✅ 集成事件通过 Outbox 机制发布
- ✅ 消费者支持多版本处理
- ✅ 版本不匹配时有明确的警告日志

---

#### 9.3 Schema 契约定义（2 天）

**重构方案**：

```typescript
// libs/contracts/src/tenant/tenant-created.v1.schema.ts
/**
 * 租户创建集成事件 V1 Schema
 * 
 * 定义 V1 版本的事件契约
 */
export const TenantCreatedV1Schema = {
	$id: 'tenant.created.v1',
	type: 'object',
	required: ['tenantId', 'name', 'slug', 'createdAt'],
	properties: {
		tenantId: {
			type: 'string',
			format: 'uuid',
			description: '租户唯一标识',
		},
		name: {
			type: 'string',
			minLength: 2,
			maxLength: 100,
			description: '租户名称',
		},
		slug: {
			type: 'string',
			pattern: '^[a-z0-9-]+$',
			description: '租户标识',
		},
		createdAt: {
			type: 'string',
			format: 'date-time',
			description: '创建时间（ISO 8601 格式）',
		},
	},
	additionalProperties: false,
} as const;

// libs/contracts/src/tenant/tenant-created.v2.schema.ts
/**
 * 租户创建集成事件 V2 Schema
 * 
 * 定义 V2 版本的事件契约（扩展 V1）
 */
export const TenantCreatedV2Schema = {
	$id: 'tenant.created.v2',
	type: 'object',
	required: ['tenantId', 'name', 'slug', 'createdAt', 'type', 'quota'],
	properties: {
		// 继承 V1 的所有字段
		...TenantCreatedV1Schema.properties,
		// V2 新增字段
		type: {
			type: 'string',
			enum: ['ORGANIZATION', 'PERSONAL', 'ENTERPRISE'],
			description: '租户类型',
		},
		quota: {
			type: 'object',
			required: ['maxMembers', 'maxStorage'],
			properties: {
				maxMembers: {
					type: 'integer',
					minimum: 1,
					description: '最大成员数',
				},
				maxStorage: {
					type: 'integer',
					minimum: 1048576, // 1MB
					description: '最大存储空间（字节）',
				},
			},
		},
	},
	additionalProperties: false,
} as const;

// libs/contracts/src/tenant/index.ts
/**
 * 租户集成事件契约导出
 */
export * from './tenant-created.v1.schema';
export * from './tenant-created.v2.schema';

/**
 * 所有版本的租户创建事件 Schema
 */
export const TenantCreatedSchemas = {
	v1: TenantCreatedV1Schema,
	v2: TenantCreatedV2Schema,
};
```

**验收标准**：
- ✅ 所有集成事件都有对应的 JSON Schema
- ✅ Schema 版本化管理
- ✅ Schema 可用于验证和文档生成
- ✅ Schema 发布到独立的 `@oksai/contracts` 包

---

### Phase 11：数据转换管道（6 天）【P1 优先级 - 支持数据仓库】

**目标**：构建数据标准化和转换管道，为异构系统数据仓库提供统一的数据格式。

**核心价值**：
- ✅ Schema 映射和转换
- ✅ 数据验证和清洗
- ✅ 数据增强和标准化
- ✅ 数据血缘追踪

#### 11.1 Schema 管理系统（3 天）

**重构方案**：

```typescript
// libs/domains/data-warehouse/src/domain/aggregates/data-schema.aggregate.ts
/**
 * 数据 Schema 聚合根
 * 
 * 管理异构系统的 Schema 定义和演进
 */
export class DataSchemaAggregate extends AggregateRoot<DataSchemaEvent> {
	private constructor(
		private readonly _id: SchemaId,
		private _name: SchemaName,
		private _version: SchemaVersion,
		private _fields: SchemaField[],
		private _mappings: FieldMapping[],
		private _status: SchemaStatus,
	) {
		super();
	}

	/**
	 * 创建新 Schema
	 */
	public static create(
		props: CreateSchemaProps,
	): Either<DataSchemaAggregate, DomainException> {
		const schema = new DataSchemaAggregate(
			SchemaId.generate(),
			SchemaName.create(props.name).value as SchemaName,
			SchemaVersion.create('1.0.0').value as SchemaVersion,
			props.fields,
			props.mappings || [],
			SchemaStatus.ACTIVE,
		);

		schema.addEvent(new SchemaCreatedEvent({
			schemaId: schema.id.value,
			name: schema.name.value,
			version: schema.version.value,
			fieldCount: schema.fields.length,
		}));

		return ok(schema);
	}

	/**
	 * 演进 Schema（新增版本）
	 */
	public evolve(
		newFields: SchemaField[],
		migrations?: FieldMigration[],
	): Either<DataSchemaAggregate, DomainException> {
		// 验证演进规则
		const ruleError = BusinessRuleValidator.validate(
			new SchemaEvolutionRule(this._fields, newFields),
		);

		if (ruleError) {
			return fail(ruleError);
		}

		// 创建新版本
		const newVersion = this._version.increment();
		const evolvedSchema = new DataSchemaAggregate(
			this._id,
			this._name,
			newVersion,
			newFields,
			this._mappings,
			SchemaStatus.ACTIVE,
		);

		evolvedSchema.addEvent(new SchemaEvolvedEvent({
			schemaId: evolvedSchema.id.value,
			oldVersion: this._version.value,
			newVersion: newVersion.value,
			migrations: migrations || [],
		}));

		return ok(evolvedSchema);
	}

	/**
	 * 验证数据是否符合 Schema
	 */
	public validateData(data: Record<string, unknown>): Either<void, ValidationError[]> {
		const errors: ValidationError[] = [];

		for (const field of this._fields) {
			const value = data[field.name];

			// 必填字段检查
			if (field.required && (value === undefined || value === null)) {
				errors.push(new ValidationError(
					`字段 ${field.name} 是必填的`,
					field.name,
					value,
				));
				continue;
			}

			// 类型检查
			if (value !== undefined && value !== null) {
				if (!this.validateType(value, field.type)) {
					errors.push(new ValidationError(
						`字段 ${field.name} 类型错误，期望 ${field.type}，实际 ${typeof value}`,
						field.name,
						value,
					));
				}
			}

			// 自定义验证规则
			if (field.validationRules) {
				for (const rule of field.validationRules) {
					if (!rule.validate(value)) {
						errors.push(new ValidationError(
							rule.errorMessage,
							field.name,
							value,
						));
					}
				}
			}
		}

		return errors.length > 0 ? fail(errors) : ok();
	}

	private validateType(value: unknown, type: FieldType): boolean {
		switch (type) {
			case FieldType.STRING:
				return typeof value === 'string';
			case FieldType.NUMBER:
				return typeof value === 'number';
			case FieldType.BOOLEAN:
				return typeof value === 'boolean';
			case FieldType.DATE:
				return value instanceof Date || !isNaN(Date.parse(value as string));
			case FieldType.OBJECT:
				return typeof value === 'object' && value !== null;
			case FieldType.ARRAY:
				return Array.isArray(value);
			default:
				return true;
		}
	}
}

// libs/domains/data-warehouse/src/domain/value-objects/schema-field.vo.ts
/**
 * Schema 字段定义
 */
export interface SchemaField {
	name: string;
	type: FieldType;
	required: boolean;
	description?: string;
	default?: unknown;
	validationRules?: FieldValidationRule[];
	metadata?: Record<string, unknown>;
}

export enum FieldType {
	STRING = 'STRING',
	NUMBER = 'NUMBER',
	BOOLEAN = 'BOOLEAN',
	DATE = 'DATE',
	OBJECT = 'OBJECT',
	ARRAY = 'ARRAY',
	BINARY = 'BINARY',
	GEOPOINT = 'GEOPOINT',
}

/**
 * 字段验证规则
 */
export interface FieldValidationRule {
	name: string;
	validate: (value: unknown) => boolean;
	errorMessage: string;
}
```

**验收标准**：
- ✅ Schema 聚合根完整实现
- ✅ Schema 演进机制正常工作
- ✅ 数据验证覆盖所有类型
- ✅ Schema 版本控制完整

---

#### 11.2 数据转换管道（2 天）

**重构方案**：

```typescript
// libs/domains/data-warehouse/src/application/services/data-transformation.service.ts
/**
 * 数据转换服务
 * 
 * 将异构数据转换为统一格式
 */
export class DataTransformationService {
	constructor(
		private readonly schemaRepo: IDataSchemaRepository,
		private readonly logger: ILogger,
	) {}

	/**
	 * 转换数据
	 */
	async transform(
		rawData: RawData[],
		targetSchemaId: string,
	): Promise<Either<TransformedData[], TransformationError>> {
		// 加载目标 Schema
		const schema = await this.schemaRepo.findById(targetSchemaId);
		if (!schema) {
			return fail(new TransformationError('目标 Schema 不存在'));
		}

		const transformedData: TransformedData[] = [];
		const errors: TransformationError[] = [];

		for (const raw of rawData) {
			try {
				// 1. Schema 映射
				const mappedData = this.applyMapping(raw._data, schema.mappings);

				// 2. 数据验证
				const validationResult = schema.validateData(mappedData);
				if (validationResult.isFail()) {
					errors.push(new TransformationError(
						`数据验证失败：${validationResult.value.map(e => e.message).join(', ')}`,
						raw._metadata.correlationId,
					));
					continue;
				}

				// 3. 数据清洗
				const cleanedData = this.cleanData(mappedData);

				// 4. 数据增强
				const enrichedData = this.enrichData(cleanedData, raw._metadata);

				// 5. 构建转换后的数据
				transformedData.push({
					id: raw._id || randomUUID(),
					schemaId: schema.id.value,
					schemaVersion: schema.version.value,
					data: enrichedData,
					metadata: {
						...raw._metadata,
						transformedAt: new Date(),
						transformationBatchId: randomUUID(),
					},
					lineage: {
						sourceId: raw._sourceId,
						sourceType: raw._metadata.sourceType,
						sourceTimestamp: raw._timestamp,
					},
				});
			} catch (error) {
				this.logger.error('数据转换失败', {
					sourceId: raw._sourceId,
					error: error.message,
				});
				errors.push(new TransformationError(error.message, raw._metadata.correlationId));
			}
		}

		if (errors.length > 0 && transformedData.length === 0) {
			return fail(new TransformationError('所有数据转换失败'));
		}

		this.logger.info('数据转换完成', {
			totalCount: rawData.length,
			successCount: transformedData.length,
			errorCount: errors.length,
		});

		return ok(transformedData);
	}

	/**
	 * 应用字段映射
	 */
	private applyMapping(
		data: Record<string, unknown>,
		mappings: FieldMapping[],
	): Record<string, unknown> {
		if (mappings.length === 0) {
			return data;
		}

		const mappedData: Record<string, unknown> = {};

		for (const mapping of mappings) {
			const sourceValue = this.getNestedValue(data, mapping.sourceField);
			
			if (sourceValue !== undefined) {
				// 应用转换函数
				const transformedValue = mapping.transformFunction
					? mapping.transformFunction(sourceValue)
					: sourceValue;

				this.setNestedValue(mappedData, mapping.targetField, transformedValue);
			} else if (mapping.defaultValue !== undefined) {
				this.setNestedValue(mappedData, mapping.targetField, mapping.defaultValue);
			}
		}

		return mappedData;
	}

	/**
	 * 数据清洗
	 */
	private cleanData(data: Record<string, unknown>): Record<string, unknown> {
		const cleaned: Record<string, unknown> = {};

		for (const [key, value] of Object.entries(data)) {
			// 移除 null 和 undefined
			if (value === null || value === undefined) {
				continue;
			}

			// 字符串修剪
			if (typeof value === 'string') {
				cleaned[key] = value.trim();
			}
			// 日期格式化
			else if (value instanceof Date) {
				cleaned[key] = value.toISOString();
			}
			// 递归清洗对象
			else if (typeof value === 'object' && !Array.isArray(value)) {
				cleaned[key] = this.cleanData(value as Record<string, unknown>);
			}
			// 递归清洗数组
			else if (Array.isArray(value)) {
				cleaned[key] = value.map(item => {
					if (typeof item === 'object' && item !== null) {
						return this.cleanData(item);
					}
					return item;
				});
			}
			else {
				cleaned[key] = value;
			}
		}

		return cleaned;
	}

	/**
	 * 数据增强
	 */
	private enrichData(
		data: Record<string, unknown>,
		metadata: RawData['_metadata'],
	): Record<string, unknown> {
		return {
			...data,
			_enriched: {
				enrichedAt: new Date(),
				tenantId: metadata.tenantId,
				sourceType: metadata.sourceType,
				correlationId: metadata.correlationId,
			},
		};
	}

	/**
	 * 获取嵌套值
	 */
	private getNestedValue(obj: Record<string, unknown>, path: string): unknown {
		return path.split('.').reduce((current, key) => {
			return current && typeof current === 'object' ? (current as Record<string, unknown>)[key] : undefined;
		}, obj as unknown);
	}

	/**
	 * 设置嵌套值
	 */
	private setNestedValue(
		obj: Record<string, unknown>,
		path: string,
		value: unknown,
	): void {
		const keys = path.split('.');
		const lastKey = keys.pop()!;
		
		const target = keys.reduce((current, key) => {
			if (!current[key]) {
				current[key] = {};
			}
			return current[key] as Record<string, unknown>;
		}, obj);

		target[lastKey] = value;
	}
}

/**
 * 字段映射定义
 */
export interface FieldMapping {
	sourceField: string;      // 源字段路径（支持嵌套）
	targetField: string;      // 目标字段路径（支持嵌套）
	transformFunction?: (value: unknown) => unknown;  // 转换函数
	defaultValue?: unknown;   // 默认值
}

/**
 * 转换后的数据
 */
export interface TransformedData {
	id: string;
	schemaId: string;
	schemaVersion: string;
	data: Record<string, unknown>;
	metadata: {
		tenantId: string;
		transformedAt: Date;
		transformationBatchId: string;
		correlationId: string;
	};
	lineage: {
		sourceId: string;
		sourceType: DataSourceType;
		sourceTimestamp: Date;
	};
}
```

**验收标准**：
- ✅ 数据转换管道正常工作
- ✅ 支持复杂嵌套映射
- ✅ 数据清洗覆盖常见场景
- ✅ 错误处理完善

---

#### 11.3 数据血缘追踪（1 天）

**重构方案**：

```typescript
// libs/domains/data-warehouse/src/application/services/data-lineage.service.ts
/**
 * 数据血缘追踪服务
 * 
 * 记录数据从源头到目标的完整流转路径
 */
export class DataLineageService {
	constructor(
		private readonly lineageRepo: IDataLineageRepository,
		private readonly logger: ILogger,
	) {}

	/**
	 * 记录数据血缘
	 */
	async recordLineage(
		sourceData: RawData,
		transformedData: TransformedData,
	): Promise<void> {
		const lineage: DataLineage = {
			id: randomUUID(),
			targetDataId: transformedData.id,
			schemaId: transformedData.schemaId,
			schemaVersion: transformedData.schemaVersion,
			tenantId: transformedData.metadata.tenantId,
			
			// 源数据信息
			source: {
				sourceId: sourceData._sourceId,
				sourceType: sourceData._metadata.sourceType,
				sourceTimestamp: sourceData._timestamp,
				correlationId: sourceData._metadata.correlationId,
			},

			// 转换信息
			transformation: {
				transformedAt: transformedData.metadata.transformedAt,
				batchId: transformedData.metadata.transformationBatchId,
			},

			// 审计信息
			audit: {
				createdAt: new Date(),
				createdBy: transformedData.metadata.tenantId,
			},
		};

		await this.lineageRepo.save(lineage);

		this.logger.info('数据血缘已记录', {
			lineageId: lineage.id,
			targetDataId: lineage.targetDataId,
			sourceId: lineage.source.sourceId,
		});
	}

	/**
	 * 查询数据血缘
	 */
	async queryLineage(dataId: string): Promise<DataLineage[]> {
		return await this.lineageRepo.findByTargetDataId(dataId);
	}

	/**
	 * 反向追溯数据来源
	 */
	async traceBackwards(dataId: string): Promise<DataLineageChain> {
		const chain: DataLineageChain = {
			dataId,
			sources: [],
		};

		let currentDataId = dataId;
		let depth = 0;
		const maxDepth = 10; // 最大追溯深度

		while (depth < maxDepth) {
			const lineages = await this.lineageRepo.findByTargetDataId(currentDataId);
			
			if (lineages.length === 0) {
				break;
			}

			for (const lineage of lineages) {
				chain.sources.push({
					sourceId: lineage.source.sourceId,
					sourceType: lineage.source.sourceType,
					timestamp: lineage.source.sourceTimestamp,
					depth,
				});

				// 继续向上追溯
				currentDataId = lineage.source.sourceId;
			}

			depth++;
		}

		return chain;
	}
}

/**
 * 数据血缘记录
 */
export interface DataLineage {
	id: string;
	targetDataId: string;
	schemaId: string;
	schemaVersion: string;
	tenantId: string;
	
	source: {
		sourceId: string;
		sourceType: DataSourceType;
		sourceTimestamp: Date;
		correlationId: string;
	};

	transformation: {
		transformedAt: Date;
		batchId: string;
	};

	audit: {
		createdAt: Date;
		createdBy: string;
	};
}

/**
 * 数据血缘链
 */
export interface DataLineageChain {
	dataId: string;
	sources: Array<{
		sourceId: string;
		sourceType: DataSourceType;
		timestamp: Date;
		depth: number;
	}>;
}
```

**验收标准**：
- ✅ 数据血缘完整记录
- ✅ 支持反向追溯
- ✅ 血缘查询性能优化
- ✅ 血缘可视化支持

---

### Phase 12：数据湖架构（10 天）【P2 优先级 - 支持数据仓库】

**目标**：构建多租户数据湖架构，为异构系统提供统一的数据仓库。

**核心价值**：
- ✅ 多租户数据隔离
- ✅ 分层存储（Raw/Processed/Curated）
- ✅ Schema Evolution 支持
- ✅ 数据生命周期管理

#### 12.1 数据湖存储架构（4 天）

**重构方案**：

```typescript
// libs/domains/data-lake/src/domain/aggregates/data-lake.aggregate.ts
/**
 * 数据湖聚合根
 * 
 * 管理租户的数据湖配置和存储
 */
export class DataLakeAggregate extends AggregateRoot<DataLakeEvent> {
	private constructor(
		private readonly _id: DataLakeId,
		private readonly _tenantId: TenantId,
		private _storageConfig: DataLakeStorageConfig,
		private _retentionPolicy: RetentionPolicy,
		private _quotas: DataLakeQuota,
	) {
		super();
	}

	/**
	 * 创建数据湖
	 */
	public static create(
		props: CreateDataLakeProps,
	): Either<DataLakeAggregate, DomainException> {
		const dataLake = new DataLakeAggregate(
			DataLakeId.generate(),
			props.tenantId,
			props.storageConfig,
			props.retentionPolicy,
			props.quotas,
		);

		dataLake.addEvent(new DataLakeCreatedEvent({
			dataLakeId: dataLake.id.value,
			tenantId: dataLake.tenantId.value,
			storageType: dataLake.storageConfig.type,
		}));

		return ok(dataLake);
	}

	/**
	 * 存储原始数据（Raw Zone）
	 */
	public async storeRawData(
		data: TransformedData[],
		adapter: IDataLakeStorageAdapter,
	): Promise<Either<StorageResult, DomainException>> {
		// 检查存储配额
		const currentUsage = await adapter.getStorageUsage(this._tenantId.value);
		const dataSize = this.calculateDataSize(data);

		if (currentUsage + dataSize > this._quotas.maxStorage) {
			return fail(new DomainException('存储配额已用尽'));
		}

		// 存储 Parquet 格式（列式存储，适合分析）
		const result = await adapter.store({
			tenantId: this._tenantId.value,
			zone: 'raw',
			data: data,
			format: 'parquet',
			partitionBy: ['_metadata.tenantId', 'schemaId'],
		});

		this.addEvent(new RawDataStoredEvent({
			dataLakeId: this.id.value,
			tenantId: this._tenantId.value,
			recordCount: data.length,
			dataSize: dataSize,
			zone: 'raw',
		}));

		return ok(result);
	}

	/**
	 * 处理数据并存储到 Processed Zone
	 */
	public async storeProcessedData(
		rawDataPath: string,
		processingPipeline: IDataProcessingPipeline,
		adapter: IDataLakeStorageAdapter,
	): Promise<Either<StorageResult, DomainException>> {
		// 执行数据处理管道
		const processedData = await processingPipeline.process(rawDataPath);

		// 存储 Delta Lake 格式（支持 ACID 事务）
		const result = await adapter.store({
			tenantId: this._tenantId.value,
			zone: 'processed',
			data: processedData,
			format: 'delta',
			partitionBy: ['_metadata.tenantId', 'schemaId', 'year', 'month'],
		});

		this.addEvent(new ProcessedDataStoredEvent({
			dataLakeId: this.id.value,
			tenantId: this._tenantId.value,
			sourcePath: rawDataPath,
			targetPath: result.path,
			zone: 'processed',
		}));

		return ok(result);
	}

	/**
	 * 执行数据保留策略
	 */
	public async applyRetentionPolicy(
		adapter: IDataLakeStorageAdapter,
	): Promise<void> {
		const now = new Date();

		// Raw Zone 保留策略
		if (this._retentionPolicy.rawZoneRetentionDays) {
			const cutoffDate = new Date(
				now.getTime() - this._retentionPolicy.rawZoneRetentionDays * 24 * 60 * 60 * 1000,
			);
			await adapter.deleteOldData(this._tenantId.value, 'raw', cutoffDate);
		}

		// Processed Zone 保留策略
		if (this._retentionPolicy.processedZoneRetentionDays) {
			const cutoffDate = new Date(
				now.getTime() - this._retentionPolicy.processedZoneRetentionDays * 24 * 60 * 60 * 1000,
			);
			await adapter.deleteOldData(this._tenantId.value, 'processed', cutoffDate);
		}

		this.addEvent(new RetentionPolicyAppliedEvent({
			dataLakeId: this.id.value,
			tenantId: this._tenantId.value,
			appliedAt: now,
		}));
	}

	private calculateDataSize(data: TransformedData[]): number {
		// 计算数据大小（字节数）
		return JSON.stringify(data).length;
	}
}

// libs/domains/data-lake/src/domain/value-objects/data-lake-config.vo.ts
/**
 * 数据湖存储配置
 */
export interface DataLakeStorageConfig {
	type: StorageType;
	bucket?: string;           // S3/MinIO bucket 名称
	prefix?: string;           // 存储前缀
	region?: string;           // AWS 区域
	endpoint?: string;         // 自定义端点（MinIO）
}

export enum StorageType {
	S3 = 'S3',                 // AWS S3
	MINIO = 'MINIO',           // MinIO（自托管）
	AZURE_BLOB = 'AZURE_BLOB', // Azure Blob Storage
	GCS = 'GCS',               // Google Cloud Storage
	LOCAL = 'LOCAL',           // 本地存储（开发环境）
}

/**
 * 数据湖分层
 */
export enum DataLakeZone {
	RAW = 'raw',               // 原始数据区
	PROCESSED = 'processed',   // 处理后的数据区
	CURATED = 'curated',       // 精选数据区
}

/**
 * 保留策略
 */
export interface RetentionPolicy {
	rawZoneRetentionDays?: number;        // Raw Zone 保留天数
	processedZoneRetentionDays?: number;  // Processed Zone 保留天数
	curatedZoneRetentionDays?: number;    // Curated Zone 保留天数
	archiveAfterDays?: number;            // 归档天数
	deleteAfterDays?: number;             // 删除天数
}

/**
 * 数据湖配额
 */
export interface DataLakeQuota {
	maxStorage: number;       // 最大存储空间（字节）
	maxTables: number;        // 最大表数量
	maxPartitions: number;    // 最大分区数量
}
```

**验收标准**：
- ✅ 数据湖聚合根完整实现
- ✅ 三层存储架构正常工作
- ✅ 保留策略自动执行
- ✅ 多租户隔离完善

---

#### 12.2 Delta Lake 集成（3 天）

**重构方案**：

```typescript
// libs/domains/data-lake/src/infrastructure/adapters/delta-lake-storage.adapter.ts
/**
 * Delta Lake 存储适配器
 * 
 * 支持 ACID 事务的湖仓一体存储
 */
export class DeltaLakeStorageAdapter implements IDataLakeStorageAdapter {
	constructor(
		private readonly sparkSession: SparkSession,
		private readonly logger: ILogger,
	) {}

	async store(params: StoreParams): Promise<StorageResult> {
		const path = this.buildPath(params);

		try {
			// 创建 DataFrame
			const df = this.sparkSession.createDataFrame(params.data);

			// 写入 Delta Lake
			await df.write
				.format('delta')
				.mode('append')
				.partitionBy(...params.partitionBy)
				.option('mergeSchema', 'true')  // 支持 Schema Evolution
				.save(path);

			// 获取表统计信息
			const stats = await this.getTableStats(path);

			this.logger.info('Delta Lake 数据存储成功', {
				path,
				recordCount: stats.recordCount,
				sizeInBytes: stats.sizeInBytes,
			});

			return {
				path,
				recordCount: stats.recordCount,
				sizeInBytes: stats.sizeInBytes,
				format: 'delta',
			};
		} catch (error) {
			this.logger.error('Delta Lake 数据存储失败', {
				path,
				error: error.message,
			});
			throw error;
		}
	}

	async query(sql: string): Promise<QueryResult> {
		try {
			const df = await this.sparkSession.sql(sql);
			const rows = await df.collect();

			return {
				rows,
				schema: df.schema,
			};
		} catch (error) {
			this.logger.error('Delta Lake 查询失败', {
				sql,
				error: error.message,
			});
			throw error;
		}
	}

	/**
	 * 时间旅行查询
	 */
	async queryAtTimestamp(
		tablePath: string,
		timestamp: Date,
		sql: string,
	): Promise<QueryResult> {
		const version = await this.getVersionAtTimestamp(tablePath, timestamp);
		
		const timeTravelSql = `
			SELECT * FROM delta.\`${tablePath}@v${version}\` 
			${sql}
		`;

		return await this.query(timeTravelSql);
	}

	/**
	 * Vacuum 清理旧版本
	 */
	async vacuum(tablePath: string, retentionHours: number = 168): Promise<void> {
		await this.sparkSession.sql(
			`VACUUM '${tablePath}' RETAIN ${retentionHours} HOURS`,
		);

		this.logger.info('Delta Lake Vacuum 完成', {
			tablePath,
			retentionHours,
		});
	}

	private buildPath(params: StoreParams): string {
		const parts = [
			params.tenantId,
			params.zone,
			params.format,
		];

		if (params.partitionBy) {
			parts.push(...params.partitionBy);
		}

		return `${params.basePath}/${parts.join('/')}`;
	}

	private async getTableStats(path: string): Promise<TableStats> {
		const detail = await this.sparkSession.sql(
			`DESCRIBE DETAIL '${path}'`,
		);
		const stats = await detail.collect();

		return {
			recordCount: stats[0].numRows,
			sizeInBytes: stats[0].sizeInBytes,
		};
	}
}

/**
 * 存储参数
 */
export interface StoreParams {
	tenantId: string;
	zone: DataLakeZone;
	data: TransformedData[];
	format: 'parquet' | 'delta' | 'avro' | 'json';
	partitionBy: string[];
	basePath?: string;
}

/**
 * 存储结果
 */
export interface StorageResult {
	path: string;
	recordCount: number;
	sizeInBytes: number;
	format: string;
}
```

**验收标准**：
- ✅ Delta Lake 集成正常
- ✅ ACID 事务支持
- ✅ 时间旅行查询正常
- ✅ Vacuum 清理正常

---

### Phase 13：AI 能力嵌入（14 天）【P2 优先级 - 支持 AI 嵌入】

**目标**：为平台嵌入 AI 能力，包括向量数据库集成、AI 推理服务、智能分析等。

**核心价值**：
- ✅ 向量嵌入和相似性搜索
- ✅ AI 推理服务集成
- ✅ 智能分类和推荐
- ✅ AI 增强的领域模型

#### 13.1 AI 领域建模（3 天）

**重构方案**：

```typescript
// libs/domains/ai/src/domain/aggregates/ai-model.aggregate.ts
/**
 * AI 模型聚合根
 * 
 * 管理 AI 模型的生命周期和配置
 */
export class AIModelAggregate extends AggregateRoot<AIModelEvent> {
	private constructor(
		private readonly _id: ModelId,
		private _name: ModelName,
		private _type: ModelType,
		private _provider: AIProvider,
		private _version: ModelVersion,
		private _config: ModelConfig,
		private _status: ModelStatus,
		private _metrics?: ModelMetrics,
	) {
		super();
	}

	/**
	 * 注册新 AI 模型
	 */
	public static register(
		props: RegisterModelProps,
	): Either<AIModelAggregate, DomainException> {
		const model = new AIModelAggregate(
			ModelId.generate(),
			ModelName.create(props.name).value as ModelName,
			props.type,
			props.provider,
			ModelVersion.create(props.version).value as ModelVersion,
			props.config,
			ModelStatus.INACTIVE,
		);

		model.addEvent(new AIModelRegisteredEvent({
			modelId: model.id.value,
			name: model.name.value,
			type: model.type,
			provider: model.provider,
			version: model.version.value,
		}));

		return ok(model);
	}

	/**
	 * 激活模型
	 */
	public async activate(
		adapter: IAIInferenceAdapter,
	): Promise<Either<void, DomainException>> {
		if (this._status === ModelStatus.ACTIVE) {
			return fail(new DomainException('模型已激活'));
		}

		// 测试模型可用性
		const testResult = await adapter.testModel(this._id.value);
		if (testResult.isFail()) {
			return fail(new DomainException(`模型测试失败：${testResult.value.message}`));
		}

		this._status = ModelStatus.ACTIVE;

		this.addEvent(new AIModelActivatedEvent({
			modelId: this.id.value,
			activatedAt: new Date(),
		}));

		return ok();
	}

	/**
	 * 记录模型性能指标
	 */
	public recordMetrics(metrics: ModelMetrics): void {
		this._metrics = metrics;

		this.addEvent(new AIModelMetricsRecordedEvent({
			modelId: this.id.value,
			metrics: {
				accuracy: metrics.accuracy,
				latency: metrics.latency,
				requestCount: metrics.requestCount,
				errorRate: metrics.errorRate,
			},
		}));
	}
}

// libs/domains/ai/src/domain/entities/ai-embedding.entity.ts
/**
 * AI 嵌入实体
 * 
 * 存储数据的向量嵌入
 */
export class AIEmbeddingEntity extends Entity<AIEmbeddingProps> {
	/**
	 * 创建嵌入
	 */
	public static create(
		props: CreateEmbeddingProps,
	): Either<AIEmbeddingEntity, DomainException> {
		const embedding = new AIEmbeddingEntity({
			id: EntityId.generate(),
			entityId: props.entityId,
			entityType: props.entityType,
			vector: props.vector,
			modelId: props.modelId,
			text: props.text,
			createdAt: new Date(),
		});

		return ok(embedding);
	}

	/**
	 * 计算余弦相似度
	 */
	public cosineSimilarity(other: AIEmbeddingEntity): number {
		const vec1 = this.props.vector;
		const vec2 = other.props.vector;

		if (vec1.length !== vec2.length) {
			throw new Error('向量维度不匹配');
		}

		let dotProduct = 0;
		let norm1 = 0;
		let norm2 = 0;

		for (let i = 0; i < vec1.length; i++) {
			dotProduct += vec1[i] * vec2[i];
			norm1 += vec1[i] * vec1[i];
			norm2 += vec2[i] * vec2[i];
		}

		return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
	}
}

// libs/domains/ai/src/domain/value-objects/model-type.vo.ts
/**
 * AI 模型类型
 */
export enum ModelType {
	EMBEDDING = 'EMBEDDING',         // 文本嵌入
	CLASSIFICATION = 'CLASSIFICATION', // 文本分类
	SENTIMENT = 'SENTIMENT',         // 情感分析
	SUMMARIZATION = 'SUMMARIZATION',  // 文本摘要
	TRANSLATION = 'TRANSLATION',     // 翻译
	QUESTION_ANSWERING = 'QA',       // 问答
	COMPLETION = 'COMPLETION',       // 文本补全
}

/**
 * AI 服务提供商
 */
export enum AIProvider {
	OPENAI = 'OPENAI',
	AZURE_OPENAI = 'AZURE_OPENAI',
	AWS_BEDROCK = 'AWS_BEDROCK',
	GOOGLE_VERTEX = 'GOOGLE_VERTEX',
	ANTHROPIC = 'ANTHROPIC',
	LOCAL = 'LOCAL',  // 本地模型
}
```

**验收标准**：
- ✅ AI 领域模型完整
- ✅ 支持多种 AI 模型类型
- ✅ 支持多个 AI 服务提供商
- ✅ 性能指标追踪完善

---

#### 13.2 向量数据库集成（4 天）

**重构方案**：

```typescript
// libs/domains/ai/src/application/ports/vector-database.port.ts
/**
 * 向量数据库端口
 * 
 * Hexagonal Architecture 的 Driven Port
 */
export interface IVectorDatabase {
	/**
	 * 插入向量
	 */
	insertVector(params: InsertVectorParams): Promise<Either<void, VectorDBError>>;

	/**
	 * 批量插入向量
	 */
	insertBatch(params: InsertBatchParams): Promise<Either<void, VectorDBError>>;

	/**
	 * 相似性搜索
	 */
	searchSimilar(params: SearchSimilarParams): Promise<Either<SearchResult[], VectorDBError>>;

	/**
	 * 删除向量
	 */
	deleteVector(id: string): Promise<Either<void, VectorDBError>>;

	/**
	 * 更新向量
	 */
	updateVector(params: UpdateVectorParams): Promise<Either<void, VectorDBError>>;
}

// libs/domains/ai/src/infrastructure/adapters/pinecone-vector-db.adapter.ts
/**
 * Pinecone 向量数据库适配器
 */
export class PineconeVectorDBAdapter implements IVectorDatabase {
	private client: PineconeClient;
	private index: Index;

	constructor(
		private readonly config: PineconeConfig,
		private readonly logger: ILogger,
	) {
		this.client = new PineconeClient(config);
	}

	async connect(): Promise<void> {
		await this.client.init({
			apiKey: this.config.apiKey,
			environment: this.config.environment,
		});

		this.index = this.client.Index(this.config.indexName);
		
		this.logger.info('Pinecone 连接成功', {
			indexName: this.config.indexName,
		});
	}

	async insertVector(params: InsertVectorParams): Promise<Either<void, VectorDBError>> {
		try {
			const vector: PineconeVector = {
				id: params.id,
				values: params.vector,
				metadata: params.metadata || {},
			};

			await this.index.upsert({
				vectors: [vector],
				namespace: params.namespace,
			});

			this.logger.info('向量插入成功', {
				vectorId: params.id,
				namespace: params.namespace,
			});

			return ok();
		} catch (error) {
			this.logger.error('向量插入失败', {
				vectorId: params.id,
				error: error.message,
			});
			return fail(new VectorDBError(`向量插入失败：${error.message}`));
		}
	}

	async searchSimilar(
		params: SearchSimilarParams,
	): Promise<Either<SearchResult[], VectorDBError>> {
		try {
			const queryRequest: QueryRequest = {
				vector: params.vector,
				topK: params.topK || 10,
				includeMetadata: params.includeMetadata ?? true,
				includeValues: params.includeValues ?? false,
				namespace: params.namespace,
				filter: params.filter,
			};

			const response = await this.index.query(queryRequest);

			const results: SearchResult[] = response.matches.map(match => ({
				id: match.id,
				score: match.score,
				metadata: match.metadata,
				vector: match.values,
			}));

			this.logger.info('相似性搜索完成', {
				resultCount: results.length,
				topScore: results[0]?.score,
			});

			return ok(results);
		} catch (error) {
			this.logger.error('相似性搜索失败', {
				error: error.message,
			});
			return fail(new VectorDBError(`搜索失败：${error.message}`));
		}
	}
}

/**
 * 向量插入参数
 */
export interface InsertVectorParams {
	id: string;
	vector: number[];
	metadata?: Record<string, unknown>;
	namespace?: string;
}

/**
 * 相似性搜索参数
 */
export interface SearchSimilarParams {
	vector: number[];
	topK?: number;
	includeMetadata?: boolean;
	includeValues?: boolean;
	namespace?: string;
	filter?: Record<string, unknown>;
}

/**
 * 搜索结果
 */
export interface SearchResult {
	id: string;
	score: number;
	metadata?: Record<string, unknown>;
	vector?: number[];
}
```

**验收标准**：
- ✅ 至少集成 2 个向量数据库（Pinecone、Weaviate）
- ✅ 相似性搜索准确
- ✅ 批量插入性能优化
- ✅ 错误处理完善

---

#### 13.3 AI 推理服务集成（4 天）

**重构方案**：

```typescript
// libs/domains/ai/src/application/services/ai-inference.service.ts
/**
 * AI 推理服务
 * 
 * 统一的 AI 推理服务接口
 */
export class AIInferenceService {
	constructor(
		private readonly modelRegistry: IAIModelRegistry,
		private readonly embeddingRepo: IAIEmbeddingRepository,
		private readonly vectorDB: IVectorDatabase,
		private readonly logger: ILogger,
	) {}

	/**
	 * 生成文本嵌入
	 */
	async generateEmbedding(
		text: string,
		modelId: string,
	): Promise<Either<EmbeddingResult, AIInferenceError>> {
		// 获取模型
		const model = await this.modelRegistry.getModel(modelId);
		if (!model) {
			return fail(new AIInferenceError('模型不存在'));
		}

		if (model.type !== ModelType.EMBEDDING) {
			return fail(new AIInferenceError('模型类型不正确'));
		}

		// 获取适配器
		const adapter = this.modelRegistry.getAdapter(model.provider);

		// 生成嵌入
		const startTime = Date.now();
		const result = await adapter.generateEmbedding({
			text,
			model: model.config.modelName,
			...model.config.parameters,
		});

		if (result.isFail()) {
			return result;
		}

		const latency = Date.now() - startTime;

		// 记录指标
		await model.recordMetrics({
			requestCount: 1,
			latency,
			errorRate: 0,
		});

		this.logger.info('嵌入生成成功', {
			modelId,
			latency,
			vectorLength: result.value.vector.length,
		});

		return ok({
			vector: result.value.vector,
			modelId,
			text,
			generatedAt: new Date(),
		});
	}

	/**
	 * 文本分类
	 */
	async classify(
		text: string,
		modelId: string,
	): Promise<Either<ClassificationResult, AIInferenceError>> {
		const model = await this.modelRegistry.getModel(modelId);
		if (!model || model.type !== ModelType.CLASSIFICATION) {
			return fail(new AIInferenceError('模型不存在或类型不正确'));
		}

		const adapter = this.modelRegistry.getAdapter(model.provider);
		const result = await adapter.classify({
			text,
			model: model.config.modelName,
			...model.config.parameters,
		});

		if (result.isFail()) {
			return result;
		}

		this.logger.info('文本分类完成', {
			modelId,
			label: result.value.label,
			confidence: result.value.confidence,
		});

		return result;
	}

	/**
	 * 智能问答
	 */
	async questionAnswering(
		question: string,
		context?: string,
		modelId?: string,
	): Promise<Either<QAResult, AIInferenceError>> {
		const defaultModelId = modelId || 'default-qa-model';
		const model = await this.modelRegistry.getModel(defaultModelId);
		
		if (!model || model.type !== ModelType.QUESTION_ANSWERING) {
			return fail(new AIInferenceError('模型不存在或类型不正确'));
		}

		const adapter = this.modelRegistry.getAdapter(model.provider);
		const result = await adapter.questionAnswering({
			question,
			context,
			model: model.config.modelName,
			...model.config.parameters,
		});

		if (result.isFail()) {
			return result;
		}

		this.logger.info('问答完成', {
			modelId,
			confidence: result.value.confidence,
		});

		return result;
	}

	/**
	 * 批量生成嵌入
	 */
	async batchGenerateEmbeddings(
		texts: string[],
		modelId: string,
	): Promise<Either<EmbeddingResult[], AIInferenceError>> {
		const results: EmbeddingResult[] = [];

		for (const text of texts) {
			const result = await this.generateEmbedding(text, modelId);
			if (result.isFail()) {
				return fail(new AIInferenceError(
					`批量嵌入生成失败：${result.value.message}`,
				));
			}
			results.push(result.value);
		}

		this.logger.info('批量嵌入生成完成', {
			modelId,
			count: results.length,
		});

		return ok(results);
	}
}

/**
 * 嵌入结果
 */
export interface EmbeddingResult {
	vector: number[];
	modelId: string;
	text: string;
	generatedAt: Date;
}

/**
 * 分类结果
 */
export interface ClassificationResult {
	label: string;
	confidence: number;
	labels?: Array<{ label: string; confidence: number }>;
}

/**
 * 问答结果
 */
export interface QAResult {
	answer: string;
	confidence: number;
	context?: string;
}
```

**验收标准**：
- ✅ 至少集成 2 个 AI 服务提供商（OpenAI、Azure OpenAI）
- ✅ 支持多种 AI 任务类型
- ✅ 错误处理和重试机制
- ✅ 性能监控和指标记录

---

#### 13.4 AI 增强领域模型（3 天）

**重构方案**：

```typescript
// libs/shared/kernel/src/domain/ai-enhanced-aggregate.base.ts
/**
 * AI 增强的聚合根基类
 * 
 * 为聚合根提供 AI 能力扩展
 */
export abstract class AIEnhancedAggregateRoot<
	TEvent extends DomainEvent = DomainEvent,
> extends AggregateRoot<TEvent> {
	protected aiMetadata?: AIEnhancedMetadata;

	/**
	 * 生成 AI 嵌入
	 */
	public async generateAIEmbedding(
		text: string,
		aiService: AIInferenceService,
		modelId: string,
	): Promise<Either<void, AIInferenceError>> {
		const result = await aiService.generateEmbedding(text, modelId);

		if (result.isFail()) {
			return result;
		}

		if (!this.aiMetadata) {
			this.aiMetadata = {};
		}

		this.aiMetadata.embedding = result.value.vector;
		this.aiMetadata.embeddingModelId = modelId;
		this.aiMetadata.embeddingGeneratedAt = new Date();

		return ok();
	}

	/**
	 * 生成 AI 标签
	 */
	public async generateAITags(
		text: string,
		aiService: AIInferenceService,
		modelId: string,
	): Promise<Either<void, AIInferenceError>> {
		const result = await aiService.classify(text, modelId);

		if (result.isFail()) {
			return result;
		}

		if (!this.aiMetadata) {
			this.aiMetadata = {};
		}

		this.aiMetadata.aiTags = this.extractTags(result.value);
		this.aiMetadata.tagGeneratedAt = new Date();

		return ok();
	}

	/**
	 * 分析情感
	 */
	public async analyzeSentiment(
		text: string,
		aiService: AIInferenceService,
		modelId: string,
	): Promise<Either<void, AIInferenceError>> {
		const result = await aiService.classify(text, modelId);

		if (result.isFail()) {
			return result;
		}

		if (!this.aiMetadata) {
			this.aiMetadata = {};
		}

		this.aiMetadata.sentimentScore = this.calculateSentimentScore(result.value);
		this.aiMetadata.sentimentGeneratedAt = new Date();

		return ok();
	}

	/**
	 * 获取 AI 元数据
	 */
	public getAIMetadata(): Readonly<AIEnhancedMetadata> | undefined {
		return this.aiMetadata ? { ...this.aiMetadata } : undefined;
	}

	/**
	 * 搜索相似实体
	 */
	public async searchSimilar(
		vectorDB: IVectorDatabase,
		topK: number = 10,
	): Promise<Either<SearchResult[], VectorDBError>> {
		if (!this.aiMetadata?.embedding) {
			return fail(new VectorDBError('实体没有嵌入向量'));
		}

		return await vectorDB.searchSimilar({
			vector: this.aiMetadata.embedding,
			topK,
			includeMetadata: true,
		});
	}

	private extractTags(classification: ClassificationResult): string[] {
		const tags: string[] = [classification.label];
		
		if (classification.labels) {
			tags.push(...classification.labels
				.filter(l => l.confidence > 0.5)
				.map(l => l.label));
		}

		return [...new Set(tags)]; // 去重
	}

	private calculateSentimentScore(classification: ClassificationResult): number {
		// 简化的情感分数计算（0-1，0.5 为中性）
		const sentimentMap: Record<string, number> = {
			'positive': 1.0,
			'negative': 0.0,
			'neutral': 0.5,
		};

		return sentimentMap[classification.label.toLowerCase()] ?? 0.5;
	}
}

/**
 * AI 增强元数据
 */
export interface AIEnhancedMetadata {
	embedding?: number[];
	embeddingModelId?: string;
	embeddingGeneratedAt?: Date;
	
	aiTags?: string[];
	tagGeneratedAt?: Date;
	
	sentimentScore?: number;
	sentimentGeneratedAt?: Date;
	
	aiProcessingStatus?: 'pending' | 'processing' | 'completed' | 'failed';
	aiProcessingError?: string;
}

// 应用示例
// libs/domains/tenant/src/domain/aggregates/tenant.aggregate.ts
export class TenantAggregate extends AIEnhancedAggregateRoot<TenantEvent> {
	// ... 原有实现

	/**
	 * 为租户生成 AI 增强
	 */
	public async enrichWithAI(
		aiService: AIInferenceService,
		vectorDB: IVectorDatabase,
	): Promise<Either<void, AIInferenceError | VectorDBError>> {
		// 构建文本描述
		const text = `租户：${this.name.value}，类型：${this.type}，状态：${this.status}`;

		// 生成嵌入
		const embeddingResult = await this.generateAIEmbedding(
			text,
			aiService,
			'text-embedding-3-small',
		);
		if (embeddingResult.isFail()) {
			return embeddingResult;
		}

		// 生成标签
		const tagsResult = await this.generateAITags(
			text,
			aiService,
			'tenant-classifier-model',
		);
		if (tagsResult.isFail()) {
			return tagsResult;
		}

		// 存储到向量数据库
		if (this.aiMetadata?.embedding) {
			const insertResult = await vectorDB.insertVector({
				id: this.id.value,
				vector: this.aiMetadata.embedding,
				metadata: {
					tenantId: this.id.value,
					name: this.name.value,
					type: this.type,
					tags: this.aiMetadata.aiTags,
				},
				namespace: 'tenants',
			});

			if (insertResult.isFail()) {
				return insertResult;
			}
		}

		this.addEvent(new TenantAIEnrichedEvent({
			tenantId: this.id.value,
			aiMetadata: this.aiMetadata!,
		}));

		return ok();
	}
}
```

**验收标准**：
- ✅ AI 增强基类正常工作
- ✅ 支持嵌入、标签、情感分析
- ✅ 向量搜索正常
- ✅ 至少 2 个聚合根使用 AI 增强

---

## 四、实施时间表（基于四大核心目标）

### 4.1 总体时间规划

```
┌────────────────────────────────────────────────────────────────────┐
│                    重构时间表（18 周，91 天）                         │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  P0 优先级：核心架构（5 周，25 天）                                  │
│  ├── Week 1-2: Phase 7 - 领域模型增强（5 天）                       │
│  │   ├── Day 1-2: 值对象模式增强                                    │
│  │   ├── Day 3-4: 业务规则封装模式                                  │
│  │   └── Day 5: 领域事件增强                                        │
│  │                                                                 │
│  └── Week 3-5: Phase 8 - 事件溯源和投影机制（6 天）                 │
│      ├── Day 1-2: 事件存储优化                                      │
│      ├── Day 3-5: 分析投影实现                                      │
│      └── Day 6: 实时数据同步                                        │
│                                                                    │
│  P1 优先级：数据平台能力（5.5 周，28 天）                            │
│  ├── Week 6-7: Phase 9 - BDD 测试框架建立（5 天）                   │
│  │   ├── Day 1: 测试目录结构                                        │
│  │   ├── Day 2-4: BDD 测试用例编写                                  │
│  │   └── Day 5: 测试 Builder 模式                                   │
│  │                                                                 │
│  ├── Week 8-9: Phase 10 - 数据源适配器体系（8 天）                  │
│  │   ├── Day 1-2: 数据接入领域建模                                  │
│  │   ├── Day 3-4: 数据源适配器端口设计                              │
│  │   ├── Day 5-7: 核心适配器实现                                    │
│  │   └── Day 8: 数据源健康监控                                      │
│  │                                                                 │
│  └── Week 10-11: Phase 11 - 数据转换管道（6 天）                    │
│      ├── Day 1-3: Schema 管理系统                                   │
│      ├── Day 4-5: 数据转换管道                                      │
│      └── Day 6: 数据血缘追踪                                        │
│                                                                    │
│  P2 优先级：高级能力（7.5 周，38 天）                                │
│  ├── Week 12-13: Phase 12 - 数据湖架构（10 天）                     │
│  │   ├── Day 1-4: 数据湖存储架构                                    │
│  │   ├── Day 5-7: Delta Lake 集成                                   │
│  │   └── Day 8-10: 数据湖优化和测试                                 │
│  │                                                                 │
│  ├── Week 14-16: Phase 13 - AI 能力嵌入（14 天）                    │
│  │   ├── Day 1-3: AI 领域建模                                       │
│  │   ├── Day 4-7: 向量数据库集成                                    │
│  │   ├── Day 8-11: AI 推理服务集成                                  │
│  │   └── Day 12-14: AI 增强领域模型                                 │
│  │                                                                 │
│  └── Week 17-18: 集成测试与文档完善（10 天）                        │
│      ├── Day 1-4: 端到端集成测试                                    │
│      ├── Day 5-7: 性能测试和优化                                    │
│      └── Day 8-10: 文档更新和培训                                   │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

### 4.2 阶段与核心目标映射

| 阶段 | 工时 | 数据分析 | 外部数据接入 | 数据仓库 | AI 嵌入 |
|------|------|----------|--------------|----------|---------|
| **Phase 7: 领域模型增强** | 5 天 | ⭐⭐ | ⭐⭐ | ⭐⭐ | ⭐⭐ |
| **Phase 8: 事件溯源和投影** | 6 天 | ⭐⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐ |
| **Phase 9: BDD 测试框架** | 5 天 | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ |
| **Phase 10: 数据源适配器** | 8 天 | ⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐ |
| **Phase 11: 数据转换管道** | 6 天 | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐ |
| **Phase 12: 数据湖架构** | 10 天 | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐ |
| **Phase 13: AI 能力嵌入** | 14 天 | ⭐⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **集成测试与文档** | 10 天 | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ |

### 4.3 关键里程碑

```
Week 2  ✅ 领域模型增强完成
Week 5  ✅ 事件溯源和投影机制完成（数据分析基础）
Week 7  ✅ BDD 测试框架建立
Week 9  ✅ 数据源适配器体系完成（外部数据接入）
Week 11 ✅ 数据转换管道完成（数据仓库基础）
Week 13 ✅ 数据湖架构完成（异构系统数据仓库）
Week 16 ✅ AI 能力嵌入完成
Week 18 ✅ 全部完成并发布
```

---

## 五、风险评估与缓解策略

### 5.1 技术风险

| 风险 | 影响 | 概率 | 缓解策略 | 关联目标 |
|------|------|------|----------|----------|
| **1. 事件溯源性能问题** | 高 | 中 | ✅ 实现快照机制<br>✅ 优化事件存储索引<br>✅ 异步投影更新 | 数据分析 |
| **2. 数据源适配器兼容性** | 高 | 高 | ✅ 充分测试各种数据源<br>✅ 实现降级方案<br>✅ 完善错误处理 | 外部数据接入 |
| **3. 数据湖存储成本** | 中 | 中 | ✅ 实施保留策略<br>✅ 数据分层存储<br>✅ 压缩优化 | 数据仓库 |
| **4. AI 服务可用性** | 高 | 低 | ✅ 多服务商备份<br>✅ 本地模型降级<br>✅ 缓存机制 | AI 嵌入 |
| **5. 多租户隔离失败** | 高 | 低 | ✅ 严格的 CLS 约束<br>✅ 数据库行级安全<br>✅ 定期审计 | 所有目标 |

### 5.2 项目风险

| 风险 | 影响 | 概率 | 缓解策略 |
|------|------|------|----------|
| **1. 破坏现有功能** | 高 | 中 | ✅ 保留旧实现，通过 feature flag 切换<br>✅ 每个阶段都有完整的 E2E 测试 |
| **2. 性能下降** | 中 | 低 | ✅ 基准测试对比<br>✅ 保留性能监控<br>✅ 逐步迁移 |
| **3. 团队学习曲线** | 中 | 中 | ✅ 提供详细的中文文档<br>✅ 代码示例和培训<br>✅ 结对编程 |
| **4. 时间超期** | 中 | 中 | ✅ 每个阶段独立可验收<br>✅ 优先级管理（P0 > P1 > P2）<br>✅ 及时调整计划 |
| **5. 第三方依赖风险** | 高 | 低 | ✅ 使用成熟的开源项目<br>✅ 保留替换能力<br>✅ 监控项目活跃度 |

### 5.3 业务风险

| 风险 | 影响 | 概率 | 缓解策略 |
|------|------|------|----------|
| **1. 数据质量问题** | 高 | 高 | ✅ 完善的数据验证<br>✅ 数据质量监控<br>✅ 数据清洗管道 |
| **2. 数据安全和隐私** | 高 | 低 | ✅ 数据加密<br>✅ 访问控制<br>✅ 审计日志 |
| **3. AI 伦理问题** | 中 | 中 | ✅ AI 决策透明化<br>✅ 人工审核机制<br>✅ 偏见检测 |
| **4. 成本控制** | 中 | 中 | ✅ 配额管理<br>✅ 成本监控<br>✅ 资源优化 |

---

## 六、验收标准（基于四大核心目标）

### 6.1 数据分析平台验收

#### 功能验收
- ✅ 所有领域事件完整记录到 Event Store
- ✅ 至少实现 3 个分析投影（租户分析、数据质量、使用统计）
- ✅ 投影重建机制正常工作
- ✅ 实时数据同步延迟 < 100ms

#### 性能验收
- ✅ 事件流查询响应时间 < 50ms（1 万条事件内）
- ✅ 分析查询响应时间 < 200ms（100 万条记录内）
- ✅ 投影更新吞吐量 > 1000 events/s

#### 质量验收
- ✅ 数据完整性 100%（无数据丢失）
- ✅ 数据一致性（投影与事件流一致）
- ✅ 时间旅行查询准确

---

### 6.2 外部数据接入验收

#### 功能验收
- ✅ 支持至少 5 种数据源类型（PostgreSQL、MySQL、REST API、CSV、JSON）
- ✅ 数据源适配器可插拔（Hexagonal Architecture）
- ✅ 数据源健康监控完善
- ✅ 增量数据同步正常工作

#### 性能验收
- ✅ 数据接入吞吐量 > 10000 rows/min（PostgreSQL）
- ✅ 大数据量流式查询支持（> 100 万条记录）
- ✅ 连接池正常工作，无连接泄漏

#### 质量验收
- ✅ 数据验证覆盖率 100%
- ✅ 错误处理完善（失败重试、死信队列）
- ✅ 数据血缘追踪完整

---

### 6.3 数据仓库验收

#### 功能验收
- ✅ 数据湖三层架构正常（Raw/Processed/Curated）
- ✅ Schema Evolution 支持（向后兼容）
- ✅ 多租户数据隔离（行级安全）
- ✅ 数据生命周期管理（保留策略）

#### 性能验收
- ✅ 数据存储性能 > 5000 rows/s（Delta Lake）
- ✅ 分析查询性能 < 5s（1 亿条记录内）
- ✅ 数据压缩率 > 70%

#### 质量验收
- ✅ ACID 事务支持（Delta Lake）
- ✅ 时间旅行查询支持
- ✅ 数据血缘可追溯

---

### 6.4 AI 嵌入验收

#### 功能验收
- ✅ 至少集成 2 个向量数据库（Pinecone、Weaviate）
- ✅ 至少集成 2 个 AI 服务提供商（OpenAI、Azure OpenAI）
- ✅ 支持多种 AI 任务（嵌入、分类、问答）
- ✅ AI 增强的领域模型正常工作

#### 性能验收
- ✅ 嵌入生成延迟 < 100ms（OpenAI）
- ✅ 相似性搜索延迟 < 50ms（10 万向量内）
- ✅ 批量处理吞吐量 > 100 items/s

#### 质量验收
- ✅ 嵌入质量（相似性搜索准确率 > 90%）
- ✅ AI 服务可用性 > 99%
- ✅ 错误处理和降级机制完善

---

### 6.5 整体架构验收

#### 代码质量
- ✅ 所有代码通过 Lint 检查
- ✅ 所有代码通过类型检查
- ✅ 所有代码有完整的中文 TSDoc
- ✅ 测试覆盖率 > 80%

#### 架构质量
- ✅ Hexagonal Architecture 完整实现（Ports + Adapters）
- ✅ DDD 战术模式完整实现（Aggregates、Entities、Value Objects）
- ✅ CQRS 分离清晰（Command Handlers、Query Handlers）
- ✅ 事件溯源完整（Event Store + Projections）
- ✅ 事件驱动架构完整（Domain Events + Integration Events）

#### 安全验收
- ✅ 多租户隔离严格（CLS 约束）
- ✅ 数据访问控制（RBAC）
- ✅ 敏感数据加密
- ✅ 审计日志完整

---

## 七、回滚策略（基于四大核心目标）

### 7.1 Phase 级别回滚

每个 Phase 都可以通过配置开关回滚到旧实现：

```typescript
// config/feature-flags.ts
export const FEATURE_FLAGS = {
	// Phase 7: 领域模型增强
	USE_NEW_VALUE_OBJECT_BASE: false,
	USE_BUSINESS_RULE_VALIDATOR: false,
	USE_NEW_DOMAIN_EVENT_BASE: false,

	// Phase 8: 事件溯源和投影
	USE_EVENT_SOURCING: true,  // 已启用，不可关闭
	USE_PROJECTION_SYSTEM: false,
	USE_REALTIME_SYNC: false,

	// Phase 10: 数据源适配器
	USE_DATA_SOURCE_ADAPTERS: false,
	USE_DATA_SOURCE_HEALTH_CHECK: false,

	// Phase 11: 数据转换管道
	USE_SCHEMA_MANAGEMENT: false,
	USE_DATA_TRANSFORMATION: false,
	USE_DATA_LINEAGE: false,

	// Phase 12: 数据湖架构
	USE_DATA_LAKE: false,
	USE_DELTA_LAKE: false,
	USE_RETENTION_POLICY: false,

	// Phase 13: AI 能力嵌入
	USE_AI_EMBEDDING: false,
	USE_VECTOR_DATABASE: false,
	USE_AI_INFERENCE_SERVICE: false,
	USE_AI_ENHANCED_MODELS: false,
};
```

### 7.2 模块级别回滚

每个领域模块可以独立回滚：

```typescript
// libs/domains/tenant/src/config/feature-flags.ts
export const TENANT_FEATURE_FLAGS = {
	USE_NEW_AGGREGATE_BASE: false,
	USE_NEW_VALUE_OBJECTS: false,
	USE_AI_ENHANCED_TENANT: false,
	USE_TENANT_ANALYTICS_PROJECTION: false,
};

// libs/domains/data-ingestion/src/config/feature-flags.ts
export const DATA_INGESTION_FEATURE_FLAGS = {
	USE_DATA_SOURCE_AGGREGATE: false,
	USE_POSTGRESQL_ADAPTER: true,  // 已启用
	USE_MYSQL_ADAPTER: false,
	USE_REST_API_ADAPTER: false,
};

// libs/domains/data-lake/src/config/feature-flags.ts
export const DATA_LAKE_FEATURE_FLAGS = {
	USE_DATA_LAKE_STORAGE: false,
	USE_DELTA_LAKE_FORMAT: false,
	USE_RAW_ZONE: true,  // 基础功能
	USE_PROCESSED_ZONE: false,
	USE_CURATED_ZONE: false,
};
```

### 7.3 数据兼容性回滚

所有事件和数据结构保持向后兼容：

```typescript
// 1. 事件版本控制
if (event.version === 'v1') {
	await this.handleV1(event);
} else if (event.version === 'v2') {
	await this.handleV2(event);
}

// 2. Schema 兼容性
const schema = await this.schemaRepo.findById(schemaId);
if (!schema.isCompatible(newSchema)) {
	throw new IncompatibleSchemaError();
}

// 3. 数据湖格式兼容
if (storageFormat === 'parquet') {
	await this.writeParquet(data);
} else if (storageFormat === 'delta') {
	await this.writeDelta(data);
}
```

### 7.4 紧急回滚流程

```bash
# 1. 立即禁用新功能
curl -X POST http://api.example.com/admin/feature-flags \
  -d '{"USE_DATA_SOURCE_ADAPTERS": false}'

# 2. 回滚到上一版本
git checkout v1.2.3
pnpm install
pnpm build
pm2 restart all

# 3. 验证回滚成功
curl http://api.example.com/health
pnpm test:e2e

# 4. 通知相关团队
./scripts/notify-rollback.sh
```

### 7.5 数据恢复策略

```typescript
// 1. 事件溯源回滚：重放事件到指定版本
await eventStore.replay({
	streamId: tenantId,
	toVersion: 42,
});

// 2. 投影回滚：重建投影
await projectionOrchestrator.rebuildAll();

// 3. 数据湖回滚：时间旅行查询
await deltaLake.queryAtTimestamp(tablePath, rollbackTime);

// 4. 向量数据库回滚：删除最近的向量
await vectorDB.deleteVectors({
	namespace: 'tenants',
	before: rollbackTime,
});
```

---

## 八、后续优化方向（基于四大核心目标）

### 8.1 数据分析平台优化

1. **高级分析能力**
   - ✅ 实时流处理（Apache Flink）
   - ✅ 机器学习管道（MLflow）
   - ✅ 自助 BI 工具（Metabase）
   - ✅ 数据可视化（Apache Superset）

2. **性能优化**
   - ✅ 列式存储优化（ClickHouse）
   - ✅ 物化视图（Materialized Views）
   - ✅ 查询缓存（Redis）
   - ✅ 数据分区优化

3. **智能分析**
   - ✅ 异常检测（AI 驱动）
   - ✅ 趋势预测
   - ✅ 智能推荐
   - ✅ 自然语言查询

---

### 8.2 外部数据接入优化

1. **更多数据源支持**
   - ✅ SAP ERP
   - ✅ Salesforce CRM
   - ✅ ServiceNow ITSM
   - ✅ AWS/Azure/GCP 云服务

2. **实时数据流**
   - ✅ Apache Kafka 集成
   - ✅ CDC（Change Data Capture）
   - ✅ 流式 ETL
   - ✅ 实时数据湖

3. **数据质量**
   - ✅ 数据质量监控
   - ✅ 数据修复建议
   - ✅ 数据匹配和去重
   - ✅ 主数据管理（MDM）

---

### 8.3 数据仓库优化

1. **性能优化**
   - ✅ Z-Ordering 优化
   - ✅ Data Skipping 索引
   - ✅ Caching 层
   - ✅ 查询优化器

2. **数据治理**
   - ✅ 数据目录（Apache Atlas）
   - ✅ 数据血缘可视化
   - ✅ 数据质量规则引擎
   - ✅ 数据隐私保护

3. **多云支持**
   - ✅ AWS S3 + Delta Lake
   - ✅ Azure Blob Storage + Delta Lake
   - ✅ GCS + Delta Lake
   - ✅ 混合云架构

---

### 8.4 AI 嵌入优化

1. **更多 AI 能力**
   - ✅ 图像识别
   - ✅ 语音处理
   - ✅ 自然语言生成（NLG）
   - ✅ 推荐系统

2. **模型管理**
   - ✅ 模型版本控制
   - ✅ A/B 测试
   - ✅ 模型监控
   - ✅ 自动化训练

3. **本地化部署**
   - ✅ 本地 LLM（Llama 2、Qwen）
   - ✅ 边缘 AI
   - ✅ 私有化部署
   - ✅ AI 网关

---

### 8.5 平台化能力

1. **插件化架构**
   - ✅ 插件接口设计
   - ✅ 插件生命周期管理
   - ✅ 插件市场
   - ✅ 插件沙箱隔离

2. **多租户增强**
   - ✅ 租户自定义配置
   - ✅ 租户级 AI 模型
   - ✅ 租户级数据隔离
   - ✅ 租户配额管理

3. **开发者体验**
   - ✅ CLI 工具
   - ✅ SDK 支持
   - ✅ API 文档自动生成
   - ✅ 沙箱环境

---

## 九、关键技术选型（基于四大核心目标）

### 9.1 数据分析技术栈

```yaml
分析引擎:
  OLAP: ClickHouse / Apache Doris
  搜索: Elasticsearch / OpenSearch
  流处理: Apache Flink / Kafka Streams

可视化:
  BI: Metabase / Apache Superset
  监控: Grafana / Prometheus
```

### 9.2 外部数据接入技术栈

```yaml
数据源适配器:
  数据库: PostgreSQL, MySQL, Oracle, SQL Server, MongoDB
  云服务: AWS RDS/S3, Azure SQL/Blob, GCP BigQuery
  SaaS: Salesforce, SAP, ServiceNow
  API: REST, GraphQL, gRPC

数据格式:
  结构化: CSV, JSON, XML, Parquet, Avro
  半结构化: JSON, BSON, YAML
  非结构化: Text, PDF, Images

ETL/ELT:
  编排: Apache Airflow
  数据流: Apache NiFi
  转换: dbt
```

### 9.3 数据仓库技术栈

```yaml
存储:
  对象存储: S3 / MinIO
  格式: Parquet (列式) + Avro (Schema Evolution)
  表格式: Delta Lake / Apache Iceberg / Apache Hudi

Schema:
  注册中心: Confluent Schema Registry / AWS Glue
  治理: Apache Atlas / AWS Glue Data Catalog
```

### 9.4 AI 嵌入技术栈

```yaml
AI 服务:
  LLM: OpenAI GPT-4, Azure OpenAI, AWS Bedrock
  本地: Llama 2, Mistral, Qwen

向量数据库:
  托管: Pinecone
  开源: Weaviate, Milvus, Qdrant

ML 平台:
  模型注册: MLflow / Weights & Biases
  特征存储: Feast / Tecton
  框架: PyTorch, TensorFlow, Hugging Face, LangChain
```

---

## 十、总结

### 10.1 架构选择总结

本项目选择 **DDD + Hexagonal Architecture + CQRS + Event Sourcing + EDA** 混合架构，理由如下：

| 架构模式 | 解决的问题 | 对应目标 |
|----------|------------|----------|
| **DDD** | 复杂业务领域建模 | 所有目标 |
| **Hexagonal** | 多适配器插拔能力 | 外部数据接入、AI 嵌入 |
| **CQRS** | 读写分离，分析查询优化 | 数据分析 |
| **Event Sourcing** | 完整审计，时间旅行，数据分析基础 | 数据分析、数据仓库 |
| **EDA** | 松耦合跨域通信 | 所有目标 |

### 10.2 核心价值总结

| 核心目标 | 关键技术 | 预期价值 |
|----------|----------|----------|
| **数据分析平台** | 事件溯源 + 投影 + ClickHouse | 实时分析、历史回放、多维度统计 |
| **外部数据接入** | Hexagonal Ports + 多种 Adapters | 统一接入、可插拔、健康监控 |
| **数据仓库** | Delta Lake + Schema Evolution | ACID 事务、Schema 演进、时间旅行 |
| **AI 嵌入** | 向量数据库 + AI 推理服务 | 智能分析、相似性搜索、自动化决策 |

### 10.3 实施路径总结

```
阶段 1: 核心架构（P0，5 周）
  → 领域模型增强 + 事件溯源/投影

阶段 2: 数据平台（P1，5.5 周）
  → BDD 测试 + 数据源适配器 + 数据转换

阶段 3: 高级能力（P2，7.5 周）
  → 数据湖 + AI 嵌入

总工时: 91 天（约 18 周，4.5 个月）
```

---

## 十一、参考文档

- [ddd-hexagonal-cqrs-es-eda 项目 README](../forks/ddd-hexagonal-cqrs-es-eda/README.md)
- [XS-SAAS平台架构设计方案（全局演进版）.md](./XS-SAAS平台架构设计方案（全局演进版）.md)
- [XS-项目重构计划（CQRS+EDA平台化）.md](./XS-项目重构计划（CQRS+EDA平台化）.md)
- [XS-聚合根基类重构方案.md](./XS-聚合根基类重构方案.md)
- [XS-领域模型增强计划（Rich Model + ES 混合架构）.md](./XS-领域模型增强计划（Rich Model + ES 混合架构）.md)

---

## 十二、变更历史

| 版本 | 日期 | 变更内容 | 作者 |
|------|------|----------|------|
| v1.0.0 | 2026-02-19 | 初始版本 | AI Assistant |
| v2.0.0 | 2026-02-19 | 基于四大核心目标全面重构：<br>1. 新增数据分析平台阶段（Phase 8）<br>2. 新增外部数据接入阶段（Phase 10-11）<br>3. 新增数据湖架构阶段（Phase 12）<br>4. 新增 AI 嵌入阶段（Phase 13）<br>5. 调整工时估算（91 天）<br>6. 完善验收标准（分目标）<br>7. 增强风险评估和回滚策略 | AI Assistant |
| v2.1.0 | 2026-02-19 | **Phase 7 已完成**：<br>1. ✅ 值对象基类 `ValueObjectBase`<br>2. ✅ Either 模式错误处理<br>3. ✅ 业务规则封装 `IBusinessRule` + `BusinessRuleValidator`<br>4. ✅ 领域异常 `DomainException` + `ValidationError`<br>5. ✅ 领域事件基类 `DomainEventBase`<br>6. ✅ Tenant 域完整迁移（148 测试通过） | AI Assistant |

---

**文档状态**：✅ Phase 7 已完成，继续 Phase 8

**已完成阶段**：
- ✅ **Phase 7: 领域模型增强**（2026-02-19 完成）
  - 值对象模式增强
  - 业务规则封装模式
  - 领域事件增强

**下一步行动**：
1. ~~团队评审本方案~~ ✅ 已完成
2. ~~确认优先级和时间表~~ ✅ 已完成
3. ~~开始 Phase 7（领域模型增强）的实施~~ ✅ 已完成
4. **开始 Phase 8（事件溯源和投影）的实施**
5. 并行准备 Phase 9（BDD 测试框架）的环境

**关键里程碑**：
- ✅ Week 1-2: Phase 7 - 领域模型增强完成
- ⏳ Week 3-5: Phase 8 - 数据分析基础进行中
- 🔲 Week 11: 外部数据接入完成
- 🔲 Week 13: 数据仓库完成
- 🔲 Week 16: AI 嵌入完成
- 🔲 Week 18: 全部完成并发布
