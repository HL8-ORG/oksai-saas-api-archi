import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { TenantOptional } from '@oksai/context';
import { TenantApplicationService } from '@oksai/tenant';
import { CreateTenantDto } from '../dto/create-tenant.dto';

/**
 * @description Tenant API（示例）
 *
 * 说明：
 * - 这里只演示“创建租户”最小闭环
 * - 在真实系统中，创建租户通常是公开接口，因此使用 @TenantOptional()
 */
@Controller('tenants')
@TenantOptional()
export class TenantController {
	constructor(private readonly tenantApp: TenantApplicationService) {}

	/**
	 * @description 创建租户
	 */
	@Post()
	@HttpCode(HttpStatus.CREATED)
	async create(@Body() body: CreateTenantDto): Promise<{ tenantId: string }> {
		return await this.tenantApp.createTenant({ name: body.name, maxMembers: body.maxMembers });
	}
}

