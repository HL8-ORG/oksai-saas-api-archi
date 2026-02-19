import { InMemoryInbox } from './in-memory-inbox';

describe('InMemoryInbox', () => {
	let inbox: InMemoryInbox;

	beforeEach(() => {
		inbox = new InMemoryInbox();
	});

	describe('isProcessed', () => {
		it('未处理的消息应返回 false', async () => {
			const result = await inbox.isProcessed('msg-1');
			expect(result).toBe(false);
		});

		it('已处理的消息应返回 true', async () => {
			await inbox.markProcessed('msg-1');

			const result = await inbox.isProcessed('msg-1');
			expect(result).toBe(true);
		});

		it('不同的 messageId 应独立判断', async () => {
			await inbox.markProcessed('msg-1');

			expect(await inbox.isProcessed('msg-1')).toBe(true);
			expect(await inbox.isProcessed('msg-2')).toBe(false);
		});

		it('空 messageId 应正常处理', async () => {
			const result = await inbox.isProcessed('');
			expect(result).toBe(false);
		});

		it('多次检查同一未处理消息应始终返回 false', async () => {
			expect(await inbox.isProcessed('msg-1')).toBe(false);
			expect(await inbox.isProcessed('msg-1')).toBe(false);
			expect(await inbox.isProcessed('msg-1')).toBe(false);
		});
	});

	describe('markProcessed', () => {
		it('标记消息为已处理', async () => {
			await inbox.markProcessed('msg-1');

			expect(await inbox.isProcessed('msg-1')).toBe(true);
		});

		it('重复标记同一消息应无副作用', async () => {
			await inbox.markProcessed('msg-1');
			await inbox.markProcessed('msg-1');
			await inbox.markProcessed('msg-1');

			expect(await inbox.isProcessed('msg-1')).toBe(true);
		});

		it('标记不同消息应独立存储', async () => {
			await inbox.markProcessed('msg-1');
			await inbox.markProcessed('msg-2');
			await inbox.markProcessed('msg-3');

			expect(await inbox.isProcessed('msg-1')).toBe(true);
			expect(await inbox.isProcessed('msg-2')).toBe(true);
			expect(await inbox.isProcessed('msg-3')).toBe(true);
		});

		it('空 messageId 应可正常标记', async () => {
			await inbox.markProcessed('');

			expect(await inbox.isProcessed('')).toBe(true);
		});
	});

	describe('幂等性测试', () => {
		it('模拟消息处理幂等场景', async () => {
			const processedMessages: string[] = [];

			const processMessage = async (messageId: string, payload: unknown) => {
				if (await inbox.isProcessed(messageId)) {
					return;
				}
				processedMessages.push(messageId);
				await inbox.markProcessed(messageId);
			};

			const payload = { data: 'test' };

			await processMessage('msg-1', payload);
			await processMessage('msg-1', payload);
			await processMessage('msg-1', payload);

			expect(processedMessages).toHaveLength(1);
			expect(processedMessages).toContain('msg-1');
		});

		it('并发检查和标记应正确工作', async () => {
			const messageId = 'concurrent-msg';

			const results = await Promise.all([
				inbox.isProcessed(messageId),
				inbox.markProcessed(messageId).then(() => inbox.isProcessed(messageId)),
				inbox.isProcessed(messageId)
			]);

			expect(results[2]).toBe(true);
		});
	});
});
