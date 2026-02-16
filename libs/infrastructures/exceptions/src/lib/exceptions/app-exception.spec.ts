import { AppException } from './app-exception';

describe('AppException', () => {
	describe('constructor', () => {
		it('should create exception with message', () => {
			const error = new AppException('test error');
			expect(error.message).toBe('test error');
			expect(error.name).toBe('AppException');
			expect(error.errorCode).toBeUndefined();
			expect(error.data).toBeUndefined();
			expect(error.cause).toBeUndefined();
		});

		it('should create exception with errorCode', () => {
			const error = new AppException('test error', { errorCode: 'ERR_001' });
			expect(error.errorCode).toBe('ERR_001');
		});

		it('should create exception with data', () => {
			const data = { field: 'value' };
			const error = new AppException('test error', { data });
			expect(error.data).toEqual(data);
		});

		it('should create exception with data array', () => {
			const data = [{ field: 'value1' }, { field: 'value2' }];
			const error = new AppException('test error', { data });
			expect(error.data).toEqual(data);
		});

		it('should create exception with cause', () => {
			const cause = new Error('inner error');
			const error = new AppException('test error', { cause });
			expect(error.cause).toBe(cause);
		});

		it('should create exception with all options', () => {
			const data = { field: 'value' };
			const cause = new Error('inner error');
			const error = new AppException('test error', {
				errorCode: 'ERR_001',
				data,
				cause
			});
			expect(error.message).toBe('test error');
			expect(error.errorCode).toBe('ERR_001');
			expect(error.data).toEqual(data);
			expect(error.cause).toBe(cause);
		});

		it('should use constructor name as error name', () => {
			class CustomException extends AppException {}
			const error = new CustomException('test');
			expect(error.name).toBe('CustomException');
		});
	});
});
