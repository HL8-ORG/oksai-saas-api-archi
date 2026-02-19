import { setupRequestIdResponseHeader } from '@oksai/logger';
import { Logger } from '@oksai/logger';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppModule } from './app.module';

async function bootstrap() {
	const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter(), {
		bufferLogs: true
	});

	app.useLogger(app.get(Logger));

	app.useGlobalPipes(
		new ValidationPipe({
			whitelist: true,
			forbidNonWhitelisted: true,
			transform: true
		})
	);

	setupRequestIdResponseHeader(app, {
		headerName: 'x-request-id'
	});

	const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;
	await app.listen({ port, host: '0.0.0.0' });

	const logger = app.get(Logger);
	logger.log(`应用启动成功，监听端口：${port}`);
	logger.log(`运行环境：${process.env.NODE_ENV ?? 'development'}`);
}

bootstrap().catch((error) => {
	console.error('应用启动失败：', error);
	process.exit(1);
});
