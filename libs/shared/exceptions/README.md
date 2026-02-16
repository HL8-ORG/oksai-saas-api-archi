## @oksai/exceptions（统一异常与 Problem Details）

### 目标

为本仓库提供一个统一的异常模型与 HTTP 错误响应格式：

- **异常类型尽量不依赖 Nest**（便于在 Application/Domain 层使用）
- 在 **Nest + Fastify** 下通过全局 Filter 输出 **RFC7807 Problem Details**
- 通过 **nestjs-pino** 使用结构化日志记录异常

### 主要能力

- `AppException` / `HttpError`：基础异常类型
- `ProblemDetails`：RFC7807 响应结构（含 `errorCode` 扩展字段）
- Nest Filters：
    - `AppExceptionFilter`：捕获 `HttpError` 并输出 Problem Details
    - `NestHttpExceptionFilter`：捕获 Nest 的 `HttpException` 并转为 Problem Details
    - `AnyExceptionFilter`：兜底未知异常（500）

### 在应用中接入（示例）

在 `apps/<app>/src/main.ts`：

```ts
import { setupGlobalExceptionFilters } from '@oksai/exceptions';

// 初始化应用后
await setupGlobalExceptionFilters(app);
```

或在应用模块中手动装配：

```ts
import { AppExceptionFilter } from '@oksai/exceptions';
import { NestHttpExceptionFilter } from '@oksai/exceptions';
import { AnyExceptionFilter } from '@oksai/exceptions';

app.useGlobalFilters(
	new AppExceptionFilter(httpAdapterHost, pinoLogger),
	new NestHttpExceptionFilter(httpAdapterHost, pinoLogger),
	new AnyExceptionFilter(httpAdapterHost, pinoLogger)
);
```
