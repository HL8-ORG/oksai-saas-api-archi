## @oksai/logger（NestJS + Fastify + Pino）

### 目标

在 monorepo 内提供统一的日志装配能力：

- 使用 **nestjs-pino + pino-http** 输出结构化 JSON 日志
- 默认面向 **NestJS + Fastify**（但尽量不强依赖 Fastify 类型）
- 提供统一的 `customProps` 入口，用于注入 `traceId/requestId/tenantId/actorId` 等字段
- 支持开发环境的美化日志输出（pino-pretty）

### 使用方式

在 `apps/<app>/src/app.module.ts`：

```typescript
import { Module } from '@nestjs/common';
import { setupLoggerModule } from '@oksai/logger';

@Module({
	imports: [
		setupLoggerModule({
			level: 'info',
			pretty: process.env.NODE_ENV === 'development',
			prettyOptions: {
				colorize: true,
				timeFormat: 'HH:MM:ss.l',
				singleLine: false,
				errorLikeObjectKeys: ['err', 'error'],
				ignore: 'pid,hostname'
			},
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

本包支持可选的 `pino-pretty` 用于美化日志输出：

- 安装：`pnpm add -D pino-pretty`
- 配置：通过 `prettyOptions` 自定义美化选项
- 效果：彩色、格式化的日志输出

### PrettyOptions 配置

- `colorize` - 是否使用颜色（默认 true）
- `timeFormat` - 时间格式（默认 'HH:MM:ss.l'）
- `singleLine` - 是否单行输出（默认 false）
- `errorLikeObjectKeys` - 错误对象键（默认 ['err', 'error']）
- `ignore` - 忽略的字段（默认 'pid,hostname'）

### 日志输出示例

#### 生产环境（JSON 格式）

```json
{
	"level": "info",
	"time": 1708092180000,
	"requestId": "abc123",
	"req": { "method": "GET", "url": "/" },
	"res": { "statusCode": 200 },
	"responseTime": 123
}
```

#### 开发环境（Pretty 格式）

```
[14:32:45.123] INFO (abc123): HTTP GET /
  req: {
    "method": "GET",
    "url": "/"
  }
  res: {
    "statusCode": 200
  }
  responseTime: 123ms
```
