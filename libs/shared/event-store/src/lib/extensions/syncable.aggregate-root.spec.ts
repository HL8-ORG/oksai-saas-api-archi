import { SyncableAggregateRoot, ExternalIdMap } from './syncable.aggregate-root';
import { SyncStatus, ETLMetadata } from './enums-and-interfaces';
import type { EventStoreDomainEvent } from '../event-store.interface';

/**
 * @description 测试用的具体同步聚合根实现
 */
class TestSyncableAggregate extends SyncableAggregateRoot<TestDomainEvent> {
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

describe('SyncableAggregateRoot', () => {
	let aggregate: TestSyncableAggregate;

	beforeEach(() => {
		aggregate = new TestSyncableAggregate();
	});

	describe('外部ID管理', () => {
		describe('setExternalId', () => {
			it('应正确设置外部系统ID', () => {
				// Arrange & Act
				aggregate.setExternalId('erp', 'ERP-001');

				// Assert
				expect(aggregate.getExternalId('erp')).toBe('ERP-001');
			});

			it('应覆盖同名系统的外部ID', () => {
				// Arrange
				aggregate.setExternalId('erp', 'ERP-001');

				// Act
				aggregate.setExternalId('erp', 'ERP-002');

				// Assert
				expect(aggregate.getExternalId('erp')).toBe('ERP-002');
			});

			it('设置外部ID后应标记为已更新', () => {
				// Arrange
				const beforeUpdatedAt = aggregate.updatedAt;

				// Act
				aggregate.setExternalId('crm', 'CRM-001');

				// Assert
				expect(aggregate.updatedAt.getTime()).toBeGreaterThanOrEqual(beforeUpdatedAt.getTime());
			});
		});

		describe('getExternalId', () => {
			it('应返回已设置的外部ID', () => {
				// Arrange
				aggregate.setExternalId('erp', 'ERP-001');

				// Act & Assert
				expect(aggregate.getExternalId('erp')).toBe('ERP-001');
			});

			it('未设置的系统的外部ID应返回undefined', () => {
				// Act & Assert
				expect(aggregate.getExternalId('unknown')).toBeUndefined();
			});
		});

		describe('removeExternalId', () => {
			it('应正确移除已设置的外部ID', () => {
				// Arrange
				aggregate.setExternalId('erp', 'ERP-001');

				// Act
				aggregate.removeExternalId('erp');

				// Assert
				expect(aggregate.getExternalId('erp')).toBeUndefined();
			});

			it('移除外部ID后应标记为已更新', () => {
				// Arrange
				aggregate.setExternalId('erp', 'ERP-001');
				const beforeUpdatedAt = aggregate.updatedAt;

				// Act
				aggregate.removeExternalId('erp');

				// Assert
				expect(aggregate.updatedAt.getTime()).toBeGreaterThanOrEqual(beforeUpdatedAt.getTime());
			});

			it('移除不存在的外部ID不应抛出错误', () => {
				// Act & Assert
				expect(() => aggregate.removeExternalId('unknown')).not.toThrow();
			});
		});

		describe('hasExternalId', () => {
			it('存在外部ID时应返回true', () => {
				// Arrange
				aggregate.setExternalId('erp', 'ERP-001');

				// Act & Assert
				expect(aggregate.hasExternalId('erp')).toBe(true);
			});

			it('不存在外部ID时应返回false', () => {
				// Act & Assert
				expect(aggregate.hasExternalId('unknown')).toBe(false);
			});
		});

		describe('setExternalIds', () => {
			it('应批量设置多个外部ID', () => {
				// Arrange
				const externalIds: ExternalIdMap = {
					erp: 'ERP-001',
					crm: 'CRM-001'
				};

				// Act
				aggregate.setExternalIds(externalIds);

				// Assert
				expect(aggregate.getExternalId('erp')).toBe('ERP-001');
				expect(aggregate.getExternalId('crm')).toBe('CRM-001');
			});

			it('批量设置时应保留现有外部ID', () => {
				// Arrange
				aggregate.setExternalId('existing', 'EXISTING-001');
				const newIds: ExternalIdMap = { erp: 'ERP-001' };

				// Act
				aggregate.setExternalIds(newIds);

				// Assert
				expect(aggregate.getExternalId('existing')).toBe('EXISTING-001');
				expect(aggregate.getExternalId('erp')).toBe('ERP-001');
			});

			it('批量设置后应标记为已更新', () => {
				// Arrange
				const beforeUpdatedAt = aggregate.updatedAt;

				// Act
				aggregate.setExternalIds({ erp: 'ERP-001' });

				// Assert
				expect(aggregate.updatedAt.getTime()).toBeGreaterThanOrEqual(beforeUpdatedAt.getTime());
			});
		});

		describe('externalIds getter', () => {
			it('应返回所有外部ID的副本', () => {
				// Arrange
				aggregate.setExternalId('erp', 'ERP-001');
				aggregate.setExternalId('crm', 'CRM-001');

				// Act
				const ids = aggregate.externalIds;

				// Assert
				expect(ids).toEqual({ erp: 'ERP-001', crm: 'CRM-001' });
			});

			it('返回的副本修改不应影响内部状态', () => {
				// Arrange
				aggregate.setExternalId('erp', 'ERP-001');
				const ids = aggregate.externalIds;

				// Act
				(ids as ExternalIdMap)['erp'] = 'MODIFIED';

				// Assert
				expect(aggregate.getExternalId('erp')).toBe('ERP-001');
			});
		});
	});

	describe('数据源管理', () => {
		describe('setDataSource', () => {
			it('应正确设置数据来源', () => {
				// Arrange & Act
				aggregate.setDataSource('external-system');

				// Assert
				expect(aggregate.dataSource).toBe('external-system');
			});

			it('设置数据来源后应标记为已更新', () => {
				// Arrange
				const beforeUpdatedAt = aggregate.updatedAt;

				// Act
				aggregate.setDataSource('external-system');

				// Assert
				expect(aggregate.updatedAt.getTime()).toBeGreaterThanOrEqual(beforeUpdatedAt.getTime());
			});
		});

		describe('dataSource getter', () => {
			it('未设置数据来源时应返回undefined', () => {
				// Act & Assert
				expect(aggregate.dataSource).toBeUndefined();
			});

			it('设置后应返回正确的数据来源', () => {
				// Arrange
				aggregate.setDataSource('data-warehouse');

				// Act & Assert
				expect(aggregate.dataSource).toBe('data-warehouse');
			});
		});
	});

	describe('同步状态管理', () => {
		describe('初始状态', () => {
			it('初始同步状态应为SYNCED', () => {
				// Act & Assert
				expect(aggregate.syncStatus).toBe(SyncStatus.SYNCED);
			});

			it('初始同步版本应为1', () => {
				// Act & Assert
				expect(aggregate.syncVersion).toBe(1);
			});

			it('初始最后同步时间应为undefined', () => {
				// Act & Assert
				expect(aggregate.lastSyncedAt).toBeUndefined();
			});
		});

		describe('markSyncRequired', () => {
			it('应将状态更改为PENDING', () => {
				// Act
				aggregate.markSyncRequired();

				// Assert
				expect(aggregate.syncStatus).toBe(SyncStatus.PENDING);
			});

			it('应递增同步版本', () => {
				// Arrange
				const initialVersion = aggregate.syncVersion;

				// Act
				aggregate.markSyncRequired();

				// Assert
				expect(aggregate.syncVersion).toBe(initialVersion + 1);
			});

			it('重复调用时版本应持续递增', () => {
				// Arrange
				const initialVersion = aggregate.syncVersion;

				// Act
				aggregate.markSyncRequired();
				aggregate.markSyncRequired();

				// Assert
				expect(aggregate.syncVersion).toBe(initialVersion + 2);
			});

			it('状态已为PENDING时重复调用不应递增版本', () => {
				// Arrange
				aggregate.markSyncRequired();
				const versionAfterFirst = aggregate.syncVersion;

				// Act
				aggregate.markSyncRequired();

				// Assert
				expect(aggregate.syncVersion).toBe(versionAfterFirst + 1);
			});

			it('应标记为已更新', () => {
				// Arrange
				const beforeUpdatedAt = aggregate.updatedAt;

				// Act
				aggregate.markSyncRequired();

				// Assert
				expect(aggregate.updatedAt.getTime()).toBeGreaterThanOrEqual(beforeUpdatedAt.getTime());
			});
		});

		describe('markSynced', () => {
			it('应将状态更改为SYNCED', () => {
				// Arrange
				aggregate.markSyncRequired();

				// Act
				aggregate.markSynced();

				// Assert
				expect(aggregate.syncStatus).toBe(SyncStatus.SYNCED);
			});

			it('应设置最后同步时间', () => {
				// Arrange
				const beforeSync = new Date();

				// Act
				aggregate.markSynced();

				// Assert
				expect(aggregate.lastSyncedAt).toBeDefined();
				expect(aggregate.lastSyncedAt!.getTime()).toBeGreaterThanOrEqual(beforeSync.getTime());
			});

			it('应标记为已更新', () => {
				// Arrange
				aggregate.markSyncRequired();
				const beforeUpdatedAt = aggregate.updatedAt;

				// Act
				aggregate.markSynced();

				// Assert
				expect(aggregate.updatedAt.getTime()).toBeGreaterThanOrEqual(beforeUpdatedAt.getTime());
			});
		});

		describe('markSyncFailed', () => {
			it('应将状态更改为FAILED', () => {
				// Act
				aggregate.markSyncFailed('连接超时');

				// Assert
				expect(aggregate.syncStatus).toBe(SyncStatus.FAILED);
			});

			it('应设置ETL元数据中的错误信息', () => {
				// Act
				aggregate.markSyncFailed('网络错误');

				// Assert
				expect(aggregate.etlMetadata?.errorMessage).toBe('网络错误');
			});

			it('应设置ETL元数据中的处理时间', () => {
				// Arrange
				const beforeMark = new Date();

				// Act
				aggregate.markSyncFailed('处理失败');

				// Assert
				expect(aggregate.etlMetadata?.processedAt).toBeDefined();
				expect(aggregate.etlMetadata!.processedAt!.getTime()).toBeGreaterThanOrEqual(beforeMark.getTime());
			});

			it('应标记为已更新', () => {
				// Arrange
				const beforeUpdatedAt = aggregate.updatedAt;

				// Act
				aggregate.markSyncFailed('错误');

				// Assert
				expect(aggregate.updatedAt.getTime()).toBeGreaterThanOrEqual(beforeUpdatedAt.getTime());
			});
		});

		describe('needsSync', () => {
			it('PENDING状态应返回true', () => {
				// Arrange
				aggregate.markSyncRequired();

				// Act & Assert
				expect(aggregate.needsSync()).toBe(true);
			});

			it('FAILED状态应返回true', () => {
				// Arrange
				aggregate.markSyncFailed('错误');

				// Act & Assert
				expect(aggregate.needsSync()).toBe(true);
			});

			it('SYNCED状态应返回false', () => {
				// Arrange
				aggregate.markSynced();

				// Act & Assert
				expect(aggregate.needsSync()).toBe(false);
			});
		});

		describe('syncStatus getter', () => {
			it('应返回当前同步状态', () => {
				// Arrange
				aggregate.markSyncRequired();

				// Act & Assert
				expect(aggregate.syncStatus).toBe(SyncStatus.PENDING);
			});
		});

		describe('lastSyncedAt getter', () => {
			it('未同步时应返回undefined', () => {
				// Act & Assert
				expect(aggregate.lastSyncedAt).toBeUndefined();
			});

			it('同步后应返回同步时间', () => {
				// Arrange
				aggregate.markSynced();

				// Act & Assert
				expect(aggregate.lastSyncedAt).toBeInstanceOf(Date);
			});
		});

		describe('syncVersion getter', () => {
			it('应返回当前同步版本', () => {
				// Arrange
				aggregate.markSyncRequired();
				aggregate.markSyncRequired();

				// Act & Assert
				expect(aggregate.syncVersion).toBe(3); // 初始1 + 2次递增
			});
		});
	});

	describe('ETL元数据管理', () => {
		describe('setETLMetadata', () => {
			it('应设置ETL元数据', () => {
				// Arrange
				const metadata: Partial<ETLMetadata> = {
					jobId: 'job-001',
					version: '1.0'
				};

				// Act
				aggregate.setETLMetadata(metadata);

				// Assert
				expect(aggregate.etlMetadata?.jobId).toBe('job-001');
				expect(aggregate.etlMetadata?.version).toBe('1.0');
			});

			it('应合并现有ETL元数据', () => {
				// Arrange
				aggregate.setETLMetadata({ jobId: 'job-001' });

				// Act
				aggregate.setETLMetadata({ version: '1.0' });

				// Assert
				expect(aggregate.etlMetadata?.jobId).toBe('job-001');
				expect(aggregate.etlMetadata?.version).toBe('1.0');
			});

			it('应标记为已更新', () => {
				// Arrange
				const beforeUpdatedAt = aggregate.updatedAt;

				// Act
				aggregate.setETLMetadata({ jobId: 'job-001' });

				// Assert
				expect(aggregate.updatedAt.getTime()).toBeGreaterThanOrEqual(beforeUpdatedAt.getTime());
			});

			it('应支持设置转换规则', () => {
				// Arrange
				const rules = ['rule1', 'rule2'];

				// Act
				aggregate.setETLMetadata({ transformRules: rules });

				// Assert
				expect(aggregate.etlMetadata?.transformRules).toEqual(rules);
			});

			it('应支持设置额外元数据', () => {
				// Arrange
				const extra = { customField: 'value' };

				// Act
				aggregate.setETLMetadata({ extra });

				// Assert
				expect(aggregate.etlMetadata?.extra).toEqual(extra);
			});
		});

		describe('etlMetadata getter', () => {
			it('未设置时应返回undefined', () => {
				// Act & Assert
				expect(aggregate.etlMetadata).toBeUndefined();
			});

			it('设置后应返回正确的元数据', () => {
				// Arrange
				aggregate.setETLMetadata({ jobId: 'job-001' });

				// Act & Assert
				expect(aggregate.etlMetadata?.jobId).toBe('job-001');
			});
		});
	});

	describe('信息获取', () => {
		describe('getSyncInfo', () => {
			it('应返回完整的同步信息', () => {
				// Arrange
				aggregate.setExternalId('erp', 'ERP-001');
				aggregate.setDataSource('external');
				aggregate.markSyncRequired();
				aggregate.setETLMetadata({ jobId: 'job-001' });

				// Act
				const info = aggregate.getSyncInfo();

				// Assert
				expect(info.externalIds).toEqual({ erp: 'ERP-001' });
				expect(info.dataSource).toBe('external');
				expect(info.syncStatus).toBe(SyncStatus.PENDING);
				expect(info.syncVersion).toBe(2);
				expect(info.etlMetadata?.jobId).toBe('job-001');
				expect(info.needsSync).toBe(true);
			});

			it('应返回外部ID的副本', () => {
				// Arrange
				aggregate.setExternalId('erp', 'ERP-001');

				// Act
				const info = aggregate.getSyncInfo();
				info.externalIds['new'] = 'NEW';

				// Assert
				expect(aggregate.getExternalId('new')).toBeUndefined();
			});

			it('同步成功后needsSync应为false', () => {
				// Arrange
				aggregate.markSyncRequired();
				aggregate.markSynced();

				// Act
				const info = aggregate.getSyncInfo();

				// Assert
				expect(info.needsSync).toBe(false);
				expect(info.lastSyncedAt).toBeDefined();
			});
		});
	});
});
