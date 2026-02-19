import 'reflect-metadata';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { BadRequestException } from '@nestjs/common';
import { ValidationPipe, UseValidationDto, CQRS_VALIDATION_DTO_KEY } from './validation.pipe';
import { createCqrsContext } from '../pipeline';
import type { ICommand } from '../../interfaces';

jest.mock('class-validator');
jest.mock('class-transformer');

describe('ValidationPipe', () => {
	let validationPipe: ValidationPipe;
	const mockValidate = validate as jest.MockedFunction<typeof validate>;
	const mockPlainToInstance = plainToInstance as jest.MockedFunction<typeof plainToInstance>;

	beforeEach(() => {
		jest.clearAllMocks();
		validationPipe = new ValidationPipe();
	});

	describe('基本属性', () => {
		it('应该有正确的管道名称', () => {
			expect(validationPipe.name).toBe('ValidationPipe');
		});
	});

	describe('execute', () => {
		it('当没有 @UseValidationDto 装饰器时应该跳过校验', async () => {
			const command: ICommand = { type: 'TestCommand' };
			const context = createCqrsContext('TestCommand', command);
			const next = jest.fn().mockResolvedValue('result');

			const result = await validationPipe.execute(context, next);

			expect(result).toBe('result');
			expect(next).toHaveBeenCalled();
			expect(mockValidate).not.toHaveBeenCalled();
		});

		it('当有 @UseValidationDto 装饰器时应该执行校验', async () => {
			class TestDto {
				name!: string;
			}

			@UseValidationDto(TestDto)
			class TestCommand implements ICommand {
				type = 'TestCommand' as const;
				name!: string;
			}

			const command = new TestCommand();
			command.name = 'test';

			const context = createCqrsContext('TestCommand', command);
			const next = jest.fn().mockResolvedValue('result');

			mockPlainToInstance.mockReturnValue({ name: 'test' });
			mockValidate.mockResolvedValue([]);

			const result = await validationPipe.execute(context, next);

			expect(result).toBe('result');
			expect(mockPlainToInstance).toHaveBeenCalledWith(TestDto, command);
			expect(mockValidate).toHaveBeenCalled();
		});

		it('当校验失败时应该抛出 BadRequestException', async () => {
			class TestDto {
				name!: string;
			}

			@UseValidationDto(TestDto)
			class TestCommand implements ICommand {
				type = 'TestCommand' as const;
				name!: string;
			}

			const command = new TestCommand();
			const context = createCqrsContext('TestCommand', command);
			const next = jest.fn().mockResolvedValue('result');

			mockPlainToInstance.mockReturnValue({ name: '' });
			mockValidate.mockResolvedValue([
				{
					property: 'name',
					constraints: { isNotEmpty: 'name should not be empty' },
					children: []
				} as any
			]);

			await expect(validationPipe.execute(context, next)).rejects.toThrow(BadRequestException);
			await expect(validationPipe.execute(context, next)).rejects.toThrow('输入参数校验失败');
			expect(next).not.toHaveBeenCalled();
		});

		it('当 transform 选项为 false 时应该使用 Object.assign', async () => {
			class TestDto {
				name!: string;
			}

			@UseValidationDto(TestDto)
			class TestCommand implements ICommand {
				type = 'TestCommand' as const;
				name!: string;
			}

			const pipe = new ValidationPipe({ transform: false });
			const command = new TestCommand();
			command.name = 'test';

			const context = createCqrsContext('TestCommand', command);
			const next = jest.fn().mockResolvedValue('result');

			mockValidate.mockResolvedValue([]);

			await pipe.execute(context, next);

			expect(mockPlainToInstance).not.toHaveBeenCalled();
		});
	});

	describe('formatErrors', () => {
		it('应该正确格式化单个错误', async () => {
			class TestDto {
				email!: string;
			}

			@UseValidationDto(TestDto)
			class TestCommand implements ICommand {
				type = 'TestCommand' as const;
				email!: string;
			}

			const command = new TestCommand();
			const context = createCqrsContext('TestCommand', command);
			const next = jest.fn().mockResolvedValue('result');

			mockPlainToInstance.mockReturnValue({ email: '' });
			mockValidate.mockResolvedValue([
				{
					property: 'email',
					constraints: { isEmail: 'must be an email' },
					children: []
				} as any
			]);

			try {
				await validationPipe.execute(context, next);
			} catch (error) {
				expect(error).toBeInstanceOf(BadRequestException);
				expect((error as BadRequestException).message).toContain('email');
			}
		});

		it('应该正确处理嵌套错误', async () => {
			class TestDto {
				address!: { city: string };
			}

			@UseValidationDto(TestDto)
			class TestCommand implements ICommand {
				type = 'TestCommand' as const;
				address!: { city: string };
			}

			const command = new TestCommand();
			const context = createCqrsContext('TestCommand', command);
			const next = jest.fn().mockResolvedValue('result');

			mockPlainToInstance.mockReturnValue({ address: { city: '' } });
			mockValidate.mockResolvedValue([
				{
					property: 'address',
					constraints: {},
					children: [
						{
							property: 'city',
							constraints: { isNotEmpty: 'should not be empty' },
							children: []
						} as any
					]
				} as any
			]);

			try {
				await validationPipe.execute(context, next);
			} catch (error) {
				expect(error).toBeInstanceOf(BadRequestException);
				expect((error as BadRequestException).message).toContain('address.city');
			}
		});
	});

	describe('translateErrorMessage', () => {
		it('应该翻译常见的英文错误消息', async () => {
			class TestDto {
				name!: string;
				count!: number;
				email!: string;
			}

			@UseValidationDto(TestDto)
			class TestCommand implements ICommand {
				type = 'TestCommand' as const;
				name!: string;
				count!: number;
				email!: string;
			}

			const command = new TestCommand();
			const context = createCqrsContext('TestCommand', command);
			const next = jest.fn().mockResolvedValue('result');

			mockPlainToInstance.mockReturnValue({ name: '', count: 'not-number', email: 'invalid' });
			mockValidate.mockResolvedValue([
				{
					property: 'name',
					constraints: { isNotEmpty: 'should not be empty' },
					children: []
				} as any,
				{
					property: 'count',
					constraints: { isNumber: 'must be a number' },
					children: []
				} as any,
				{
					property: 'email',
					constraints: { isEmail: 'must be an email' },
					children: []
				} as any
			]);

			try {
				await validationPipe.execute(context, next);
			} catch (error) {
				const message = (error as BadRequestException).message;
				expect(message).toContain('不能为空');
				expect(message).toContain('必须是数字');
				expect(message).toContain('邮箱地址');
			}
		});
	});

	describe('配置选项', () => {
		it('应该使用 forbidUnknownValues 选项', async () => {
			class TestDto {
				name!: string;
			}

			@UseValidationDto(TestDto)
			class TestCommand implements ICommand {
				type = 'TestCommand' as const;
				name!: string;
			}

			const pipe = new ValidationPipe({ forbidUnknownValues: true });
			const command = new TestCommand();
			const context = createCqrsContext('TestCommand', command);
			const next = jest.fn().mockResolvedValue('result');

			mockPlainToInstance.mockReturnValue({ name: 'test' });
			mockValidate.mockResolvedValue([]);

			await pipe.execute(context, next);

			expect(mockValidate).toHaveBeenCalledWith(
				expect.any(Object),
				expect.objectContaining({ forbidUnknownValues: true })
			);
		});

		it('应该使用 enableDebugMessages 选项显示详细错误', async () => {
			class TestDto {
				name!: string;
			}

			@UseValidationDto(TestDto)
			class TestCommand implements ICommand {
				type = 'TestCommand' as const;
				name!: string;
			}

			const pipe = new ValidationPipe({ enableDebugMessages: true });
			const command = new TestCommand();
			const context = createCqrsContext('TestCommand', command);
			const next = jest.fn().mockResolvedValue('result');

			mockPlainToInstance.mockReturnValue({ name: '' });
			mockValidate.mockResolvedValue([
				{
					property: 'name',
					constraints: { custom: 'unknown validation rule' },
					children: []
				} as any
			]);

			try {
				await pipe.execute(context, next);
			} catch (error) {
				expect((error as BadRequestException).message).toContain('unknown validation rule');
			}
		});
	});
});

