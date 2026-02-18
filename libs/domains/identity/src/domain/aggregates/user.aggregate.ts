import type { DomainEvent } from '../events/domain-event';
import { Email } from '../value-objects/email';
import { UserId } from '../value-objects/user-id';
import { TenantId } from '../value-objects/tenant-id';
import { RoleKey } from '../value-objects/role-key';
import { UserRegisteredEvent } from '../events/user-registered.event';
import { UserDisabledEvent } from '../events/user-disabled.event';
import { UserEnabledEvent } from '../events/user-enabled.event';
import { RoleGrantedToUserEvent } from '../events/role-granted-to-user.event';
import { UserAddedToTenantEvent } from '../events/user-added-to-tenant.event';
import {
	UserCannotBeDisabledException,
	UserAlreadyHasRoleException,
	UserNotEligibleForRoleException,
	InactiveUserException,
	CannotDisableTenantOwnerException,
	CannotRemoveLastRoleException
} from '../exceptions/domain-exceptions';
import { CanAssignRoleSpecification, CanDisableUserSpecification } from '../specifications';

/**
 * @description 用户聚合根（Rich Model 风格）
 *
 * 业务规则内聚在实体方法中，直接修改状态，同时记录领域事件。
 *
 * 职责：
 * - 管理用户生命周期（注册、禁用、启用）
 * - 管理用户角色（授予、撤销）
 * - 管理用户与租户的关系
 *
 * 强约束：
 * - 领域层不存储密码明文/哈希；认证交给 Better Auth 适配层
 * - tenantId 必须来自 CLS（由应用层保证）
 */
export class UserAggregate {
	private readonly _domainEvents: DomainEvent[] = [];
	private committedVersion = 0;
	private version = 0;

	private readonly _id: UserId;
	private _email!: Email;
	private _disabled = false;
	private _disabledReason?: string;
	private _roles: RoleKey[] = [];
	private _tenantMemberships: TenantId[] = [];
	private _createdAt!: Date;
	private _updatedAt!: Date;

	private constructor(id: UserId) {
		this._id = id;
	}

	// ==================== 工厂方法 ====================

	/**
	 * @description 注册新用户（工厂方法）
	 *
	 * @param id - 用户 ID
	 * @param email - 邮箱
	 * @returns 用户聚合根
	 */
	static register(id: string, email: string): UserAggregate {
		const userId = UserId.of(id);
		const emailVo = Email.of(email);
		const agg = new UserAggregate(userId);

		// Rich Model：直接设置状态
		const now = new Date();
		agg._email = emailVo;
		agg._disabled = false;
		agg._createdAt = now;
		agg._updatedAt = now;

		// 记录领域事件（用于审计/集成）
		agg.addDomainEvent(new UserRegisteredEvent(userId.getValue(), { email: emailVo.getValue() }));

		return agg;
	}

	/**
	 * @description 从历史事件重建聚合（事件溯源）
	 *
	 * 使用场景：
	 * - 仓储从 EventStore 读取事件流后重建聚合状态
	 *
	 * @param id - 用户 ID
	 * @param events - 历史事件（按 version 升序）
	 * @returns 聚合根
	 */
	static rehydrate(id: string, events: DomainEvent[]): UserAggregate {
		const agg = new UserAggregate(UserId.of(id));
		for (const e of events) {
			agg.apply(e);
			agg.version += 1;
		}
		agg.committedVersion = agg.version;
		agg._domainEvents.splice(0, agg._domainEvents.length);
		return agg;
	}

	// ==================== 业务方法（Rich Model 风格） ====================

