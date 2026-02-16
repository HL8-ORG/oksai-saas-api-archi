import { DomainException } from '../exceptions/domain.exception';
import type { DomainEvent } from '../events/domain-event';
import { TenantCreatedEvent } from '../events/tenant-created.event';
import { TenantId } from '../value-objects/tenant-id.value-object';
import { TenantName } from '../value-objects/tenant-name.value-object';
import { TenantSettings } from '../value-objects/tenant-settings.value-object';

/**
 * @description
 * Tenant 聚合根（示例最小实现）。
 *
 * 说明：
 * - 聚合根是唯一访问入口
 * - 通过方法保证不变性约束
 * - 变更返回领域事件（供应用层发布/持久化）
 */
export class TenantAggregate {
	private readonly uncommitted: DomainEvent[] = [];

	private constructor(
		readonly id: TenantId,
		private name: TenantName,
		private settings: TenantSettings,
		private members: string[]
	) {}

	/**
	 * @description 创建租户（工厂方法）
	 * @param id - tenantId
	 * @param name - 租户名称
	 * @param settings - 配置
	 * @returns 聚合根
	 */
	static create(id: TenantId, name: TenantName, settings: TenantSettings): TenantAggregate {
		const agg = new TenantAggregate(id, name, settings, []);
		agg.record(new TenantCreatedEvent(id.toString(), name.toString()));
		return agg;
	}

	/**
	 * @description 添加成员（演示不变性：成员数上限）
	 * @param userId - 用户标识
	 * @returns 领域事件列表
	 * @throws {DomainException} 当超过上限或 userId 非法时抛出
	 */
	addMember(userId: string): DomainEvent[] {
		const uid = String(userId ?? '').trim();
		if (!uid) throw new DomainException('userId 不能为空');
		if (this.members.length >= this.settings.maxMembers) {
			throw new DomainException('超过租户成员上限');
		}
		this.members.push(uid);
		// 示例：此处可产生 TenantMemberAddedEvent（暂略）
		return [];
	}

	/**
	 * @description 获取并清空未提交事件（供应用层持久化/发布）
	 */
	pullUncommittedEvents(): DomainEvent[] {
		const events = this.uncommitted.splice(0, this.uncommitted.length);
		return events;
	}

	private record(event: DomainEvent) {
		this.uncommitted.push(event);
	}
}

