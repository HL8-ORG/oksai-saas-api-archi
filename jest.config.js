/** @type {import('jest').Config} */
module.exports = {
	preset: 'ts-jest',
	testEnvironment: 'node',
	rootDir: '.',
	roots: ['<rootDir>/libs'],
	testMatch: ['**/*.spec.ts'],
	moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
	collectCoverageFrom: ['libs/**/*.ts', '!libs/**/*.spec.ts', '!libs/**/index.ts', '!libs/**/dist/**'],
	coverageDirectory: 'coverage',
	coverageReporters: ['text', 'lcov', 'html'],
	coveragePathIgnorePatterns: ['/node_modules/', '/dist/', '.*\\.d\\.ts$'],
	transform: {
		'^.+\\.tsx?$': [
			'ts-jest',
			{
				tsconfig: 'tsconfig.base.json'
			}
		]
	},
	moduleNameMapper: {
		'^@oksai/(.*)$': '<rootDir>/libs/shared/$1/src',
		'^@oksai/contracts$': '<rootDir>/libs/contracts/src',
		'^@oksai/domains/(.*)$': '<rootDir>/libs/domains/$1/src'
	},
	testPathIgnorePatterns: ['/node_modules/', '/dist/'],
	verbose: true,
	testTimeout: 10000
};
