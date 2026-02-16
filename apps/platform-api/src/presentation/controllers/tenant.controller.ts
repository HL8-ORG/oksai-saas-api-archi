import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { TenantApplicationService } from '@oksai/tenant';
import { TenantOptional } from '@oksai/context';
import { CreateTenantDto } from '../dto/create-tenant.dto';

@Controller('tenants')
@TenantOptional()
export class TenantController {
	constructor(private readonly tenantApp: TenantApplicationService) {}

	@Post()
	@HttpCode(HttpStatus.CREATED)
	async create(@Body() body: CreateTenantDto): Promise<{ tenantId: string }> {
		return await this.tenantApp.createTenant({ name: body.name, maxMembers: body.maxMembers });
	}
}

