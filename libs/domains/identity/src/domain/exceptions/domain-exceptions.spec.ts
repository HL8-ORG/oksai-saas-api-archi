import {
	DomainException,
	InvalidEmailException,
	InvalidUserIdException,
	InvalidTenantIdException,
	UserCannotBeDisabledException,
	UserAlreadyHasRoleException,
	UserNotEligibleForRoleException,
	InactiveUserException,
	CannotDisableTenantOwnerException,
	CannotRemoveLastRoleException,
	UserNotFoundException,
	TenantMemberAlreadyExistsException,
	InvalidRoleKeyException
} from './domain-exceptions';

describe('DomainException', () => {
	describe('基础领域异常', () => {
		it('应正确设置 name 属性', () => {
			class TestException extends DomainException {
				constructor(message: string) {
					super(message);
				}
			}

			const exception = new TestException('测试异常');

			expect(exception.name).toBe('TestException');
			expect(exception.message).toBe('测试异常');
		});

		it('应继承自 Error', () => {
			class TestException extends DomainException {
				constructor(message: string) {
					super(message);
				}
			}

			const exception = new TestException('测试异常');

			expect(exception).toBeInstanceOf(Error);
			expect(exception).toBeInstanceOf(DomainException);
		});
	});
});

describe('InvalidEmailException', () => {
	it('应创建带有正确消息的异常', () => {
		const exception = new InvalidEmailException('格式不正确');

		expect(exception.name).toBe('InvalidEmailException');
		expect(exception.message).toBe('邮箱无效：格式不正确');
	});

	it('应继承自 DomainException', () => {
		const exception = new InvalidEmailException('测试');

		expect(exception).toBeInstanceOf(DomainException);
		expect(exception).toBeInstanceOf(Error);
	});
});

describe('InvalidUserIdException', () => {
	it('应创建带有正确消息的异常', () => {
		const exception = new InvalidUserIdException('不能为空');

		expect(exception.name).toBe('InvalidUserIdException');
		expect(exception.message).toBe('用户 ID 无效：不能为空');
	});

	it('应继承自 DomainException', () => {
		const exception = new InvalidUserIdException('测试');

		expect(exception).toBeInstanceOf(DomainException);
	});
});

describe('InvalidTenantIdException', () => {
	it('应创建带有正确消息的异常', () => {
		const exception = new InvalidTenantIdException('格式不正确');

		expect(exception.name).toBe('InvalidTenantIdException');
		expect(exception.message).toBe('租户 ID 无效：格式不正确');
	});

	it('应继承自 DomainException', () => {
		const exception = new InvalidTenantIdException('测试');

		expect(exception).toBeInstanceOf(DomainException);
	});
});

describe('UserCannotBeDisabledException', () => {
	it('应创建带有正确消息和属性的异常', () => {
		const exception = new UserCannotBeDisabledException('user-123', '用户是管理员');

		expect(exception.name).toBe('UserCannotBeDisabledException');
		expect(exception.message).toBe('无法禁用用户 user-123：用户是管理员');
		expect(exception.userId).toBe('user-123');
	});

	it('应继承自 DomainException', () => {
		const exception = new UserCannotBeDisabledException('user-123', '测试');

		expect(exception).toBeInstanceOf(DomainException);
	});
});

describe('UserAlreadyHasRoleException', () => {
	it('应创建带有正确消息和属性的异常', () => {
		const exception = new UserAlreadyHasRoleException('user-123', 'TenantAdmin');

		expect(exception.name).toBe('UserAlreadyHasRoleException');
		expect(exception.message).toBe('用户 user-123 已拥有角色 TenantAdmin');
		expect(exception.userId).toBe('user-123');
		expect(exception.roleKey).toBe('TenantAdmin');
	});

	it('应继承自 DomainException', () => {
		const exception = new UserAlreadyHasRoleException('user-123', 'Role');

		expect(exception).toBeInstanceOf(DomainException);
	});
});

describe('UserNotEligibleForRoleException', () => {
	it('应创建带有正确消息和属性的异常', () => {
		const exception = new UserNotEligibleForRoleException('user-123', 'PlatformAdmin');

		expect(exception.name).toBe('UserNotEligibleForRoleException');
		expect(exception.message).toBe('用户 user-123 不满足分配角色 PlatformAdmin 的条件');
		expect(exception.userId).toBe('user-123');
		expect(exception.roleKey).toBe('PlatformAdmin');
	});

	it('应继承自 DomainException', () => {
		const exception = new UserNotEligibleForRoleException('user-123', 'Role');

		expect(exception).toBeInstanceOf(DomainException);
	});
});