describe('UseValidationDto', () => {
	it('应该在目标类上设置 DTO 元数据', () => {
		class TestDto {
			name!: string;
		}

		@UseValidationDto(TestDto)
		class TestCommand implements ICommand {
			type = 'TestCommand' as const;
			name!: string;
		}

		const metadata = Reflect.getMetadata(CQRS_VALIDATION_DTO_KEY, TestCommand);

		expect(metadata).toBe(TestDto);
	});

	it('应该支持不同的 DTO 类', () => {
		class CreateUserDto {
			name!: string;
			email!: string;
		}

		class UpdateUserDto {
			id!: string;
			name!: string;
		}

		@UseValidationDto(CreateUserDto)
		class CreateUserCommand implements ICommand {
			type = 'CreateUser' as const;
			name!: string;
			email!: string;
		}

		@UseValidationDto(UpdateUserDto)
		class UpdateUserCommand implements ICommand {
			type = 'UpdateUser' as const;
			id!: string;
			name!: string;
		}

		const createMetadata = Reflect.getMetadata(CQRS_VALIDATION_DTO_KEY, CreateUserCommand);
		const updateMetadata = Reflect.getMetadata(CQRS_VALIDATION_DTO_KEY, UpdateUserCommand);

		expect(createMetadata).toBe(CreateUserDto);
		expect(updateMetadata).toBe(UpdateUserDto);
	});
});
