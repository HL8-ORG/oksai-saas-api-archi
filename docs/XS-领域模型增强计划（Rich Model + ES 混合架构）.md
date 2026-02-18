# 领域模型增强计划（Rich Model + ES 混合架构）

> **状态**：规划中 ⏳
>
> **版本**：v1.0.0
>
> **创建日期**：2026-02-18
>
> **前置文档**：
>
> - `docs/XS-项目重构计划（CQRS+EDA平台化）.md`（Phase 0-9 已完成）
> - `forks/nestjs-template` 技术调研

## 一、背景与架构方向调整

### 1.1 业务特点分析

本项目（oksai-saas）核心业务场景为**数据分析平台**，具有以下特点：

- **查询密集**：大量报表、仪表盘、数据聚合查询
- **写入相对较少**：主要是配置、元数据的变更
- **审计要求**：部分操作需要追溯（计费、权限变更）

### 1.2 架构方向调整

基于业务特点，架构方向从**纯 Event Sourcing**调整为**ES + Rich Model 混合**：

| 方面       | 原方案（ES 风格）             | 调整后（Rich Model 风格）       |
| ---------- | ----------------------------- | ------------------------------- |
| 聚合风格   | ES 风格（apply 事件重建状态） | Rich Model 风格（业务规则内聚） |
| 写侧持久化 | 纯事件流                      | ES（审计）+ Write Model（ORM）  |
| 读侧查询   | 事件重建 / Read Model         | 优化的 Read Model（直接查询）   |
| 优先级     | 审计完整性                    | 查询效率 + 业务规则清晰         |

### 1.3 核心原则

1. **Rich Model 优先**：聚合采用 Rich Domain Model 风格，业务规则内聚
2. **ES 可选保留**：仅对审计要求高的场景保留 ES（计费、权限变更）
3. **读侧优化**：Read Model 设计为可直接查询，避免事件重建开销
4. **渐进迁移**：不破坏现有功能，分阶段迁移

---

## 二、架构风格对比与选型

### 2.1 三种领域模型风格对比

| 风格                  | 状态管理 | 业务规则          | 查询效率     | 审计能力      | 复杂度 |
| --------------------- | -------- | ----------------- | ------------ | ------------- | ------ |
| **Event Sourcing**    | 事件流   | 分散在 apply 方法 | 低（需重建） | ✅ 完整       | 高     |
| **Rich Domain Model** | 直接修改 | 内聚在实体        | 高           | ⚠️ 需额外实现 | 中     |
| **Active Record**     | ORM 管理 | 分散在 Service    | 高           | ❌ 无         | 低     |

### 2.2 oksai-saas 选择：ES + Rich Model 混合

```
┌─────────────────────────────────────────────────────────────────┐
│                        写侧（Command Side）                       │
├─────────────────────────────────────────────────────────────────┤
│  Aggregate（Rich Model 风格）                                    │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ - 业务规则内聚在实体方法中                               │    │
│  │ - 直接修改状态（非事件驱动状态变更）                     │    │
│  │ - 可选：同时记录领域事件（审计）                         │    │
│  └─────────────────────────────────────────────────────────┘    │
│                              │                                   │
│              ┌───────────────┼───────────────┐                  │
│              ▼               ▼               ▼                  │
│        ┌──────────┐   ┌──────────┐   ┌──────────┐              │
│        │ ES Store │   │ Write DB │   │  Outbox  │              │
│        │ (审计)   │   │ (ORM)    │   │ (集成)   │              │
│        └──────────┘   └──────────┘   └──────────┘              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        读侧（Query Side）                         │
├─────────────────────────────────────────────────────────────────┤
│  Read Model（优化查询）                                          │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ - 物化视图（预聚合）                                     │    │
│  │ - 缓存层（热点数据）                                     │    │
│  │ - 直接 ORM 查询（无事件重建）                            │    │
│  │ - 按 tenantId 行级隔离                                   │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

### 2.3 各上下文的架构选择

| 上下文       | 写侧          | 读侧       | ES 保留 | 理由                      |
| ------------ | ------------- | ---------- | ------- | ------------------------- |
| Tenant       | Rich Model    | Read Model | ✅ 是   | 租户创建/变更是关键审计点 |
| Identity     | Rich Model    | Read Model | ✅ 是   | 用户注册/权限变更是审计点 |
| Billing      | Rich Model    | Read Model | ✅ 是   | 计费操作必须有审计        |
| Analytics    | Active Record | 直接查询   | ❌ 否   | 纯查询，无复杂业务规则    |
| Notification | Rich Model    | Read Model | ⚠️ 可选 | 发送记录可留存            |

---

## 三、从 nestjs-template 可借鉴的内容

### 3.1 借鉴评估

| 内容            | nestjs-template 实现             | oksai-saas 现状 | 建议    |
| --------------- | -------------------------------- | --------------- | ------- |
| Value Objects   | 丰富（equals/getValue/验证内聚） | 基础            | ✅ 增强 |
| Specifications  | 有（业务规则封装）               | 无              | ✅ 引入 |
| Mapper 模式     | 有（领域↔DTO 转换）              | 无              | ✅ 引入 |
| Collection VO   | 有（RolesCollection）            | 无              | ✅ 参考 |
| 异常层次        | 丰富（按业务场景细分）           | 基础            | ✅ 扩展 |
| Repository 映射 | 完善（primitives ↔ VO）          | 有              | ✅ 参考 |
| Prisma ORM      | 使用                             | ❌ 不采用       | -       |

### 3.2 不借鉴的内容

| 内容       | 原因                |
| ---------- | ------------------- |
| Prisma ORM | 项目已选 MikroORM   |
| 单体结构   | 项目用 monorepo     |
| 无多租户   | 项目核心需求        |
| 无 ES      | 项目保留 ES（审计） |

---

## 四、优化计划（Phase 10-15）

### 总览

| Phase    | 名称                   | 预计周期 | 优先级 | 核心产出                  |
| -------- | ---------------------- | -------- | ------ | ------------------------- |
| Phase 10 | Rich Model 风格迁移    | 7-10 天  | 🔴 高  | 聚合改为 Rich Model 风格  |
| Phase 11 | Value Objects 增强     | 5-7 天   | 🔴 高  | 完善 equals/getValue/验证 |
| Phase 12 | Specifications 模式    | 5-7 天   | 🟡 中  | 业务规则规格类            |
| Phase 13 | Mapper + Collection VO | 5-7 天   | 🟡 中  | 领域↔DTO 转换、角色集合   |
| Phase 14 | 读侧查询优化           | 5-7 天   | 🟡 中  | 物化视图/缓存/索引        |
| Phase 15 | 模板更新与验收         | 3-5 天   | 🟢 低  | 文档同步、测试覆盖        |

**总周期**：5-7 周

---

## 五、Phase 10：Rich Model 风格迁移（7-10 天）

### 5.1 目标

将聚合从**ES 风格**（apply 事件重建状态）迁移到**Rich Model 风格**（业务规则内聚、直接修改状态）。

### 5.2 迁移对比

#### Before（当前 ES 风格）

```typescript
// libs/domains/identity/src/domain/aggregates/user.aggregate.ts
export class UserAggregate {
	private disabled = false;
	private readonly uncommitted: DomainEvent[] = [];

