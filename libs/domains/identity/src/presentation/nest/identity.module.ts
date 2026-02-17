import { type DynamicModule, Module } from '@nestjs/common';
import { OksaiRequestContextService } from '@oksai/context';
import { DatabaseUnitOfWork } from '@oksai/database';
import { setupEventStoreModule } from '@oksai/event-store';
import { OKSAI_OUTBOX_TOKEN, type IOutbox } from '@oksai/messaging';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { IdentityApplicationService } from '../../application/services/identity-application.service';
import type { IUserRepository } from '../../application/ports/user.repository.port';
import { EventSourcedUserRepository } from '../../infrastructure/persistence/event-sourced-user.repository';
import { IdentityRoleAssignmentEntity } from '../../infrastructure/read-model/role-assignment.entity';
import { PgRoleResolver } from '../../infrastructure/read-model/pg-role-resolver';
import { IdentityRoleProjectionSubscriber } from '../../infrastructure/projections/identity-role-projection.subscriber';

/**
 * @description Identity 上下文 Nest 装配模块（最小实现）
 */
@Module({})
export class IdentityModule {
	/**
	 * @description 初始化 Identity 模块
	 */
	static init(options: { persistence?: 'eventStore' } = {}): DynamicModule {
		const persistence = options.persistence ?? 'eventStore';

		if (persistence !== 'eventStore') {
			throw new Error('Identity 目前仅支持 eventStore 持久化模式。');
		}

		return {
			module: IdentityModule,
			imports: [setupEventStoreModule({ isGlobal: false }), MikroOrmModule.forFeature([IdentityRoleAssignmentEntity])],
			providers: [
				EventSourcedUserRepository,
				PgRoleResolver,
				IdentityRoleProjectionSubscriber,
				{
					provide: IdentityApplicationService,
					useFactory: (repo: IUserRepository, outbox: IOutbox, ctx: OksaiRequestContextService, uow?: DatabaseUnitOfWork) =>
						new IdentityApplicationService(repo, outbox, ctx, uow),
					inject: [EventSourcedUserRepository, OKSAI_OUTBOX_TOKEN, OksaiRequestContextService, { token: DatabaseUnitOfWork, optional: true }]
				}
			],
			exports: [IdentityApplicationService, PgRoleResolver]
		};
	}
}

