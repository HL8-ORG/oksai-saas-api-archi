import { AIEnabledAggregateRoot } from './ai-enabled.aggregate-root';
import { EmbeddingStatus, AIProcessingMetadata } from './enums-and-interfaces';
import type { EventStoreDomainEvent } from '../event-store.interface';

/**
 * @description 测试用的具体AI聚合根实现
 */
class TestAIEnabledAggregate extends AIEnabledAggregateRoot<TestDomainEvent> {
	constructor() {
		super();
		// 初始化审计时间戳
		this['initAuditTimestamps']();
	}

	protected apply(_event: TestDomainEvent): void {
		// 测试用空实现
	}
}

/**
 * @description 测试用领域事件类型
 */
interface TestDomainEvent extends EventStoreDomainEvent {
	eventType: string;
}

describe('AIEnabledAggregateRoot', () => {
	let aggregate: TestAIEnabledAggregate;

	beforeEach(() => {
		aggregate = new TestAIEnabledAggregate();
	});

	describe('初始状态', () => {
		it('初始嵌入状态应为PENDING', () => {
			// Act & Assert
			expect(aggregate.embeddingStatus).toBe(EmbeddingStatus.PENDING);
		});

		it('初始嵌入版本应为undefined', () => {
			// Act & Assert
			expect(aggregate.embeddingVersion).toBeUndefined();
		});

		it('初始嵌入ID应为undefined', () => {
			// Act & Assert
			expect(aggregate.embeddingId).toBeUndefined();
		});

		it('初始AI元数据应为undefined', () => {
			// Act & Assert
			expect(aggregate.aiMetadata).toBeUndefined();
		});
	});

	describe('嵌入状态管理', () => {
		describe('markEmbeddingStale', () => {
			it('应将状态更改为STALE', () => {
				// Act
				aggregate.markEmbeddingStale();

				// Assert
				expect(aggregate.embeddingStatus).toBe(EmbeddingStatus.STALE);
			});

			it('应标记为已更新', () => {
				// Arrange
				const beforeUpdatedAt = aggregate.updatedAt;

				// Act
				aggregate.markEmbeddingStale();

				// Assert
				expect(aggregate.updatedAt.getTime()).toBeGreaterThanOrEqual(beforeUpdatedAt.getTime());
			});

			it('状态已为STALE时重复调用不应重复更新', () => {
				// Arrange
				aggregate.markEmbeddingStale();
				const afterFirstMark = aggregate.updatedAt;

				// Act
				aggregate.markEmbeddingStale();

				// Assert
				expect(aggregate.updatedAt).toEqual(afterFirstMark);
			});

			it('从SYNCED状态调用应更改为STALE', () => {
				// Arrange
				aggregate.updateEmbedding('embed-001', 'v1.0');

				// Act
				aggregate.markEmbeddingStale();

				// Assert
				expect(aggregate.embeddingStatus).toBe(EmbeddingStatus.STALE);
			});
		});

		describe('markEmbeddingFailed', () => {
			it('应将状态更改为FAILED', () => {
				// Act
				aggregate.markEmbeddingFailed('嵌入生成失败');

				// Assert
				expect(aggregate.embeddingStatus).toBe(EmbeddingStatus.FAILED);
			});

			it('应设置AI元数据中的错误信息', () => {
				// Act
				aggregate.markEmbeddingFailed('网络超时');

				// Assert
				expect(aggregate.aiMetadata?.errorMessage).toBe('网络超时');
			});

			it('应设置AI元数据中的处理时间', () => {
				// Arrange
				const beforeMark = new Date();

				// Act
				aggregate.markEmbeddingFailed('处理失败');

				// Assert
				expect(aggregate.aiMetadata?.processedAt).toBeDefined();
				expect(aggregate.aiMetadata!.processedAt!.getTime()).toBeGreaterThanOrEqual(beforeMark.getTime());
			});

			it('应标记为已更新', () => {
				// Arrange
				const beforeUpdatedAt = aggregate.updatedAt;

				// Act
				aggregate.markEmbeddingFailed('错误');

				// Assert
				expect(aggregate.updatedAt.getTime()).toBeGreaterThanOrEqual(beforeUpdatedAt.getTime());
			});

			it('应保留现有的AI元数据', () => {
				// Arrange
				aggregate.setAIMetadata({ modelName: 'gpt-4' });

				// Act
				aggregate.markEmbeddingFailed('失败');

				// Assert
				expect(aggregate.aiMetadata?.modelName).toBe('gpt-4');
				expect(aggregate.aiMetadata?.errorMessage).toBe('失败');
			});
		});

		describe('updateEmbedding', () => {
			it('应将状态更改为SYNCED', () => {
				// Act
				aggregate.updateEmbedding('embed-001', 'v1.0');

				// Assert
				expect(aggregate.embeddingStatus).toBe(EmbeddingStatus.SYNCED);
			});

			it('应设置嵌入ID', () => {
				// Act
				aggregate.updateEmbedding('embed-001', 'v1.0');

				// Assert
				expect(aggregate.embeddingId).toBe('embed-001');
			});

			it('应设置嵌入版本', () => {
				// Act
				aggregate.updateEmbedding('embed-001', 'v2.0');

				// Assert
				expect(aggregate.embeddingVersion).toBe('v2.0');
			});

			it('应设置处理时间', () => {
				// Arrange
				const beforeUpdate = new Date();

				// Act
				aggregate.updateEmbedding('embed-001', 'v1.0');

				// Assert
				expect(aggregate.aiMetadata?.processedAt).toBeDefined();
				expect(aggregate.aiMetadata!.processedAt!.getTime()).toBeGreaterThanOrEqual(beforeUpdate.getTime());
			});

			it('应清除错误信息', () => {
				// Arrange
				aggregate.markEmbeddingFailed('之前失败');

				// Act
				aggregate.updateEmbedding('embed-001', 'v1.0');

				// Assert
				expect(aggregate.aiMetadata?.errorMessage).toBeUndefined();
			});

			it('应标记为已更新', () => {
				// Arrange
				const beforeUpdatedAt = aggregate.updatedAt;

				// Act
				aggregate.updateEmbedding('embed-001', 'v1.0');

				// Assert
				expect(aggregate.updatedAt.getTime()).toBeGreaterThanOrEqual(beforeUpdatedAt.getTime());
			});

			it('应支持设置额外的AI元数据', () => {
				// Arrange
				const metadata: Partial<AIProcessingMetadata> = {
					modelName: 'text-embedding-ada-002',
					tokenCount: 150,
					processingTimeMs: 200
				};

				// Act
				aggregate.updateEmbedding('embed-001', 'v1.0', metadata);

				// Assert
				expect(aggregate.aiMetadata?.modelName).toBe('text-embedding-ada-002');
				expect(aggregate.aiMetadata?.tokenCount).toBe(150);
				expect(aggregate.aiMetadata?.processingTimeMs).toBe(200);
			});

			it('应合并现有AI元数据', () => {
				// Arrange
				aggregate.setAIMetadata({ extra: { customField: 'value' } });

				// Act
				aggregate.updateEmbedding('embed-001', 'v1.0', { modelName: 'gpt-4' });

				// Assert
				expect(aggregate.aiMetadata?.modelName).toBe('gpt-4');
				expect(aggregate.aiMetadata?.extra?.customField).toBe('value');
			});
		});

		describe('needsReembedding', () => {
			it('PENDING状态应返回true', () => {
				// Arrange - 初始状态为PENDING

				// Act & Assert
				expect(aggregate.needsReembedding()).toBe(true);
			});

			it('STALE状态应返回true', () => {
				// Arrange
				aggregate.markEmbeddingStale();

				// Act & Assert
				expect(aggregate.needsReembedding()).toBe(true);
			});

			it('FAILED状态应返回true', () => {
				// Arrange
				aggregate.markEmbeddingFailed('错误');

				// Act & Assert
				expect(aggregate.needsReembedding()).toBe(true);
			});

			it('SYNCED状态应返回false', () => {
				// Arrange
				aggregate.updateEmbedding('embed-001', 'v1.0');

				// Act & Assert
				expect(aggregate.needsReembedding()).toBe(false);
			});
		});
	});

	describe('AI元数据管理', () => {
		describe('setAIMetadata', () => {
			it('应设置AI元数据', () => {
				// Arrange
				const metadata: Partial<AIProcessingMetadata> = {
					modelName: 'gpt-4',
					tokenCount: 100
				};

				// Act
				aggregate.setAIMetadata(metadata);

				// Assert
				expect(aggregate.aiMetadata?.modelName).toBe('gpt-4');
				expect(aggregate.aiMetadata?.tokenCount).toBe(100);
			});

			it('应合并现有AI元数据', () => {
				// Arrange
				aggregate.setAIMetadata({ modelName: 'gpt-4' });

				// Act
				aggregate.setAIMetadata({ tokenCount: 200 });

				// Assert
				expect(aggregate.aiMetadata?.modelName).toBe('gpt-4');
				expect(aggregate.aiMetadata?.tokenCount).toBe(200);
			});

			it('设置AI元数据不应标记为已更新', () => {
				// Arrange
				const beforeUpdatedAt = aggregate.updatedAt;

				// Act
				aggregate.setAIMetadata({ modelName: 'gpt-4' });

				// Assert
				expect(aggregate.updatedAt).toEqual(beforeUpdatedAt);
			});

			it('应支持设置处理时间', () => {
				// Arrange
				const processedAt = new Date('2024-01-01T00:00:00Z');

				// Act
				aggregate.setAIMetadata({ processedAt });

				// Assert
				expect(aggregate.aiMetadata?.processedAt).toEqual(processedAt);
			});

			it('应支持设置处理耗时', () => {
				// Act
				aggregate.setAIMetadata({ processingTimeMs: 1500 });

				// Assert
				expect(aggregate.aiMetadata?.processingTimeMs).toBe(1500);
			});

			it('应支持设置额外元数据', () => {
				// Arrange
				const extra = { customField: 'customValue', nested: { value: 123 } };

				// Act
				aggregate.setAIMetadata({ extra });

				// Assert
				expect(aggregate.aiMetadata?.extra).toEqual(extra);
			});
		});

		describe('aiMetadata getter', () => {
			it('未设置时应返回undefined', () => {
				// Act & Assert
				expect(aggregate.aiMetadata).toBeUndefined();
			});

			it('设置后应返回正确的元数据', () => {
				// Arrange
				aggregate.setAIMetadata({ modelName: 'gpt-4' });

				// Act & Assert
				expect(aggregate.aiMetadata?.modelName).toBe('gpt-4');
			});
		});
	});

	describe('信息获取', () => {
		describe('getAIInfo', () => {
			it('应返回完整的AI信息', () => {
				// Arrange
				aggregate.updateEmbedding('embed-001', 'v1.0', { modelName: 'gpt-4' });

				// Act
				const info = aggregate.getAIInfo();

				// Assert
				expect(info.embeddingStatus).toBe(EmbeddingStatus.SYNCED);
				expect(info.embeddingId).toBe('embed-001');
				expect(info.embeddingVersion).toBe('v1.0');
				expect(info.aiMetadata?.modelName).toBe('gpt-4');
				expect(info.needsReembedding).toBe(false);
			});

			it('初始状态应返回正确的默认值', () => {
				// Act
				const info = aggregate.getAIInfo();

				// Assert
				expect(info.embeddingStatus).toBe(EmbeddingStatus.PENDING);
				expect(info.embeddingVersion).toBeUndefined();
				expect(info.embeddingId).toBeUndefined();
				expect(info.aiMetadata).toBeUndefined();
				expect(info.needsReembedding).toBe(true);
			});

			it('STALE状态needsReembedding应为true', () => {
				// Arrange
				aggregate.markEmbeddingStale();

				// Act
				const info = aggregate.getAIInfo();

				// Assert
				expect(info.needsReembedding).toBe(true);
			});

			it('FAILED状态needsReembedding应为true', () => {
				// Arrange
				aggregate.markEmbeddingFailed('错误');

				// Act
				const info = aggregate.getAIInfo();

				// Assert
				expect(info.needsReembedding).toBe(true);
				expect(info.aiMetadata?.errorMessage).toBe('错误');
			});

			it('SYNCED状态needsReembedding应为false', () => {
				// Arrange
				aggregate.updateEmbedding('embed-001', 'v1.0');

				// Act
				const info = aggregate.getAIInfo();

				// Assert
				expect(info.needsReembedding).toBe(false);
			});
		});
	});

	describe('状态转换场景', () => {
		it('完整生命周期：创建 -> 嵌入成功 -> 内容更新 -> 重新嵌入', () => {
			// Arrange - 初始状态
			expect(aggregate.embeddingStatus).toBe(EmbeddingStatus.PENDING);
			expect(aggregate.needsReembedding()).toBe(true);

			// Act - 嵌入成功
			aggregate.updateEmbedding('embed-001', 'v1.0');

			// Assert
			expect(aggregate.embeddingStatus).toBe(EmbeddingStatus.SYNCED);
			expect(aggregate.needsReembedding()).toBe(false);

			// Act - 内容更新，标记为过期
			aggregate.markEmbeddingStale();

			// Assert
			expect(aggregate.embeddingStatus).toBe(EmbeddingStatus.STALE);
			expect(aggregate.needsReembedding()).toBe(true);

			// Act - 重新嵌入成功
			aggregate.updateEmbedding('embed-002', 'v1.1');

			// Assert
			expect(aggregate.embeddingStatus).toBe(EmbeddingStatus.SYNCED);
			expect(aggregate.embeddingId).toBe('embed-002');
			expect(aggregate.embeddingVersion).toBe('v1.1');
		});

		it('失败重试场景：嵌入失败 -> 重试成功', () => {
			// Arrange - 嵌入失败
			aggregate.markEmbeddingFailed('API限流');

			// Assert
			expect(aggregate.embeddingStatus).toBe(EmbeddingStatus.FAILED);
			expect(aggregate.needsReembedding()).toBe(true);
			expect(aggregate.aiMetadata?.errorMessage).toBe('API限流');

			// Act - 重试成功
			aggregate.updateEmbedding('embed-001', 'v1.0');

			// Assert
			expect(aggregate.embeddingStatus).toBe(EmbeddingStatus.SYNCED);
			expect(aggregate.needsReembedding()).toBe(false);
			expect(aggregate.aiMetadata?.errorMessage).toBeUndefined();
		});

		it('连续失败场景：多次失败应保留最新错误信息', () => {
			// Arrange & Act - 第一次失败
			aggregate.markEmbeddingFailed('错误1');
			expect(aggregate.aiMetadata?.errorMessage).toBe('错误1');

			// Act - 第二次失败
			aggregate.markEmbeddingFailed('错误2');

			// Assert
			expect(aggregate.aiMetadata?.errorMessage).toBe('错误2');
		});
	});

	describe('Getters', () => {
		describe('embeddingStatus getter', () => {
			it('应返回当前嵌入状态', () => {
				// Arrange
				aggregate.markEmbeddingStale();

				// Act & Assert
				expect(aggregate.embeddingStatus).toBe(EmbeddingStatus.STALE);
			});
		});

		describe('embeddingVersion getter', () => {
			it('设置后应返回正确的版本', () => {
				// Arrange
				aggregate.updateEmbedding('embed-001', 'v2.0');

				// Act & Assert
				expect(aggregate.embeddingVersion).toBe('v2.0');
			});
		});

		describe('embeddingId getter', () => {
			it('设置后应返回正确的ID', () => {
				// Arrange
				aggregate.updateEmbedding('new-embed-id', 'v1.0');

				// Act & Assert
				expect(aggregate.embeddingId).toBe('new-embed-id');
			});
		});
	});
});