	disable(reason?: string): void {
		if (this.disabled) return;
		// 通过事件驱动状态变更
		this.record(new UserDisabledEvent(this.id, { reason }));
	}

	private apply(event: DomainEvent): void {
		switch (event.eventType) {
			case 'UserDisabled':
				this.disabled = true;
				break;
		}
	}

	private record(event: DomainEvent): void {
		this.apply(event);
		this.uncommitted.push(event);
	}
}
```

#### After（Rich Model 风格）

```typescript
// libs/domains/identity/src/domain/aggregates/user.aggregate.ts

/**
 * 用户聚合根（Rich Model 风格）
 *
 * 业务规则内聚在实体方法中，直接修改状态
 */
export class UserAggregate {
	private _disabled = false;
	private _disabledReason?: string;
	private _updatedAt: Date;
	private readonly _domainEvents: DomainEvent[] = [];

	private constructor(
		private readonly _id: string,
		private _email: Email
	) {}

	/**
	 * 禁用用户
	 *
	 * 业务规则：
	 * - 幂等操作：已禁用则无操作
	 * - 必须满足禁用条件
	 *
	 * @param reason - 禁用原因
	 * @throws UserCannotBeDisabledException 当不满足禁用条件时
	 */
	disable(reason?: string): void {
		// 幂等检查
		if (this._disabled) return;

		// 业务规则校验
		if (!this.canBeDisabled()) {
			throw new UserCannotBeDisabledException(this._id, '用户不满足禁用条件');
		}

		// 直接修改状态（Rich Model）
		this._disabled = true;
		this._disabledReason = reason;
		this._updatedAt = new Date();

		// 记录领域事件（用于审计/集成）
		this.addDomainEvent(new UserDisabledEvent(this._id, { reason }));
	}

	/**
	 * 检查用户是否可以被禁用
	 */
	private canBeDisabled(): boolean {
		// 业务规则：管理员不能被禁用
		if (this.hasRole('admin')) return false;
		// 业务规则：租户所有者不能被禁用
		if (this._isTenantOwner) return false;
		return true;
	}

	/**
	 * 添加领域事件
	 */
	private addDomainEvent(event: DomainEvent): void {
		this._domainEvents.push(event);
	}

	/**
	 * 获取未提交的领域事件
	 */
	getDomainEvents(): DomainEvent[] {
		return [...this._domainEvents];
	}

	/**
	 * 清空领域事件
	 */
	clearDomainEvents(): void {
		this._domainEvents.length = 0;
	}

	// Getters
	get id(): string {
		return this._id;
	}
	get email(): Email {
		return this._email;
	}
	get disabled(): boolean {
		return this._disabled;
	}
	get disabledReason(): string | undefined {
		return this._disabledReason;
	}
}
```

### 5.3 工作项

| #    | 任务                  | 说明                   | 产出                   |
| ---- | --------------------- | ---------------------- | ---------------------- |
| 10.1 | UserAggregate 重构    | 迁移到 Rich Model 风格 | `user.aggregate.ts`    |
| 10.2 | TenantAggregate 重构  | 迁移到 Rich Model 风格 | `tenant.aggregate.ts`  |
| 10.3 | BillingAggregate 重构 | 迁移到 Rich Model 风格 | `billing.aggregate.ts` |
| 10.4 | 领域异常细化          | 添加业务场景异常       | `domain-exceptions.ts` |
| 10.5 | 单元测试补充          | 覆盖业务规则           | `*.spec.ts`            |

### 5.4 领域异常设计

```typescript
// libs/domains/identity/src/domain/exceptions/domain-exceptions.ts

/**
 * 用户无法被禁用异常
 */
export class UserCannotBeDisabledException extends Error {
	constructor(
		public readonly userId: string,
		reason: string
	) {
		super(`无法禁用用户 ${userId}：${reason}`);
		this.name = 'UserCannotBeDisabledException';
	}
}

/**
 * 用户已拥有该角色异常
 */
export class UserAlreadyHasRoleException extends Error {
	constructor(
		public readonly userId: string,
		public readonly roleName: string
	) {
		super(`用户 ${userId} 已拥有角色 ${roleName}`);
		this.name = 'UserAlreadyHasRoleException';
	}
}

/**
 * 用户不满足角色分配条件异常
 */
export class UserNotEligibleForRoleException extends Error {
	constructor(
		public readonly userId: string,
		public readonly roleName: string
	) {
		super(`用户 ${userId} 不满足分配角色 ${roleName} 的条件`);
		this.name = 'UserNotEligibleForRoleException';
	}
}

/**
 * 非活跃用户操作异常
 */
export class InactiveUserException extends Error {
	constructor(operation: string) {
		super(`非活跃用户无法执行操作：${operation}`);
		this.name = 'InactiveUserException';
	}
}
```

### 5.5 验收标准

- [ ] 聚合业务规则内聚在实体方法中
- [ ] 不再依赖 `apply(event)` 修改状态
- [ ] 业务异常语义清晰（中文）
- [ ] 单元测试覆盖率 ≥ 80%
- [ ] E2E 测试全绿

### 5.6 回滚策略

- 保留 `rehydrate` 静态方法（兼容 ES 读取）
- 通过 feature flag 控制新旧路径

---

## 六、Phase 11：Value Objects 增强（5-7 天）

### 6.1 目标

增强现有 Value Objects，添加 `equals()`、`getValue()` 等方法，内聚验证规则。

### 6.2 增强对比

#### Before（当前）

```typescript
// libs/domains/identity/src/domain/value-objects/email.ts
export class Email {
	private constructor(readonly value: string) {}

