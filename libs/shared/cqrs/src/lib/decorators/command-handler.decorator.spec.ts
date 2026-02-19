import 'reflect-metadata';
import { CommandHandler } from './command-handler.decorator';
import { OKSAI_COMMAND_HANDLER_METADATA } from './metadata.constants';

describe('CommandHandler', () => {
	it('应该在类上设置命令处理器元数据', () => {
		@CommandHandler('CreateUser')
		class CreateUserHandler {}

		const metadata = Reflect.getMetadata(OKSAI_COMMAND_HANDLER_METADATA, CreateUserHandler);

		expect(metadata).toBe('CreateUser');
	});

	it('应该支持不同的命令类型', () => {
		@CommandHandler('UpdateUser')
		class UpdateUserHandler {}

		@CommandHandler('DeleteUser')
		class DeleteUserHandler {}

		const updateMetadata = Reflect.getMetadata(OKSAI_COMMAND_HANDLER_METADATA, UpdateUserHandler);
		const deleteMetadata = Reflect.getMetadata(OKSAI_COMMAND_HANDLER_METADATA, DeleteUserHandler);

		expect(updateMetadata).toBe('UpdateUser');
		expect(deleteMetadata).toBe('DeleteUser');
	});

	it('应该返回类装饰器', () => {
		const decorator = CommandHandler('CreateTenant');

		expect(typeof decorator).toBe('function');
	});

	it('应该能够与类继承一起使用', () => {
		abstract class BaseHandler {}

		@CommandHandler('CreateOrder')
		class CreateOrderHandler extends BaseHandler {}

		const metadata = Reflect.getMetadata(OKSAI_COMMAND_HANDLER_METADATA, CreateOrderHandler);

		expect(metadata).toBe('CreateOrder');
		expect(CreateOrderHandler.prototype).toBeInstanceOf(BaseHandler);
	});

	it('应该支持包含命名空间的命令类型', () => {
		@CommandHandler('tenant:create')
		class CreateTenantHandler {}

		const metadata = Reflect.getMetadata(OKSAI_COMMAND_HANDLER_METADATA, CreateTenantHandler);

		expect(metadata).toBe('tenant:create');
	});

	it('不同类上的相同命令类型应该各自保留元数据', () => {
		@CommandHandler('ProcessPayment')
		class PaymentHandlerV1 {}

		@CommandHandler('ProcessPayment')
		class PaymentHandlerV2 {}

		const metadataV1 = Reflect.getMetadata(OKSAI_COMMAND_HANDLER_METADATA, PaymentHandlerV1);
		const metadataV2 = Reflect.getMetadata(OKSAI_COMMAND_HANDLER_METADATA, PaymentHandlerV2);

		expect(metadataV1).toBe('ProcessPayment');
		expect(metadataV2).toBe('ProcessPayment');
	});
});
