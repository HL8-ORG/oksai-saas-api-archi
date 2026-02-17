import { SetMetadata } from '@nestjs/common';
import { OKSAI_QUERY_HANDLER_METADATA } from './metadata.constants';

/**
 * @description 标记一个类为 QueryHandler（查询处理器）
 *
 * 说明：
 * - 处理器通过 `queryType` 与 QueryBus 绑定
 * - QueryBus 仅负责“用例调度”，不承载集成事件投递（集成事件请使用 @oksai/eda）
 *
 * @param queryType - 查询类型（稳定字符串）
 */
export function QueryHandler(queryType: string): ClassDecorator {
	return SetMetadata(OKSAI_QUERY_HANDLER_METADATA, queryType);
}