	static of(value: string): Email {
		const v = String(value ?? '')
			.trim()
			.toLowerCase();
		if (!v) throw new Error('邮箱不能为空。');
		if (!v.includes('@')) throw new Error('邮箱格式不正确。');
		return new Email(v);
	}
}
```

#### After（增强后）

```typescript
// libs/domains/identity/src/domain/value-objects/email.ts

/**
 * 邮箱值对象
 *
 * 业务规则：
 * - 必须符合邮箱格式
 * - 存储时统一小写
 * - 不可变
 */
export class Email {
	private readonly _value: string;

	private constructor(email: string) {
		this._value = email;
	}

	/**
	 * 从字符串创建邮箱
	 *
	 * @param value - 邮箱字符串
	 * @throws InvalidEmailException 格式不正确时
	 */
	static of(value: string): Email {
		const normalized = this.normalize(value);
		this.validate(normalized);
		return new Email(normalized);
	}

	/**
	 * 获取邮箱值（原始字符串）
	 */
	getValue(): string {
		return this._value;
	}

	/**
	 * 比较两个邮箱是否相等
	 */
	equals(other: Email): boolean {
		return this._value === other._value;
	}

	/**
	 * 获取邮箱域名部分
	 */
	getDomain(): string {
		return this._value.split('@')[1] ?? '';
	}

	/**
	 * 转换为字符串
	 */
	toString(): string {
		return this._value;
	}

	/**
	 * 序列化为 JSON
	 */
	toJSON(): string {
		return this._value;
	}

	// 私有方法
	private static normalize(value: string): string {
		return String(value ?? '')
			.trim()
			.toLowerCase();
	}

	private static validate(email: string): void {
		if (!email) {
			throw new InvalidEmailException('邮箱不能为空');
		}
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		if (!emailRegex.test(email)) {
			throw new InvalidEmailException(`邮箱格式不正确: ${email}`);
		}
	}
}
```

### 6.3 通用值对象基类

```typescript
// libs/shared/domain/src/value-objects/base-value-object.ts

/**
 * 值对象基类
 *
 * 提供 equals、toString、toJSON 的默认实现
 */
export abstract class BaseValueObject<T> {
	constructor(protected readonly _value: T) {
		Object.freeze(this);
	}

	/**
	 * 获取值
	 */
	getValue(): T {
		return this._value;
	}

	/**
	 * 比较相等性
	 */
	equals(other: this): boolean {
		if (other === null || other === undefined) return false;
		return this._value === other._value;
	}

	/**
	 * 转换为字符串
	 */
	toString(): string {
		return String(this._value);
	}

	/**
	 * 序列化为 JSON
	 */
	toJSON(): T {
		return this._value;
	}
}
```

### 6.4 增强后的 EntityId 值对象

```typescript
// libs/shared/domain/src/value-objects/entity-id.vo.ts

/**
 * 实体 ID 值对象基类
 */
export abstract class EntityId extends BaseValueObject<string> {
	/**
	 * 生成新的 UUID
	 */
	static generate(): string {
		return crypto.randomUUID();
	}

	/**
	 * 验证 UUID 格式
	 */
	protected static isValidUUID(value: string): boolean {
		const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
		return uuidRegex.test(value);
	}
}

/**
 * 用户 ID 值对象
 */
export class UserId extends EntityId {
	private constructor(value: string) {
		super(value);
	}

	static of(value: string): UserId {
		if (!value) {
			throw new InvalidUserIdException('用户 ID 不能为空');
		}
		if (!this.isValidUUID(value)) {
			throw new InvalidUserIdException(`无效的用户 ID 格式: ${value}`);
		}
		return new UserId(value);
	}

	static create(): UserId {
		return new UserId(this.generate());
	}
}

/**
 * 租户 ID 值对象
 */
export class TenantId extends EntityId {
	private constructor(value: string) {
		super(value);
	}

	static of(value: string): TenantId {
		if (!value) {
			throw new InvalidTenantIdException('租户 ID 不能为空');
		}
		if (!this.isValidUUID(value)) {
			throw new InvalidTenantIdException(`无效的租户 ID 格式: ${value}`);
		}
		return new TenantId(value);
	}

	static create(): TenantId {
		return new TenantId(this.generate());
	}
}
```

### 6.5 工作项

| #    | 任务                                 | 产出                   |
| ---- | ------------------------------------ | ---------------------- |
| 11.1 | 创建 BaseValueObject 基类            | `base-value-object.ts` |
| 11.2 | 增强 Email 值对象                    | `email.vo.ts`          |
| 11.3 | 增强 UserId/TenantId 值对象          | `entity-id.vo.ts`      |
| 11.4 | 增强 RoleKey 值对象                  | `role-key.vo.ts`       |
| 11.5 | 创建姓名值对象（FirstName/LastName） | `name.vo.ts`           |
| 11.6 | 单元测试                             | `*.spec.ts`            |

### 6.6 验收标准

- [ ] 所有 VO 继承 BaseValueObject 或实现完整接口
- [ ] 所有 VO 有 `equals()`、`getValue()` 方法
- [ ] 验证规则内聚在 VO 内部
- [ ] 中文错误消息
- [ ] 单元测试覆盖率 100%

---

## 七、Phase 12：Specifications 模式（5-7 天）

### 7.1 目标

引入 Specifications 模式，封装复杂业务规则，提高可测试性和复用性。

### 7.2 规格接口设计

```typescript
// libs/shared/domain/src/specifications/specification.interface.ts

/**
 * 规格接口
 *
 * 用于封装业务规则，支持组合
 */
export interface ISpecification<T> {
	/**
	 * 检查候选对象是否满足规格
	 */
	isSatisfiedBy(candidate: T): boolean;

	/**
	 * 与另一个规格组合（AND）
	 */
	and(other: ISpecification<T>): ISpecification<T>;

	/**
	 * 或另一个规格组合（OR）
	 */
	or(other: ISpecification<T>): ISpecification<T>;

	/**
	 * 取反（NOT）
	 */
	not(): ISpecification<T>;
}
```

### 7.3 规格基类与组合规格

```typescript
// libs/shared/domain/src/specifications/specification.ts

/**
 * 规格基类
 *
 * 提供组合操作的默认实现
 */
