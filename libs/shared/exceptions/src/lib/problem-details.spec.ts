import { buildProblemDetails } from './problem-details';

describe('buildProblemDetails', () => {
	it('should return the input object', () => {
		const input = {
			type: 'https://example.com/errors/not-found',
			title: 'Not Found',
			status: 404,
			detail: 'Resource not found',
			instance: 'req-123',
			errorCode: 'NOT_FOUND',
			data: { id: '123' }
		};
		const result = buildProblemDetails(input);
		expect(result).toEqual(input);
	});

	it('should handle data without errorCode', () => {
		const input = {
			type: 'about:blank',
			title: 'Error',
			status: 400,
			detail: 'Bad request',
			instance: 'req-123',
			data: { field: 'value' }
		};
		const result = buildProblemDetails(input);
		expect(result).toEqual(input);
	});

	it('should handle minimal input', () => {
		const input = {
			type: 'about:blank',
			title: 'Error',
			status: 400,
			detail: 'Bad request',
			instance: 'req-123'
		};
		const result = buildProblemDetails(input);
		expect(result).toEqual(input);
	});

	it('should handle data array', () => {
		const input = {
			type: 'about:blank',
			title: 'Validation Error',
			status: 400,
			detail: 'Multiple validation errors',
			instance: 'req-123',
			data: [{ field: 'email', message: 'Invalid email' }]
		};
		const result = buildProblemDetails(input);
		expect(result).toEqual(input);
	});
});
