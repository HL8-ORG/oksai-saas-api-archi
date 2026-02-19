import { AggregateRoot } from '@oksai/event-store';
import type { DomainEvent } from '../events/domain-event';
import { UserAddedToTenantEvent } from '../events/user-added-to-tenant.event';
import { RoleGrantedToUserEvent } from '../events/role-granted-to-user.event';
import { RoleKey } from '../value-objects/role-key';

/**
 * @description 租户成员关系领域事件类型
 */
type TenantMembershipEvent = DomainEvent;

/**
 * @description 租户成员关系聚合根（最小可用）
 *
 * 说明：
 * - 一个聚合实例表示"某用户在某租户下的成员关系"
 * - aggregateId 采用 `${tenantId}:${userId}` 形式（仅作为最小实现）
 */
export class TenantMembershipAggregate extends AggregateRoot<TenantMembershipEvent> {
	private roles: RoleKey[] = [];

	private constructor(
		readonly tenantId: string,
		readonly userId: string
	) {
		super();
	}

	/**
	 * @description 创建租户成员关系
	 *
	 * @param tenantId - 租户 ID
	 * @param userId - 用户 ID
	 * @returns 聚合根
	 */
	static create(tenantId: string, userId: string): TenantMembershipAggregate {
		const agg = new TenantMembershipAggregate(tenantId, userId);
		agg.initAuditTimestamps();
		agg.addDomainEvent(new UserAddedToTenantEvent(agg.getAggregateId(), { tenantId }));
		return agg;
	}

	/**
	 * @description 从历史事件重建聚合
	 *
	 * @param tenantId - 租户 ID
	 * @param userId - 用户 ID
	 * @param events - 历史事件
	 * @returns 聚合根
	 */
	static rehydrate(tenantId: string, userId: string, events: DomainEvent[]): TenantMembershipAggregate {
		const agg = new TenantMembershipAggregate(tenantId, userId);
		for (const e of events) {
			agg.apply(e);
			agg.version += 1;
		}
		agg.resetEventStateAfterRehydrate();
		return agg;
	}

	/**
	 * @description 获取聚合 ID
	 *
	 * @returns 聚合 ID（格式：tenantId:userId）
	 */
	getAggregateId(): string {
		return `${this.tenantId}:${this.userId}`;
	}

	/**
	 * @description 授予角色
	 *
	 * @param role - 角色键
	 */
	grantRole(role: string): void {
		const key = RoleKey.of(role);
		if (this.roles.some((r) => r.value === key.value)) return;
		this.markUpdated();
		this.addDomainEvent(
			new RoleGrantedToUserEvent(this.getAggregateId(), { tenantId: this.tenantId, role: key.value })
		);
	}

	/**
	 * @description 应用事件（用于 rehydrate）
	 *
	 * @param event - 领域事件
	 */
	protected apply(event: DomainEvent): void {
		switch (event.eventType) {
			case 'UserAddedToTenant': {
				this._createdAt = event.occurredAt;
				this._updatedAt = event.occurredAt;
				return;
			}
			case 'RoleGrantedToUser': {
				const data = event.eventData as { role?: string };
				const role = RoleKey.of(String(data?.role ?? ''));
				if (!this.roles.some((r) => r.value === role.value)) this.roles.push(role);
				this._updatedAt = event.occurredAt;
				return;
			}
			default:
				return;
		}
	}
}