export abstract class Specification<T> implements ISpecification<T> {
	/**
	 * 检查候选对象是否满足规格（由子类实现）
	 */
	abstract isSatisfiedBy(candidate: T): boolean;

	/**
	 * 与另一个规格组合
	 */
	and(other: ISpecification<T>): ISpecification<T> {
		return new AndSpecification(this, other);
	}

	/**
	 * 或另一个规格组合
	 */
	or(other: ISpecification<T>): ISpecification<T> {
		return new OrSpecification(this, other);
	}

	/**
	 * 取反
	 */
	not(): ISpecification<T> {
		return new NotSpecification(this);
	}
}

/**
 * AND 组合规格
 */
class AndSpecification<T> extends Specification<T> {
	constructor(
		private readonly left: ISpecification<T>,
		private readonly right: ISpecification<T>
	) {
		super();
	}

	isSatisfiedBy(candidate: T): boolean {
		return this.left.isSatisfiedBy(candidate) && this.right.isSatisfiedBy(candidate);
	}
}

/**
 * OR 组合规格
 */
class OrSpecification<T> extends Specification<T> {
	constructor(
		private readonly left: ISpecification<T>,
		private readonly right: ISpecification<T>
	) {
		super();
	}

	isSatisfiedBy(candidate: T): boolean {
		return this.left.isSatisfiedBy(candidate) || this.right.isSatisfiedBy(candidate);
	}
}

/**
 * NOT 组合规格
 */
class NotSpecification<T> extends Specification<T> {
	constructor(private readonly spec: ISpecification<T>) {
		super();
	}

	isSatisfiedBy(candidate: T): boolean {
		return !this.spec.isSatisfiedBy(candidate);
	}
}
```

### 7.4 示例：用户角色分配规格

```typescript
// libs/domains/identity/src/domain/specifications/can-assign-role.specification.ts

import { Specification } from '@oksai/domain';
import type { UserAggregate } from '../aggregates/user.aggregate';
import type { Role } from '../entities/role.entity';

/**
 * 可以分配角色规格
 *
 * 业务规则：
 * - 用户必须处于活跃状态
 * - 用户不能已有该角色
 * - 分配管理员角色需要特殊条件
 */
export class CanAssignRoleSpecification extends Specification<UserAggregate> {
	constructor(private readonly role: Role) {
		super();
	}

	isSatisfiedBy(user: UserAggregate): boolean {
		// 用户必须活跃
		if (user.disabled) return false;

		// 不能重复分配
		if (user.hasRole(this.role.id)) return false;

		// 管理员角色需要特殊条件
		if (this.role.isAdminRole()) {
			return this.canAssignAdminRole(user);
		}

		return true;
	}

	/**
	 * 检查是否可以分配管理员角色
	 */
	private canAssignAdminRole(user: UserAggregate): boolean {
		// 业务规则：只有现有管理员才能分配管理员角色
		// 业务规则：用户必须有至少一个角色
		return user.hasAnyRole() && user.hasAdminPrivileges();
	}
}
```

### 7.5 示例：用户禁用规格

```typescript
// libs/domains/identity/src/domain/specifications/can-disable-user.specification.ts

import { Specification } from '@oksai/domain';
import type { UserAggregate } from '../aggregates/user.aggregate';

/**
 * 可以禁用用户规格
 *
 * 业务规则：
 * - 用户当前必须是活跃状态
 * - 用户不能是租户所有者
 * - 用户不能是最后一个管理员
 */
export class CanDisableUserSpecification extends Specification<UserAggregate> {
	isSatisfiedBy(user: UserAggregate): boolean {
		// 必须是活跃用户
		if (user.disabled) return false;

		// 不能是租户所有者
		if (user.isTenantOwner) return false;

		// 不能是最后一个管理员
		if (user.isAdmin() && this.isLastAdmin(user)) return false;

		return true;
	}

	/**
	 * 检查是否是最后一个管理员
	 * 注意：这个检查需要查询其他用户，实际实现需要注入 UserRepository
	 */
	private isLastAdmin(user: UserAggregate): boolean {
		// 此处为示例，实际需要通过 Repository 查询
		return false;
	}
}
```

### 7.6 规格在聚合中的使用

```typescript
// libs/domains/identity/src/domain/aggregates/user.aggregate.ts

export class UserAggregate {
	/**
	 * 分配角色
	 */
	assignRole(role: Role): void {
		const canAssignRole = new CanAssignRoleSpecification(role);

		if (!canAssignRole.isSatisfiedBy(this)) {
			if (this.disabled) {
				throw new InactiveUserException('分配角色');
			}
			if (this.hasRole(role.id)) {
				throw new UserAlreadyHasRoleException(this.id, role.name);
			}
			throw new UserNotEligibleForRoleException(this.id, role.name);
		}

		this._roles.push(role);
		this._updatedAt = new Date();
		this.addDomainEvent(new RoleAssignedEvent(this._id, { roleId: role.id }));
	}

	/**
	 * 禁用用户
	 */
	disable(reason?: string): void {
		const canDisable = new CanDisableUserSpecification();

		if (!canDisable.isSatisfiedBy(this)) {
			if (this.isTenantOwner) {
				throw new CannotDisableTenantOwnerException(this._id);
			}
			throw new UserCannotBeDisabledException(this._id, '不满足禁用条件');
		}

		this._disabled = true;
		this._disabledReason = reason;
		this._updatedAt = new Date();
		this.addDomainEvent(new UserDisabledEvent(this._id, { reason }));
	}
}
```

### 7.7 工作项

| #    | 任务                        | 产出                                |
| ---- | --------------------------- | ----------------------------------- |
| 12.1 | 创建 Specification 基类     | `specification.ts`                  |
| 12.2 | 创建组合规格类              | `composite-specifications.ts`       |
| 12.3 | CanAssignRoleSpecification  | `can-assign-role.specification.ts`  |
| 12.4 | CanDisableUserSpecification | `can-disable-user.specification.ts` |
| 12.5 | ActiveTenantSpecification   | `active-tenant.specification.ts`    |
| 12.6 | 单元测试                    | `*.spec.ts`                         |

### 7.8 验收标准

- [ ] 规格基类可用
- [ ] 组合规格（and/or/not）可用
- [ ] 业务规则规格类实现完成
- [ ] 聚合方法使用规格进行校验
- [ ] 规格可独立单元测试
- [ ] 单元测试覆盖率 100%

---

## 八、Phase 13：Mapper 模式 + Collection VO（5-7 天）

### 8.1 Mapper 模式

**目的**：统一领域对象 → DTO 的转换逻辑，保持领域层纯净。

```typescript
// libs/domains/identity/src/application/mappers/user.mapper.ts

