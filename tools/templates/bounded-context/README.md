# bounded context 可复制模板（Starter Template）

本目录用于**复制粘贴**创建新的 `libs/domains/<context>/` 包，帮助你在本仓库架构约束下快速落盘并跑通最小闭环。

> 详细说明文档：`docs/XS-bounded-context-模板使用与结构说明.md`

## 适用范围

- 本模板对齐 `docs/ARCHITECTURE.md` 的强约束：Clean Architecture + CQRS + ES + EDA。
- 默认投递方式仍为**同进程 `IEventBus`**；可靠性边界在 Postgres（EventStore/Outbox/Inbox/Projection）。

## 使用方式（复制后替换占位符）

1. 复制整个目录 `tools/templates/bounded-context/libs/domains/__context__` 到 `libs/domains/<your-context>`。
2. 全局替换占位符：
    - `__context__` → 你的上下文名（kebab-case，例如 `inventory`）
    - `__CONTEXT__` → 你的上下文名（PascalCase，例如 `Inventory`）
3. 更新 `package.json#name` 为 `@oksai/<your-context>`。
4. 将新包加入 `tsconfig.json` 的 references（根项目引用列表）。
5. 在 `apps/platform-api/src/app.module.ts` 中装配：
    - `TenantModule.init(...)` 的方式可作为参考（inMemory 与 eventStore 双路径）。
6. 复制 `tools/templates/bounded-context/tests/integration/__context__-eventstore-outbox-projection.spec.ts` 到：
    - `tests/integration/<your-context>-eventstore-outbox-projection.spec.ts`

## 模板原则（请勿删除）

- **中文注释 + 英文命名**：变量/类型名保持英文，注释必须中文。
- **tenantId 强约束**：tenantId 必须来自 CLS（`@oksai/context`），禁止客户端透传覆盖。
- **投影幂等**：投影订阅者必须用 Inbox（messageId）去重。
