import { Test, TestingModule } from '@nestjs/testing';
import { QualityScorer, BillingQualityScorer, QualityDimension } from './quality-scorer.service';
import type { IFullAggregateMetadata } from '@oksai/aggregate-metadata';

/**
 * @description QualityScorer 和 BillingQualityScorer 单元测试
 *
 * 测试覆盖：
 * - 服务初始化
 * - 默认评分维度
 * - 自定义维度注册
 * - 各维度评分逻辑
 * - BillingQualityScorer 专用逻辑
 * - 边界条件和错误处理
 */
describe('QualityScorer', () => {
	let scorer: QualityScorer;

	// 模拟完整的聚合根元数据
	const mockCompleteMetadata: IFullAggregateMetadata = {
		aggregateType: 'Billing',
		aggregateId: 'billing-001',
		tenantId: 'tenant-123',
		createdAt: new Date(),
		updatedAt: new Date(),
		createdBy: 'user-001',
		updatedBy: 'user-001',
		isDeleted: false,
		analyzable: {
			tags: ['high-value', 'paid'],
			category: 'subscription',
			analyticsDimensions: {
				amount: 1500,
				currency: 'CNY',
				status: 'PAID'
			},
			includeInAnalytics: true,
			qualityScore: 85
		}
	};

	// 模拟部分完成的聚合根元数据
	const mockPartialMetadata: IFullAggregateMetadata = {
		aggregateType: 'Order',
		aggregateId: 'order-001',
		tenantId: 'tenant-456',
		createdAt: new Date(),
		updatedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
		isDeleted: false
	};

	// 模拟已删除的聚合根元数据
	const mockDeletedMetadata: IFullAggregateMetadata = {
		aggregateType: 'Test',
		aggregateId: 'test-001',
		tenantId: 'tenant-789',
		createdAt: new Date(),
		updatedAt: new Date(),
		isDeleted: true,
		deletedAt: new Date(),
		deletedBy: 'user-001'
	};

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			providers: [QualityScorer]
		}).compile();

		scorer = module.get<QualityScorer>(QualityScorer);
	});

	describe('服务初始化', () => {
		it('应该成功创建评分器实例', () => {
			expect(scorer).toBeDefined();
		});

		it('应该返回正确的评分器名称', () => {
			expect(scorer.getName()).toBe('DefaultQualityScorer');
		});

		it('应该支持所有聚合类型', () => {
			expect(scorer.getSupportedAggregateTypes()).toEqual(['*']);
		});
	});

	describe('默认评分维度', () => {
		it('应该注册 5 个默认维度', async () => {
			const result = await scorer.score(mockCompleteMetadata);

			expect(result.details).toHaveLength(5);
		});

		it('默认维度应该包含完整性', async () => {
			const result = await scorer.score(mockCompleteMetadata);

			const completenessDim = result.details.find((d) => d.dimension === '完整性');
			expect(completenessDim).toBeDefined();
			expect(completenessDim!.weight).toBe(0.25);
		});

		it('默认维度应该包含时效性', async () => {
			const result = await scorer.score(mockCompleteMetadata);

			const timelinessDim = result.details.find((d) => d.dimension === '时效性');
			expect(timelinessDim).toBeDefined();
			expect(timelinessDim!.weight).toBe(0.2);
		});

		it('默认维度应该包含一致性', async () => {
			const result = await scorer.score(mockCompleteMetadata);

			const consistencyDim = result.details.find((d) => d.dimension === '一致性');
			expect(consistencyDim).toBeDefined();
		});

		it('默认维度应该包含有效性', async () => {
			const result = await scorer.score(mockCompleteMetadata);

			const validityDim = result.details.find((d) => d.dimension === '有效性');
			expect(validityDim).toBeDefined();
		});

		it('默认维度应该包含可访问性', async () => {
			const result = await scorer.score(mockCompleteMetadata);

			const accessibilityDim = result.details.find((d) => d.dimension === '可访问性');
			expect(accessibilityDim).toBeDefined();
		});
	});

	describe('完整性评分', () => {
		it('完整数据应该得到满分', async () => {
			const result = await scorer.score(mockCompleteMetadata);

			const completenessDim = result.details.find((d) => d.dimension === '完整性');
			expect(completenessDim!.score).toBe(100);
		});

		it('缺少 createdAt 应该扣分', async () => {
			const metadata: IFullAggregateMetadata = {
				...mockPartialMetadata,
				createdAt: undefined as any
			};

			const result = await scorer.score(metadata);

			const completenessDim = result.details.find((d) => d.dimension === '完整性');
			expect(completenessDim!.score).toBeLessThan(100);
		});

		it('缺少 analyzable.category 应该扣分', async () => {
			const metadata: IFullAggregateMetadata = {
				...mockPartialMetadata,
				analyzable: {
					tags: ['test'],
					includeInAnalytics: true
				}
			};

			const result = await scorer.score(metadata);

			const completenessDim = result.details.find((d) => d.dimension === '完整性');
			expect(completenessDim!.score).toBeLessThan(100);
		});

		it('缺少 analyzable.tags 应该扣分', async () => {
			const metadata: IFullAggregateMetadata = {
				...mockPartialMetadata,
				analyzable: {
					tags: [],
					category: 'test',
					includeInAnalytics: true
				}
			};

			const result = await scorer.score(metadata);

			const completenessDim = result.details.find((d) => d.dimension === '完整性');
			expect(completenessDim!.score).toBeLessThan(100);
		});
	});

	describe('时效性评分', () => {
		it('最近更新的数据应该得到高分', async () => {
			const metadata: IFullAggregateMetadata = {
				...mockPartialMetadata,
				updatedAt: new Date()
			};

			const result = await scorer.score(metadata);

			const timelinessDim = result.details.find((d) => d.dimension === '时效性');
			expect(timelinessDim!.score).toBe(100);
		});

		it('24小时内更新的数据应该得到满分', async () => {
			const metadata: IFullAggregateMetadata = {
				...mockPartialMetadata,
				updatedAt: new Date(Date.now() - 12 * 60 * 60 * 1000)
			};

			const result = await scorer.score(metadata);

			const timelinessDim = result.details.find((d) => d.dimension === '时效性');
			expect(timelinessDim!.score).toBe(100);
		});

		it('一周前更新的数据应该得到中等分数', async () => {
			const metadata: IFullAggregateMetadata = {
				...mockPartialMetadata,
				updatedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
			};

			const result = await scorer.score(metadata);

			const timelinessDim = result.details.find((d) => d.dimension === '时效性');
			expect(timelinessDim!.score).toBe(60);
		});

		it('一个月前更新的数据应该得到低分', async () => {
			const metadata: IFullAggregateMetadata = {
				...mockPartialMetadata,
				updatedAt: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000)
			};

			const result = await scorer.score(metadata);

			const timelinessDim = result.details.find((d) => d.dimension === '时效性');
			expect(timelinessDim!.score).toBe(20);
		});
	});

	describe('一致性评分', () => {
		it('逻辑一致的数据应该得到满分', async () => {
			const result = await scorer.score(mockCompleteMetadata);

			const consistencyDim = result.details.find((d) => d.dimension === '一致性');
			expect(consistencyDim!.score).toBe(100);
		});

		it('updatedAt 早于 createdAt 应该扣分', async () => {
			const metadata: IFullAggregateMetadata = {
				...mockPartialMetadata,
				createdAt: new Date('2024-02-01'),
				updatedAt: new Date('2024-01-01')
			};

			const result = await scorer.score(metadata);

			const consistencyDim = result.details.find((d) => d.dimension === '一致性');
			expect(consistencyDim!.score).toBeLessThan(100);
		});

		it('已删除但没有 deletedAt 应该扣分', async () => {
			const metadata: IFullAggregateMetadata = {
				...mockPartialMetadata,
				isDeleted: true,
				deletedAt: undefined as any
			};

			const result = await scorer.score(metadata);

			const consistencyDim = result.details.find((d) => d.dimension === '一致性');
			expect(consistencyDim!.score).toBeLessThan(100);
		});
	});

	describe('有效性评分', () => {
		it('有效数据应该得到满分', async () => {
			const result = await scorer.score(mockCompleteMetadata);

			const validityDim = result.details.find((d) => d.dimension === '有效性');
			expect(validityDim!.score).toBe(100);
		});

		it('空的 aggregateId 应该扣分', async () => {
			const metadata: IFullAggregateMetadata = {
				...mockPartialMetadata,
				aggregateId: ''
			};

			const result = await scorer.score(metadata);

			const validityDim = result.details.find((d) => d.dimension === '有效性');
			expect(validityDim!.score).toBeLessThan(100);
		});

		it('空的 tenantId 应该扣分', async () => {
			const metadata: IFullAggregateMetadata = {
				...mockPartialMetadata,
				tenantId: ''
			};

			const result = await scorer.score(metadata);

			const validityDim = result.details.find((d) => d.dimension === '有效性');
			expect(validityDim!.score).toBeLessThan(100);
		});

		it('质量分数超出范围应该扣分', async () => {
			const metadata: IFullAggregateMetadata = {
				...mockCompleteMetadata,
				analyzable: {
					...mockCompleteMetadata.analyzable!,
					qualityScore: 150
				}
			};

			const result = await scorer.score(metadata);

			const validityDim = result.details.find((d) => d.dimension === '有效性');
			expect(validityDim!.score).toBeLessThan(100);
		});
	});

	describe('可访问性评分', () => {
		it('正常数据应该得到满分', async () => {
			const result = await scorer.score(mockCompleteMetadata);

			const accessibilityDim = result.details.find((d) => d.dimension === '可访问性');
			expect(accessibilityDim!.score).toBe(100);
		});

		it('已删除的数据应该得到低分', async () => {
			const result = await scorer.score(mockDeletedMetadata);

			const accessibilityDim = result.details.find((d) => d.dimension === '可访问性');
			expect(accessibilityDim!.score).toBe(30);
		});

		it('不包含在分析中的数据应该得到中等分数', async () => {
			const metadata: IFullAggregateMetadata = {
				...mockPartialMetadata,
				analyzable: {
					tags: [],
					includeInAnalytics: false
				}
			};

			const result = await scorer.score(metadata);

			const accessibilityDim = result.details.find((d) => d.dimension === '可访问性');
			expect(accessibilityDim!.score).toBe(50);
		});
	});

	describe('自定义维度注册', () => {
		it('应该能够注册自定义维度', async () => {
			const customDimension: QualityDimension = {
				name: '自定义维度',
				weight: 0.1,
				evaluate: () => 80
			};

			scorer.registerDimension(customDimension);

			const result = await scorer.score(mockCompleteMetadata);

			const customDim = result.details.find((d) => d.dimension === '自定义维度');
			expect(customDim).toBeDefined();
			expect(customDim!.score).toBe(80);
		});
	});

	describe('评分结果', () => {
		it('应该返回 0-100 范围内的总分', async () => {
			const result = await scorer.score(mockCompleteMetadata);

			expect(result.score).toBeGreaterThanOrEqual(0);
			expect(result.score).toBeLessThanOrEqual(100);
		});

		it('应该返回评分时间', async () => {
			const result = await scorer.score(mockCompleteMetadata);

			expect(result.evaluatedAt).toBeInstanceOf(Date);
		});

		it('应该返回包含描述的评分详情', async () => {
			const result = await scorer.score(mockCompleteMetadata);

			for (const detail of result.details) {
				expect(detail.description).toBeDefined();
				expect(detail.description).toContain(detail.dimension);
			}
		});
	});

	describe('评分描述', () => {
		it('高分应该显示"优秀"', async () => {
			const metadata: IFullAggregateMetadata = {
				...mockCompleteMetadata,
				updatedAt: new Date()
			};

			const result = await scorer.score(metadata);

			const timelinessDim = result.details.find((d) => d.dimension === '时效性');
			expect(timelinessDim!.description).toContain('优秀');
		});

		it('低分应该显示"需改进"', async () => {
			const metadata: IFullAggregateMetadata = {
				...mockPartialMetadata,
				updatedAt: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000)
			};

			const result = await scorer.score(metadata);

			const timelinessDim = result.details.find((d) => d.dimension === '时效性');
			expect(timelinessDim!.description).toContain('需改进');
		});
	});
});

