import { Body, Controller, Get, HttpCode, HttpStatus, Inject, Post, UseGuards } from '@nestjs/common';
import { AuthSessionGuard } from '@oksai/auth';
import { CheckPolicies, makeTenantSubject, PoliciesGuard } from '@oksai/authorization';
import { OKSAI_TENANT_READ_MODEL_TOKEN, TenantApplicationService, type ITenantReadModel } from '@oksai/tenant';
import { OksaiRequestContextService, TenantOptional, TenantRequired } from '@oksai/context';
import { CreateTenantDto } from '../dto/create-tenant.dto';

@Controller('tenants')
@TenantOptional()
export class TenantController {
	constructor(
		private readonly tenantApp: TenantApplicationService,
		private readonly ctx: OksaiRequestContextService,
		@Inject(OKSAI_TENANT_READ_MODEL_TOKEN) private readonly readModel: ITenantReadModel
	) {}

	@Post()
	@HttpCode(HttpStatus.CREATED)
	async create(@Body() body: CreateTenantDto): Promise<{ tenantId: string }> {
		return await this.tenantApp.createTenant({ name: body.name, maxMembers: body.maxMembers });
	}

	@Get('me')
	@TenantRequired()
	@UseGuards(AuthSessionGuard, PoliciesGuard)
	@CheckPolicies((ability, ctx) => {
		if (!ctx.tenantId) return false;
		return ability.can('read', makeTenantSubject(ctx.tenantId));
	})
	async getMe(): Promise<{ tenantId: string; name: string } | null> {
		const tenantId = this.ctx.getTenantId();
		if (!tenantId) return null;
		return await this.readModel.findByTenantId(tenantId);
	}
}
