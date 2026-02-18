import { Injectable } from '@nestjs/common';
import { AbilityFactory } from '@oksai/authorization';
import type { IPermissionChecker } from '@oksai/cqrs';

/**
 * @description CASL 权限检查器
 *
 * 说明：
 * - 接入 @oksai/authorization（CASL）进行用例级权限检查
 * - 通过 AbilityFactory 创建当前请求的 Ability
 * - 使用 Ability.can() 检查用户是否有权限执行特定操作
 *
 * 使用方式：
 * - 在 CQRS 模块配置中提供此权限检查器：
 * ```typescript
 * OksaiCqrsModule.forRoot({
 *   pipeline: {
 *     authorization: true,
 *     permissionChecker: { provide: 'CQRS_PERMISSION_CHECKER', useClass: CaslPermissionChecker }
 *   }
 * })
 * ```
 *
 * 强约束：
 * - userId 和 tenantId 必须来自 CLS
 * - 未登录用户（无 userId）默认拒绝所有受保护的用例
 */
@Injectable()
export class CaslPermissionChecker implements IPermissionChecker {
	constructor(private readonly abilityFactory: AbilityFactory) {}

	/**
	 * @description 检查权限
	 *
	 * @param params - 权限检查参数
	 * @returns 是否有权限
	 */
	async checkPermission(params: { userId?: string; tenantId?: string; commandType: string }): Promise<boolean> {
		// 未登录用户默认拒绝
		if (!params.userId) {
			return false;
		}

		// 创建当前请求的 Ability
		const ability = await this.abilityFactory.createForRequest();

		// 解析权限操作（从 commandType 映射到 CASL action）
		const action = this.resolveAction(params.commandType);

		// 根据是否有 tenantId 确定资源类型
		if (params.tenantId) {
			// 租户级资源
			return ability.can(action, { type: 'Tenant', tenantId: params.tenantId });
		} else {
			// 平台级资源
			return ability.can(action, 'Platform');
		}
	}

	/**
	 * @description 从 commandType 解析 CASL action
	 *
	 * @param commandType - 命令类型
	 * @returns CASL action
	 */
	private resolveAction(commandType: string): 'manage' | 'read' | 'create' | 'update' | 'delete' {
		const type = commandType.toLowerCase();

		if (type.includes('create') || type.includes('register') || type.includes('add')) {
			return 'create';
		}
		if (type.includes('update') || type.includes('change') || type.includes('modify')) {
			return 'update';
		}
		if (type.includes('delete') || type.includes('remove')) {
			return 'delete';
		}
		if (type.includes('read') || type.includes('get') || type.includes('find') || type.includes('list')) {
			return 'read';
		}

		// 默认需要管理权限
		return 'manage';
	}
}
