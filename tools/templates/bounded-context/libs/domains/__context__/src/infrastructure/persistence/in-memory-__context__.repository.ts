import { Injectable } from '@nestjs/common';
import type { I__CONTEXT__Repository } from '../../application/ports/__context__.repository.port';
import { __CONTEXT__Aggregate } from '../../domain/aggregates/__context__.aggregate';

/**
 * @description __CONTEXT__ 内存仓储实现（模板）
 *
 * 使用场景：
 * - demo/开发阶段快速验证，不具备持久化能力
 */
@Injectable()
export class InMemory__CONTEXT__Repository implements I__CONTEXT__Repository {
	private readonly store = new Map<string, __CONTEXT__Aggregate>();

	async save(aggregate: __CONTEXT__Aggregate): Promise<void> {
		this.store.set(aggregate.id, aggregate);
	}

	async findById(id: string): Promise<__CONTEXT__Aggregate | null> {
		return this.store.get(id) ?? null;
	}
}
