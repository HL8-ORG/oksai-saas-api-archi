import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppModule } from '../../app.module';

describe('platform-admin-api smoke', () => {
	let app: NestFastifyApplication;
	let baseUrl: string;

	beforeAll(async () => {
		process.env.NODE_ENV = 'test';
		process.env.DB_USE_TEST_PORT = 'true';
		process.env.DB_HOST = process.env.DB_HOST ?? '127.0.0.1';
		process.env.DB_USER = process.env.DB_USER ?? 'postgres';
		process.env.DB_PASSWORD = process.env.DB_PASSWORD ?? 'test_password';
		process.env.DB_NAME = process.env.DB_NAME ?? 'test_oksai';
		process.env.DB_MIGRATIONS_RUN = 'false';
		process.env.OUTBOX_PUBLISHER_ENABLED = 'false';

		app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter(), {
			logger: false,
			abortOnError: false
		});
		// 与 main.ts 对齐：管理端统一使用 /admin 前缀
		app.setGlobalPrefix('admin');
		await app.listen({ port: 0, host: '127.0.0.1' });

		const server = app.getHttpServer() as unknown as { address: () => { port: number } | string | null };
		const address = server.address();
		if (!address || typeof address === 'string') throw new Error('无法获取测试服务监听端口。');
		baseUrl = `http://127.0.0.1:${address.port}`;
	});

	afterAll(async () => {
		if (app) await app.close();
	});

	it('should start and respond to /admin/health', async () => {
		const resp = await fetch(`${baseUrl}/admin/health`);
		expect(resp.status).toBe(200);
		const body = (await resp.json()) as { status: string };
		expect(body.status).toBe('ok');
	});
});
