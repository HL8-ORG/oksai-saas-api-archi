# Phase 9：BDD 测试框架建立 - 实施计划

> **创建日期**：2026-02-20
> **优先级**：P1
> **预计工时**：5 天
> **当前状态**：⏳ 进行中

---

## 1. 目标

借鉴参考项目的 BDD 测试模式，建立完善的测试体系，确保四大核心功能的质量。

### 核心目标

- 建立统一的 BDD 测试目录结构
- 实现 Builder 模式的测试数据构建器
- 创建可复用的 Mock 对象体系
- 为每个用例编写完整的 BDD 测试场景

---

## 2. 任务分解

### 9.1 测试目录结构建立（1 天）

**交付物**：

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

- [ ] 测试目录结构创建完成
- [ ] Jest 配置支持新测试目录
- [ ] 现有测试不受影响

---

### 9.2 Builder 模式实现（1 天）

**交付物**：

| Builder                  | 用途           | 状态 |
| ------------------------ | -------------- | ---- |
| `TenantPropsBuilder`     | 构建租户属性   | ⏳   |
| `TenantAggregateBuilder` | 构建租户聚合   | ⏳   |
| `ContextBuilder`         | 构建执行上下文 | ⏳   |

**示例代码**：

```typescript
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
```

**验收标准**：

- [ ] TenantPropsBuilder 实现完成
- [ ] TenantAggregateBuilder 实现完成
- [ ] ContextBuilder 实现完成
- [ ] Builder 单元测试通过

---

### 9.3 Mock 对象实现（1 天）

**交付物**：

| Mock                    | 用途            | 状态 |
| ----------------------- | --------------- | ---- |
| `MockTenantWriteRepo`   | 租户写仓储 Mock | ⏳   |
| `MockTenantReadRepo`    | 租户读仓储 Mock | ⏳   |
| `MockAsyncLocalStorage` | CLS Mock        | ⏳   |

**示例代码**：

```typescript
export class MockTenantWriteRepo {
	mockSaveMethod = jest.fn();
	mockFindBySlugMethod = jest.fn();
	private existingTenants: Map<string, TenantAggregate> = new Map();

	getMock(): ITenantWriteRepository {
		return {
			save: this.mockSaveMethod.mockImplementation(async (tenant: TenantAggregate) => {
				this.existingTenants.set(tenant.id.value, tenant);
			}),
			findBySlug: this.mockFindBySlugMethod.mockImplementation(async (slug: string) => {
				for (const tenant of this.existingTenants.values()) {
					if (tenant.slug.value === slug) {
						return tenant;
					}
				}
				return null;
			})
		} as ITenantWriteRepository;
	}

	setupExistingTenant(props: { slug: string }): void {
		const tenant = new TenantAggregateBuilder().withSlug(props.slug).build();
		this.existingTenants.set(tenant.id.value, tenant);
	}

	setupError(error: Error): void {
		this.mockSaveMethod.mockRejectedValue(error);
	}
}
```

**验收标准**：

- [ ] MockTenantWriteRepo 实现完成
- [ ] MockTenantReadRepo 实现完成
- [ ] Mock 对象测试通过

---

### 9.4 BDD 测试用例编写（2 天）

#### 9.4.1 创建租户测试用例

**测试场景**：

| 场景             | 描述           | 状态 |
| ---------------- | -------------- | ---- |
| 创建租户成功     | 正常创建租户   | ⏳   |
| 租户标识已存在   | slug 重复      | ⏳   |
| 租户名称验证失败 | 名称长度不合法 | ⏳   |
| 仓储层错误       | 数据库连接失败 | ⏳   |

#### 9.4.2 激活租户测试用例

**测试场景**：

| 场景         | 描述     | 状态 |
| ------------ | -------- | ---- |
| 激活租户成功 | 正常激活 | ⏳   |
| 租户不存在   | ID 无效  | ⏳   |
| 租户已激活   | 重复激活 | ⏳   |

#### 9.4.3 添加成员测试用例

**测试场景**：

| 场景         | 描述     | 状态 |
| ------------ | -------- | ---- |
| 添加成员成功 | 正常添加 | ⏳   |
| 成员已存在   | 重复添加 | ⏳   |
| 租户不存在   | ID 无效  | ⏳   |
| 超过成员限制 | 超出配额 | ⏳   |

**验收标准**：

- [ ] 所有测试场景覆盖
- [ ] 测试覆盖率 > 80%
- [ ] Given-When-Then 结构清晰
- [ ] 领域事件验证完整

---

## 3. 技术规范

### 3.1 BDD 测试结构

```typescript
describe('Feature: Create tenant', () => {
	describe('Scenario: Tenant created successfully', () => {
		it('should create tenant and emit TenantCreatedEvent', async () => {
			// given - 准备测试数据和依赖
			const mockRepo = new MockTenantWriteRepo();
			const command = new CreateTenantCommand({ name: 'Test', slug: 'test' });

			// when - 执行被测行为
			const handler = new CreateTenantHandler(mockRepo.getMock());
			const result = await handler.execute(command);

			// then - 验证结果
			expect(result.isOk()).toBe(true);
			expect(mockRepo.mockSaveMethod).toHaveBeenCalled();
		});
	});
});
```

### 3.2 命名规范

| 类型         | 命名规则             | 示例                               |
| ------------ | -------------------- | ---------------------------------- |
| 测试文件     | `{feature}.steps.ts` | `create-tenant.steps.ts`           |
| Mock 文件    | `{name}.mock.ts`     | `create-tenant-write-repo.mock.ts` |
| Builder 文件 | `{name}.builder.ts`  | `tenant-props.builder.ts`          |
| 测试场景     | 中文描述             | `创建租户成功`                     |

### 3.3 测试覆盖要求

- **成功场景**：至少 1 个
- **业务规则失败**：每个业务规则至少 1 个
- **技术错误**：至少 1 个
- **边界条件**：关键边界至少 1 个

---

## 4. 依赖关系

```
9.1 目录结构
    ↓
9.2 Builder 实现 ← 9.3 Mock 实现
         ↓              ↓
    9.4 BDD 测试用例编写
```

---

## 5. 风险与缓解

| 风险                | 影响 | 缓解措施                      |
| ------------------- | ---- | ----------------------------- |
| 现有测试受影响      | 中   | 保持现有测试不动，新目录独立  |
| Mock 行为与真实不符 | 高   | Mock 行为需与真实实现对照验证 |
| 测试数据构建复杂    | 低   | Builder 模式灵活组合          |

---

## 6. 验收标准

### Phase 9 完成标准

- [ ] 测试目录结构完整
- [ ] 所有 Builder 实现并通过测试
- [ ] 所有 Mock 实现并通过测试
- [ ] create-tenant BDD 测试通过
- [ ] activate-tenant BDD 测试通过
- [ ] add-member BDD 测试通过
- [ ] 整体测试覆盖率 > 80%

---

## 7. 进度追踪

| 日期       | 完成内容     | 备注 |
| ---------- | ------------ | ---- |
| 2026-02-20 | 创建实施计划 | -    |
| -          | -            | -    |

---

## 8. 相关文档

- [XS-基于ddd-hexagonal-cqrs-es-eda项目的重构方案.md](./XS-基于ddd-hexagonal-cqrs-es-eda项目的重构方案.md) - Phase 9 详细设计
- [XS-阶段性任务计划.md](./XS-阶段性任务计划.md) - 总体进度
