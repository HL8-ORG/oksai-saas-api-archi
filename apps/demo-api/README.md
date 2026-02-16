# Demo API

演示 API，集成测试 config 和 logger 包，使用 Fastify 作为 HTTP 服务器。

## 技术栈

- **框架**：NestJS
- **HTTP 服务器**：Fastify（替代 Express，提供更好的性能）
- **配置管理**：@oksai/config
- **日志管理**：@oksai/logger（基于 Pino）
- **验证**：class-validator
- **类型**：TypeScript

## 环境变量

```bash
PORT=3000
NODE_ENV=development
LOG_LEVEL=debug
```

## 开发

```bash
# 安装依赖
pnpm install

# 开发模式
pnpm --filter demo-api start:dev

# 构建生产版本
pnpm --filter demo-api build

# 启动生产版本
pnpm --filter demo-api start:prod
```

## API 接口

### GET /

返回欢迎消息。

### GET /health

健康检查接口。

### GET /config

查看当前配置。

## 集成测试

本应用用于集成测试以下包：

- `@oksai/config` - 配置管理
- `@oksai/logger` - 日志管理

## Fastify 优势

- **更高的性能**：比 Express 快 60-70%
- **更低的内存占用**：减少约 30-40%
- **原生日志支持**：与 Pino 完美集成
- **更好的插件系统**：模块化和可扩展
- **HTTP/2 和 HTTP/3 支持**：开箱即用

## 相关文档

- Fastify 使用总结：`docs/demo-api使用Fastify总结.md`
- Fastify 官方文档：https://fastify.dev