	/**
	 * @description 禁用用户
	 *
	 * 业务规则：
	 * - 幂等操作：已禁用则无操作
	 * - 租户所有者不能被禁用
	 *
	 * @param reason - 禁用原因
	 * @throws UserCannotBeDisabledException 当不满足禁用条件时
	 */
	disable(reason?: string): void {
		// 幂等检查
		if (this._disabled) return;

		// 使用规格进行业务规则校验
		const canDisable = new CanDisableUserSpecification();
		if (!canDisable.isSatisfiedBy(this)) {
			if (this.isTenantOwner()) {
				throw new CannotDisableTenantOwnerException(
					this._id.getValue(),
					this._tenantMemberships[0]?.getValue() ?? ''
				);
			}
			throw new UserCannotBeDisabledException(this._id.getValue(), '不满足禁用条件');
		}

		// Rich Model：直接修改状态
		this._disabled = true;
		this._disabledReason = reason;
		this._updatedAt = new Date();

		// 记录领域事件
		this.addDomainEvent(new UserDisabledEvent(this._id.getValue(), { reason }));
	}

	/**
	 * @description 启用用户
	 *
	 * 业务规则：
	 * - 幂等操作：已启用则无操作
	 */
	enable(): void {
		// 幂等检查
		if (!this._disabled) return;

		// Rich Model：直接修改状态
		this._disabled = false;
		this._disabledReason = undefined;
		this._updatedAt = new Date();

		// 记录领域事件
		this.addDomainEvent(new UserEnabledEvent(this._id.getValue(), {}));
	}

	/**
	 * @description 授予角色
	 *
	 * 业务规则：
	 * - 用户必须处于活跃状态
	 * - 用户不能已有该角色
	 * - 分配管理员角色需要特殊条件
	 *
	 * @param roleKey - 角色键
	 * @throws InactiveUserException 用户已禁用时
	 * @throws UserAlreadyHasRoleException 用户已拥有该角色时
	 * @throws UserNotEligibleForRoleException 用户不满足角色分配条件时
	 */
	grantRole(roleKey: RoleKey): void {
		// 使用规格进行业务规则校验
		const canAssignRole = new CanAssignRoleSpecification(roleKey);

		if (!canAssignRole.isSatisfiedBy(this)) {
			if (this._disabled) {
				throw new InactiveUserException('授予角色');
			}
			if (this.hasRole(roleKey)) {
				throw new UserAlreadyHasRoleException(this._id.getValue(), roleKey.getValue());
			}
			throw new UserNotEligibleForRoleException(this._id.getValue(), roleKey.getValue());
		}

		// Rich Model：直接修改状态
		this._roles.push(roleKey);
		this._updatedAt = new Date();

		// 记录领域事件
		this.addDomainEvent(
			new RoleGrantedToUserEvent(this._id.getValue(), { tenantId: '', role: roleKey.getValue() })
		);
	}

	/**
	 * @description 撤销角色
	 *
	 * 业务规则：
	 * - 用户必须处于活跃状态
	 * - 用户必须拥有该角色
	 * - 不能撤销最后一个角色
	 *
	 * @param roleKey - 角色键
	 * @throws InactiveUserException 用户已禁用时
	 * @throws CannotRemoveLastRoleException 尝试移除最后一个角色时
	 */
	revokeRole(roleKey: RoleKey): void {
		// 业务规则：用户必须活跃
		if (this._disabled) {
			throw new InactiveUserException('撤销角色');
		}

		// 业务规则：不能移除最后一个角色
		if (this._roles.length <= 1) {
			throw new CannotRemoveLastRoleException(this._id.getValue());
		}

		// Rich Model：直接修改状态
		const index = this._roles.findIndex((r) => r.equals(roleKey));
		if (index >= 0) {
			this._roles.splice(index, 1);
			this._updatedAt = new Date();
		}
	}

	/**
	 * @description 添加到租户
	 *
	 * @param tenantId - 租户 ID
	 */
	addToTenant(tenantId: TenantId): void {
		// 幂等检查
		if (this._tenantMemberships.some((t) => t.equals(tenantId))) return;

		this._tenantMemberships.push(tenantId);
		this._updatedAt = new Date();

		this.addDomainEvent(new UserAddedToTenantEvent(this._id.getValue(), { tenantId: tenantId.getValue() }));
	}

	// ==================== 查询方法 ====================

	/**
	 * @description 检查用户是否拥有指定角色
	 */
	hasRole(roleKey: RoleKey): boolean {
		return this._roles.some((r) => r.equals(roleKey));
	}

