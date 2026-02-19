import { TenantAggregate } from './tenant.aggregate';
import { TenantId } from '../value-objects/tenant-id.value-object';
import { TenantName } from '../value-objects/tenant-name.value-object';
import { TenantSettings } from '../value-objects/tenant-settings.value-object';
import { TenantCreatedEvent } from '../events/tenant-created.event';

describe('TenantAggregate 聚合根', () => {
	// 测试辅助函数
	const createTestTenant = (
		id: string = 't-001',
		name: string = '测试租户',
		maxMembers: number = 10
	): TenantAggregate => {
		return TenantAggregate.create(TenantId.of(id), TenantName.of(name), TenantSettings.of({ maxMembers }));
	};

	describe('create 工厂方法', () => {
		it('应该创建租户聚合根', () => {
			// Arrange
			const tenantId = TenantId.of('t-001');
			const tenantName = TenantName.of('测试租户');
			const settings = TenantSettings.of({ maxMembers: 10 });

			// Act
			const tenant = TenantAggregate.create(tenantId, tenantName, settings);

			// Assert
			expect(tenant).toBeDefined();
			expect(tenant.id.getValue()).toBe('t-001');
			expect(tenant.name.getValue()).toBe('测试租户');
			expect(tenant.settings.getMaxMembers()).toBe(10);
		});

		it('创建时应该触发 TenantCreatedEvent', () => {
			// Arrange
			const tenantId = TenantId.of('t-001');
			const tenantName = TenantName.of('测试租户');
			const settings = TenantSettings.default();

			// Act
			const tenant = TenantAggregate.create(tenantId, tenantName, settings);

			// Assert
			const events = tenant.getUncommittedEvents();
			expect(events.length).toBe(1);
			expect(events[0].eventType).toBe('TenantCreated');
			expect(events[0]).toBeInstanceOf(TenantCreatedEvent);
		});

		it('创建时应该初始化审计时间戳', () => {
			// Arrange & Act
			const tenant = createTestTenant();

			// Assert
			expect(tenant.createdAt).toBeDefined();
			expect(tenant.updatedAt).toBeDefined();
			expect(tenant.createdAt).toBeInstanceOf(Date);
			expect(tenant.updatedAt).toBeInstanceOf(Date);
		});

		it('新创建的租户应该没有成员', () => {
			// Arrange & Act
			const tenant = createTestTenant();

			// Assert
			expect(tenant.getMemberCount()).toBe(0);
			expect(tenant.getMembers()).toEqual([]);
		});
	});

	describe('rehydrate 工厂方法', () => {
		it('应该从创建事件重建租户', () => {
			// Arrange
			const tenantId = TenantId.of('t-001');
			const createdEvent = new TenantCreatedEvent('t-001', { name: '重建租户' });

			// Act
			const tenant = TenantAggregate.rehydrate(tenantId, [createdEvent]);

			// Assert
			expect(tenant.name.getValue()).toBe('重建租户');
		});

		it('重建后不应该有未提交事件', () => {
			// Arrange
			const tenantId = TenantId.of('t-001');
			const createdEvent = new TenantCreatedEvent('t-001', { name: '重建租户' });

			// Act
			const tenant = TenantAggregate.rehydrate(tenantId, [createdEvent]);

			// Assert
			expect(tenant.hasUncommittedEvents()).toBe(false);
		});

		it('缺少创建事件时应该抛出异常', () => {
			// Arrange
			const tenantId = TenantId.of('t-001');

			// Act & Assert
			expect(() => TenantAggregate.rehydrate(tenantId, [])).toThrow();
		});

		it('应该正确设置版本号', () => {
			// Arrange
			const tenantId = TenantId.of('t-001');
			const createdEvent = new TenantCreatedEvent('t-001', { name: '重建租户' });

			// Act
			const tenant = TenantAggregate.rehydrate(tenantId, [createdEvent]);

			// Assert
			expect(tenant.getExpectedVersion()).toBe(1);
		});
	});

	describe('addMember 方法', () => {
		it('应该成功添加成员', () => {
			// Arrange
			const tenant = createTestTenant();

			// Act
			tenant.addMember('user-001');

			// Assert
			expect(tenant.getMemberCount()).toBe(1);
			expect(tenant.hasMember('user-001')).toBe(true);
		});

		it('添加成员后应该更新时间戳', () => {
			// Arrange
			const tenant = createTestTenant();
			const originalUpdatedAt = tenant.updatedAt;

			// 等待一小段时间确保时间戳不同
			const wait = new Promise((resolve) => setTimeout(resolve, 10));
			return wait.then(() => {
				// Act
				tenant.addMember('user-001');

				// Assert
				expect(tenant.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
			});
		});

		it('重复添加相同成员应该幂等处理', () => {
			// Arrange
			const tenant = createTestTenant();

			// Act
			tenant.addMember('user-001');
			tenant.addMember('user-001');

			// Assert
			expect(tenant.getMemberCount()).toBe(1);
		});

		it('空 userId 应该抛出异常', () => {
			// Arrange
			const tenant = createTestTenant();

			// Act & Assert
			expect(() => tenant.addMember('')).toThrow();
		});

		it('null userId 应该抛出异常', () => {
			// Arrange
			const tenant = createTestTenant();

			// Act & Assert
			expect(() => tenant.addMember(null as unknown as string)).toThrow();
		});

		it('应该去除 userId 前后空格', () => {
			// Arrange
			const tenant = createTestTenant();

			// Act
			tenant.addMember('  user-001  ');

			// Assert
			expect(tenant.hasMember('user-001')).toBe(true);
		});

		it('超过成员上限时应该抛出异常', () => {
			// Arrange
			const tenant = createTestTenant('t-001', '测试租户', 2);
			tenant.addMember('user-001');
			tenant.addMember('user-002');

			// Act & Assert
			expect(() => tenant.addMember('user-003')).toThrow();
		});

		it('异常消息应该包含当前成员数和上限', () => {
			// Arrange
			const tenant = createTestTenant('t-001', '测试租户', 2);
			tenant.addMember('user-001');
			tenant.addMember('user-002');

			// Act & Assert
			expect(() => tenant.addMember('user-003')).toThrow('当前：2，上限：2');
		});
	});

	describe('removeMember 方法', () => {
		it('应该成功移除成员', () => {
			// Arrange
			const tenant = createTestTenant();
			tenant.addMember('user-001');

			// Act
			tenant.removeMember('user-001');

			// Assert
			expect(tenant.getMemberCount()).toBe(0);
			expect(tenant.hasMember('user-001')).toBe(false);
		});

		it('移除成员后应该更新时间戳', () => {
			// Arrange
			const tenant = createTestTenant();
			tenant.addMember('user-001');
			const originalUpdatedAt = tenant.updatedAt;

			// 等待一小段时间确保时间戳不同
			const wait = new Promise((resolve) => setTimeout(resolve, 10));
			return wait.then(() => {
				// Act
				tenant.removeMember('user-001');

				// Assert
				expect(tenant.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
			});
		});

		it('移除不存在的成员应该无操作', () => {
			// Arrange
			const tenant = createTestTenant();
			tenant.addMember('user-001');

			// Act
			tenant.removeMember('user-999');

			// Assert
			expect(tenant.getMemberCount()).toBe(1);
		});

		it('空 userId 应该抛出异常', () => {
			// Arrange
			const tenant = createTestTenant();

			// Act & Assert
			expect(() => tenant.removeMember('')).toThrow();
		});

		it('null userId 应该抛出异常', () => {
			// Arrange
			const tenant = createTestTenant();

			// Act & Assert
			expect(() => tenant.removeMember(null as unknown as string)).toThrow();
		});

		it('应该去除 userId 前后空格', () => {
			// Arrange
			const tenant = createTestTenant();
			tenant.addMember('user-001');

			// Act
			tenant.removeMember('  user-001  ');

			// Assert
			expect(tenant.hasMember('user-001')).toBe(false);
		});
	});

	describe('updateName 方法', () => {
		it('应该成功更新名称', async () => {
			// Arrange
			const tenant = createTestTenant();
			const newName = TenantName.of('新名称');

			// Act
			await tenant.updateName(newName);

			// Assert
			expect(tenant.name.getValue()).toBe('新名称');
		});

		it('更新名称后应该更新时间戳', async () => {
			// Arrange
			const tenant = createTestTenant();
			const originalUpdatedAt = tenant.updatedAt;
			const newName = TenantName.of('新名称');

			// 等待一小段时间确保时间戳不同
			await new Promise((resolve) => setTimeout(resolve, 10));

			// Act
			await tenant.updateName(newName);

			// Assert
			expect(tenant.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
		});

		it('设置相同名称应该无操作', async () => {
			// Arrange
			const tenant = createTestTenant('t-001', '测试租户');
			const originalUpdatedAt = tenant.updatedAt;
			const sameName = TenantName.of('测试租户');

			// 等待一小段时间
			await new Promise((resolve) => setTimeout(resolve, 10));

			// Act
			await tenant.updateName(sameName);

			// Assert
			expect(tenant.updatedAt).toEqual(originalUpdatedAt);
		});
	});

	describe('updateSettings 方法', () => {
		it('应该成功更新配置', () => {
			// Arrange
			const tenant = createTestTenant();
			const newSettings = TenantSettings.of({ maxMembers: 100 });

			// Act
			tenant.updateSettings(newSettings);

			// Assert
			expect(tenant.settings.getMaxMembers()).toBe(100);
		});

		it('更新配置后应该更新时间戳', () => {
			// Arrange
			const tenant = createTestTenant();
			const originalUpdatedAt = tenant.updatedAt;
			const newSettings = TenantSettings.of({ maxMembers: 100 });

			// 等待一小段时间确保时间戳不同
			const wait = new Promise((resolve) => setTimeout(resolve, 10));
			return wait.then(() => {
				// Act
				tenant.updateSettings(newSettings);

				// Assert
				expect(tenant.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
			});
		});

		it('设置相同配置应该无操作', () => {
			// Arrange
			const tenant = createTestTenant('t-001', '测试租户', 10);
			const originalUpdatedAt = tenant.updatedAt;
			const sameSettings = TenantSettings.of({ maxMembers: 10 });

			// 等待一小段时间
			const wait = new Promise((resolve) => setTimeout(resolve, 10));
			return wait.then(() => {
				// Act
				tenant.updateSettings(sameSettings);

				// Assert
				expect(tenant.updatedAt).toEqual(originalUpdatedAt);
			});
		});

		it('新上限小于当前成员数时应该抛出异常', () => {
			// Arrange
			const tenant = createTestTenant('t-001', '测试租户', 10);
			tenant.addMember('user-001');
			tenant.addMember('user-002');
			tenant.addMember('user-003');
			const newSettings = TenantSettings.of({ maxMembers: 2 });

			// Act & Assert
			expect(() => tenant.updateSettings(newSettings)).toThrow();
		});

		it('新上限等于当前成员数时应该成功', () => {
			// Arrange
			const tenant = createTestTenant('t-001', '测试租户', 10);
			tenant.addMember('user-001');
			tenant.addMember('user-002');
			const newSettings = TenantSettings.of({ maxMembers: 2 });

			// Act & Assert
			expect(() => tenant.updateSettings(newSettings)).not.toThrow();
			expect(tenant.settings.getMaxMembers()).toBe(2);
		});
	});

	describe('hasMember 方法', () => {
		it('成员存在时应该返回 true', () => {
			// Arrange
			const tenant = createTestTenant();
			tenant.addMember('user-001');

			// Act & Assert
			expect(tenant.hasMember('user-001')).toBe(true);
		});

		it('成员不存在时应该返回 false', () => {
			// Arrange
			const tenant = createTestTenant();

			// Act & Assert
			expect(tenant.hasMember('user-001')).toBe(false);
		});
	});

	describe('getMemberCount 方法', () => {
		it('应该返回正确的成员数量', () => {
			// Arrange
			const tenant = createTestTenant();
			tenant.addMember('user-001');
			tenant.addMember('user-002');
			tenant.addMember('user-003');

			// Act & Assert
			expect(tenant.getMemberCount()).toBe(3);
		});

		it('添加重复成员不应该增加计数', () => {
			// Arrange
			const tenant = createTestTenant();
			tenant.addMember('user-001');
			tenant.addMember('user-001');

			// Act & Assert
			expect(tenant.getMemberCount()).toBe(1);
		});

		it('移除成员后应该减少计数', () => {
			// Arrange
			const tenant = createTestTenant();
			tenant.addMember('user-001');
			tenant.addMember('user-002');
			tenant.removeMember('user-001');

			// Act & Assert
			expect(tenant.getMemberCount()).toBe(1);
		});
	});

	describe('getMembers 方法', () => {
		it('应该返回所有成员的 userId 列表', () => {
			// Arrange
			const tenant = createTestTenant();
			tenant.addMember('user-001');
			tenant.addMember('user-002');

			// Act
			const members = tenant.getMembers();

			// Assert
			expect(members).toEqual(['user-001', 'user-002']);
		});

		it('没有成员时应该返回空数组', () => {
			// Arrange
			const tenant = createTestTenant();

			// Act
			const members = tenant.getMembers();

			// Assert
			expect(members).toEqual([]);
		});
	});

	describe('领域事件管理', () => {
		it('getUncommittedEvents 应该返回未提交事件', () => {
			// Arrange
			const tenant = createTestTenant();

			// Act
			const events = tenant.getUncommittedEvents();

			// Assert
			expect(events.length).toBeGreaterThan(0);
		});

		it('commitUncommittedEvents 应该清空事件并更新版本', () => {
			// Arrange
			const tenant = createTestTenant();
			const versionBefore = tenant.getExpectedVersion();

			// Act
			tenant.commitUncommittedEvents();

			// Assert
			expect(tenant.hasUncommittedEvents()).toBe(false);
			expect(tenant.getExpectedVersion()).toBeGreaterThan(versionBefore);
		});

		it('pullUncommittedEvents 应该返回并清空事件', () => {
			// Arrange
			const tenant = createTestTenant();

			// Act
			const events = tenant.pullUncommittedEvents();

			// Assert
			expect(events.length).toBeGreaterThan(0);
			expect(tenant.hasUncommittedEvents()).toBe(false);
		});
	});

	describe('Getters', () => {
		it('id getter 应该返回 TenantId', () => {
			// Arrange
			const tenantId = TenantId.of('t-001');
			const tenant = TenantAggregate.create(tenantId, TenantName.of('测试租户'), TenantSettings.default());

			// Act & Assert
			expect(tenant.id).toBe(tenantId);
		});

		it('name getter 应该返回 TenantName', () => {
			// Arrange
			const tenantName = TenantName.of('测试租户');
			const tenant = TenantAggregate.create(TenantId.of('t-001'), tenantName, TenantSettings.default());

			// Act & Assert
			expect(tenant.name).toBe(tenantName);
		});

		it('settings getter 应该返回 TenantSettings', () => {
			// Arrange
			const settings = TenantSettings.of({ maxMembers: 100 });
			const tenant = TenantAggregate.create(TenantId.of('t-001'), TenantName.of('测试租户'), settings);

			// Act & Assert
			expect(tenant.settings).toBe(settings);
		});
	});
});