import type { UserAggregate } from '../domain/aggregates/user.aggregate';
import type { Role } from '../domain/entities/role.entity';

/**
 * 用户详情响应 DTO
 */
export interface IUserDetailResponse {
	id: string;
	email: string;
	firstName: string;
	lastName: string;
	fullName: string;
	disabled: boolean;
	disabledReason?: string;
	roles: Array<{ id: string; name: string }>;
	createdAt: Date;
	updatedAt: Date;
}

/**
 * 用户列表项 DTO
 */
export interface IUserListItem {
	id: string;
	email: string;
	fullName: string;
	disabled: boolean;
	roles: string[];
}

/**
 * 认证响应中的用户信息 DTO
 */
export interface IUserAuthResponse {
	id: string;
	email: string;
	fullName: string;
	disabled: boolean;
	roles: Array<{ id: string; name: string }>;
}

/**
 * 用户 Mapper
 *
 * 负责领域实体与 DTO 之间的转换
 */
export class UserMapper {
	/**
	 * 转换为详情响应 DTO
	 */
	static toDetailResponse(user: UserAggregate): IUserDetailResponse {
		return {
			id: user.id,
			email: user.email.getValue(),
			firstName: user.firstName.getValue(),
			lastName: user.lastName.getValue(),
			fullName: user.getFullName(),
			disabled: user.disabled,
			disabledReason: user.disabledReason,
			roles: user.roles.map((role) => ({
				id: role.id.getValue(),
				name: role.name
			})),
			createdAt: user.createdAt,
			updatedAt: user.updatedAt
		};
	}

	/**
	 * 转换为列表项 DTO
	 */
	static toListItem(user: UserAggregate): IUserListItem {
		return {
			id: user.id,
			email: user.email.getValue(),
			fullName: user.getFullName(),
			disabled: user.disabled,
			roles: user.roles.map((r) => r.name)
		};
	}

	/**
	 * 转换为认证响应 DTO
	 */
	static toAuthResponse(user: UserAggregate): IUserAuthResponse {
		return {
			id: user.id,
			email: user.email.getValue(),
			fullName: user.getFullName(),
			disabled: user.disabled,
			roles: user.roles.map((role) => ({
				id: role.id.getValue(),
				name: role.name
			}))
		};
	}

	/**
	 * 批量转换为列表项
	 */
	static toListItems(users: UserAggregate[]): IUserListItem[] {
		return users.map((user) => this.toListItem(user));
	}
}
```

### 8.2 Collection Value Object

**目的**：封装集合操作，避免在聚合中暴露原始数组。

```typescript
// libs/domains/identity/src/domain/value-objects/roles.collection.ts

import type { Role } from '../entities/role.entity';
import type { RoleId } from './role-id.vo';

/**
 * 角色集合值对象
 *
 * 封装角色的集合操作，避免在聚合中暴露原始数组
 */
export class RolesCollection {
	private constructor(private readonly _roles: readonly Role[]) {
		Object.freeze(this);
	}

	/**
	 * 创建角色集合
	 */
	static create(roles: Role[]): RolesCollection {
		return new RolesCollection(Object.freeze([...roles]));
	}

	/**
	 * 空集合
	 */
	static empty(): RolesCollection {
		return new RolesCollection([]);
	}

	/**
	 * 检查是否拥有指定角色
	 */
	hasRole(roleId: RoleId): boolean {
		return this._roles.some((r) => r.id.equals(roleId));
	}

	/**
	 * 检查是否拥有指定角色名
	 */
	hasRoleByName(roleName: string): boolean {
		return this._roles.some((r) => r.name === roleName);
	}

	/**
	 * 检查是否拥有指定权限
	 */
	hasPermission(permissionName: string): boolean {
		return this._roles.some((r) => r.permissions.some((p) => p.name === permissionName));
	}

	/**
	 * 检查是否拥有管理员权限
	 */
	hasAdminPrivileges(): boolean {
		return this._roles.some((r) => r.isAdminRole());
	}

	/**
	 * 检查是否有任何角色
	 */
	hasAnyRole(): boolean {
		return this._roles.length > 0;
	}

	/**
	 * 添加角色（返回新集合）
	 */
	add(role: Role): RolesCollection {
		if (this.hasRole(role.id)) {
			return this;
		}
		return RolesCollection.create([...this._roles, role]);
	}

	/**
	 * 移除角色（返回新集合）
	 */
	remove(roleId: RoleId): RolesCollection {
		return RolesCollection.create(this._roles.filter((r) => !r.id.equals(roleId)));
	}

	/**
	 * 获取角色数量
	 */
	get count(): number {
		return this._roles.length;
	}

	/**
	 * 转换为数组
	 */
	toArray(): Role[] {
		return [...this._roles];
	}

	/**
	 * 获取所有权限名
	 */
	getAllPermissionNames(): string[] {
		const permissions = new Set<string>();
		for (const role of this._roles) {
			for (const permission of role.permissions) {
				permissions.add(permission.name);
			}
		}
		return Array.from(permissions);
	}
}
```

### 8.3 权限集合值对象

```typescript
// libs/domains/identity/src/domain/value-objects/permissions.collection.ts

import type { Permission } from '../entities/permission.entity';

/**
 * 权限集合值对象
 */
export class PermissionsCollection {
	private constructor(private readonly _permissions: readonly Permission[]) {
		Object.freeze(this);
	}

	static create(permissions: Permission[]): PermissionsCollection {
		return new PermissionsCollection(Object.freeze([...permissions]));
	}

	static empty(): PermissionsCollection {
		return new PermissionsCollection([]);
	}

	/**
	 * 检查是否拥有指定权限
	 */
	has(permissionName: string): boolean {
		return this._permissions.some((p) => p.name === permissionName);
	}

	/**
	 * 检查是否拥有指定资源的操作权限
	 */
	hasResourceAction(resource: string, action: string): boolean {
		const permissionName = `${resource}:${action}`;
		return this.has(permissionName);
	}

	/**
	 * 获取权限数量
	 */
	get count(): number {
		return this._permissions.length;
	}

