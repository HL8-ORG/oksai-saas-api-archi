import { AnalyticsReportEntity } from './analytics-report.entity';
import { AnalyticsReportType } from '../interfaces/analytics-report.interface';

/**
 * @description AnalyticsReportEntity 单元测试
 *
 * 测试覆盖：
 * - 实体创建与属性赋值
 * - 必填属性验证
 * - 可选属性处理
 * - 默认值设置
 * - JSON 字段类型支持
 */

describe('AnalyticsReportEntity', () => {
	describe('实体创建', () => {
		it('应正确创建实体实例', () => {
			// Arrange & Act
			const entity = new AnalyticsReportEntity();

			// Assert
			expect(entity).toBeDefined();
			expect(entity).toBeInstanceOf(AnalyticsReportEntity);
		});

		it('应自动设置 generatedAt 为当前时间', () => {
			// Arrange
			const beforeCreate = new Date();

			// Act
			const entity = new AnalyticsReportEntity();

			// Assert
			const afterCreate = new Date();
			expect(entity.generatedAt).toBeInstanceOf(Date);
			expect(entity.generatedAt.getTime()).toBeGreaterThanOrEqual(beforeCreate.getTime());
			expect(entity.generatedAt.getTime()).toBeLessThanOrEqual(afterCreate.getTime());
		});

		it('应默认 isDeleted 为 false', () => {
			// Arrange & Act
			const entity = new AnalyticsReportEntity();

			// Assert
			expect(entity.isDeleted).toBe(false);
		});
	});

	describe('复合主键', () => {
		it('应正确设置 tenantId', () => {
			// Arrange & Act
			const entity = new AnalyticsReportEntity();
			entity.tenantId = 'tenant-123';

			// Assert
			expect(entity.tenantId).toBe('tenant-123');
		});

		it('应正确设置 reportId', () => {
			// Arrange & Act
			const entity = new AnalyticsReportEntity();
			entity.reportId = 'report-456';

			// Assert
			expect(entity.reportId).toBe('report-456');
		});

		it('应支持复合主键（tenantId + reportId）', () => {
			// Arrange & Act
			const entity = new AnalyticsReportEntity();
			entity.tenantId = 'tenant-789';
			entity.reportId = 'report-012';

			// Assert
			expect(entity.tenantId).toBe('tenant-789');
			expect(entity.reportId).toBe('report-012');
		});
	});

	describe('报表基本信息', () => {
		it('应正确设置 reportName', () => {
			// Arrange & Act
			const entity = new AnalyticsReportEntity();
			entity.reportName = '用户活跃度报表';

			// Assert
			expect(entity.reportName).toBe('用户活跃度报表');
		});

		it('应正确设置 reportType（SUMMARY）', () => {
			// Arrange & Act
			const entity = new AnalyticsReportEntity();
			entity.reportType = AnalyticsReportType.SUMMARY;

			// Assert
			expect(entity.reportType).toBe(AnalyticsReportType.SUMMARY);
		});

		it('应正确设置 reportType（TREND）', () => {
			// Arrange & Act
			const entity = new AnalyticsReportEntity();
			entity.reportType = AnalyticsReportType.TREND;

			// Assert
			expect(entity.reportType).toBe(AnalyticsReportType.TREND);
		});

		it('应正确设置 reportType（QUALITY）', () => {
			// Arrange & Act
			const entity = new AnalyticsReportEntity();
			entity.reportType = AnalyticsReportType.QUALITY;

			// Assert
			expect(entity.reportType).toBe(AnalyticsReportType.QUALITY);
		});

		it('应正确设置 reportType（COMPARISON）', () => {
			// Arrange & Act
			const entity = new AnalyticsReportEntity();
			entity.reportType = AnalyticsReportType.COMPARISON;

			// Assert
			expect(entity.reportType).toBe(AnalyticsReportType.COMPARISON);
		});

		it('应正确设置自定义 generatedAt', () => {
			// Arrange
			const customDate = new Date('2024-06-15T10:30:00Z');

			// Act
			const entity = new AnalyticsReportEntity();
			entity.generatedAt = customDate;

			// Assert
			expect(entity.generatedAt).toEqual(customDate);
		});

		it('应正确设置 expiresAt', () => {
			// Arrange
			const expireDate = new Date('2024-12-31T23:59:59Z');

			// Act
			const entity = new AnalyticsReportEntity();
			entity.expiresAt = expireDate;

			// Assert
			expect(entity.expiresAt).toEqual(expireDate);
		});

		it('expiresAt 应为可选', () => {
			// Arrange & Act
			const entity = new AnalyticsReportEntity();

			// Assert
			expect(entity.expiresAt).toBeUndefined();
		});
	});

	describe('报表配置（JSON 字段）', () => {
		it('应正确设置 reportConfig 对象', () => {
			// Arrange
			const config = {
				groupBy: ['department', 'region'],
				filters: { status: 'active' },
				timeRange: { start: '2024-01-01', end: '2024-12-31' }
			};

			// Act
			const entity = new AnalyticsReportEntity();
			entity.reportConfig = config;

			// Assert
			expect(entity.reportConfig).toEqual(config);
		});

		it('应支持复杂的嵌套配置对象', () => {
			// Arrange
			const complexConfig = {
				aggregations: [
					{ function: 'COUNT', field: 'userId', alias: 'totalUsers' },
					{ function: 'SUM', field: 'amount', alias: 'totalAmount' }
				],
				nested: {
					level1: {
						level2: {
							value: 'deep-value'
						}
					}
				}
			};

			// Act
			const entity = new AnalyticsReportEntity();
			entity.reportConfig = complexConfig;

			// Assert
			expect(entity.reportConfig).toEqual(complexConfig);
		});

		it('应支持空对象作为 reportConfig', () => {
			// Arrange & Act
			const entity = new AnalyticsReportEntity();
			entity.reportConfig = {};

			// Assert
			expect(entity.reportConfig).toEqual({});
		});
	});

	describe('报表数据（JSON 字段）', () => {
		it('应正确设置 reportRows 数组', () => {
			// Arrange
			const rows = [
				{ department: '销售', count: 150, amount: 50000 },
				{ department: '技术', count: 80, amount: 30000 },
				{ department: '市场', count: 45, amount: 20000 }
			];

			// Act
			const entity = new AnalyticsReportEntity();
			entity.reportRows = rows;

			// Assert
			expect(entity.reportRows).toEqual(rows);
			expect(entity.reportRows.length).toBe(3);
		});

		it('应支持空数组作为 reportRows', () => {
			// Arrange & Act
			const entity = new AnalyticsReportEntity();
			entity.reportRows = [];

			// Assert
			expect(entity.reportRows).toEqual([]);
		});

		it('应正确设置 reportSummary', () => {
			// Arrange
			const summary = {
				totalRows: 100,
				totalRecords: 5000,
				aggregations: { totalCount: 5000, avgAmount: 1250.5 }
			};

			// Act
			const entity = new AnalyticsReportEntity();
			entity.reportSummary = summary;

			// Assert
			expect(entity.reportSummary).toEqual(summary);
		});

		it('reportSummary 应为可选', () => {
			// Arrange & Act
			const entity = new AnalyticsReportEntity();

			// Assert
			expect(entity.reportSummary).toBeUndefined();
		});

		it('应正确设置 metadata', () => {
			// Arrange
			const metadata = {
				generatedBy: 'system',
				version: '1.0',
				cached: true
			};

			// Act
			const entity = new AnalyticsReportEntity();
			entity.metadata = metadata;

			// Assert
			expect(entity.metadata).toEqual(metadata);
		});

		it('metadata 应为可选', () => {
			// Arrange & Act
			const entity = new AnalyticsReportEntity();

			// Assert
			expect(entity.metadata).toBeUndefined();
		});
	});

	describe('审计字段', () => {
		it('应正确设置 createdBy', () => {
			// Arrange & Act
			const entity = new AnalyticsReportEntity();
			entity.createdBy = 'user-123';

			// Assert
			expect(entity.createdBy).toBe('user-123');
		});

		it('createdBy 应为可选', () => {
			// Arrange & Act
			const entity = new AnalyticsReportEntity();

			// Assert
			expect(entity.createdBy).toBeUndefined();
		});

		it('应正确设置 isDeleted 为 true', () => {
			// Arrange & Act
			const entity = new AnalyticsReportEntity();
			entity.isDeleted = true;

			// Assert
			expect(entity.isDeleted).toBe(true);
		});
	});

	describe('完整实体构建', () => {
		it('应正确构建完整的报表实体', () => {
			// Arrange
			const config = { groupBy: ['region'], filters: {} };
			const rows = [{ region: '华东', count: 100 }];
			const summary = { totalRows: 1 };

			// Act
			const entity = new AnalyticsReportEntity();
			entity.tenantId = 'tenant-001';
			entity.reportId = 'report-001';
			entity.reportName = '区域销售报表';
			entity.reportType = AnalyticsReportType.SUMMARY;
			entity.reportConfig = config;
			entity.reportRows = rows;
			entity.reportSummary = summary;
			entity.metadata = { cached: true };
			entity.createdBy = 'admin';
			entity.expiresAt = new Date('2024-12-31');

			// Assert
			expect(entity.tenantId).toBe('tenant-001');
			expect(entity.reportId).toBe('report-001');
			expect(entity.reportName).toBe('区域销售报表');
			expect(entity.reportType).toBe(AnalyticsReportType.SUMMARY);
			expect(entity.reportConfig).toEqual(config);
			expect(entity.reportRows).toEqual(rows);
			expect(entity.reportSummary).toEqual(summary);
			expect(entity.metadata).toEqual({ cached: true });
			expect(entity.createdBy).toBe('admin');
			expect(entity.generatedAt).toBeInstanceOf(Date);
			expect(entity.expiresAt).toBeInstanceOf(Date);
			expect(entity.isDeleted).toBe(false);
		});
	});
});
