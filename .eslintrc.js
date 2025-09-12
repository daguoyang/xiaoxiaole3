module.exports = {
    root: true,
    env: {
        browser: true,
        es2020: true,
        node: true
    },
    extends: [
        '@typescript-eslint/recommended',
        'prettier'
    ],
    parser: '@typescript-eslint/parser',
    parserOptions: {
        ecmaVersion: 2020,
        sourceType: 'module',
        project: './tsconfig.json'
    },
    plugins: [
        '@typescript-eslint'
    ],
    rules: {
        // TypeScript 特定规则
        '@typescript-eslint/no-unused-vars': 'error',
        '@typescript-eslint/explicit-function-return-type': 'warn',
        '@typescript-eslint/no-explicit-any': 'warn',
        '@typescript-eslint/prefer-interface': 'off',
        '@typescript-eslint/no-empty-function': 'warn',
        
        // 通用代码质量规则
        'prefer-const': 'error',
        'no-var': 'error',
        'no-console': 'warn',
        'no-debugger': 'error',
        
        // 命名约定
        '@typescript-eslint/naming-convention': [
            'error',
            {
                'selector': 'default',
                'format': ['camelCase']
            },
            {
                'selector': 'variable',
                'format': ['camelCase', 'UPPER_CASE']
            },
            {
                'selector': 'parameter',
                'format': ['camelCase'],
                'leadingUnderscore': 'allow'
            },
            {
                'selector': 'memberLike',
                'modifiers': ['private'],
                'format': ['camelCase'],
                'leadingUnderscore': 'require'
            },
            {
                'selector': 'typeLike',
                'format': ['PascalCase']
            },
            {
                'selector': 'enumMember',
                'format': ['UPPER_CASE']
            }
        ],
        
        // Cocos Creator 特定设置
        '@typescript-eslint/no-inferrable-types': 'off', // Cocos 装饰器需要
        '@typescript-eslint/explicit-module-boundary-types': 'off'
    },
    ignorePatterns: [
        'temp/**',
        'library/**',
        'build/**',
        'node_modules/**',
        '*.js'
    ]
};