	/**
	 * 转换为权限名数组
	 */
	toNameArray(): string[] {
		return this._permissions.map((p) => p.name);
	}

	/**
	 * 转换为数组
	 */
	toArray(): Permission[] {
		return [...this._permissions];
	}
}
```

### 8.4 工作项

| #    | 任务                       | 产出                        |
| ---- | -------------------------- | --------------------------- |
| 13.1 | 创建 UserMapper            | `user.mapper.ts`            |
| 13.2 | 创建 TenantMapper          | `tenant.mapper.ts`          |
| 13.3 | 创建 BillingMapper         | `billing.mapper.ts`         |
| 13.4 | 创建 RolesCollection       | `roles.collection.ts`       |
| 13.5 | 创建 PermissionsCollection | `permissions.collection.ts` |
| 13.6 | 聚合使用 Collection VO     | 修改聚合实现                |
| 13.7 | 单元测试                   | `*.spec.ts`                 |

### 8.5 验收标准

- [ ] 所有 Mapper 实现完成
- [ ] Command Handler 使用 Mapper 返回 DTO
- [ ] Collection VO 可用
- [ ] 聚合使用 Collection VO 替代原始数组
- [ ] 单元测试覆盖率 100%

---

## 九、Phase 14：读侧查询优化（5-7 天）

### 9.1 目标

优化 Read Model 设计，提升查询效率，满足数据分析场景需求。

### 9.2 优化策略

| 策略     | 适用场景   | 实现方式         | 预期收益         |
| -------- | ---------- | ---------------- | ---------------- |
| 物化视图 | 预聚合报表 | 投影时写入聚合表 | 查询速度提升 10x |
| 缓存层   | 热点数据   | Redis 缓存       | 响应时间 < 10ms  |
| 索引优化 | 复杂查询   | 添加复合索引     | 查询速度提升 5x  |
| 分页优化 | 大数据集   | Cursor 分页      | 避免深分页超时   |
| 批量查询 | 列表加载   | DataLoader       | 减少 N+1 查询    |

### 9.3 物化视图示例：租户统计

```typescript
// libs/domains/tenant/src/infrastructure/read-model/tenant-stats-read-model.entity.ts

import { Entity, PrimaryKey, Property } from '@mikro-orm/core';

/**
 * 租户统计读模型（物化视图）
 *
 * 预聚合租户的关键指标，避免实时计算
 * 通过投影订阅者更新
 */
@Entity({ tableName: 'tenant_stats' })
export class TenantStatsReadModel {
	@PrimaryKey()
	id!: string;

	@Property()
	tenantId!: string;

	@Property()
	tenantName!: string;

	@Property()
	userCount!: number;

	@Property()
	activeUserCount!: number;

	@Property()
	disabledUserCount!: number;

	@Property({ type: 'decimal', precision: 12, scale: 2 })
	totalBillingAmount!: number;

	@Property({ type: 'decimal', precision: 12, scale: 2 })
	paidBillingAmount!: number;

	@Property({ type: 'decimal', precision: 12, scale: 2 })
	pendingBillingAmount!: number;

	@Property()
	lastActivityAt?: Date;

	@Property()
	updatedAt!: Date;
}
```

### 9.4 投影订阅者：更新物化视图

```typescript
// libs/domains/tenant/src/infrastructure/projections/tenant-stats-projection.subscriber.ts

import { BaseIntegrationEventSubscriber } from '@oksai/eda';
import type { UserRegisteredEvent } from '@oksai/identity';

/**
 * 租户统计投影订阅者
 *
 * 监听用户相关事件，更新租户统计数据
 */
export class TenantStatsProjectionSubscriber extends BaseIntegrationEventSubscriber {
	protected readonly subscriberId = 'tenant-stats-projection';

	protected getSubscribedEvents(): string[] {
		return ['UserRegistered', 'UserDisabled', 'UserEnabled', 'UserAddedToTenant', 'BillingCreated', 'BillingPaid'];
	}

	protected async handleEvent(event: any, context: EventContext): Promise<void> {
		const { tenantId } = event.eventData;

		switch (event.eventType) {
			case 'UserRegistered':
			case 'UserAddedToTenant':
				await this.incrementUserCount(tenantId);
				break;

			case 'UserDisabled':
				await this.updateUserStats(tenantId, { active: -1, disabled: 1 });
				break;

			case 'UserEnabled':
				await this.updateUserStats(tenantId, { active: 1, disabled: -1 });
				break;

			case 'BillingCreated':
				await this.updateBillingStats(tenantId, event.eventData.amount, 'created');
				break;

			case 'BillingPaid':
				await this.updateBillingStats(tenantId, event.eventData.amount, 'paid');
				break;
		}
	}

	private async incrementUserCount(tenantId: string): Promise<void> {
		await this.em.nativeUpdate(
			TenantStatsReadModel,
			{ tenantId },
			{
				userCount: { $inc: 1 },
				activeUserCount: { $inc: 1 },
				updatedAt: new Date()
			}
		);
	}

	private async updateUserStats(tenantId: string, delta: { active: number; disabled: number }): Promise<void> {
		await this.em.nativeUpdate(
			TenantStatsReadModel,
			{ tenantId },
			{
				activeUserCount: { $inc: delta.active },
				disabledUserCount: { $inc: delta.disabled },
				updatedAt: new Date()
			}
		);
	}

	private async updateBillingStats(tenantId: string, amount: number, status: 'created' | 'paid'): Promise<void> {
		const updates: any = { updatedAt: new Date() };

		if (status === 'created') {
			updates.totalBillingAmount = { $inc: amount };
			updates.pendingBillingAmount = { $inc: amount };
		} else if (status === 'paid') {
			updates.pendingBillingAmount = { $inc: -amount };
			updates.paidBillingAmount = { $inc: amount };
		}

		await this.em.nativeUpdate(TenantStatsReadModel, { tenantId }, updates);
	}
}
```

### 9.5 缓存层设计

```typescript
// libs/shared/cache/src/lib/cache.service.ts

import { Injectable, Inject } from '@nestjs/common';
import type { Redis } from 'ioredis';

/**
 * 缓存服务
 *
 * 提供统一的缓存操作接口
 */
@Injectable()
export class CacheService {
	constructor(@Inject('REDIS_CLIENT') private readonly redis: Redis) {}

