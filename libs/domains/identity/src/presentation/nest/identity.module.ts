import { type DynamicModule, Module } from '@nestjs/common';
import { setupEventStoreModule } from '@oksai/event-store';
import { OksaiCqrsModule } from '@oksai/cqrs';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { IdentityApplicationService } from '../../application/services/identity-application.service';
import { RegisterUserCommandHandler } from '../../application/handlers/register-user.command-handler';
import { EventSourcedUserRepository } from '../../infrastructure/persistence/event-sourced-user.repository';
import { IdentityRoleAssignmentEntity } from '../../infrastructure/read-model/role-assignment.entity';
import { PgRoleResolver } from '../../infrastructure/read-model/pg-role-resolver';
import { IdentityRoleProjectionSubscriber } from '../../infrastructure/projections/identity-role-projection.subscriber';

/**
 * @description Identity 上下文 Nest 装配模块
 *
 * 说明：
 * - 该模块负责把"端口接口"绑定到"基础设施实现"
 * - 支持 `eventStore` 持久化装配路径
 * - 通过 CQRS 调度路径执行用例（CommandBus → Handler）
 *
 * 变更说明：
 * - 已迁移到 CQRS 调度路径
 * - ApplicationService 通过注入 CommandBus 调用 handler
 * - Handler 通过 @CommandHandler 装饰器自动注册
 *
 * 强约束：
 * - 必须启用 `@oksai/app-kit` 的 `cqrs.enabled: true` 或自行装配 OksaiCqrsModule
 * - Handler 必须使用 `@Injectable` + `@CommandHandler` 装饰器
 */
@Module({})
export class IdentityModule {
	/**
	 * @description 初始化 Identity 模块
	 *
	 * @param options - 装配选项
	 * @returns DynamicModule
	 */
	static init(options: { persistence?: 'eventStore' } = {}): DynamicModule {
		const persistence = options.persistence ?? 'eventStore';

		if (persistence !== 'eventStore') {
			throw new Error('Identity 目前仅支持 eventStore 持久化模式。');
		}

		return {
			module: IdentityModule,
			imports: [
				setupEventStoreModule({ isGlobal: false }),
				OksaiCqrsModule,
				MikroOrmModule.forFeature([IdentityRoleAssignmentEntity])
			],
			providers: [
				EventSourcedUserRepository,
				PgRoleResolver,
				IdentityRoleProjectionSubscriber,
				// CQRS Handler（通过 @CommandHandler 自动注册）
				RegisterUserCommandHandler,
				// ApplicationService（注入 CommandBus）
				IdentityApplicationService
			],
			exports: [IdentityApplicationService, PgRoleResolver]
		};
	}
}
