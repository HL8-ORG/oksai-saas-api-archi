import type { UserAggregate } from '../../domain/aggregates/user.aggregate';

/**
 * @description 用户仓储端口（Identity）
 */
export interface IUserRepository {
	save(aggregate: UserAggregate): Promise<void>;
	findById(id: string): Promise<UserAggregate | null>;
}
