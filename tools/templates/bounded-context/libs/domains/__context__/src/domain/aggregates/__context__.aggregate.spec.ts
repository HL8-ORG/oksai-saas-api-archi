import { __CONTEXT__Aggregate } from './__context__.aggregate';

describe('__CONTEXT__Aggregate (模板)', () => {
	describe('工厂方法', () => {
		it('create 应创建聚合并记录事件', () => {
			const agg = __CONTEXT__Aggregate.create('x_1', 'NAME');

			expect(agg.id).toBe('x_1');
			expect(agg.name).toBe('NAME');
			expect(agg.hasUncommittedEvents()).toBe(true);
			expect(agg.getUncommittedEventCount()).toBe(1);

			const events = agg.getUncommittedEvents();
			expect(events[0]?.eventType).toBe('__CONTEXT__Created');
		});

		it('rehydrate 应从事件重建聚合', () => {
			const events = [
				{
					eventType: '__CONTEXT__Created',
					aggregateId: 'x_1',
					occurredAt: new Date('2024-01-01T00:00:00Z'),
					eventData: { name: 'NAME' },
					schemaVersion: 1
				}
			];

			const agg = __CONTEXT__Aggregate.rehydrate('x_1', events);

			expect(agg.id).toBe('x_1');
			expect(agg.name).toBe('NAME');
			expect(agg.hasUncommittedEvents()).toBe(false);
			expect(agg.getExpectedVersion()).toBe(1);
		});
	});

	describe('审计追踪', () => {
		it('应自动设置审计时间戳', () => {
			const agg = __CONTEXT__Aggregate.create('x_1', 'NAME');

			expect(agg.createdAt).toBeDefined();
			expect(agg.updatedAt).toBeDefined();
			expect(agg.createdAt).toEqual(agg.updatedAt);
		});

		it('setCreatedBy 应设置创建者', () => {
			const agg = __CONTEXT__Aggregate.create('x_1', 'NAME');
			agg.setCreatedBy('user-123');

			expect(agg.createdBy).toBe('user-123');
		});

		it('getAuditInfo 应返回完整审计信息', () => {
			const agg = __CONTEXT__Aggregate.create('x_1', 'NAME');
			agg.setCreatedBy('user-123');

			const auditInfo = agg.getAuditInfo();

			expect(auditInfo.createdAt).toBeDefined();
			expect(auditInfo.updatedAt).toBeDefined();
			expect(auditInfo.createdBy).toBe('user-123');
			expect(auditInfo.isDeleted).toBe(false);
		});
	});

	describe('软删除', () => {
		it('softDelete 应标记为已删除', () => {
			const agg = __CONTEXT__Aggregate.create('x_1', 'NAME');
			agg.softDelete('user-123');

			expect(agg.isDeleted()).toBe(true);
			expect(agg.deletedBy).toBe('user-123');
		});

		it('restore 应恢复已删除的聚合', () => {
			const agg = __CONTEXT__Aggregate.create('x_1', 'NAME');
			agg.softDelete('user-123');
			agg.restore();

			expect(agg.isDeleted()).toBe(false);
			expect(agg.deletedBy).toBeUndefined();
		});
	});

	describe('事件管理', () => {
		it('pullUncommittedEvents 应返回并清空事件', () => {
			const agg = __CONTEXT__Aggregate.create('x_1', 'NAME');
			const events = agg.pullUncommittedEvents();

			expect(events).toHaveLength(1);
			expect(agg.hasUncommittedEvents()).toBe(false);
			expect(agg.getExpectedVersion()).toBe(1);
		});
	});
});
