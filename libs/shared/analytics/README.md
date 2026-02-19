# @oksai/analytics

数据分析能力包 - 提供数据质量评分、分析维度计算和报表生成功能。

## 安装

```bash
pnpm add @oksai/analytics
```

## 功能特性

### 1. 数据质量评分

自动评估数据质量，提供多维度评分和改进建议。

```typescript
import { DataQualityScorerService } from '@oksai/analytics';

const qualityScorer = new DataQualityScorerService();
const result = await qualityScorer.score(aggregateMetadata);

console.log(`数据质量分数: ${result.totalScore}`);
// 输出：数据质量分数: 85.5
```

**评分维度：**

- 基础完整性（30%）：必填字段完整性
- 分类准确性（20%）：标签和分类设置
- 分析维度完整性（25%）：分析维度设置
- 审计完整性（15%）：审计信息完整性
- 扩展能力利用（10%）：扩展能力使用情况

### 2. 分析维度计算

自动提取时间、业务等分析维度，用于数据聚合和报表生成。

```typescript
import { AnalyticsDimensionCalculatorService } from '@oksai/analytics';

const calculator = new AnalyticsDimensionCalculatorService();
const dimensions = await calculator.calculate(aggregateMetadata);

console.log(dimensions);
// 输出：
// {
//   time_year: 2026,
//   time_month: 2,
//   time_day: 19,
//   business_type: 'Billing',
//   business_status: 'PAID',
//   business_amount_range: '1000-5000'
// }
```

**支持的计算器：**

- `TimeDimensionCalculator`：时间维度（年、月、周、日、小时、季度）
- `BusinessDimensionCalculator`：业务维度（类型、状态、金额范围、货币）

### 3. 分析报表生成

生成汇总、趋势、质量、对比等多种类型报表。

```typescript
import { AnalyticsReportService, AnalyticsReportType } from '@oksai/analytics';

const reportService = new AnalyticsReportService(orm);

const report = await reportService.generateReport({
	id: 'billing-summary-2026',
	name: '账单汇总报表',
	type: AnalyticsReportType.SUMMARY,
	groupBy: ['business_type', 'business_status'],
	filters: { tenantId: 'tenant-123' },
	aggregations: [
		{ function: 'COUNT', field: '*', alias: 'total_count' },
		{ function: 'SUM', field: 'amount', alias: 'total_amount' }
	]
});

console.log(`报表生成完成，共 ${report.rows.length} 行数据`);
```

**支持的报表类型：**

- `SUMMARY`：汇总报表（按维度聚合统计）
- `TREND`：趋势报表（时间序列分析）
- `QUALITY`：质量报表（数据质量统计）
- `COMPARISON`：对比报表（多维度对比分析）

## NestJS 集成

### 1. 导入模块

```typescript
import { AnalyticsModule } from '@oksai/analytics';

@Module({
	imports: [
		AnalyticsModule.forRoot({
			enableQualityScoring: true,
			enableDimensionCalculation: true,
			enableReportGeneration: true
		})
	]
})
export class AppModule {}
```

### 2. 在服务中使用

```typescript
import { Injectable } from '@nestjs/common';
import { DataQualityScorerService } from '@oksai/analytics';

@Injectable()
export class BillingService {
	constructor(private readonly qualityScorer: DataQualityScorerService) {}

	async assessBillingQuality(billingId: string) {
		const result = await this.qualityScorer.score(billingMetadata);
		return result;
	}
}
```

## API 端点

### 数据质量评分

```http
POST /analytics/quality/score
Content-Type: application/json

{
  "aggregateType": "Billing",
  "aggregateId": "billing-001",
  "tenantId": "tenant-123"
}
```

### 批量质量评分

```http
POST /analytics/quality/batch
Content-Type: application/json

{
  "aggregates": [
    { "aggregateType": "Billing", "aggregateId": "billing-001", "tenantId": "tenant-123" },
    { "aggregateType": "Billing", "aggregateId": "billing-002", "tenantId": "tenant-123" }
  ]
}
```

### 计算分析维度

```http
POST /analytics/dimensions/calculate
Content-Type: application/json

{
  "aggregateType": "Billing",
  "aggregateId": "billing-001",
  "tenantId": "tenant-123",
  "calculatorNames": ["TimeDimensionCalculator", "BusinessDimensionCalculator"]
}
```

### 生成分析报表

```http
POST /analytics/reports/generate
Content-Type: application/json

{
  "reportId": "billing-summary-2026",
  "reportName": "账单汇总报表",
  "reportType": "SUMMARY",
  "groupBy": ["business_type", "business_status"],
  "tenantId": "tenant-123",
  "aggregations": [
    { "function": "COUNT", "field": "*", "alias": "total_count" },
    { "function": "SUM", "field": "amount", "alias": "total_amount" }
  ]
}
```

### 获取报表模板

```http
GET /analytics/reports/template?reportType=SUMMARY
```

### 获取服务信息

```http
GET /analytics/info
```

## 配置选项

### QualityScorerConfig

```typescript
{
  strictMode?: boolean;           // 严格模式（缺失必填字段时分数为 0）
  lowQualityThreshold?: number;   // 低质量阈值（默认 60）
  dimensions?: QualityDimensionConfig[];  // 自定义评分维度
}
```

## 最佳实践

### 1. 在聚合根创建时自动设置分析维度

```typescript
export class BillingAggregate extends AnalyzableAggregateRoot<BillingEvent> {
	static create(id: BillingId, tenantId: string, amount: Money): BillingAggregate {
		const billing = new BillingAggregate(id, tenantId, amount);

		// 自动设置分析维度
		billing.setAnalyticsDimension('currency', amount.getCurrency());
		billing.setAnalyticsDimension('amount', amount.getAmount());

		// 根据金额自动添加标签
		if (amount.getAmount() >= 1000) {
			billing.addTag('high-value');
		}

		return billing;
	}
}
```

### 2. 定期生成数据质量报告

```typescript
@Cron('0 2 * * *')  // 每天凌晨 2 点
async generateDailyQualityReport() {
  const report = await this.reportService.generateReport({
    id: `quality-report-${new Date().toISOString().split('T')[0]}`,
    name: '每日数据质量报告',
    type: AnalyticsReportType.QUALITY,
    groupBy: ['aggregate_type'],
    filters: { tenantId: this.tenantId },
    aggregations: [
      { function: 'AVG', field: 'quality_score', alias: 'avg_score' },
      { function: 'COUNT', field: '*', alias: 'total_count' }
    ]
  });

  await this.sendReport(report);
}
```

### 3. 使用维度计算器进行数据分类

```typescript
async classifyBilling(billingId: string) {
  const dimensions = await this.dimensionCalculator.calculate(billingMetadata);

  // 根据时间维度分类
  if (dimensions.time_month === new Date().getMonth() + 1) {
    await this.addTag(billingId, 'current-month');
  }

  // 根据金额范围分类
  if (dimensions.business_amount_range === '5000+') {
    await this.addTag(billingId, 'high-priority');
  }
}
```

## 测试

```bash
# 运行单元测试
pnpm test

# 运行测试并生成覆盖率报告
pnpm test:cov
```

## 许可证

MIT
