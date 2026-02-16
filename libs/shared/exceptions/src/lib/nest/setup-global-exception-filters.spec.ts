import { setupGlobalExceptionFilters } from './setup-global-exception-filters';
import { INestApplication } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { PinoLogger } from 'nestjs-pino';

describe('setupGlobalExceptionFilters', () => {
	let app: jest.Mocked<INestApplication>;
	let httpAdapterHost: jest.Mocked<HttpAdapterHost>;
	let logger: jest.Mocked<PinoLogger>;

	beforeEach(() => {
		app = {
			get: jest.fn(),
			resolve: jest.fn(),
			useGlobalFilters: jest.fn()
		} as unknown as jest.Mocked<INestApplication>;

		httpAdapterHost = {} as jest.Mocked<HttpAdapterHost>;
		logger = {} as jest.Mocked<PinoLogger>;

		app.get.mockImplementation((token) => {
			if (token === HttpAdapterHost) return httpAdapterHost;
			return undefined;
		});

		app.resolve.mockImplementation(async (token: any) => {
			if (token === PinoLogger) return logger;
			return undefined as any;
		});
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	it('should get HttpAdapterHost and resolve PinoLogger from app', async () => {
		await setupGlobalExceptionFilters(app);

		expect(app.get).toHaveBeenCalledWith(HttpAdapterHost);
		expect(app.resolve).toHaveBeenCalledWith(PinoLogger);
	});

	it('should call useGlobalFilters with all filters', async () => {
		await setupGlobalExceptionFilters(app);

		expect(app.useGlobalFilters).toHaveBeenCalled();
	});

	it('should call useGlobalFilters with AnyExceptionFilter by default', async () => {
		await setupGlobalExceptionFilters(app);

		const filters = app.useGlobalFilters.mock.calls[0];
		expect(filters).toHaveLength(3);
	});

	it('should not call useGlobalFilters with AnyExceptionFilter when disabled', async () => {
		await setupGlobalExceptionFilters(app, { enableAnyExceptionFilter: false });

		const filters = app.useGlobalFilters.mock.calls[0];
		expect(filters).toHaveLength(2);
	});
});
