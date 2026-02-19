import { DatabaseUnitOfWork } from './unit-of-work';
import { DatabaseTransactionHost } from './database-transaction-host';

describe('DatabaseUnitOfWork', () => {
	let unitOfWork: DatabaseUnitOfWork;
	let mockOrm: { em: { transactional: jest.Mock } };
	let mockTxHost: { runWithEntityManager: jest.Mock };

	beforeEach(() => {
		// 创建模拟的 MikroORM
		mockOrm = {
			em: {
				transactional: jest.fn()
			}
		};

		// 创建模拟的 DatabaseTransactionHost
		mockTxHost = {
			runWithEntityManager: jest.fn()
		};

		unitOfWork = new DatabaseUnitOfWork(mockOrm as unknown as any, mockTxHost as unknown as any);
	});

	describe('transactional', () => {
		it('应该调用 em.transactional 并传递回调函数', async () => {
			// Arrange
			const mockEm = { id: 'mock-em' };
			const mockResult = { success: true };
			mockOrm.em.transactional.mockImplementation(async (fn: any) => {
				return fn(mockEm);
			});
			mockTxHost.runWithEntityManager.mockImplementation(async (em: any, fn: any) => {
				return fn();
			});

			// Act
			const result = await unitOfWork.transactional(async () => mockResult);

			// Assert
			expect(mockOrm.em.transactional).toHaveBeenCalledTimes(1);
			expect(mockOrm.em.transactional).toHaveBeenCalledWith(expect.any(Function));
		});

		it('应该将事务 EntityManager 传递给 txHost', async () => {
			// Arrange
			const mockEm = { id: 'mock-em' };
			mockOrm.em.transactional.mockImplementation(async (fn: any) => {
				return fn(mockEm);
			});
			mockTxHost.runWithEntityManager.mockImplementation(async (em: any, fn: any) => {
				return fn();
			});

			// Act
			await unitOfWork.transactional(async () => {});

			// Assert
			expect(mockTxHost.runWithEntityManager).toHaveBeenCalledWith(mockEm, expect.any(Function));
		});

		it('应该返回业务函数的结果', async () => {
			// Arrange
			const mockEm = { id: 'mock-em' };
			const expectedResult = { id: 1, name: 'test' };
			mockOrm.em.transactional.mockImplementation(async (fn: any) => {
				return fn(mockEm);
			});
			mockTxHost.runWithEntityManager.mockImplementation(async (em: any, fn: any) => {
				return fn();
			});

			// Act
			const result = await unitOfWork.transactional(async () => expectedResult);

			// Assert
			expect(result).toEqual(expectedResult);
		});

		it('应该支持返回 Promise', async () => {
			// Arrange
			const mockEm = { id: 'mock-em' };
			const expectedResult = 'async-result';
			mockOrm.em.transactional.mockImplementation(async (fn: any) => {
				return fn(mockEm);
			});
			mockTxHost.runWithEntityManager.mockImplementation(async (em: any, fn: any) => {
				return fn();
			});

			// Act
			const result = await unitOfWork.transactional(async () => {
				await new Promise((resolve) => setTimeout(resolve, 10));
				return expectedResult;
			});

			// Assert
			expect(result).toBe(expectedResult);
		});

		it('应该支持返回 void', async () => {
			// Arrange
			const mockEm = { id: 'mock-em' };
			mockOrm.em.transactional.mockImplementation(async (fn: any) => {
				return fn(mockEm);
			});
			mockTxHost.runWithEntityManager.mockImplementation(async (em: any, fn: any) => {
				return fn();
			});

			// Act
			const result = await unitOfWork.transactional(async () => {
				// 执行一些操作但不返回值
			});

			// Assert
			expect(result).toBeUndefined();
		});

		it('应该传播事务中的错误', async () => {
			// Arrange
			const mockError = new Error('事务失败');
			mockOrm.em.transactional.mockImplementation(async () => {
				throw mockError;
			});

			// Act & Assert
			await expect(unitOfWork.transactional(async () => {})).rejects.toThrow('事务失败');
		});

		it('应该传播业务函数中的错误', async () => {
			// Arrange
			const mockEm = { id: 'mock-em' };
			const businessError = new Error('业务逻辑错误');
			mockOrm.em.transactional.mockImplementation(async (fn: any) => {
				return fn(mockEm);
			});
			mockTxHost.runWithEntityManager.mockImplementation(async (em: any, fn: any) => {
				return fn();
			});

			// Act & Assert
			await expect(
				unitOfWork.transactional(async () => {
					throw businessError;
				})
			).rejects.toThrow('业务逻辑错误');
		});

		it('应该在业务函数中提供正确的上下文', async () => {
			// Arrange
			const mockEm = { id: 'mock-em' };
			let capturedEm: any = null;
			mockOrm.em.transactional.mockImplementation(async (fn: any) => {
				return fn(mockEm);
			});
			mockTxHost.runWithEntityManager.mockImplementation(async (em: any, fn: any) => {
				capturedEm = em;
				return fn();
			});

			// Act
			await unitOfWork.transactional(async () => {});

			// Assert
			expect(capturedEm).toBe(mockEm);
		});

		it('应该支持多次事务操作', async () => {
			// Arrange
			const mockEm = { id: 'mock-em' };
			mockOrm.em.transactional.mockImplementation(async (fn: any) => {
				return fn(mockEm);
			});
			mockTxHost.runWithEntityManager.mockImplementation(async (em: any, fn: any) => {
				return fn();
			});

			// Act
			const result1 = await unitOfWork.transactional(async () => 'result1');
			const result2 = await unitOfWork.transactional(async () => 'result2');

			// Assert
			expect(result1).toBe('result1');
			expect(result2).toBe('result2');
			expect(mockOrm.em.transactional).toHaveBeenCalledTimes(2);
		});
	});

	describe('依赖注入', () => {
		it('应该可以通过构造函数注入 orm 和 txHost', () => {
			// Arrange & Act
			const uow = new DatabaseUnitOfWork(mockOrm as unknown as any, mockTxHost as unknown as any);

			// Assert
			expect(uow).toBeInstanceOf(DatabaseUnitOfWork);
		});
	});
});
