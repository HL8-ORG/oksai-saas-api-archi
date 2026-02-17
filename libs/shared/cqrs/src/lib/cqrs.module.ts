import { Module } from '@nestjs/common';
import { CommandBus } from './buses/command-bus';
import { QueryBus } from './buses/query-bus';
import { ExplorerService } from './services/explorer.service';

/**
 * @description CQRS 模块（最小实现）
 *
 * 能力：
 * - CommandBus / QueryBus
 * - @CommandHandler / @QueryHandler 的自动探测与注册
 *
 * 强约束：
 * - 不提供 EventBus/Saga（集成事件通道请使用 `@oksai/eda`）
 */
@Module({
	providers: [CommandBus, QueryBus, ExplorerService],
	exports: [CommandBus, QueryBus]
})
export class OksaiCqrsModule {}