	/**
	 * 获取缓存
	 */
	async get<T>(key: string): Promise<T | null> {
		const value = await this.redis.get(key);
		if (!value) return null;
		return JSON.parse(value) as T;
	}

	/**
	 * 设置缓存
	 */
	async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
		await this.redis.setex(key, ttlSeconds, JSON.stringify(value));
	}

	/**
	 * 删除缓存
	 */
	async delete(key: string): Promise<void> {
		await this.redis.del(key);
	}

	/**
	 * 删除匹配模式的缓存
	 */
	async deletePattern(pattern: string): Promise<void> {
		const keys = await this.redis.keys(pattern);
		if (keys.length > 0) {
			await this.redis.del(...keys);
		}
	}

	/**
	 * 生成租户缓存键
	 */
	tenantKey(tenantId: string, entity: string, id: string): string {
		return `tenant:${tenantId}:${entity}:${id}`;
	}
}
```

### 9.6 Read Model 查询服务（带缓存）

```typescript
// libs/domains/tenant/src/application/services/tenant-query.service.ts

import { Injectable } from '@nestjs/common';
import { CacheService } from '@oksai/cache';
import { TenantStatsReadModel } from '../../infrastructure/read-model/tenant-stats-read-model.entity';

/**
 * 租户查询服务
 *
 * 提供租户数据的查询能力，带缓存优化
 */
@Injectable()
export class TenantQueryService {
	private readonly CACHE_TTL = 300; // 5 分钟

	constructor(
		private readonly cache: CacheService,
		private readonly em: EntityManager
	) {}

	/**
	 * 获取租户统计数据（带缓存）
	 */
	async getTenantStats(tenantId: string): Promise<TenantStatsReadModel | null> {
		const cacheKey = this.cache.tenantKey(tenantId, 'stats', 'current');

		// 先查缓存
		const cached = await this.cache.get<TenantStatsReadModel>(cacheKey);
		if (cached) return cached;

		// 查询数据库
		const stats = await this.em.findOne(TenantStatsReadModel, { tenantId });
		if (!stats) return null;

		// 写入缓存
		await this.cache.set(cacheKey, stats, this.CACHE_TTL);

		return stats;
	}

	/**
	 * 刷新租户统计缓存
	 */
	async refreshTenantStatsCache(tenantId: string): Promise<void> {
		const cacheKey = this.cache.tenantKey(tenantId, 'stats', 'current');
		await this.cache.delete(cacheKey);
	}
}
```

### 9.7 索引优化示例

```typescript
// migrations/YYYYMMDDHHMMSS-add-tenant-stats-indexes.ts

import { Migration } from '@mikro-orm/migrations';

export class AddTenantStatsIndexes extends Migration {
	async up(): Promise<void> {
		// 租户 ID 索引（主查询字段）
		this.addSql(`
      CREATE INDEX IF NOT EXISTS idx_tenant_stats_tenant_id
      ON tenant_stats(tenant_id);
    `);

		// 最后活动时间索引（排序查询）
		this.addSql(`
      CREATE INDEX IF NOT EXISTS idx_tenant_stats_last_activity
      ON tenant_stats(last_activity_at DESC);
    `);

		// 复合索引：租户 + 活跃用户数（用于排序）
		this.addSql(`
      CREATE INDEX IF NOT EXISTS idx_tenant_stats_active_users
      ON tenant_stats(active_user_count DESC);
    `);
	}

	async down(): Promise<void> {
		this.addSql(`DROP INDEX IF EXISTS idx_tenant_stats_tenant_id;`);
		this.addSql(`DROP INDEX IF EXISTS idx_tenant_stats_last_activity;`);
		this.addSql(`DROP INDEX IF EXISTS idx_tenant_stats_active_users;`);
	}
}
```

### 9.8 工作项

| #    | 任务                                 | 产出                                    |
| ---- | ------------------------------------ | --------------------------------------- |
| 14.1 | 识别慢查询                           | 分析报告（EXPLAIN ANALYZE）             |
| 14.2 | 创建 TenantStatsReadModel            | `tenant-stats-read-model.entity.ts`     |
| 14.3 | 创建 TenantStatsProjectionSubscriber | `tenant-stats-projection.subscriber.ts` |
| 14.4 | 实现 CacheService                    | `cache.service.ts`                      |
| 14.5 | 实现 TenantQueryService              | `tenant-query.service.ts`               |
| 14.6 | 添加数据库索引                       | Migration 文件                          |
| 14.7 | 性能测试                             | Benchmark 报告                          |

### 9.9 验收标准

- [ ] 关键查询响应时间 < 100ms（P95）
- [ ] 热点数据缓存命中率 > 80%
- [ ] 大数据集分页不超时（> 10000 条）
- [ ] 性能测试报告完成

---

## 十、Phase 15：模板更新与验收（3-5 天）

### 10.1 目标

更新 bounded-context 模板，反映 Rich Model 风格，同步文档，完成最终验收。

### 10.2 模板更新内容

| 文件                           | 更新内容                         |
| ------------------------------ | -------------------------------- |
| `__CONTEXT__Aggregate.ts`      | 改为 Rich Model 风格             |
| `__CONTEXT__.value-objects.ts` | 增强值对象，添加 equals/getValue |
| `__CONTEXT__.mapper.ts`        | 新增 Mapper 模板                 |
| `__CONTEXT__.collection.ts`    | 新增 Collection VO 模板          |
| `__CONTEXT__.specification.ts` | 新增 Specification 模板          |
| `README.md`                    | 更新使用说明                     |

### 10.3 模板聚合示例

```typescript
// tools/templates/bounded-context/libs/domains/__context__/src/domain/aggregates/__context__.aggregate.ts

/**
 * __CONTEXT__ 聚合根（Rich Model 风格）
 *
 * 业务规则内聚在实体方法中
 */
export class __CONTEXT__Aggregate {
	private _status: __CONTEXT__Status = __CONTEXT__Status.ACTIVE;
	private _updatedAt: Date;
	private readonly _domainEvents: DomainEvent[] = [];

	private constructor(
		private readonly _id: __CONTEXT__Id,
		private _name: __CONTEXT__Name
	) {
		this._updatedAt = new Date();
	}

	/**
	 * 创建新的 __CONTEXT__
	 */
	static create(name: __CONTEXT__Name): __CONTEXT__Aggregate {
		const id = __CONTEXT__Id.create();
		const aggregate = new __CONTEXT__Aggregate(id, name);
		aggregate.addDomainEvent(new __CONTEXT__CreatedEvent(id.getValue(), { name: name.getValue() }));
		return aggregate;
	}

