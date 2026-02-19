import type { IInbox } from './inbox';

describe('IInbox 接口契约', () => {
	it('IInbox 接口应定义 isProcessed 方法', () => {
		const inbox: IInbox = {
			isProcessed: async () => false,
			markProcessed: async () => undefined
		};
		expect(typeof inbox.isProcessed).toBe('function');
	});

	it('IInbox 接口应定义 markProcessed 方法', () => {
		const inbox: IInbox = {
			isProcessed: async () => false,
			markProcessed: async () => undefined
		};
		expect(typeof inbox.markProcessed).toBe('function');
	});

	it('isProcessed 应返回 Promise<boolean>', async () => {
		const inbox: IInbox = {
			isProcessed: async () => true,
			markProcessed: async () => undefined
		};
		const result = await inbox.isProcessed('test-id');
		expect(typeof result).toBe('boolean');
	});

	it('markProcessed 应返回 Promise<void>', async () => {
		const inbox: IInbox = {
			isProcessed: async () => false,
			markProcessed: async () => undefined
		};
		const result = await inbox.markProcessed('test-id');
		expect(result).toBeUndefined();
	});

	it('isProcessed 应接受 string 类型的 messageId', async () => {
		const inbox: IInbox = {
			isProcessed: async (id: string) => id.length > 0,
			markProcessed: async () => undefined
		};
		await expect(inbox.isProcessed('valid-id')).resolves.toBe(true);
		await expect(inbox.isProcessed('')).resolves.toBe(false);
	});

	it('markProcessed 应接受 string 类型的 messageId', async () => {
		let processed = false;
		const inbox: IInbox = {
			isProcessed: async () => processed,
			markProcessed: async () => {
				processed = true;
			}
		};

		expect(await inbox.isProcessed('test-id')).toBe(false);
		await inbox.markProcessed('test-id');
		expect(await inbox.isProcessed('test-id')).toBe(true);
	});

	describe('实现示例', () => {
		it('简单的内存实现应满足接口契约', async () => {
			const processedSet = new Set<string>();
			const inbox: IInbox = {
				isProcessed: async (id) => processedSet.has(id),
				markProcessed: async (id) => {
					processedSet.add(id);
				}
			};

			expect(await inbox.isProcessed('msg-1')).toBe(false);
			await inbox.markProcessed('msg-1');
			expect(await inbox.isProcessed('msg-1')).toBe(true);
		});
	});
});
