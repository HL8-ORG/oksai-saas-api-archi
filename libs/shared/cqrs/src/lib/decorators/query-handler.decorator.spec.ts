import 'reflect-metadata';
import { QueryHandler } from './query-handler.decorator';
import { OKSAI_QUERY_HANDLER_METADATA } from './metadata.constants';

describe('QueryHandler', () => {
	it('应该在类上设置查询处理器元数据', () => {
		@QueryHandler('GetUser')
		class GetUserHandler {}

		const metadata = Reflect.getMetadata(OKSAI_QUERY_HANDLER_METADATA, GetUserHandler);

		expect(metadata).toBe('GetUser');
	});

	it('应该支持不同的查询类型', () => {
		@QueryHandler('ListUsers')
		class ListUsersHandler {}

		@QueryHandler('SearchUsers')
		class SearchUsersHandler {}

		const listMetadata = Reflect.getMetadata(OKSAI_QUERY_HANDLER_METADATA, ListUsersHandler);
		const searchMetadata = Reflect.getMetadata(OKSAI_QUERY_HANDLER_METADATA, SearchUsersHandler);

		expect(listMetadata).toBe('ListUsers');
		expect(searchMetadata).toBe('SearchUsers');
	});

	it('应该返回类装饰器', () => {
		const decorator = QueryHandler('GetTenant');

		expect(typeof decorator).toBe('function');
	});

	it('应该能够与类继承一起使用', () => {
		abstract class BaseQueryHandler {}

		@QueryHandler('GetOrder')
		class GetOrderHandler extends BaseQueryHandler {}

		const metadata = Reflect.getMetadata(OKSAI_QUERY_HANDLER_METADATA, GetOrderHandler);

		expect(metadata).toBe('GetOrder');
		expect(GetOrderHandler.prototype).toBeInstanceOf(BaseQueryHandler);
	});

	it('应该支持包含命名空间的查询类型', () => {
		@QueryHandler('tenant:get')
		class GetTenantHandler {}

		const metadata = Reflect.getMetadata(OKSAI_QUERY_HANDLER_METADATA, GetTenantHandler);

		expect(metadata).toBe('tenant:get');
	});

	it('不同类上的相同查询类型应该各自保留元数据', () => {
		@QueryHandler('GetMetrics')
		class MetricsHandlerV1 {}

		@QueryHandler('GetMetrics')
		class MetricsHandlerV2 {}

		const metadataV1 = Reflect.getMetadata(OKSAI_QUERY_HANDLER_METADATA, MetricsHandlerV1);
		const metadataV2 = Reflect.getMetadata(OKSAI_QUERY_HANDLER_METADATA, MetricsHandlerV2);

		expect(metadataV1).toBe('GetMetrics');
		expect(metadataV2).toBe('GetMetrics');
	});

	it('应该与 CommandHandler 使用不同的元数据 key', () => {
		@QueryHandler('ProcessItem')
		class QueryProcessor {}

		const queryMetadata = Reflect.getMetadata(OKSAI_QUERY_HANDLER_METADATA, QueryProcessor);
		const commandMetadata = Reflect.getMetadata('oksai:cqrs:commandHandler', QueryProcessor);

		expect(queryMetadata).toBe('ProcessItem');
		expect(commandMetadata).toBeUndefined();
	});
});