	/**
	 * 从持久化数据重建
	 */
	static rehydrate(data: __CONTEXT__Data): __CONTEXT__Aggregate {
		const aggregate = new __CONTEXT__Aggregate(__CONTEXT__Id.of(data.id), __CONTEXT__Name.of(data.name));
		aggregate._status = data.status;
		aggregate._updatedAt = data.updatedAt;
		return aggregate;
	}

	/**
	 * 更新名称
	 */
	updateName(newName: __CONTEXT__Name): void {
		if (this._name.equals(newName)) return; // 幂等

		this._name = newName;
		this._updatedAt = new Date();
		this.addDomainEvent(
			new __CONTEXT__NameUpdatedEvent(this._id.getValue(), {
				oldName: this._name.getValue(),
				newName: newName.getValue()
			})
		);
	}

	/**
	 * 停用
	 */
	deactivate(): void {
		if (this._status === __CONTEXT__Status.INACTIVE) return; // 幂等

		this._status = __CONTEXT__Status.INACTIVE;
		this._updatedAt = new Date();
		this.addDomainEvent(new __CONTEXT__DeactivatedEvent(this._id.getValue()));
	}

	/**
	 * 添加领域事件
	 */
	private addDomainEvent(event: DomainEvent): void {
		this._domainEvents.push(event);
	}

	/**
	 * 获取领域事件
	 */
	getDomainEvents(): DomainEvent[] {
		return [...this._domainEvents];
	}

	/**
	 * 清空领域事件
	 */
	clearDomainEvents(): void {
		this._domainEvents.length = 0;
	}

	// Getters
	get id(): __CONTEXT__Id {
		return this._id;
	}
	get name(): __CONTEXT__Name {
		return this._name;
	}
	get status(): __CONTEXT__Status {
		return this._status;
	}
	get updatedAt(): Date {
		return this._updatedAt;
	}
}
```

### 10.4 工作项

| #    | 任务                   | 产出                                       |
| ---- | ---------------------- | ------------------------------------------ |
| 15.1 | 更新模板聚合           | `__CONTEXT__Aggregate.ts`                  |
| 15.2 | 更新模板值对象         | `__CONTEXT__.value-objects.ts`             |
| 15.3 | 新增模板 Mapper        | `__CONTEXT__.mapper.ts`                    |
| 15.4 | 新增模板 Collection    | `__CONTEXT__.collection.ts`                |
| 15.5 | 新增模板 Specification | `__CONTEXT__.specification.ts`             |
| 15.6 | 更新模板文档           | `XS-bounded-context-模板使用与结构说明.md` |
| 15.7 | 最终验收               | E2E 测试全绿                               |

### 10.5 验收总清单

#### 代码质量

- [ ] 所有聚合采用 Rich Model 风格
- [ ] Value Objects 完善（equals/getValue）
- [ ] Specifications 模式可用
- [ ] Mapper 模式可用
- [ ] Collection VO 可用
- [ ] 领域异常语义清晰（中文）
- [ ] 所有公共 API 有 TSDoc 注释

#### 测试覆盖

- [ ] 单元测试覆盖率 ≥ 80%
- [ ] 关键路径测试覆盖率 ≥ 90%
- [ ] E2E 测试全绿
- [ ] 集成测试全绿

#### 性能

- [ ] 关键查询响应时间 < 100ms（P95）
- [ ] 热点数据缓存命中率 > 80%
- [ ] 无内存泄漏

#### 文档

- [ ] `XS-bounded-context-模板使用与结构说明.md` 已更新
- [ ] `XS-项目重构计划（CQRS+EDA平台化）.md` 已更新（添加 Phase 10-15）
- [ ] 代码示例可运行

---

## 十一、风险与对策

| 风险                         | 影响 | 概率 | 对策                                                 |
| ---------------------------- | ---- | ---- | ---------------------------------------------------- |
| R1：迁移导致回归             | 高   | 中   | 每个 Phase 结束运行 E2E 测试，提供 feature flag 回滚 |
| R2：ES 与 Write Model 不一致 | 高   | 低   | 同步事务写入，添加一致性检查任务                     |
| R3：团队学习曲线             | 中   | 高   | 提供示例代码、Pair Programming、Code Review          |
| R4：查询优化效果不达预期     | 中   | 低   | 先做性能基准测试，逐步优化，保留回滚能力             |
| R5：模板迁移成本高           | 低   | 中   | 提供迁移脚本，新旧模板共存期                         |

---

## 十二、文档元信息

- **版本**：v1.2.0
- **创建日期**：2026-02-18
- **最后更新**：2026-02-18
- **作者**：基于 `forks/nestjs-template` 技术调研
- **相关文档**：
    - `docs/XS-项目重构计划（CQRS+EDA平台化）.md`
    - `docs/XS-bounded-context-模板使用与结构说明.md`
    - `forks/nestjs-template/README.md`

### 实施进度

| Phase    | 名称                   | 状态      | 完成日期   |
| -------- | ---------------------- | --------- | ---------- |
| Phase 10 | Rich Model 风格迁移    | ✅ 已完成 | 2026-02-18 |
| Phase 11 | Value Objects 增强     | ✅ 已完成 | 2026-02-18 |
| Phase 12 | Specifications 模式    | ✅ 已完成 | 2026-02-18 |
| Phase 13 | Mapper + Collection VO | ⏳ 待实施 | -          |
| Phase 14 | 读侧查询优化           | ⏳ 待实施 | -          |
| Phase 15 | 模板更新与验收         | ⏳ 待实施 | -          |

### 变更记录

| 版本   | 日期       | 变更内容                                                                                                                       |
| ------ | ---------- | ------------------------------------------------------------------------------------------------------------------------------ |
| v1.2.0 | 2026-02-18 | Phase 12 完成：Specifications 模式引入（Specification 基类 + 组合规格 + 业务规则规格类）                                       |
| v1.1.0 | 2026-02-18 | Phase 10-11 完成：UserAggregate/TenantAggregate/BillingAggregate 重构为 Rich Model 风格，Value Objects 增强（equals/getValue） |
| v1.0.0 | 2026-02-18 | 初始版本，规划 Phase 10-15                                                                                                     |
