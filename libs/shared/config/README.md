# Config

配置管理服务，提供环境变量解析和 NestJS 配置模块装配功能。

## 功能

- 统一的环境变量解析器（支持 string、int、bool、enum、url、json、list、durationMs）
- NestJS ConfigModule 统一装配
- 应用配置注册（基于 @nestjs/config 的 registerAs）

## 使用示例

### 环境变量解析

```typescript
import { env } from '@oksai/config';

const port = env.int('PORT', { defaultValue: 3000 });
const dbUrl = env.url('DATABASE_URL');
const plugins = env.list('PLUGINS_ENABLED', { defaultValue: [] });
const cacheTtl = env.durationMs('CACHE_TTL', { defaultValue: 300_000 });
```

### NestJS 配置模块装配

```typescript
import { setupConfigModule } from '@oksai/config';

@Module({
	imports: [
		setupConfigModule({
			isGlobal: true,
			envFilePath: ['.env', '.env.local']
		})
	]
})
export class AppModule {}
```

### 应用配置注册

```typescript
import { registerAppConfig } from '@oksai/config';

export const appConfig = registerAppConfig('app', () => ({
	port: env.int('PORT', { defaultValue: 3000 }),
	nodeEnv: env.string('NODE_ENV', { defaultValue: 'development' })
}));
```
