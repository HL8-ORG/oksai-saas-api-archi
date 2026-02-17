import type { DomainEvent } from '../events/domain-event';
import { UserAddedToTenantEvent } from '../events/user-added-to-tenant.event';
import { RoleGrantedToUserEvent } from '../events/role-granted-to-user.event';
import { RoleKey } from '../value-objects/role-key';

/**
 * @description 租户成员关系聚合根（最小可用）
 *
 * 说明：
 * - 一个聚合实例表示“某用户在某租户下的成员关系”
 * - aggregateId 采用 `${tenantId}:${userId}` 形式（仅作为最小实现）
 */
export class TenantMembershipAggregate {
	private readonly uncommitted: DomainEvent[] = [];
	private committedVersion = 0;
	private version = 0;

	private roles: RoleKey[] = [];

	private constructor(
		readonly tenantId: string,
		readonly userId: string
	) {}

	static create(tenantId: string, userId: string): TenantMembershipAggregate {
		const agg = new TenantMembershipAggregate(tenantId, userId);
		agg.record(new UserAddedToTenantEvent(agg.getAggregateId(), { tenantId }));
		return agg;
	}

	static rehydrate(tenantId: string, userId: string, events: DomainEvent[]): TenantMembershipAggregate {
		const agg = new TenantMembershipAggregate(tenantId, userId);
		for (const e of events) {
			agg.apply(e);
			agg.version += 1;
		}
		agg.committedVersion = agg.version;
		agg.uncommitted.splice(0, agg.uncommitted.length);
		return agg;
	}

	getAggregateId(): string {
		return `${this.tenantId}:${this.userId}`;
	}

	getExpectedVersion(): number {
		return this.committedVersion;
	}

	getUncommittedEvents(): DomainEvent[] {
		return [...this.uncommitted];
	}

	commitUncommittedEvents(): void {
		this.uncommitted.splice(0, this.uncommitted.length);
		this.committedVersion = this.version;
	}

	grantRole(role: string): void {
		const key = RoleKey.of(role);
		if (this.roles.some((r) => r.value === key.value)) return;
		this.record(new RoleGrantedToUserEvent(this.getAggregateId(), { tenantId: this.tenantId, role: key.value }));
	}

	private record(event: DomainEvent): void {
		this.apply(event);
		this.version += 1;
		this.uncommitted.push(event);
	}

	private apply(event: DomainEvent): void {
		switch (event.eventType) {
			case 'UserAddedToTenant': {
				// no-op
				return;
			}
			case 'RoleGrantedToUser': {
				const data = event.eventData as { role?: string };
				const role = RoleKey.of(String(data?.role ?? ''));
				if (!this.roles.some((r) => r.value === role.value)) this.roles.push(role);
				return;
			}
			default:
				return;
		}
	}
}

