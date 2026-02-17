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
	private committedVersion = 0;
	private version = 0;

	private constructor(
		readonly id: TenantId,
		private name: TenantName,
		private settings: TenantSettings,
		private members: string[]
	) {}

	/**
	 * @description 从历史事件重建聚合（事件溯源）
	 *
	 * 使用场景：
	 * - 仓储从 EventStore 读取事件流后重建聚合状态
	 *
	 * 注意事项：
	 * - 该方法不会产生未提交事件
	 *
	 * @param id - tenantId
	 * @param events - 历史事件（按 version 升序）
	 * @returns 聚合根
	 * @throws {DomainException} 当事件流非法或缺少创建事件时抛出
	 */
	static rehydrate(id: TenantId, events: DomainEvent[]): TenantAggregate {
		// 用占位值初始化；后续由 apply 逐步修正
		const agg = new TenantAggregate(id, new TenantName('__rehydrate__'), new TenantSettings(50), []);
		for (const e of events) {
			agg.apply(e);
			agg.version += 1;
		}
		agg.committedVersion = agg.version;
		agg.uncommitted.splice(0, agg.uncommitted.length);

		// 基础校验：必须出现创建事件
		if (agg.name.toString() === '__rehydrate__') {
			throw new DomainException(`租户事件流非法：缺少创建事件（tenantId=${id.toString()}）。`);
		}
		return agg;
	}

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
		const events = this.getUncommittedEvents();
		this.commitUncommittedEvents();
		return events;
	}

	/**
	 * @description 获取未提交事件快照（不会清空）
	 */
	getUncommittedEvents(): DomainEvent[] {
		return [...this.uncommitted];
	}

	/**
	 * @description 提交未提交事件（清空缓冲并推进 committedVersion）
	 *
	 * 注意：仅应在事件成功持久化后调用。
	 */
	commitUncommittedEvents(): void {
		this.uncommitted.splice(0, this.uncommitted.length);
		this.committedVersion = this.version;
	}

	private record(event: DomainEvent) {
		this.apply(event);
		this.version += 1;
		this.uncommitted.push(event);
	}

	/**
	 * @description 获取当前已提交版本（用于 expectedVersion）
	 */
	getExpectedVersion(): number {
		return this.committedVersion;
	}

	private apply(event: DomainEvent) {
		switch (event.eventType) {
			case 'TenantCreated': {
				const data = event.eventData as { name?: string };
				this.name = new TenantName(String(data?.name ?? '').trim());
				return;
			}
			default:
				return;
		}
	}
}

