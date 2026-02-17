import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppModule } from '../../app.module';

describe('platform-api tenant auth + casl (E2E)', () => {
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

		app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter(), {
			logger: false,
			abortOnError: false
		});
		await app.listen({ port: 0, host: '127.0.0.1' });

		const server = app.getHttpServer() as unknown as { address: () => { port: number } | string | null };
		const address = server.address();
		if (!address || typeof address === 'string') throw new Error('无法获取测试服务监听端口。');
		baseUrl = `http://127.0.0.1:${address.port}`;
	});

	afterAll(async () => {
		if (app) await app.close();
	});

	it('should deny /tenants/me without session', async () => {
		const resp = await fetch(`${baseUrl}/tenants/me`, { headers: { 'x-tenant-id': 't_fake' } });
		expect(resp.status).toBe(401);
	});

	it('should allow /tenants/me with session + tenantId after projection', async () => {
		const signup = await fetch(`${baseUrl}/api/auth/sign-up/email`, {
			method: 'POST',
			headers: { 'content-type': 'application/json', accept: 'application/json' },
			body: JSON.stringify({ email: 'user_e2e@example.com', password: 'Password123!', name: 'UserE2E' })
		});
		expect(signup.status).toBe(200);
		const setCookie = signup.headers.get('set-cookie');
		expect(setCookie).toBeTruthy();

		const createResp = await fetch(`${baseUrl}/tenants`, {
			method: 'POST',
			headers: { 'content-type': 'application/json', cookie: String(setCookie) },
			body: JSON.stringify({ name: 'T_AUTHZ_E2E', maxMembers: 10 })
		});
		expect(createResp.status).toBe(201);
		const created = (await createResp.json()) as { tenantId: string };
		expect(created.tenantId).toMatch(/^t_/);

		const deadline = Date.now() + 10_000;
		while (true) {
			const meResp = await fetch(`${baseUrl}/tenants/me`, {
				method: 'GET',
				headers: { 'x-tenant-id': created.tenantId, cookie: String(setCookie) }
			});

			if (meResp.status === 200) return;
			if (Date.now() > deadline) throw new Error('等待投影超时：受保护查询未成功返回。');
			await new Promise((r) => setTimeout(r, 200));
		}
	});
});

