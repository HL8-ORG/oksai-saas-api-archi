## @oksai/redis（Redis + 分布式锁）

### 目标

为本仓库提供统一的 Redis 基础设施封装：

- Redis 客户端：`ioredis`
- 分布式锁：`redlock`
- 配置：基于 `@oksai/config` + `@nestjs/config`（registerAs + ConfigService）
- 退出：在 Nest 应用关闭时优雅释放连接（`quit()`）

### 推荐用法（应用侧）

1. 注册配置（示例：`apps/<app>/src/config/redis.config.ts`）

```ts
import { registerRedisConfig } from '@oksai/redis';

export const redisConfig = registerRedisConfig();
```

环境变量：

- `REDIS_URL`（必填）：如 `redis://localhost:6379/0`
- `REDIS_KEY_PREFIX`（可选）：统一 key 前缀，避免跨服务冲突

2. 在 AppModule 装配

```ts
import { Module } from '@nestjs/common';
import { setupConfigModule } from '@oksai/config';
import { redisConfig, setupRedisModule, setupRedisLockModule } from '@oksai/redis';

@Module({
	imports: [setupConfigModule({ load: [redisConfig] }), setupRedisModule(), setupRedisLockModule()]
})
export class AppModule {}
```

3. 在业务中注入 Redis/Redlock

```ts
import { Inject } from '@nestjs/common';
import type Redis from 'ioredis';
import type Redlock from 'redlock';
import { OKSAI_REDIS, OKSAI_REDLOCK } from '@oksai/redis';

@Inject(OKSAI_REDIS) private readonly redis: Redis
@Inject(OKSAI_REDLOCK) private readonly redlock: Redlock
```