describe('InactiveUserException', () => {
	it('应创建带有正确消息的异常', () => {
		const exception = new InactiveUserException('授予角色');

		expect(exception.name).toBe('InactiveUserException');
		expect(exception.message).toBe('已禁用的用户无法执行操作：授予角色');
	});

	it('应继承自 DomainException', () => {
		const exception = new InactiveUserException('测试');

		expect(exception).toBeInstanceOf(DomainException);
	});
});

describe('CannotDisableTenantOwnerException', () => {
	it('应创建带有正确消息和属性的异常', () => {
		const exception = new CannotDisableTenantOwnerException('user-123', 'tenant-456');

		expect(exception.name).toBe('CannotDisableTenantOwnerException');
		expect(exception.message).toBe('无法禁用租户 tenant-456 的所有者 user-123');
		expect(exception.userId).toBe('user-123');
		expect(exception.tenantId).toBe('tenant-456');
	});

	it('应继承自 DomainException', () => {
		const exception = new CannotDisableTenantOwnerException('user-123', 'tenant-456');

		expect(exception).toBeInstanceOf(DomainException);
	});
});

describe('CannotRemoveLastRoleException', () => {
	it('应创建带有正确消息和属性的异常', () => {
		const exception = new CannotRemoveLastRoleException('user-123');

		expect(exception.name).toBe('CannotRemoveLastRoleException');
		expect(exception.message).toBe('无法移除用户 user-123 的最后一个角色，用户必须至少有一个角色');
		expect(exception.userId).toBe('user-123');
	});

	it('应继承自 DomainException', () => {
		const exception = new CannotRemoveLastRoleException('user-123');

		expect(exception).toBeInstanceOf(DomainException);
	});
});

describe('UserNotFoundException', () => {
	it('应创建带有正确消息和属性的异常', () => {
		const exception = new UserNotFoundException('user-123');

		expect(exception.name).toBe('UserNotFoundException');
		expect(exception.message).toBe('未找到用户：user-123');
		expect(exception.userId).toBe('user-123');
	});

	it('应继承自 DomainException', () => {
		const exception = new UserNotFoundException('user-123');

		expect(exception).toBeInstanceOf(DomainException);
	});
});

describe('TenantMemberAlreadyExistsException', () => {
	it('应创建带有正确消息和属性的异常', () => {
		const exception = new TenantMemberAlreadyExistsException('tenant-123', 'user-456');

		expect(exception.name).toBe('TenantMemberAlreadyExistsException');
		expect(exception.message).toBe('用户 user-456 已是租户 tenant-123 的成员');
		expect(exception.tenantId).toBe('tenant-123');
		expect(exception.userId).toBe('user-456');
	});

	it('应继承自 DomainException', () => {
		const exception = new TenantMemberAlreadyExistsException('tenant-123', 'user-456');

		expect(exception).toBeInstanceOf(DomainException);
	});
});

describe('InvalidRoleKeyException', () => {
	it('应创建带有正确消息的异常', () => {
		const exception = new InvalidRoleKeyException('不能为空');

		expect(exception.name).toBe('InvalidRoleKeyException');
		expect(exception.message).toBe('角色键无效：不能为空');
	});

	it('应继承自 DomainException', () => {
		const exception = new InvalidRoleKeyException('测试');

		expect(exception).toBeInstanceOf(DomainException);
	});
});

describe('异常捕获和处理', () => {
	it('可以使用 instanceof 检查异常类型', () => {
		const throwException = () => {
			throw new InvalidEmailException('格式不正确');
		};

		expect(throwException).toThrow(InvalidEmailException);
		expect(throwException).toThrow(Error);
	});

	it('可以捕获并检查异常属性', () => {
		try {
			throw new UserAlreadyHasRoleException('user-123', 'TenantAdmin');
		} catch (error) {
			expect(error).toBeInstanceOf(UserAlreadyHasRoleException);
			if (error instanceof UserAlreadyHasRoleException) {
				expect(error.userId).toBe('user-123');
				expect(error.roleKey).toBe('TenantAdmin');
			}
		}
	});
});
