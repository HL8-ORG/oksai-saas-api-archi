import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

/**
 * @description 创建租户请求 DTO
 */
export class CreateTenantDto {
	/**
	 * @description 租户名称
	 */
	@IsString()
	name!: string;

	/**
	 * @description 最大成员数（可选）
	 */
	@IsOptional()
	@IsInt()
	@Min(1)
	@Max(10000)
	maxMembers?: number;
}

