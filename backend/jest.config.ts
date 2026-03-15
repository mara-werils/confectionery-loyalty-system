import type { Config } from 'jest';

const config: Config = {
    preset: 'ts-jest/presets/default-esm',
    testEnvironment: 'node',
    roots: ['<rootDir>/src'],
    testMatch: ['**/__tests__/**/*.test.ts'],
    extensionsToTreatAsEsm: ['.ts'],
    transform: {
        '^.+\\.tsx?$': [
            'ts-jest',
            {
                useESM: true,
            },
        ],
    },
    moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
        '^@services/(.*)$': '<rootDir>/src/services/$1',
        '^@middleware/(.*)$': '<rootDir>/src/middleware/$1',
        '^@utils/(.*)$': '<rootDir>/src/utils/$1',
        '^@config/(.*)$': '<rootDir>/src/config/$1',
        '^(\\.{1,2}/.*)\\.js$': '$1',
    },

    clearMocks: true,
    collectCoverage: true,
    coverageDirectory: 'coverage',
    setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup.ts'],
};



export default config;
