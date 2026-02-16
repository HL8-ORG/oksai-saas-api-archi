## @oksai/logger（NestJS + Fastify + Pino）

### 目标

在 monorepo 内提供统一的日志装配能力：

- 使用 **nestjs-pino + pino-http** 输出结构化 JSON 日志
- 默认面向 **NestJS + Fastify**（但尽量不强依赖 Fastify 类型）
- 提供统一的 `customProps` 入口，用于注入 `traceId/requestId/tenantId/actorId` 等字段

### 使用方式

在 `apps/<app>/src/app.module.ts`：

```typescript
import { Module } from '@nestjs/common';
import { setupLoggerModule } from '@oksai/logger';

@Module({
  imports: [
    setupLoggerModule({
      customProps: (req) => ({
        requestId: (req as any)?.id
      })
    })
  ]
})
export class AppModule {}
```

在 `apps/<app>/src/main.ts`：

```typescript
import { Logger } from '@oksai/logger';

// NestFactory.create(..., { bufferLogs: true })
app.useLogger(app.get(Logger));
```

### 开发环境 pretty 输出

本包不会强依赖 `pino-pretty`，建议由应用（app）在开发环境以 devDependency 形式安装。
