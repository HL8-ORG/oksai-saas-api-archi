import { makeTenantSubject } from './subjects';

describe('subjects', () => {
	describe('makeTenantSubject', () => {
		it('应创建带有 tenantId 的 Tenant subject 实例', () => {
			// Arrange
			const tenantId = 'tenant-123';

			// Act
			const subject = makeTenantSubject(tenantId);

			// Assert
			expect(subject.__caslSubjectType__).toBe('Tenant');
			expect(subject.tenantId).toBe(tenantId);
		});

		it('不同 tenantId 应创建不同的 subject', () => {
			// Arrange
			const tenantId1 = 'tenant-111';
			const tenantId2 = 'tenant-222';

			// Act
			const subject1 = makeTenantSubject(tenantId1);
			const subject2 = makeTenantSubject(tenantId2);

			// Assert
			expect(subject1.tenantId).toBe(tenantId1);
			expect(subject2.tenantId).toBe(tenantId2);
			expect(subject1).not.toEqual(subject2);
		});

		it('返回的 subject 应包含 CASL 必需的 __caslSubjectType__ 字段', () => {
			// Arrange
			const tenantId = 'tenant-456';

			// Act
			const subject = makeTenantSubject(tenantId);

			// Assert
			expect(subject).toHaveProperty('__caslSubjectType__');
			expect(subject.__caslSubjectType__).toBe('Tenant');
		});

		it('返回的对象结构应符合 CASL ForcedSubject 规范', () => {
			// Arrange
			const tenantId = 'tenant-789';

			// Act
			const subject = makeTenantSubject(tenantId);

			// Assert
			expect(Object.keys(subject)).toContain('__caslSubjectType__');
			expect(Object.keys(subject)).toContain('tenantId');
			expect(Object.keys(subject)).toHaveLength(2);
		});
	});
});
