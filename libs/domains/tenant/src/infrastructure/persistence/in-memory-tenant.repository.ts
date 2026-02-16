import type { ITenantRepository } from '../../application/ports/tenant.repository.port';
import type { TenantAggregate } from '../../domain/aggregates/tenant.aggregate';
import { TenantId } from '../../domain/value-objects/tenant-id.value-object';

/**
 * @description
 * 内存租户仓储（仅用于 demo/测试）。
 *
 * 注意事项：
 * - 不具备持久化能力
 * - 不具备并发控制
 */
export class InMemoryTenantRepository implements ITenantRepository {
	private readonly store = new Map<string, TenantAggregate>();

	async save(tenant: TenantAggregate): Promise<void> {
		this.store.set(tenant.id.toString(), tenant);
	}

	async findById(id: TenantId): Promise<TenantAggregate | null> {
		return this.store.get(id.toString()) ?? null;
	}
}