describe('BillingQualityScorer', () => {
	let scorer: BillingQualityScorer;

	const mockBillingMetadata: IFullAggregateMetadata = {
		aggregateType: 'Billing',
		aggregateId: 'billing-001',
		tenantId: 'tenant-123',
		createdAt: new Date(),
		updatedAt: new Date(),
		isDeleted: false,
		analyzable: {
			tags: ['billing'],
			category: 'subscription',
			analyticsDimensions: {
				status: 'PAID',
				amount: 1500,
				currency: 'CNY',
				retryCount: 0
			},
			includeInAnalytics: true
		}
	};

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			providers: [BillingQualityScorer]
		}).compile();

		scorer = module.get<BillingQualityScorer>(BillingQualityScorer);
	});

	describe('服务初始化', () => {
		it('应该成功创建评分器实例', () => {
			expect(scorer).toBeDefined();
		});

		it('应该返回正确的评分器名称', () => {
			expect(scorer.getName()).toBe('BillingQualityScorer');
		});

		it('应该只支持 Billing 聚合类型', () => {
			expect(scorer.getSupportedAggregateTypes()).toEqual(['Billing']);
		});
	});

	describe('评分维度', () => {
		it('应该包含 4 个专用维度', async () => {
			const result = await scorer.score(mockBillingMetadata);

			expect(result.details).toHaveLength(4);
		});

		it('应该包含状态有效性维度', async () => {
			const result = await scorer.score(mockBillingMetadata);

			const statusDim = result.details.find((d) => d.dimension === '状态有效性');
			expect(statusDim).toBeDefined();
			expect(statusDim!.weight).toBe(0.3);
		});

		it('应该包含金额完整性维度', async () => {
			const result = await scorer.score(mockBillingMetadata);

			const amountDim = result.details.find((d) => d.dimension === '金额完整性');
			expect(amountDim).toBeDefined();
			expect(amountDim!.weight).toBe(0.3);
		});

		it('应该包含处理时效维度', async () => {
			const result = await scorer.score(mockBillingMetadata);

			const timelinessDim = result.details.find((d) => d.dimension === '处理时效');
			expect(timelinessDim).toBeDefined();
			expect(timelinessDim!.weight).toBe(0.25);
		});

		it('应该包含处理稳定性维度', async () => {
			const result = await scorer.score(mockBillingMetadata);

			const stabilityDim = result.details.find((d) => d.dimension === '处理稳定性');
			expect(stabilityDim).toBeDefined();
			expect(stabilityDim!.weight).toBe(0.15);
		});
	});

	describe('状态有效性评分', () => {
		it('PAID 状态应该得到满分', async () => {
			const result = await scorer.score(mockBillingMetadata);

			const statusDim = result.details.find((d) => d.dimension === '状态有效性');
			expect(statusDim!.score).toBe(100);
		});

		it('PENDING 状态应该得到较高分数', async () => {
			const metadata: IFullAggregateMetadata = {
				...mockBillingMetadata,
				analyzable: {
					...mockBillingMetadata.analyzable!,
					analyticsDimensions: {
						...mockBillingMetadata.analyzable!.analyticsDimensions,
						status: 'PENDING'
					}
				}
			};

			const result = await scorer.score(metadata);

			const statusDim = result.details.find((d) => d.dimension === '状态有效性');
			expect(statusDim!.score).toBe(80);
		});

		it('FAILED 状态应该得到低分', async () => {
			const metadata: IFullAggregateMetadata = {
				...mockBillingMetadata,
				analyzable: {
					...mockBillingMetadata.analyzable!,
					analyticsDimensions: {
						...mockBillingMetadata.analyzable!.analyticsDimensions,
						status: 'FAILED'
					}
				}
			};

			const result = await scorer.score(metadata);

			const statusDim = result.details.find((d) => d.dimension === '状态有效性');
			expect(statusDim!.score).toBe(40);
		});

		it('REFUNDED 状态应该得到中等分数', async () => {
			const metadata: IFullAggregateMetadata = {
				...mockBillingMetadata,
				analyzable: {
					...mockBillingMetadata.analyzable!,
					analyticsDimensions: {
						...mockBillingMetadata.analyzable!.analyticsDimensions,
						status: 'REFUNDED'
					}
				}
			};

			const result = await scorer.score(metadata);

			const statusDim = result.details.find((d) => d.dimension === '状态有效性');
			expect(statusDim!.score).toBe(60);
		});
	});

	describe('金额完整性评分', () => {
		it('完整金额信息应该得到满分', async () => {
			const result = await scorer.score(mockBillingMetadata);

			const amountDim = result.details.find((d) => d.dimension === '金额完整性');
			expect(amountDim!.score).toBe(100);
		});

		it('缺少金额应该扣分', async () => {
			const metadata: IFullAggregateMetadata = {
				...mockBillingMetadata,
				analyzable: {
					...mockBillingMetadata.analyzable!,
					analyticsDimensions: {
						...mockBillingMetadata.analyzable!.analyticsDimensions,
						amount: undefined as any
					}
				}
			};

			const result = await scorer.score(metadata);

			const amountDim = result.details.find((d) => d.dimension === '金额完整性');
			expect(amountDim!.score).toBeLessThan(100);
		});

		it('缺少货币应该扣分', async () => {
			const metadata: IFullAggregateMetadata = {
				...mockBillingMetadata,
				analyzable: {
					...mockBillingMetadata.analyzable!,
					analyticsDimensions: {
						...mockBillingMetadata.analyzable!.analyticsDimensions,
						currency: undefined as any
					}
				}
			};

			const result = await scorer.score(metadata);

			const amountDim = result.details.find((d) => d.dimension === '金额完整性');
			expect(amountDim!.score).toBeLessThan(100);
		});

		it('负金额应该扣分', async () => {
			const metadata: IFullAggregateMetadata = {
				...mockBillingMetadata,
				analyzable: {
					...mockBillingMetadata.analyzable!,
					analyticsDimensions: {
						...mockBillingMetadata.analyzable!.analyticsDimensions,
						amount: -100
					}
				}
			};

			const result = await scorer.score(metadata);

			const amountDim = result.details.find((d) => d.dimension === '金额完整性');
			expect(amountDim!.score).toBeLessThan(100);
		});
	});

	describe('处理时效评分', () => {
		it('1小时内更新应该得到满分', async () => {
			const metadata: IFullAggregateMetadata = {
				...mockBillingMetadata,
				updatedAt: new Date(Date.now() - 30 * 60 * 1000)
			};

			const result = await scorer.score(metadata);

			const timelinessDim = result.details.find((d) => d.dimension === '处理时效');
			expect(timelinessDim!.score).toBe(100);
		});

		it('24小时内更新应该得到较高分数', async () => {
			const result = await scorer.score(mockBillingMetadata);

			const timelinessDim = result.details.find((d) => d.dimension === '处理时效');
			expect(timelinessDim!.score).toBeGreaterThanOrEqual(90);
		});

		it('超过72小时更新应该得到较低分数', async () => {
			const metadata: IFullAggregateMetadata = {
				...mockBillingMetadata,
				updatedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000)
			};

			const result = await scorer.score(metadata);

			const timelinessDim = result.details.find((d) => d.dimension === '处理时效');
			expect(timelinessDim!.score).toBe(50);
		});
	});

	describe('处理稳定性评分', () => {
		it('无重试应该得到满分', async () => {
			const result = await scorer.score(mockBillingMetadata);

			const stabilityDim = result.details.find((d) => d.dimension === '处理稳定性');
			expect(stabilityDim!.score).toBe(100);
		});

		it('1次重试应该得到较高分数', async () => {
			const metadata: IFullAggregateMetadata = {
				...mockBillingMetadata,
				analyzable: {
					...mockBillingMetadata.analyzable!,
					analyticsDimensions: {
						...mockBillingMetadata.analyzable!.analyticsDimensions,
						retryCount: 1
					}
				}
			};

			const result = await scorer.score(metadata);

			const stabilityDim = result.details.find((d) => d.dimension === '处理稳定性');
			expect(stabilityDim!.score).toBe(80);
		});

		it('多次重试应该得到低分', async () => {
			const metadata: IFullAggregateMetadata = {
				...mockBillingMetadata,
				analyzable: {
					...mockBillingMetadata.analyzable!,
					analyticsDimensions: {
						...mockBillingMetadata.analyzable!.analyticsDimensions,
						retryCount: 6
					}
				}
			};

			const result = await scorer.score(metadata);

			const stabilityDim = result.details.find((d) => d.dimension === '处理稳定性');
			expect(stabilityDim!.score).toBe(20);
		});
	});

	describe('评分结果', () => {
		it('应该返回 0-100 范围内的总分', async () => {
			const result = await scorer.score(mockBillingMetadata);

			expect(result.score).toBeGreaterThanOrEqual(0);
			expect(result.score).toBeLessThanOrEqual(100);
		});

		it('应该返回评分时间', async () => {
			const result = await scorer.score(mockBillingMetadata);

			expect(result.evaluatedAt).toBeInstanceOf(Date);
		});

		it('完整 Billing 数据应该得到高分', async () => {
			const result = await scorer.score(mockBillingMetadata);

			expect(result.score).toBeGreaterThan(90);
		});
	});

	describe('边界条件', () => {
		it('应该处理缺少 analyticsDimensions 的元数据', async () => {
			const metadata: IFullAggregateMetadata = {
				...mockBillingMetadata,
				analyzable: undefined as any
			};

			const result = await scorer.score(metadata);

			expect(result).toBeDefined();
			expect(result.score).toBeGreaterThanOrEqual(0);
		});

		it('应该处理缺少 updatedAt 的元数据', async () => {
			const metadata: IFullAggregateMetadata = {
				...mockBillingMetadata,
				updatedAt: undefined as any
			};

			const result = await scorer.score(metadata);

			expect(result).toBeDefined();
		});
	});
});
