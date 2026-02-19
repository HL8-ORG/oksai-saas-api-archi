import { Specification, ISpecification } from './specification';

// ==================== 测试用的具体规格实现 ====================

class TrueSpecification<T> extends Specification<T> {
	isSatisfiedBy(_candidate: T): boolean {
		return true;
	}
}

class FalseSpecification<T> extends Specification<T> {
	isSatisfiedBy(_candidate: T): boolean {
		return false;
	}
}

// ==================== Specification 基类测试 ====================

describe('Specification', () => {
	interface TestEntity {
		value: number;
	}

	describe('and 组合操作', () => {
		it('两个 true 规格 AND 应返回 true', () => {
			// Arrange
			const spec1 = new TrueSpecification<TestEntity>();
			const spec2 = new TrueSpecification<TestEntity>();
			const combined = spec1.and(spec2);
			const candidate: TestEntity = { value: 1 };

			// Act
			const result = combined.isSatisfiedBy(candidate);

			// Assert
			expect(result).toBe(true);
		});

		it('true 和 false 规格 AND 应返回 false', () => {
			// Arrange
			const spec1 = new TrueSpecification<TestEntity>();
			const spec2 = new FalseSpecification<TestEntity>();
			const combined = spec1.and(spec2);
			const candidate: TestEntity = { value: 1 };

			// Act
			const result = combined.isSatisfiedBy(candidate);

			// Assert
			expect(result).toBe(false);
		});

		it('两个 false 规格 AND 应返回 false', () => {
			// Arrange
			const spec1 = new FalseSpecification<TestEntity>();
			const spec2 = new FalseSpecification<TestEntity>();
			const combined = spec1.and(spec2);
			const candidate: TestEntity = { value: 1 };

			// Act
			const result = combined.isSatisfiedBy(candidate);

			// Assert
			expect(result).toBe(false);
		});

		it('支持链式 AND 组合', () => {
			// Arrange
			const spec1 = new TrueSpecification<TestEntity>();
			const spec2 = new TrueSpecification<TestEntity>();
			const spec3 = new TrueSpecification<TestEntity>();
			const combined = spec1.and(spec2).and(spec3);
			const candidate: TestEntity = { value: 1 };

			// Act
			const result = combined.isSatisfiedBy(candidate);

			// Assert
			expect(result).toBe(true);
		});
	});

	describe('or 组合操作', () => {
		it('两个 true 规格 OR 应返回 true', () => {
			// Arrange
			const spec1 = new TrueSpecification<TestEntity>();
			const spec2 = new TrueSpecification<TestEntity>();
			const combined = spec1.or(spec2);
			const candidate: TestEntity = { value: 1 };

			// Act
			const result = combined.isSatisfiedBy(candidate);

			// Assert
			expect(result).toBe(true);
		});

		it('true 和 false 规格 OR 应返回 true', () => {
			// Arrange
			const spec1 = new TrueSpecification<TestEntity>();
			const spec2 = new FalseSpecification<TestEntity>();
			const combined = spec1.or(spec2);
			const candidate: TestEntity = { value: 1 };

			// Act
			const result = combined.isSatisfiedBy(candidate);

			// Assert
			expect(result).toBe(true);
		});

		it('两个 false 规格 OR 应返回 false', () => {
			// Arrange
			const spec1 = new FalseSpecification<TestEntity>();
			const spec2 = new FalseSpecification<TestEntity>();
			const combined = spec1.or(spec2);
			const candidate: TestEntity = { value: 1 };

			// Act
			const result = combined.isSatisfiedBy(candidate);

			// Assert
			expect(result).toBe(false);
		});
	});

	describe('not 取反操作', () => {
		it('true 规格 NOT 应返回 false', () => {
			// Arrange
			const spec = new TrueSpecification<TestEntity>();
			const negated = spec.not();
			const candidate: TestEntity = { value: 1 };

			// Act
			const result = negated.isSatisfiedBy(candidate);

			// Assert
			expect(result).toBe(false);
		});

		it('false 规格 NOT 应返回 true', () => {
			// Arrange
			const spec = new FalseSpecification<TestEntity>();
			const negated = spec.not();
			const candidate: TestEntity = { value: 1 };

			// Act
			const result = negated.isSatisfiedBy(candidate);

			// Assert
			expect(result).toBe(true);
		});
	});

	describe('复杂组合', () => {
		it('支持 AND + OR + NOT 复杂组合', () => {
			// Arrange
			const trueSpec = new TrueSpecification<TestEntity>();
			const falseSpec = new FalseSpecification<TestEntity>();
			const candidate: TestEntity = { value: 1 };

			// (true AND false) OR (NOT false) = false OR true = true
			const combined = trueSpec.and(falseSpec).or(falseSpec.not());

			// Act
			const result = combined.isSatisfiedBy(candidate);

			// Assert
			expect(result).toBe(true);
		});
	});
});

// ==================== ISpecification 接口测试 ====================

describe('ISpecification', () => {
	it('Specification 应实现 ISpecification 接口', () => {
		// Arrange
		const spec: ISpecification<any> = new TrueSpecification();

		// Assert
		expect(spec.isSatisfiedBy).toBeDefined();
		expect(spec.and).toBeDefined();
		expect(spec.or).toBeDefined();
		expect(spec.not).toBeDefined();
	});
});
