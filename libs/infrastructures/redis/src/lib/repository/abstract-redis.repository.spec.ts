/* eslint-disable @typescript-eslint/no-explicit-any */
import Redis from 'ioredis';
import { AbstractRedisRepository } from './abstract-redis.repository';

/**
 * 测试用的具体实现类
 */
class TestRedisRepository extends AbstractRedisRepository<{ id: string }, string> {
	constructor(redis: Redis) {
		super(redis);
	}

	protected uniqueIdentifier(t: { id: string }): string {
		return t.id;
	}

	protected keyPrefix(): string {
		return 'prefix';
	}

	protected keySuffix(): string {
		return 'suffix';
	}
}

/**
 * 最小实现的测试类
 */
class MinimalRepository extends AbstractRedisRepository<{ id: number }, number> {
	constructor(redis: Redis) {
		super(redis);
	}

	protected uniqueIdentifier(t: { id: number }): string {
		return String(t.id);
	}
}

describe('AbstractRedisRepository', () => {
	let mockRedis: jest.Mocked<Redis>;
	let repository: TestRedisRepository;

	beforeEach(() => {
		mockRedis = {} as unknown as jest.Mocked<Redis>;
		repository = new TestRedisRepository(mockRedis);
	});

	describe('getKey', () => {
		it('应该根据实体生成正确的 key', () => {
			const entity = { id: 'test-id' };

			const key = repository.getKey(entity);

			expect(key).toBe('prefix:test-id:suffix');
		});

		it('应该使用实体的唯一标识', () => {
			const entity = { id: 'entity-123' };

			const key = repository.getKey(entity);

			expect(key).toBe('prefix:entity-123:suffix');
		});
	});

	describe('getKeyById', () => {
		it('应该根据 ID 生成正确的 key', () => {
			const key = repository.getKeyById('my-id');

			expect(key).toBe('prefix:my-id:suffix');
		});

		it('应该处理字符串类型的 ID', () => {
			const key = repository.getKeyById('string-id');

			expect(key).toBe('prefix:string-id:suffix');
		});

		it('应该处理数字类型的 ID', () => {
			const numRepo = new MinimalRepository(mockRedis);
			const key = numRepo.getKeyById(123);

			expect(key).toBe('123');
		});

		it('应该转换为字符串类型的 ID', () => {
			const numRepo = new MinimalRepository(mockRedis);
			const key = numRepo.getKeyById(456);

			expect(key).toBe('456');
		});
	});

	describe('keySeparator', () => {
		it('应该使用冒号作为分隔符', () => {
			const separator = (repository as any).keySeparator();

			expect(separator).toBe(':');
		});
	});

	describe('默认实现', () => {
		it('应该返回空字符串作为默认前缀', () => {
			const minimalRepo = new MinimalRepository(mockRedis);
			const prefix = (minimalRepo as any).keyPrefix();

			expect(prefix).toBe('');
		});

		it('应该返回空字符串作为默认后缀', () => {
			const minimalRepo = new MinimalRepository(mockRedis);
			const suffix = (minimalRepo as any).keySuffix();

			expect(suffix).toBe('');
		});
	});

	describe('自定义实现', () => {
		it('应该支持自定义 key 前缀', () => {
			const prefix = (repository as any).keyPrefix();

			expect(prefix).toBe('prefix');
		});

		it('应该支持自定义 key 后缀', () => {
			const suffix = (repository as any).keySuffix();

			expect(suffix).toBe('suffix');
		});
	});

	describe('边缘情况', () => {
		it('应该正确处理空字符串 ID（过滤掉空值）', () => {
			const key = repository.getKeyById('');

			expect(key).toBe('prefix:suffix');
		});

		it('应该正确处理包含特殊字符的 ID', () => {
			const entity = { id: 'id-with-special-chars-123' };
			const key = repository.getKey(entity);

			expect(key).toBe('prefix:id-with-special-chars-123:suffix');
		});
	});
});
