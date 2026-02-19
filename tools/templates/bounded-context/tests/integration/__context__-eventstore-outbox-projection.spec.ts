/**
 * @description __CONTEXT__ 端到端模板测试
 *
 * 使用方式：
 * - 复制到 `tests/integration/<context>-eventstore-outbox-projection.spec.ts`
 * - 替换 URL 路径与 DTO，确保：创建命令 -> Outbox publish -> 投影可见
 */
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppModule } from '../../../apps/platform-api/src/app.module';

describe('__context__ end-to-end (EventStore + Outbox + Projection) (模板)', () => {
	let app: NestFastifyApplication;
	let baseUrl: string;

	beforeAll(async () => {
		process.env.NODE_ENV = 'test';
		process.env.DB_USE_TEST_PORT = 'true';
		process.env.DB_HOST = process.env.DB_HOST ?? '127.0.0.1';
		process.env.DB_USER = process.env.DB_USER ?? 'postgres';
		process.env.DB_PASSWORD = process.env.DB_PASSWORD ?? 'test_password';
		process.env.DB_NAME = process.env.DB_NAME ?? 'test_oksai';
		process.env.DB_MIGRATIONS_RUN = 'true';

		process.env.OUTBOX_PUBLISHER_ENABLED = 'true';
		process.env.OUTBOX_PUBLISH_INTERVAL_MS = '200';

		app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter(), { logger: false });
		await app.listen({ port: 0, host: '127.0.0.1' });
		const server = app.getHttpServer() as unknown as { address: () => { port: number } | string | null };
		const address = server.address();
		if (!address || typeof address === 'string') throw new Error('无法获取测试服务监听端口。');
		baseUrl = `http://127.0.0.1:${address.port}`;
	});

	afterAll(async () => {
		if (app) await app.close();
	});

	it('should create -> outbox publish -> projection visible in read model (模板)', async () => {
		// TODO: 替换为你的 API 路径与 DTO（示例：POST /<context>）
		const createResp = await fetch(`${baseUrl}/__context__`, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ name: 'E2E' })
		});
		expect([200, 201, 202]).toContain(createResp.status);
		const created = (await createResp.json()) as { id?: string; tenantId?: string };
		const tenantId = created.tenantId ?? created.id;
		expect(tenantId).toBeTruthy();

		// 轮询等待投影追上（示例：GET /<context>/me）
		const deadline = Date.now() + 10_000;
		while (true) {
			const meResp = await fetch(`${baseUrl}/__context__/me`, {
				method: 'GET',
				headers: { 'x-tenant-id': String(tenantId) }
			});

			if (meResp.status === 200) {
				// TODO: 校验你的读模型返回结构
				const me = (await meResp.json()) as unknown;
				if (me) return;
			}

			if (Date.now() > deadline) {
				throw new Error('等待投影超时：读模型未出现预期记录。');
			}
			await new Promise((r) => setTimeout(r, 200));
		}
	});
});
