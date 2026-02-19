import { TimeDimensionCalculator } from './time-dimension-calculator';
import type { IFullAggregateMetadata } from '@oksai/aggregate-metadata';
import { CommonDimensions } from '../interfaces/analytics-dimensions.interface';

/**
 * @description TimeDimensionCalculator 单元测试
 *
 * 测试覆盖：
 * - 时间维度的正确提取
 * - ISO 8601 周数计算
 * - 季度计算
 * - 边界条件（闰年、月末等）
 */
describe('TimeDimensionCalculator', () => {
	let calculator: TimeDimensionCalculator;

	beforeEach(() => {
		calculator = new TimeDimensionCalculator();
	});

	describe('基本信息', () => {
		it('应该返回计算器名称', () => {
			expect(calculator.getName()).toBe('TimeDimensionCalculator');
		});

		it('应该返回支持的维度键列表', () => {
			const supported = calculator.getSupportedDimensions();

			expect(supported).toContain(CommonDimensions.TIME_YEAR);
			expect(supported).toContain(CommonDimensions.TIME_MONTH);
			expect(supported).toContain(CommonDimensions.TIME_WEEK);
			expect(supported).toContain(CommonDimensions.TIME_DAY);
			expect(supported).toContain(CommonDimensions.TIME_HOUR);
			expect(supported).toContain(CommonDimensions.TIME_QUARTER);
		});
	});

	describe('时间维度提取', () => {
		it('应该正确提取 updatedAt 的时间维度', () => {
			// Arrange - 使用本地时间创建日期
			const testDate = new Date(2026, 1, 19, 15, 30, 0); // 2026-02-19 15:30:00 本地时间
			const aggregate: IFullAggregateMetadata = {
				aggregateType: 'Test',
				aggregateId: 'test-001',
				tenantId: 'tenant-123',
				createdAt: new Date(2026, 0, 1),
				updatedAt: testDate,
				isDeleted: false
			};

			// Act
			const dimensions = calculator.calculate(aggregate);

			// Assert
			expect(dimensions[CommonDimensions.TIME_YEAR]).toBe(2026);
			expect(dimensions[CommonDimensions.TIME_MONTH]).toBe(2);
			expect(dimensions[CommonDimensions.TIME_DAY]).toBe(19);
			expect(dimensions[CommonDimensions.TIME_HOUR]).toBe(15);
		});

		it('应该在 updatedAt 缺失时使用 createdAt', () => {
			// Arrange - 使用本地时间创建日期
			const testDate = new Date(2026, 2, 15, 10, 0, 0); // 2026-03-15 10:00:00 本地时间
			const aggregate: IFullAggregateMetadata = {
				aggregateType: 'Test',
				aggregateId: 'test-002',
				tenantId: 'tenant-123',
				createdAt: testDate,
				isDeleted: false
			};

			// Act
			const dimensions = calculator.calculate(aggregate);

			// Assert
			expect(dimensions[CommonDimensions.TIME_YEAR]).toBe(2026);
			expect(dimensions[CommonDimensions.TIME_MONTH]).toBe(3);
			expect(dimensions[CommonDimensions.TIME_DAY]).toBe(15);
		});

		it('应该在没有时间戳时使用当前时间', () => {
			// Arrange
			const aggregate: IFullAggregateMetadata = {
				aggregateType: 'Test',
				aggregateId: 'test-003',
				tenantId: 'tenant-123',
				isDeleted: false
			};

			// Act
			const dimensions = calculator.calculate(aggregate);
			const now = new Date();

			// Assert
			expect(dimensions[CommonDimensions.TIME_YEAR]).toBe(now.getFullYear());
			expect(dimensions[CommonDimensions.TIME_MONTH]).toBe(now.getMonth() + 1);
		});
	});

	describe('周数计算（ISO 8601）', () => {
		it('应该正确计算年初的周数', () => {
			// Arrange - 2026 年 1 月 1 日（周四，属于第 1 周）
			const aggregate: IFullAggregateMetadata = {
				aggregateType: 'Test',
				aggregateId: 'test-004',
				tenantId: 'tenant-123',
				updatedAt: new Date('2026-01-01'),
				isDeleted: false
			};

			// Act
			const dimensions = calculator.calculate(aggregate);

			// Assert
			expect(dimensions[CommonDimensions.TIME_WEEK]).toBe(1);
		});

		it('应该正确计算年末的周数', () => {
			// Arrange - 2026 年 12 月 31 日
			const aggregate: IFullAggregateMetadata = {
				aggregateType: 'Test',
				aggregateId: 'test-005',
				tenantId: 'tenant-123',
				updatedAt: new Date('2026-12-31'),
				isDeleted: false
			};

			// Act
			const dimensions = calculator.calculate(aggregate);

			// Assert
			expect(dimensions[CommonDimensions.TIME_WEEK]).toBeGreaterThan(50);
			expect(dimensions[CommonDimensions.TIME_WEEK]).toBeLessThanOrEqual(53);
		});

		it('应该正确计算 2 月中旬的周数', () => {
			// Arrange - 2026 年 2 月 19 日
			const aggregate: IFullAggregateMetadata = {
				aggregateType: 'Test',
				aggregateId: 'test-006',
				tenantId: 'tenant-123',
				updatedAt: new Date('2026-02-19'),
				isDeleted: false
			};

			// Act
			const dimensions = calculator.calculate(aggregate);

			// Assert
			expect(dimensions[CommonDimensions.TIME_WEEK]).toBeGreaterThan(6);
			expect(dimensions[CommonDimensions.TIME_WEEK]).toBeLessThan(10);
		});
	});

	describe('季度计算', () => {
		it('应该正确计算 Q1（1-3 月）', () => {
			for (let month = 1; month <= 3; month++) {
				// Arrange
				const aggregate: IFullAggregateMetadata = {
					aggregateType: 'Test',
					aggregateId: `test-q1-${month}`,
					tenantId: 'tenant-123',
					updatedAt: new Date(`2026-${month.toString().padStart(2, '0')}-15`),
					isDeleted: false
				};

				// Act
				const dimensions = calculator.calculate(aggregate);

				// Assert
				expect(dimensions[CommonDimensions.TIME_QUARTER]).toBe(1);
			}
		});

		it('应该正确计算 Q2（4-6 月）', () => {
			for (let month = 4; month <= 6; month++) {
				// Arrange
				const aggregate: IFullAggregateMetadata = {
					aggregateType: 'Test',
					aggregateId: `test-q2-${month}`,
					tenantId: 'tenant-123',
					updatedAt: new Date(`2026-${month.toString().padStart(2, '0')}-15`),
					isDeleted: false
				};

				// Act
				const dimensions = calculator.calculate(aggregate);

				// Assert
				expect(dimensions[CommonDimensions.TIME_QUARTER]).toBe(2);
			}
		});

		it('应该正确计算 Q3（7-9 月）', () => {
			for (let month = 7; month <= 9; month++) {
				// Arrange
				const aggregate: IFullAggregateMetadata = {
					aggregateType: 'Test',
					aggregateId: `test-q3-${month}`,
					tenantId: 'tenant-123',
					updatedAt: new Date(`2026-${month.toString().padStart(2, '0')}-15`),
					isDeleted: false
				};

				// Act
				const dimensions = calculator.calculate(aggregate);

				// Assert
				expect(dimensions[CommonDimensions.TIME_QUARTER]).toBe(3);
			}
		});

		it('应该正确计算 Q4（10-12 月）', () => {
			for (let month = 10; month <= 12; month++) {
				// Arrange
				const aggregate: IFullAggregateMetadata = {
					aggregateType: 'Test',
					aggregateId: `test-q4-${month}`,
					tenantId: 'tenant-123',
					updatedAt: new Date(`2026-${month.toString().padStart(2, '0')}-15`),
					isDeleted: false
				};

				// Act
				const dimensions = calculator.calculate(aggregate);

				// Assert
				expect(dimensions[CommonDimensions.TIME_QUARTER]).toBe(4);
			}
		});
	});

	describe('边界条件', () => {
		it('应该正确处理闰年', () => {
			// Arrange - 2024 年是闰年，2 月有 29 天
			const aggregate: IFullAggregateMetadata = {
				aggregateType: 'Test',
				aggregateId: 'test-leap',
				tenantId: 'tenant-123',
				updatedAt: new Date('2024-02-29'),
				isDeleted: false
			};

			// Act
			const dimensions = calculator.calculate(aggregate);

			// Assert
			expect(dimensions[CommonDimensions.TIME_MONTH]).toBe(2);
			expect(dimensions[CommonDimensions.TIME_DAY]).toBe(29);
		});

		it('应该正确处理午夜时间', () => {
			// Arrange - 使用本地时间创建日期
			const midnightDate = new Date(2026, 1, 19, 0, 0, 0); // 2026-02-19 00:00:00 本地时间
			const aggregate: IFullAggregateMetadata = {
				aggregateType: 'Test',
				aggregateId: 'test-midnight',
				tenantId: 'tenant-123',
				createdAt: midnightDate,
				updatedAt: midnightDate,
				isDeleted: false
			};

			// Act
			const dimensions = calculator.calculate(aggregate);

			// Assert
			expect(dimensions[CommonDimensions.TIME_HOUR]).toBe(0);
		});

		it('应该正确处理 23 点时间', () => {
			// Arrange - 使用本地时间创建日期
			const lateNightDate = new Date(2026, 1, 19, 23, 59, 59); // 2026-02-19 23:59:59 本地时间
			const aggregate: IFullAggregateMetadata = {
				aggregateType: 'Test',
				aggregateId: 'test-23h',
				tenantId: 'tenant-123',
				createdAt: lateNightDate,
				updatedAt: lateNightDate,
				isDeleted: false
			};

			// Act
			const dimensions = calculator.calculate(aggregate);

			// Assert
			expect(dimensions[CommonDimensions.TIME_HOUR]).toBe(23);
		});
	});
});
