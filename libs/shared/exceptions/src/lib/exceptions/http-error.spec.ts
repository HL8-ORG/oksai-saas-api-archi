import { HttpError, isHttpError } from './http-error';
import { AppException } from './app-exception';

describe('HttpError', () => {
	describe('constructor', () => {
		it('should create HttpError with required fields', () => {
			const error = new HttpError({
				status: 400,
				title: 'Bad Request',
				detail: 'Invalid input'
			});
			expect(error.status).toBe(400);
			expect(error.title).toBe('Bad Request');
			expect(error.detail).toBe('Invalid input');
			expect(error.type).toBe('about:blank');
			expect(error.errorCode).toBeUndefined();
			expect(error.data).toBeUndefined();
			expect(error.cause).toBeUndefined();
		});

		it('should create HttpError with custom type', () => {
			const error = new HttpError({
				status: 400,
				title: 'Bad Request',
				detail: 'Invalid input',
				type: 'https://example.com/errors/bad-request'
			});
			expect(error.type).toBe('https://example.com/errors/bad-request');
		});

		it('should create HttpError with errorCode', () => {
			const error = new HttpError({
				status: 400,
				title: 'Bad Request',
				detail: 'Invalid input',
				errorCode: 'ERR_001'
			});
			expect(error.errorCode).toBe('ERR_001');
		});

		it('should create HttpError with data', () => {
			const data = { field: 'value' };
			const error = new HttpError({
				status: 400,
				title: 'Bad Request',
				detail: 'Invalid input',
				data
			});
			expect(error.data).toEqual(data);
		});

		it('should create HttpError with data array', () => {
			const data = [{ field: 'value1' }, { field: 'value2' }];
			const error = new HttpError({
				status: 400,
				title: 'Bad Request',
				detail: 'Invalid input',
				data
			});
			expect(error.data).toEqual(data);
		});

		it('should create HttpError with cause', () => {
			const cause = new Error('inner error');
			const error = new HttpError({
				status: 500,
				title: 'Internal Server Error',
				detail: 'Something went wrong',
				cause
			});
			expect(error.cause).toBe(cause);
		});

		it('should inherit from AppException', () => {
			const error = new HttpError({
				status: 400,
				title: 'Bad Request',
				detail: 'Invalid input'
			});
			expect(error).toBeInstanceOf(AppException);
		});

		it('should format error message as title: detail', () => {
			const error = new HttpError({
				status: 400,
				title: 'Bad Request',
				detail: 'Invalid input'
			});
			expect(error.message).toBe('Bad Request: Invalid input');
		});
	});
});

describe('isHttpError', () => {
	it('should return true for HttpError', () => {
		const error = new HttpError({
			status: 400,
			title: 'Bad Request',
			detail: 'Invalid input'
		});
		expect(isHttpError(error)).toBe(true);
	});

	it('should return false for plain Error', () => {
		const error = new Error('test');
		expect(isHttpError(error)).toBe(false);
	});

	it('should return false for AppException', () => {
		const error = new AppException('test error');
		expect(isHttpError(error)).toBe(false);
	});

	it('should return false for null', () => {
		expect(isHttpError(null)).toBe(false);
	});

	it('should return false for undefined', () => {
		expect(isHttpError(undefined)).toBe(false);
	});

	it('should return false for object without required properties', () => {
		const obj = { status: 400 };
		expect(isHttpError(obj)).toBe(false);
	});

	it('should return false for object with only title', () => {
		const obj = { title: 'Bad Request' };
		expect(isHttpError(obj)).toBe(false);
	});

	it('should return true for object with all required properties', () => {
		const obj = { status: 400, title: 'Bad Request', detail: 'Invalid input' };
		expect(isHttpError(obj)).toBe(true);
	});
});