	/**
	 * @description 检查用户是否拥有指定角色名
	 */
	hasRoleByName(roleName: string): boolean {
		return this._roles.some((r) => r.getValue() === roleName);
	}

	/**
	 * @description 检查用户是否为租户所有者
	 */
	isTenantOwner(): boolean {
		return this._roles.some((r) => r.isTenantOwner());
	}

	/**
	 * @description 检查用户是否为管理员级别
	 */
	isAdminLevel(): boolean {
		return this._roles.some((r) => r.isAdminLevel());
	}

	/**
	 * @description 检查用户是否属于指定租户
	 */
	belongsToTenant(tenantId: TenantId): boolean {
		return this._tenantMemberships.some((t) => t.equals(tenantId));
	}

	/**
	 * @description 检查是否可以被分配管理员角色
	 */
	private canBeAssignedAdminRole(): boolean {
		// 业务规则：用户必须有至少一个角色
		if (this._roles.length === 0) return false;
		// 业务规则：只有现有管理员才能分配管理员角色
		return this.isAdminLevel();
	}

	// ==================== 事件管理 ====================

	/**
	 * @description 获取未提交事件快照（不会清空）
	 */
	getUncommittedEvents(): DomainEvent[] {
		return [...this._domainEvents];
	}

	/**
	 * @description 提交未提交事件（清空缓冲并推进 committedVersion）
	 */
	commitUncommittedEvents(): void {
		this._domainEvents.splice(0, this._domainEvents.length);
		this.committedVersion = this.version;
	}

	/**
	 * @description 获取并清空未提交事件
	 */
	pullUncommittedEvents(): DomainEvent[] {
		const events = this.getUncommittedEvents();
		this.commitUncommittedEvents();
		return events;
	}

	/**
	 * @description 获取当前已提交版本（用于 expectedVersion）
	 */
	getExpectedVersion(): number {
		return this.committedVersion;
	}

	/**
	 * @description 添加领域事件
	 */
	private addDomainEvent(event: DomainEvent): void {
		this._domainEvents.push(event);
		this.version += 1;
	}

	/**
	 * @description 应用事件（用于 rehydrate）
	 */
	private apply(event: DomainEvent): void {
		switch (event.eventType) {
			case 'UserRegistered': {
				const data = event.eventData as { email?: string };
				this._email = Email.of(String(data?.email ?? ''));
				this._disabled = false;
				this._createdAt = event.occurredAt;
				this._updatedAt = event.occurredAt;
				return;
			}
			case 'UserDisabled': {
				const data = event.eventData as { reason?: string };
				this._disabled = true;
				this._disabledReason = data.reason;
				this._updatedAt = event.occurredAt;
				return;
			}
			case 'UserEnabled': {
				this._disabled = false;
				this._disabledReason = undefined;
				this._updatedAt = event.occurredAt;
				return;
			}
			case 'RoleGrantedToUser': {
				const data = event.eventData as { roleKey?: string };
				if (data.roleKey) {
					this._roles.push(RoleKey.of(data.roleKey));
				}
				this._updatedAt = event.occurredAt;
				return;
			}
			case 'UserAddedToTenant': {
				const data = event.eventData as { tenantId?: string };
				if (data.tenantId) {
					this._tenantMemberships.push(TenantId.of(data.tenantId));
				}
				this._updatedAt = event.occurredAt;
				return;
			}
			default:
				return;
		}
	}

	// ==================== Getters ====================

	get id(): UserId {
		return this._id;
	}

	get email(): Email {
		return this._email;
	}

	get disabled(): boolean {
		return this._disabled;
	}

	get disabledReason(): string | undefined {
		return this._disabledReason;
	}

	get roles(): RoleKey[] {
		return [...this._roles];
	}

	get tenantMemberships(): TenantId[] {
		return [...this._tenantMemberships];
	}

	get createdAt(): Date {
		return this._createdAt;
	}

	get updatedAt(): Date {
		return this._updatedAt;
	}
}
