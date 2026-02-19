/** @type {import('jest').Config} */
module.exports = {
	preset: 'ts-jest',
	testEnvironment: 'node',
	rootDir: '.',
	roots: ['<rootDir>/src'],
	testMatch: ['**/*.spec.ts'],
	moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
	collectCoverageFrom: ['src/**/*.ts', '!src/**/*.spec.ts', '!src/**/index.ts'],
	coverageDirectory: 'coverage',
	coverageReporters: ['text', 'lcov', 'html'],
	coveragePathIgnorePatterns: ['/node_modules/', '/dist/', '.*\\.d\\.ts$'],
	transform: {
		'^.+\\.tsx?$': [
			'ts-jest',
			{
				tsconfig: 'tsconfig.json'
			}
		]
	},
	moduleNameMapper: {
		'^@oksai/(.*)$': '<rootDir>/../../shared/$1/src',
		'^@oksai/contracts$': '<rootDir>/../../../contracts/src',
		'^@oksai/domains/(.*)$': '<rootDir>/../../../domains/$1/src'
	},
	testPathIgnorePatterns: ['/node_modules/', '/dist/'],
	verbose: true,
	testTimeout: 10000
};
