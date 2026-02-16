import { TenantRequired, TenantOptional, OKSAI_TENANT_REQUIRED_METADATA_KEY } from './tenant-required.decorator';
import { SetMetadata } from '@nestjs/common';

jest.mock('@nestjs/common', () => ({
	...jest.requireActual('@nestjs/common'),
	SetMetadata: jest.fn(() => () => undefined)
}));

describe('TenantRequired Decorator', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('应该调用 SetMetadata 设置租户必需标记为 true', () => {
		TenantRequired();

		expect(SetMetadata).toHaveBeenCalledWith(OKSAI_TENANT_REQUIRED_METADATA_KEY as any, true);
	});

	it('应该返回一个装饰器函数', () => {
		const decorator = TenantRequired();
		expect(typeof decorator).toBe('function');
	});

	it('OKSAI_TENANT_REQUIRED_METADATA_KEY 应该是一个 Symbol', () => {
		expect(typeof OKSAI_TENANT_REQUIRED_METADATA_KEY).toBe('symbol');
	});
});

describe('TenantOptional Decorator', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('应该调用 SetMetadata 设置租户必需标记为 false', () => {
		TenantOptional();

		expect(SetMetadata).toHaveBeenCalledWith(OKSAI_TENANT_REQUIRED_METADATA_KEY as any, false);
	});

	it('应该返回一个装饰器函数', () => {
		const decorator = TenantOptional();
		expect(typeof decorator).toBe('function');
	});
});

describe('OKSAI_TENANT_REQUIRED_METADATA_KEY', () => {
	it('应该是一个唯一的 Symbol', () => {
		const key1 = Symbol.for('oksai:context:tenantRequired');
		const key2 = OKSAI_TENANT_REQUIRED_METADATA_KEY;

		expect(key1).toBe(key2);
	});
});
