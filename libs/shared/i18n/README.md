## @oksai/i18n（轻量 i18n 接入）

### 目标

- 基于 `nestjs-i18n` 提供统一的 i18n 装配
- 统一语言解析策略（默认：Header `accept-language`）
- 将 DTO 校验错误输出为 **RFC7807 Problem Details**（对齐 `@oksai/exceptions`）

### 使用方式（应用侧）

1. 准备翻译文件（推荐目录结构）

```
src/i18n/
  zh/
    common.json
  en/
    common.json
```

2. 确保构建时复制 assets（Nest CLI）

在 `apps/<app>/nest-cli.json` 增加：

```json
{
	"compilerOptions": {
		"assets": [{ "include": "i18n/**/*" }],
		"watchAssets": true
	}
}
```

3. AppModule 装配（`baseDir` 推荐传 `path.join(__dirname, '..')`，使 prod 可读取 `dist/i18n`）

```ts
import * as path from 'node:path';
import { Module } from '@nestjs/common';
import { setupI18nModule } from '@oksai/i18n';

@Module({
	imports: [setupI18nModule(path.join(__dirname, '..'))]
})
export class AppModule {}
```

4. main.ts 添加校验 pipe 与 filter（Problem Details 输出）

```ts
import { I18nValidationPipe } from 'nestjs-i18n';
import { I18nValidationExceptionFilter, problemDetailsResponseBodyFormatter } from '@oksai/i18n';

app.useGlobalPipes(new I18nValidationPipe({ transform: true, whitelist: true }));
app.useGlobalFilters(
	new I18nValidationExceptionFilter({
		detailedErrors: true,
		responseBodyFormatter: problemDetailsResponseBodyFormatter
	})
);
```
