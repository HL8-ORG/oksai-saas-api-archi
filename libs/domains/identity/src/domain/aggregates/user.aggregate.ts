import type { DomainEvent } from '../events/domain-event';
import { Email } from '../value-objects/email';
import { UserRegisteredEvent } from '../events/user-registered.event';
import { UserDisabledEvent } from '../events/user-disabled.event';

/**
 * @description 用户聚合根（最小可用）
 *
 * 注意事项：
 * - 领域层不存储密码明文/哈希；认证交给 Better Auth 适配层或凭证子域
 */
export class UserAggregate {
	private readonly uncommitted: DomainEvent[] = [];
	private committedVersion = 0;
	private version = 0;

	private disabled = false;
	private email!: Email;

	private constructor(readonly id: string) {}

	static register(id: string, email: string): UserAggregate {
		const agg = new UserAggregate(id);
		agg.record(new UserRegisteredEvent(id, { email: Email.of(email).value }));
		return agg;
	}

	static rehydrate(id: string, events: DomainEvent[]): UserAggregate {
		const agg = new UserAggregate(id);
		for (const e of events) {
			agg.apply(e);
			agg.version += 1;
		}
		agg.committedVersion = agg.version;
		agg.uncommitted.splice(0, agg.uncommitted.length);
		return agg;
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

	disable(reason?: string): void {
		if (this.disabled) return;
		this.record(new UserDisabledEvent(this.id, { reason }));
	}

	private record(event: DomainEvent): void {
		this.apply(event);
		this.version += 1;
		this.uncommitted.push(event);
	}

	private apply(event: DomainEvent): void {
		switch (event.eventType) {
			case 'UserRegistered': {
				const data = event.eventData as { email?: string };
				this.email = Email.of(String(data?.email ?? ''));
				this.disabled = false;
				return;
			}
			case 'UserDisabled': {
				this.disabled = true;
				return;
			}
			default:
				return;
		}
	}
}

