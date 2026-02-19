import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { DatabaseMigratorService } from './database-migrator.service';

describe('DatabaseMigratorService', () => {
	let service: DatabaseMigratorService;
	let mockMigrator: { up: jest.Mock };
	let mockOrm: { getMigrator: jest.Mock };

	const originalEnv = process.env;

	beforeEach(async () => {
		// 重置环境变量
		process.env = { ...originalEnv };
		delete process.env.DB_MIGRATIONS_RUN;
		delete process.env.NODE_ENV;

		// 创建模拟的 Migrator
		mockMigrator = {
			up: jest.fn().mockResolvedValue([])
		};

		// 创建模拟的 MikroORM
		mockOrm = {
			getMigrator: jest.fn().mockReturnValue(mockMigrator)
		};

		const module: TestingModule = await Test.createTestingModule({
			providers: [DatabaseMigratorService]
		})
			.overrideProvider(DatabaseMigratorService)
			.useFactory({
				factory: () => new DatabaseMigratorService(mockOrm as any),
				inject: []
			})
			.compile();

		service = module.get<DatabaseMigratorService>(DatabaseMigratorService);
	});

	afterEach(() => {
		process.env = originalEnv;
		jest.clearAllMocks();
	});

	describe('onModuleInit', () => {
		it('应正确实例化', () => {
			expect(service).toBeDefined();
		});

		it('当 DB_MIGRATIONS_RUN=true 时，应执行迁移', async () => {
			process.env.DB_MIGRATIONS_RUN = 'true';

			// 重新创建服务实例以应用新的环境变量
			service = new DatabaseMigratorService(mockOrm as any);
			await service.onModuleInit();

			expect(mockOrm.getMigrator).toHaveBeenCalled();
			expect(mockMigrator.up).toHaveBeenCalled();
		});

		it('当 DB_MIGRATIONS_RUN=false 时，应跳过迁移', async () => {
			process.env.DB_MIGRATIONS_RUN = 'false';

			service = new DatabaseMigratorService(mockOrm as any);
			await service.onModuleInit();

			expect(mockMigrator.up).not.toHaveBeenCalled();
		});

		it('当 DB_MIGRATIONS_RUN 未设置且 NODE_ENV=development 时，应执行迁移', async () => {
			process.env.NODE_ENV = 'development';
			delete process.env.DB_MIGRATIONS_RUN;

			service = new DatabaseMigratorService(mockOrm as any);
			await service.onModuleInit();

			expect(mockMigrator.up).toHaveBeenCalled();
		});

		it('当 DB_MIGRATIONS_RUN 未设置且 NODE_ENV 未设置时（默认 development），应执行迁移', async () => {
			delete process.env.DB_MIGRATIONS_RUN;
			delete process.env.NODE_ENV;

			service = new DatabaseMigratorService(mockOrm as any);
			await service.onModuleInit();

			expect(mockMigrator.up).toHaveBeenCalled();
		});

		it('当 DB_MIGRATIONS_RUN 未设置且 NODE_ENV=production 时，应跳过迁移', async () => {
			process.env.NODE_ENV = 'production';
			delete process.env.DB_MIGRATIONS_RUN;

			service = new DatabaseMigratorService(mockOrm as any);
			await service.onModuleInit();

			expect(mockMigrator.up).not.toHaveBeenCalled();
		});

		it('当 DB_MIGRATIONS_RUN 未设置且 NODE_ENV=test 时，应跳过迁移', async () => {
			process.env.NODE_ENV = 'test';
			delete process.env.DB_MIGRATIONS_RUN;

			service = new DatabaseMigratorService(mockOrm as any);
			await service.onModuleInit();

			expect(mockMigrator.up).not.toHaveBeenCalled();
		});

		it('DB_MIGRATIONS_RUN=TRUE（大写）应执行迁移（toLowerCase 处理）', async () => {
			process.env.DB_MIGRATIONS_RUN = 'TRUE';
			process.env.NODE_ENV = 'production';

			service = new DatabaseMigratorService(mockOrm as any);
			await service.onModuleInit();

			expect(mockMigrator.up).toHaveBeenCalled();
		});

		it('DB_MIGRATIONS_RUN=True（首字母大写）应执行迁移（toLowerCase 处理）', async () => {
			process.env.DB_MIGRATIONS_RUN = 'True';
			process.env.NODE_ENV = 'production';

			service = new DatabaseMigratorService(mockOrm as any);
			await service.onModuleInit();

			expect(mockMigrator.up).toHaveBeenCalled();
		});

		it('DB_MIGRATIONS_RUN 带空格时应正确处理（需 trim）', async () => {
			process.env.DB_MIGRATIONS_RUN = ' true ';

			service = new DatabaseMigratorService(mockOrm as any);
			await service.onModuleInit();

			expect(mockMigrator.up).toHaveBeenCalled();
		});

		it('DB_MIGRATIONS_RUN 为无效值时应按默认逻辑处理', async () => {
			process.env.DB_MIGRATIONS_RUN = 'yes';
			process.env.NODE_ENV = 'development';

			service = new DatabaseMigratorService(mockOrm as any);
			await service.onModuleInit();

			// 'yes' 既不是 'true' 也不是 'false'，应按 development 逻辑执行
			expect(mockMigrator.up).toHaveBeenCalled();
		});

		it('迁移执行时记录日志', async () => {
			process.env.DB_MIGRATIONS_RUN = 'true';

			const loggerSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation();

			service = new DatabaseMigratorService(mockOrm as any);
			await service.onModuleInit();

			expect(loggerSpy).toHaveBeenCalledWith('开始执行数据库迁移...');
			expect(loggerSpy).toHaveBeenCalledWith('数据库迁移执行完成。');

			loggerSpy.mockRestore();
		});

		it('迁移失败时应抛出异常', async () => {
			process.env.DB_MIGRATIONS_RUN = 'true';
			const migrationError = new Error('Migration failed');
			mockMigrator.up.mockRejectedValue(migrationError);

			service = new DatabaseMigratorService(mockOrm as any);

			await expect(service.onModuleInit()).rejects.toThrow('Migration failed');
		});

		it('应只调用一次 getMigrator', async () => {
			process.env.DB_MIGRATIONS_RUN = 'true';

			service = new DatabaseMigratorService(mockOrm as any);
			await service.onModuleInit();

			expect(mockOrm.getMigrator).toHaveBeenCalledTimes(1);
		});
	});

	describe('isEnabled 逻辑（私有方法间接测试）', () => {
		it('DB_MIGRATIONS_RUN=true 强制启用迁移', async () => {
			process.env.DB_MIGRATIONS_RUN = 'true';
			process.env.NODE_ENV = 'production';

			service = new DatabaseMigratorService(mockOrm as any);
			await service.onModuleInit();

			expect(mockMigrator.up).toHaveBeenCalled();
		});

		it('DB_MIGRATIONS_RUN=false 强制禁用迁移', async () => {
			process.env.DB_MIGRATIONS_RUN = 'false';
			process.env.NODE_ENV = 'development';

			service = new DatabaseMigratorService(mockOrm as any);
			await service.onModuleInit();

			expect(mockMigrator.up).not.toHaveBeenCalled();
		});

		it('未配置时 development 环境默认执行迁移', async () => {
			delete process.env.DB_MIGRATIONS_RUN;
			process.env.NODE_ENV = 'development';

			service = new DatabaseMigratorService(mockOrm as any);
			await service.onModuleInit();

			expect(mockMigrator.up).toHaveBeenCalled();
		});

		it('未配置时非 development 环境默认不执行迁移', async () => {
			delete process.env.DB_MIGRATIONS_RUN;
			process.env.NODE_ENV = 'staging';

			service = new DatabaseMigratorService(mockOrm as any);
			await service.onModuleInit();

			expect(mockMigrator.up).not.toHaveBeenCalled();
		});
	});
});
