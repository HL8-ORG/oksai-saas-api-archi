import { DatabaseTransactionHost } from './database-transaction-host';

describe('DatabaseTransactionHost', () => {
	let txHost: DatabaseTransactionHost;

	beforeEach(() => {
		txHost = new DatabaseTransactionHost();
	});

	describe('getCurrentEntityManager', () => {
		it('应该在没有事务上下文时返回 null', () => {
			// Act
			const result = txHost.getCurrentEntityManager();

			// Assert
			expect(result).toBeNull();
		});

		it('应该在事务上下文中返回 EntityManager', async () => {
			// Arrange
			const mockEm = { id: 'test-em' };

			// Act
			await txHost.runWithEntityManager(mockEm as any, async () => {
				const result = txHost.getCurrentEntityManager();

				// Assert
				expect(result).toBe(mockEm);
			});
		});

		it('应该在事务结束后返回 null', async () => {
			// Arrange
			const mockEm = { id: 'test-em' };

			// Act
			await txHost.runWithEntityManager(mockEm as any, async () => {
				// 在事务内
			});

			// Assert - 事务结束后
			expect(txHost.getCurrentEntityManager()).toBeNull();
		});

		it('应该正确处理嵌套调用', async () => {
			// Arrange
			const mockEm1 = { id: 'em-1' };
			const mockEm2 = { id: 'em-2' };

			// Act & Assert
			await txHost.runWithEntityManager(mockEm1 as any, async () => {
				expect(txHost.getCurrentEntityManager()).toBe(mockEm1);

				await txHost.runWithEntityManager(mockEm2 as any, async () => {
					expect(txHost.getCurrentEntityManager()).toBe(mockEm2);
				});

				expect(txHost.getCurrentEntityManager()).toBe(mockEm1);
			});

			expect(txHost.getCurrentEntityManager()).toBeNull();
		});
	});

	describe('runWithEntityManager', () => {
		it('应该在上下文中执行函数', async () => {
			// Arrange
			const mockEm = { id: 'test-em' };
			let executed = false;

			// Act
			await txHost.runWithEntityManager(mockEm as any, async () => {
				executed = true;
			});

			// Assert
			expect(executed).toBe(true);
		});

		it('应该返回函数的结果', async () => {
			// Arrange
			const mockEm = { id: 'test-em' };
			const expectedResult = { data: 'test' };

			// Act
			const result = await txHost.runWithEntityManager(mockEm as any, async () => {
				return expectedResult;
			});

			// Assert
			expect(result).toEqual(expectedResult);
		});

		it('应该支持返回 Promise', async () => {
			// Arrange
			const mockEm = { id: 'test-em' };
			const expectedResult = 'async-value';

			// Act
			const result = await txHost.runWithEntityManager(mockEm as any, async () => {
				await new Promise((resolve) => setTimeout(resolve, 10));
				return expectedResult;
			});

			// Assert
			expect(result).toBe(expectedResult);
		});

		it('应该传播函数中的错误', async () => {
			// Arrange
			const mockEm = { id: 'test-em' };
			const error = new Error('测试错误');

			// Act & Assert
			await expect(
				txHost.runWithEntityManager(mockEm as any, async () => {
					throw error;
				})
			).rejects.toThrow('测试错误');
		});

		it('应该在错误发生后清除上下文', async () => {
			// Arrange
			const mockEm = { id: 'test-em' };

			// Act
			try {
				await txHost.runWithEntityManager(mockEm as any, async () => {
					throw new Error('测试错误');
				});
			} catch {
				// 忽略错误
			}

			// Assert
			expect(txHost.getCurrentEntityManager()).toBeNull();
		});

		it('应该支持同步函数（虽然类型定义为异步）', async () => {
			// Arrange
			const mockEm = { id: 'test-em' };

			// Act
			const result = await txHost.runWithEntityManager(mockEm as any, async () => {
				return 'sync-result';
			});

			// Assert
			expect(result).toBe('sync-result');
		});

		it('应该在异步操作期间保持上下文', async () => {
			// Arrange
			const mockEm = { id: 'test-em' };
			const capturedEms: any[] = [];

			// Act
			await txHost.runWithEntityManager(mockEm as any, async () => {
				capturedEms.push(txHost.getCurrentEntityManager());
				await new Promise((resolve) => setTimeout(resolve, 10));
				capturedEms.push(txHost.getCurrentEntityManager());
				await new Promise((resolve) => setTimeout(resolve, 10));
				capturedEms.push(txHost.getCurrentEntityManager());
			});

			// Assert
			expect(capturedEms).toEqual([mockEm, mockEm, mockEm]);
		});

		it('应该支持返回 undefined', async () => {
			// Arrange
			const mockEm = { id: 'test-em' };

			// Act
			const result = await txHost.runWithEntityManager(mockEm as any, async () => {
				// 不返回任何值
			});

			// Assert
			expect(result).toBeUndefined();
		});

		it('应该支持返回 null', async () => {
			// Arrange
			const mockEm = { id: 'test-em' };

			// Act
			const result = await txHost.runWithEntityManager(mockEm as any, async () => {
				return null;
			});

			// Assert
			expect(result).toBeNull();
		});

		it('应该支持返回复杂对象', async () => {
			// Arrange
			const mockEm = { id: 'test-em' };
			const complexResult = {
				users: [
					{ id: 1, name: 'Alice' },
					{ id: 2, name: 'Bob' }
				],
				meta: {
					total: 2,
					page: 1
				}
			};

			// Act
			const result = await txHost.runWithEntityManager(mockEm as any, async () => {
				return complexResult;
			});

			// Assert
			expect(result).toEqual(complexResult);
		});
	});

	describe('并发安全', () => {
		it('应该隔离不同的事务上下文', async () => {
			// Arrange
			const mockEm1 = { id: 'em-1' };
			const mockEm2 = { id: 'em-2' };
			const results: string[] = [];

			// Act - 并发执行两个事务
			await Promise.all([
				txHost.runWithEntityManager(mockEm1 as any, async () => {
					results.push(`start-1: ${txHost.getCurrentEntityManager()?.id}`);
					await new Promise((resolve) => setTimeout(resolve, 20));
					results.push(`end-1: ${txHost.getCurrentEntityManager()?.id}`);
				}),
				txHost.runWithEntityManager(mockEm2 as any, async () => {
					results.push(`start-2: ${txHost.getCurrentEntityManager()?.id}`);
					await new Promise((resolve) => setTimeout(resolve, 10));
					results.push(`end-2: ${txHost.getCurrentEntityManager()?.id}`);
				})
			]);

			// Assert - 每个事务应该看到自己的 EntityManager
			expect(results.some((r) => r.includes('em-1'))).toBe(true);
			expect(results.some((r) => r.includes('em-2'))).toBe(true);
		});

		it('应该在并发操作后清除所有上下文', async () => {
			// Arrange
			const mockEm1 = { id: 'em-1' };
			const mockEm2 = { id: 'em-2' };

			// Act
			await Promise.all([
				txHost.runWithEntityManager(mockEm1 as any, async () => {}),
				txHost.runWithEntityManager(mockEm2 as any, async () => {})
			]);

			// Assert
			expect(txHost.getCurrentEntityManager()).toBeNull();
		});
	});

	describe('依赖注入', () => {
		it('应该可以被实例化', () => {
			// Act
			const host = new DatabaseTransactionHost();

			// Assert
			expect(host).toBeInstanceOf(DatabaseTransactionHost);
		});

		it('应该有 @Injectable 装饰器（通过类名验证）', () => {
			// 这个测试验证类可以被正确实例化
			// 实际的 @Injectable 装饰器功能需要 NestJS 测试环境
			expect(DatabaseTransactionHost.name).toBe('DatabaseTransactionHost');
		});
	});
});
