import { AggregateRoot } from '@oksai/event-store';
import { DomainException } from '../exceptions/domain.exception';
import type { DomainEvent } from '../events/domain-event';
import { TenantCreatedEvent } from '../events/tenant-created.event';
import { TenantId } from '../value-objects/tenant-id.value-object';
import { TenantName } from '../value-objects/tenant-name.value-object';
import { TenantSettings } from '../value-objects/tenant-settings.value-object';
import { CanAddMemberSpecification } from '../specifications';

/**
 * @description 租户成员信息
 */
interface TenantMember {
	userId: string;
	addedAt: Date;
}

/**
 * @description 租户领域事件类型
 */
type TenantEvent = DomainEvent;

/**
 * @description
 * Tenant 聚合根（Rich Model 风格）。
 *
 * 说明：
 * - 聚合根是唯一访问入口
 * - 业务规则内聚在实体方法中
 * - 变更记录领域事件（供应用层发布/持久化）
 *
 * 强约束：
 * - tenantId 必须来自 CLS（由应用层保证）
 * - 成员数不能超过配置上限
 */
export class TenantAggregate extends AggregateRoot<TenantEvent> {
	private readonly _id: TenantId;
	private _name: TenantName;
	private _settings: TenantSettings;
	private _members: TenantMember[] = [];

	private constructor(id: TenantId, name: TenantName, settings: TenantSettings) {
		super();
		this._id = id;
		this._name = name;
		this._settings = settings;
	}

	// ==================== 工厂方法 ====================

	/**
	 * @description 创建租户（工厂方法）
	 *
	 * @param id - tenantId
	 * @param name - 租户名称
	 * @param settings - 配置
	 * @returns 聚合根
	 */
	static create(id: TenantId, name: TenantName, settings: TenantSettings): TenantAggregate {
		const agg = new TenantAggregate(id, name, settings);

		agg.initAuditTimestamps();

		agg.addDomainEvent(new TenantCreatedEvent(id.toString(), name.toString()));

		return agg;
	}

	/**
	 * @description 从历史事件重建聚合（事件溯源）
	 *
	 * 使用场景：
	 * - 仓储从 EventStore 读取事件流后重建聚合状态
	 *
	 * @param id - tenantId
	 * @param events - 历史事件（按 version 升序）
	 * @returns 聚合根
	 * @throws {DomainException} 当事件流非法或缺少创建事件时抛出
	 */
	static rehydrate(id: TenantId, events: DomainEvent[]): TenantAggregate {
		const agg = new TenantAggregate(id, TenantName.of('__rehydrate__'), TenantSettings.default());
		for (const e of events) {
			agg.apply(e);
			agg.version += 1;
		}
		agg.resetEventStateAfterRehydrate();

		if (agg._name.getValue() === '__rehydrate__') {
			throw new DomainException(`租户事件流非法：缺少创建事件（tenantId=${id.toString()}）。`);
		}
		return agg;
	}

	// ==================== 业务方法（Rich Model 风格） ====================

	/**
	 * @description 添加成员
	 *
	 * 业务规则：
	 * - userId 不能为空
	 * - 成员数不能超过配置上限
	 * - 成员不能重复
	 *
	 * @param userId - 用户标识
	 * @throws {DomainException} 当超过上限或 userId 非法时抛出
	 */
	addMember(userId: string): void {
		const uid = String(userId ?? '').trim();
		if (!uid) {
			throw new DomainException('userId 不能为空');
		}

		if (this._members.some((m) => m.userId === uid)) {
			return;
		}

		const canAddMember = new CanAddMemberSpecification();
		if (!canAddMember.isSatisfiedBy(this)) {
			throw new DomainException(
				`超过租户成员上限（当前：${this._members.length}，上限：${this._settings.getMaxMembers()}）`
			);
		}

		this._members.push({ userId: uid, addedAt: new Date() });
		this.markUpdated();
	}

	/**
	 * @description 移除成员
	 *
	 * 业务规则：
	 * - userId 不能为空
	 * - 成员必须存在
	 *
	 * @param userId - 用户标识
	 */
	removeMember(userId: string): void {
		const uid = String(userId ?? '').trim();
		if (!uid) {
			throw new DomainException('userId 不能为空');
		}

		const index = this._members.findIndex((m) => m.userId === uid);
		if (index >= 0) {
			this._members.splice(index, 1);
			this.markUpdated();
		}
	}

	/**
	 * @description 更新租户名称
	 *
	 * @param name - 新名称
	 */
	updateName(name: TenantName): void {
		if (this._name.equals(name)) return;

		this._name = name;
		this.markUpdated();
	}

	/**
	 * @description 更新租户配置
	 *
	 * 业务规则：
	 * - 新的成员上限不能小于当前成员数
	 *
	 * @param settings - 新配置
	 * @throws {DomainException} 当新上限小于当前成员数时抛出
	 */
	updateSettings(settings: TenantSettings): void {
		if (settings.getMaxMembers() < this._members.length) {
			throw new DomainException(
				`新成员上限（${settings.getMaxMembers()}）不能小于当前成员数（${this._members.length}）`
			);
		}

		if (this._settings.equals(settings)) return;

		this._settings = settings;
		this.markUpdated();
	}

	// ==================== 查询方法 ====================

	/**
	 * @description 检查用户是否是成员
	 */
	hasMember(userId: string): boolean {
		return this._members.some((m) => m.userId === userId);
	}

	/**
	 * @description 获取成员数量
	 */
	getMemberCount(): number {
		return this._members.length;
	}

	/**
	 * @description 获取成员列表
	 */
	getMembers(): string[] {
		return this._members.map((m) => m.userId);
	}

	// ==================== 事件应用（用于 rehydrate） ====================

	/**
	 * @description 应用事件（用于 rehydrate）
	 */
	protected apply(event: DomainEvent): void {
		switch (event.eventType) {
			case 'TenantCreated': {
				const data = event.eventData as { name?: string };
				this._name = TenantName.of(String(data?.name ?? '').trim());
				this._createdAt = event.occurredAt;
				this._updatedAt = event.occurredAt;
				return;
			}
			default:
				return;
		}
	}

	// ==================== Getters ====================

	get id(): TenantId {
		return this._id;
	}

	get name(): TenantName {
		return this._name;
	}

	get settings(): TenantSettings {
		return this._settings;
	}
}
