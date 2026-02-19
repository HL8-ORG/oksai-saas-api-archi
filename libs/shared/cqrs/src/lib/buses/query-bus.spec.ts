import { QueryBus } from './query-bus';
import type { IQuery, IQueryHandler } from '../interfaces';

describe('QueryBus', () => {
	let queryBus: QueryBus;

	beforeEach(() => {
		queryBus = new QueryBus();
	});

	describe('register', () => {
		it('应该成功注册查询处理器', () => {
			const handler: IQueryHandler = {
				execute: jest.fn()
			};

			queryBus.register('GetUser', handler);

			expect(queryBus['handlers'].has('GetUser')).toBe(true);
		});

		it('当重复注册同一查询类型时应该抛出错误', () => {
			const handler: IQueryHandler = {
				execute: jest.fn()
			};

			queryBus.register('GetUser', handler);

			expect(() => {
				queryBus.register('GetUser', handler);
			}).toThrow('查询处理器重复注册：queryType=GetUser。');
		});
	});

	describe('execute', () => {
		interface IGetUserQuery extends IQuery {
			type: 'GetUser';
			userId: string;
		}

		it('应该成功执行查询并返回结果', async () => {
			const expectedResult = { id: 'user-123', name: 'Test User' };
			const handler: IQueryHandler<IGetUserQuery> = {
				execute: jest.fn().mockResolvedValue(expectedResult)
			};

			queryBus.register('GetUser', handler);

			const query: IGetUserQuery = {
				type: 'GetUser',
				userId: 'user-123'
			};

			const result = await queryBus.execute(query);

			expect(result).toEqual(expectedResult);
			expect(handler.execute).toHaveBeenCalledWith(query);
		});

		it('当未找到处理器时应该抛出错误', async () => {
			const query: IGetUserQuery = {
				type: 'GetUser',
				userId: 'user-123'
			};

			await expect(queryBus.execute(query)).rejects.toThrow('未找到查询处理器：queryType=GetUser。');
		});

		it('应该支持泛型返回类型', async () => {
			interface UserDto {
				id: string;
				name: string;
				email: string;
			}

			const expectedUser: UserDto = {
				id: 'user-123',
				name: 'Test User',
				email: 'test@example.com'
			};

			const handler: IQueryHandler<IGetUserQuery, UserDto> = {
				execute: jest.fn().mockResolvedValue(expectedUser)
			};

			queryBus.register('GetUser', handler);

			const query: IGetUserQuery = { type: 'GetUser', userId: 'user-123' };
			const result = await queryBus.execute<UserDto>(query);

			expect(result).toEqual(expectedUser);
		});

		it('应该正确处理返回 null 的查询', async () => {
			const handler: IQueryHandler<IGetUserQuery, null> = {
				execute: jest.fn().mockResolvedValue(null)
			};

			queryBus.register('GetUser', handler);

			const query: IGetUserQuery = { type: 'GetUser', userId: 'non-existent' };
			const result = await queryBus.execute<null>(query);

			expect(result).toBeNull();
		});

		it('应该正确处理返回数组的查询', async () => {
			const expectedUsers = [
				{ id: 'user-1', name: 'User 1' },
				{ id: 'user-2', name: 'User 2' }
			];

			const handler: IQueryHandler = {
				execute: jest.fn().mockResolvedValue(expectedUsers)
			};

			queryBus.register('ListUsers', handler);

			const result = await queryBus.execute({ type: 'ListUsers' });

			expect(result).toEqual(expectedUsers);
		});

		it('应该正确传播处理器抛出的异常', async () => {
			const handler: IQueryHandler = {
				execute: jest.fn().mockRejectedValue(new Error('查询执行失败'))
			};

			queryBus.register('GetUser', handler);

			await expect(queryBus.execute({ type: 'GetUser' })).rejects.toThrow('查询执行失败');
		});
	});
});
