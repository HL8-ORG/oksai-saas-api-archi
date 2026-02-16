# @oksai/context

本包提供**请求上下文管理**，基于 `nestjs-cls` 实现多租户场景下的请求隔离和数据访问控制。

## 能力

- `OksaiRequestContext`: 请求上下文数据结构
- `OksaiRequestContextService`: 上下文服务（tenantId/userId/locale/requestId）
- `setupOksaiContextModule`: 统一装配
- `setupClsModule`: CLS 模块配置（支持 Worker 场景）
- `TenantRequiredGuard`: 租户守卫（要求请求必须带 tenantId）
- `TenantOptionalGuard`: 可选租户守卫
- `@TenantRequired()`: 租户装饰器（方法级校验）
- `TenantRequiredOptions`: 租户选项配置

## 使用场景

- 多租户租户上下文传递
- 请求级别的数据隔离
- Worker 任务上下文传递
- 日志追踪（requestId/tenantId/userId）

## 使用示例

### 基本使用

```ts
import { Module } from '@nestjs/common';
import { OksaiRequestContextService } from '@oksai/context';

@Module({
	imports: [setupOksaiContextModule()],
	providers: [OksaiRequestContextService]
})
export class AppModule {}
```

### 在 Service 中使用

```ts
import { Injectable } from '@nestjs/common';
import { OksaiRequestContextService } from '@oksai/context';

@Injectable()
export class MyService {
	constructor(private readonly ctx: OksaiRequestContextService) {}

	async getData() {
		const tenantId = this.ctx.getTenantId();
		const userId = this.ctx.getUserId();
		const locale = this.ctx.getLocale();

		// 根据 tenantId 查询数据
	}
}
```

### 使用守卫

```ts
import { Controller, Get, UseGuards } from '@nestjs/common';
import { TenantRequiredGuard } from '@oksai/context';

@Controller('users')
@UseGuards(TenantRequiredGuard)
export class UsersController {
	@Get()
	async findAll() {
		// 此处保证有 tenantId
	}
}
```

### 使用装饰器

```ts
import { Controller, Get } from '@nestjs/common';
import { TenantRequired } from '@oksai/context';

@Controller('users')
export class UsersController {
	@Get('protected')
	@TenantRequired()
	async getProtectedData() {
		// 方法级要求 tenantId
	}
}
```

### Worker 场景

```ts
import { runWithOksaiContext } from '@oksai/context';

type Job = { tenantId: string; userId?: string; requestId: string };

const handleJob = runWithOksaiContext(
	(job: Job) => ({
		tenantId: job.tenantId,
		userId: job.userId,
		requestId: job.requestId,
		locale: 'zh'
	}),
	async (job: Job) => {
		// 在 Worker 中也可以使用 ctx 服务
	}
);
```

## API

### OksaiRequestContext

```typescript
interface OksaiRequestContext {
	tenantId?: string;
	userId?: string;
	locale?: string;
	requestId?: string;
}
```

### OksaiRequestContextService

```typescript
class OksaiRequestContextService {
	get(): OksaiRequestContext;
	getRequestId(): string;
	setRequestId(requestId: string): void;
	getTenantId(): string | undefined;
	setTenantId(tenantId: string): void;
	getUserId(): string | undefined;
	setUserId(userId: string): void;
	getLocale(): string | undefined;
	setLocale(locale: string): void;
}
```

### TenantRequiredGuard

```typescript
class TenantRequiredGuard implements CanActivate {
	canActivate(context: ExecutionContext): boolean;
}
```

## 安全特性

- 请求隔离：每个请求独立的 CLS 上下文
- 自动注入：通过守卫/装饰器自动设置 tenantId
- 防止泄漏：跨租户数据隔离
- Worker 支持：为后台任务提供上下文

## 依赖

- `@nestjs/common`: ^11.0.1
- `nestjs-cls`: ^4.0.0
