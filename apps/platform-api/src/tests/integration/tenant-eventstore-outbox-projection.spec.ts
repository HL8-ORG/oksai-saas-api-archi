import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppModule } from '../../app.module';

describe('tenant end-to-end (EventStore + Outbox + Projection)', () => {
	let app: NestFastifyApplication;
	let baseUrl: string;

	beforeAll(async () => {
		// 使用 docker/docker-compose.test.yml 的默认配置
		process.env.NODE_ENV = 'test';
		process.env.DB_USE_TEST_PORT = 'true';
		process.env.DB_HOST = process.env.DB_HOST ?? '127.0.0.1';
		process.env.DB_USER = process.env.DB_USER ?? 'postgres';
		process.env.DB_PASSWORD = process.env.DB_PASSWORD ?? 'test_password';
		process.env.DB_NAME = process.env.DB_NAME ?? 'test_oksai';
		process.env.DB_MIGRATIONS_RUN = 'true';

		// Outbox publisher 加速轮询
		process.env.OUTBOX_PUBLISHER_ENABLED = 'true';
		process.env.OUTBOX_PUBLISH_INTERVAL_MS = '200';

		// 使用随机端口避免冲突
		const port = 0;

		app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter(), {
			logger: false,
			abortOnError: false
		});
		await app.listen({ port, host: '127.0.0.1' });
		const server = app.getHttpServer() as unknown as { address: () => { port: number } | string | null };
		const address = server.address();
		if (!address || typeof address === 'string') {
			throw new Error('无法获取测试服务监听端口。');
		}
		baseUrl = `http://127.0.0.1:${address.port}`;
	});

	afterAll(async () => {
		if (app) await app.close();
	});

	it('should create tenant -> outbox publish -> projection visible in read model', async () => {
		// 先建立登录会话（Better Auth），避免受保护接口返回 401
		const signup = await fetch(`${baseUrl}/api/auth/sign-up/email`, {
			method: 'POST',
			headers: { 'content-type': 'application/json', accept: 'application/json' },
			body: JSON.stringify({ email: 'tenant_e2e@example.com', password: 'Password123!', name: 'TenantE2E' })
		});
		expect(signup.status).toBe(200);
		const setCookie = signup.headers.get('set-cookie');
		expect(setCookie).toBeTruthy();

		const createResp = await fetch(`${baseUrl}/tenants`, {
			method: 'POST',
			headers: { 'content-type': 'application/json', cookie: String(setCookie) },
			body: JSON.stringify({ name: 'T_E2E', maxMembers: 10 })
		});
		expect(createResp.status).toBe(201);
		const created = (await createResp.json()) as { tenantId: string };
		expect(created.tenantId).toMatch(/^t_/);

		// 轮询等待投影追上
		const deadline = Date.now() + 10_000;
		while (true) {
			const meResp = await fetch(`${baseUrl}/tenants/me`, {
				method: 'GET',
				headers: { 'x-tenant-id': created.tenantId, cookie: String(setCookie) }
			});
			// 说明：在投影/授权异步链路完成前，可能暂时返回 400（读模型未就绪）或 403（角色未授予）
			expect([200, 400, 403]).toContain(meResp.status);

			if (meResp.status === 200) {
				const me = (await meResp.json()) as { tenantId: string; name: string } | null;
				if (me && me.tenantId === created.tenantId && me.name === 'T_E2E') {
					return;
				}
			}

			if (Date.now() > deadline) {
				throw new Error('等待投影超时：读模型未出现预期租户记录。');
			}
			await new Promise((r) => setTimeout(r, 200));
		}
	});
});

