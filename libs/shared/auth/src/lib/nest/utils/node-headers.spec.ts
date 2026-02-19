import { fromNodeHeaders } from './node-headers';

describe('fromNodeHeaders', () => {
	describe('基本功能', () => {
		it('应将空对象转换为空的 Headers', () => {
			const headers = fromNodeHeaders({});
			expect(headers).toBeInstanceOf(Headers);
		});

		it('应正确转换单个字符串 header', () => {
			const headers = fromNodeHeaders({
				'content-type': 'application/json'
			});

			expect(headers.get('content-type')).toBe('application/json');
		});

		it('应正确转换单个字符串 header（大写键名）', () => {
			const headers = fromNodeHeaders({
				'Content-Type': 'text/html'
			});

			// Headers API 会将键名转换为小写
			expect(headers.get('content-type')).toBe('text/html');
		});
	});

	describe('数组值处理', () => {
		it('应正确处理数组形式的 header 值（使用逗号连接）', () => {
			const headers = fromNodeHeaders({
				'set-cookie': ['session=abc; Path=/', 'token=xyz; Path=/']
			});

			// Headers.get() 会返回所有值的逗号连接（对于 set-cookie 除外）
			// 但标准 Headers API 对 set-cookie 有特殊处理
			const value = headers.get('set-cookie');
			expect(value).toBeTruthy();
		});

		it('应使用 append 方法添加多个同名 header', () => {
			const headers = fromNodeHeaders({
				accept: ['text/html', 'application/json']
			});

			// Headers.get() 对于 append 添加的值会返回逗号连接的字符串
			const value = headers.get('accept');
			expect(value).toContain('text/html');
			expect(value).toContain('application/json');
		});

		it('应过滤数组中的 null 和 undefined 值', () => {
			const headers = fromNodeHeaders({
				accept: ['text/html', null, undefined, 'application/json'] as unknown as string[]
			});

			const value = headers.get('accept');
			expect(value).toContain('text/html');
			expect(value).toContain('application/json');
			// 过滤后应只有两个有效值
			expect(value?.split(',').length).toBe(2);
		});
	});

	describe('空值处理', () => {
		it('应跳过 undefined 值', () => {
			const headers = fromNodeHeaders({
				'content-type': 'application/json',
				authorization: undefined
			});

			expect(headers.get('content-type')).toBe('application/json');
			expect(headers.get('authorization')).toBeNull();
		});

		it('应跳过 null 值', () => {
			const headers = fromNodeHeaders({
				'content-type': 'application/json',
				authorization: null
			});

			expect(headers.get('content-type')).toBe('application/json');
			expect(headers.get('authorization')).toBeNull();
		});
	});

	describe('类型转换', () => {
		it('应将数字值转换为字符串', () => {
			const headers = fromNodeHeaders({
				'content-length': 1234 as unknown as string
			});

			expect(headers.get('content-length')).toBe('1234');
		});

		it('应将布尔值转换为字符串', () => {
			const headers = fromNodeHeaders({
				'x-custom': true as unknown as string
			});

			expect(headers.get('x-custom')).toBe('true');
		});
	});

	describe('边界情况', () => {
		it('应处理 null 或 undefined 输入', () => {
			// @ts-expect-error 测试边界情况
			const headersNull = fromNodeHeaders(null);
			expect(headersNull).toBeInstanceOf(Headers);

			// @ts-expect-error 测试边界情况
			const headersUndefined = fromNodeHeaders(undefined);
			expect(headersUndefined).toBeInstanceOf(Headers);
		});

		it('应处理空字符串值', () => {
			const headers = fromNodeHeaders({
				'x-empty': ''
			});

			expect(headers.get('x-empty')).toBe('');
		});

		it('应处理包含特殊字符的 header 值', () => {
			const headers = fromNodeHeaders({
				authorization:
					'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U'
			});

			expect(headers.get('authorization')).toBe(
				'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U'
			);
		});

		it('应正确处理 URL 编码的 header 值', () => {
			const encodedValue = encodeURIComponent('https://example.com?callback=/auth');
			const headers = fromNodeHeaders({
				'x-redirect-uri': encodedValue
			});

			expect(headers.get('x-redirect-uri')).toBe(encodedValue);
		});
	});

	describe('多 header 组合', () => {
		it('应正确处理多个不同的 header', () => {
			const headers = fromNodeHeaders({
				'content-type': 'application/json',
				accept: 'application/json',
				authorization: 'Bearer token123',
				'user-agent': 'TestAgent/1.0'
			});

			expect(headers.get('content-type')).toBe('application/json');
			expect(headers.get('accept')).toBe('application/json');
			expect(headers.get('authorization')).toBe('Bearer token123');
			expect(headers.get('user-agent')).toBe('TestAgent/1.0');
		});
	});
});
