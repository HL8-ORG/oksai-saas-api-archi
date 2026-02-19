# 重构基线验收清单（Phase 0）

> 本清单用于在“平台化重构（CQRS + EDA）”期间提供可对照的基线，确保每次阶段性改动都可以快速验证是否回归。
>
> 关联计划：`docs/XS-项目重构计划（CQRS+EDA平台化）.md` 的 Phase 0。

## 一、必须全绿的测试集（Definition of Done）

### 1.1 platform-api（业务端）

在仓库根目录执行：

- `pnpm -C apps/platform-api test --runInBand`

覆盖内容（关键路径）：

- tenant：EventStore + Outbox + Projection 端到端闭环
- tenant：Auth + CASL（tenant 侧受保护接口）

### 1.2 platform-admin-api（管理端）

在仓库根目录执行：

- `pnpm -C apps/platform-admin-api test --runInBand`

覆盖内容（关键路径）：

- Better Auth：sign-up/session
- CASL：PoliciesGuard + RoleResolver（依赖 Identity 角色投影）

## 二、默认测试环境变量（建议）

> 说明：以下为“集成测试场景”的最小约定；如需覆盖，请在测试文件内显式设置。

- `NODE_ENV=test`
- `DB_USE_TEST_PORT=true`
- `DB_HOST=127.0.0.1`
- `DB_USER=postgres`
- `DB_PASSWORD=test_password`
- `DB_NAME=test_oksai`
- `DB_MIGRATIONS_RUN=true`
- `OUTBOX_PUBLISHER_ENABLED=true`
- `OUTBOX_PUBLISH_INTERVAL_MS=50`（可按测试需要调小/调大）

## 三、强约束验收点（必须满足）

### 3.1 集成事件发布一致性（Outbox）

- 所有集成事件必须通过 `IOutbox.append()` 写入 outbox。
- OutboxPublisher 才能把 pending 记录投递到 event bus。

### 3.2 幂等消费（Inbox）

- 投影/订阅必须使用 `IInbox` 对 `messageId` 去重，确保至少一次投递下仍幂等。

### 3.3 多租户上下文（CLS）

- `tenantId/userId/requestId` 必须来自 CLS（`@oksai/context`）。
- 禁止客户端透传覆盖 tenantId。

## 四、观察性（最低要求）

- 日志字段必须包含（至少）：`tenantId`、`userId`、`requestId`（如可得）。
- 不记录敏感信息（密码、token 等）。
