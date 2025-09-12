module.exports = {
    // 基础格式
    semi: true,
    trailingComma: 'es5',
    singleQuote: true,
    printWidth: 100,
    tabWidth: 4,
    useTabs: false,
    
    // 对象和数组格式
    bracketSpacing: true,
    bracketSameLine: false,
    
    // 箭头函数
    arrowParens: 'avoid',
    
    // 行尾格式
    endOfLine: 'lf',
    
    // TypeScript 特定
    parser: 'typescript',
    
    // 文件覆盖规则
    overrides: [
        {
            files: '*.json',
            options: {
                tabWidth: 2
            }
        },
        {
            files: '*.md',
            options: {
                tabWidth: 2,
                printWidth: 80
            }
        }
    ]
};