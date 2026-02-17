import { Migration } from '@mikro-orm/migrations';

/**
 * @description
 * 初始化 Identity 授权相关读模型表（角色分配）。
 */
export class Migration202602170002 extends Migration {
	async up(): Promise<void> {
		this.addSql(`
      create table if not exists identity_role_assignments (
        id uuid primary key,
        user_id text not null,
        tenant_id text null,
        role text not null,
        created_at timestamptz not null
      );
    `);
		this.addSql(`
      create unique index if not exists uniq_identity_role
      on identity_role_assignments (user_id, tenant_id, role);
    `);
		this.addSql(`create index if not exists idx_identity_roles_user on identity_role_assignments (user_id);`);
		this.addSql(`create index if not exists idx_identity_roles_tenant on identity_role_assignments (tenant_id);`);
	}
}

