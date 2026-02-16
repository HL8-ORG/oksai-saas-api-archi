import { problemDetailsResponseBodyFormatter } from './problem-details-response-body-formatter';
import { ArgumentsHost } from '@nestjs/common';
import type { I18nValidationException } from 'nestjs-i18n';

describe('problemDetailsResponseBodyFormatter', () => {
	let host: jest.Mocked<ArgumentsHost>;
	let mockRequest: { headers: Record<string, string | undefined> };
	let exc: jest.Mocked<I18nValidationException>;
	let formattedErrors: object;

	beforeEach(() => {
		mockRequest = {
			headers: {
				'x-request-id': 'req-123'
			}
		};

		host = {
			switchToHttp: jest.fn(() => ({
				getRequest: () => mockRequest
			}))
		} as unknown as jest.Mocked<ArgumentsHost>;

		exc = {} as jest.Mocked<I18nValidationException>;
		formattedErrors = { errors: [] };
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	it('should return problem details format', () => {
		const result = problemDetailsResponseBodyFormatter(host, exc, formattedErrors);

		expect(result).toHaveProperty('type');
		expect(result).toHaveProperty('title');
		expect(result).toHaveProperty('status');
		expect(result).toHaveProperty('detail');
		expect(result).toHaveProperty('instance');
		expect(result).toHaveProperty('data');
	});

	it('should set type to about:blank', () => {
		const result = problemDetailsResponseBodyFormatter(host, exc, formattedErrors);

		expect(result.type).toBe('about:blank');
	});

	it('should set title to Bad Request', () => {
		const result = problemDetailsResponseBodyFormatter(host, exc, formattedErrors);

		expect(result.title).toBe('Bad Request');
	});

	it('should set status to 400', () => {
		const result = problemDetailsResponseBodyFormatter(host, exc, formattedErrors);

		expect(result.status).toBe(400);
	});

	it('should set detail to Chinese message', () => {
		const result = problemDetailsResponseBodyFormatter(host, exc, formattedErrors);

		expect(result.detail).toBe('请求参数校验失败');
	});

	it('should set instance from requestId', () => {
		const result = problemDetailsResponseBodyFormatter(host, exc, formattedErrors);

		expect(result.instance).toBe('req-123');
	});

	it('should set data to formattedErrors', () => {
		const customErrors = { field: 'email', message: 'Invalid email' };
		const result = problemDetailsResponseBodyFormatter(host, exc, customErrors);

		expect(result.data).toEqual(customErrors);
	});

	it('should handle when x-request-id is not in headers', () => {
		mockRequest = { headers: {} };

		const result = problemDetailsResponseBodyFormatter(host, exc, formattedErrors);

		expect(result.instance).toBe('unknown');
	});
});
