module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'jsdom',
    
    // 文件匹配
    testMatch: [
        '<rootDir>/tests/**/*.test.ts',
        '<rootDir>/assets/scripts/**/*.test.ts'
    ],
    
    // 模块解析
    moduleNameMapping: {
        '^@core/(.*)$': '<rootDir>/assets/scripts/core/$1',
        '^@models/(.*)$': '<rootDir>/assets/scripts/models/$1',
        '^@systems/(.*)$': '<rootDir>/assets/scripts/systems/$1',
        '^@ui/(.*)$': '<rootDir>/assets/scripts/ui/$1',
        '^@utils/(.*)$': '<rootDir>/assets/scripts/utils/$1',
        '^@controllers/(.*)$': '<rootDir>/assets/scripts/controllers/$1',
        '^@tools/(.*)$': '<rootDir>/tools/$1'
    },
    
    // 设置文件
    setupFilesAfterEnv: [
        '<rootDir>/tests/setup.ts'
    ],
    
    // 覆盖率配置
    collectCoverageFrom: [
        'assets/scripts/**/*.ts',
        '!assets/scripts/**/*.d.ts',
        '!assets/scripts/**/*.test.ts',
        '!assets/scripts/**/*.spec.ts'
    ],
    
    // 覆盖率阈值
    coverageThreshold: {
        global: {
            branches: 80,
            functions: 80,
            lines: 85,
            statements: 80
        }
    },
    
    // 覆盖率报告
    coverageReporters: [
        'text',
        'lcov',
        'html'
    ],
    
    // 转换配置
    transform: {
        '^.+\\.ts$': 'ts-jest'
    },
    
    // 全局设置
    globals: {
        'ts-jest': {
            tsconfig: 'tsconfig.json'
        }
    },
    
    // 忽略文件
    testPathIgnorePatterns: [
        '<rootDir>/node_modules/',
        '<rootDir>/build/',
        '<rootDir>/temp/',
        '<rootDir>/library/'
    ],
    
    // 模拟文件
    moduleFileExtensions: [
        'ts',
        'tsx',
        'js',
        'jsx',
        'json'
    ]
};