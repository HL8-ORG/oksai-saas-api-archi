import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateTenantDto {
	@IsString()
	name!: string;

	@IsOptional()
	@IsInt()
	@Min(1)
	@Max(10000)
	maxMembers?: number;
}
