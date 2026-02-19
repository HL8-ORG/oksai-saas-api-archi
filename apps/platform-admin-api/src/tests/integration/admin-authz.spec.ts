import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { MikroORM } from '@mikro-orm/core';
import { AppModule } from '../../app.module';

describe('platform-admin-api auth + casl (E2E)', () => {
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
		// 启用 outbox publisher，确保 AuthUserSignedUp 被投递到订阅者并写入角色表
		process.env.OUTBOX_PUBLISHER_ENABLED = 'true';
		process.env.OUTBOX_PUBLISH_INTERVAL_MS = '50';
		process.env.ADMIN_PORT = '0';

		app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter(), {
			logger: false,
			abortOnError: false
		});
		// 与 main.ts 对齐：管理端统一 /admin 前缀
		app.setGlobalPrefix('admin');
		await app.listen({ port: 0, host: '127.0.0.1' });

		// 保证测试可重复运行：清理上次运行残留的角色分配（避免“首个用户”逻辑导致的非确定性 403）
		const orm = app.get(MikroORM);
		await orm.em.getConnection().execute('delete from identity_role_assignments;');

		const server = app.getHttpServer() as unknown as { address: () => { port: number } | string | null };
		const address = server.address();
		if (!address || typeof address === 'string') throw new Error('无法获取测试服务监听端口。');
		baseUrl = `http://127.0.0.1:${address.port}`;
	});

	afterAll(async () => {
		if (app) await app.close();
	});

	it('should deny protected endpoint without session', async () => {
		const resp = await fetch(`${baseUrl}/admin/protected/ping`);
		expect(resp.status).toBe(401);
	});

	it('should allow protected endpoint after sign-up session established', async () => {
		const signup = await fetch(`${baseUrl}/admin/api/auth/sign-up/email`, {
			method: 'POST',
			headers: { 'content-type': 'application/json', accept: 'application/json' },
			body: JSON.stringify({ email: 'admin_e2e@example.com', password: 'Password123!', name: 'AdminE2E' })
		});
		expect(signup.status).toBe(200);
		const setCookie = signup.headers.get('set-cookie');
		expect(setCookie).toBeTruthy();

		// 轮询等待角色投影落库（避免 outbox/投影异步导致的偶发失败）
		const deadline = Date.now() + 15_000;
		while (true) {
			const ping = await fetch(`${baseUrl}/admin/protected/ping`, {
				method: 'GET',
				headers: { cookie: String(setCookie) }
			});
			if (ping.status === 200) return;
			if (Date.now() > deadline) throw new Error('等待角色投影超时：未能访问受保护接口。');
			await new Promise((r) => setTimeout(r, 100));
		}
	}, 20_000);
});
