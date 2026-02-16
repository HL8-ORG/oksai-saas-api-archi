import Redis from 'ioredis';

/**
 * @description Redis 仓储基类（仅负责 key 生成约定）
 *
 * @template T - 实体类型
 * @template ID - 主键类型
 */
export abstract class AbstractRedisRepository<T, ID extends number | string> {
	constructor(protected readonly redis: Redis) {}

	/**
	 * @description 从实体获取唯一标识
	 */
	protected abstract uniqueIdentifier(t: T): string;

	public getKey(t: T): string {
		return this.getKeyById(this.uniqueIdentifier(t));
	}

	public getKeyById(id: ID | string): string {
		return [this.keyPrefix(), id, this.keySuffix()]
			.map((s) => s.toString())
			.filter((s) => s.length > 0)
			.join(this.keySeparator());
	}

	protected keySeparator(): string {
		return ':';
	}

	protected keyPrefix(): string {
		return '';
	}

	protected keySuffix(): string {
		return '';
	}
}
