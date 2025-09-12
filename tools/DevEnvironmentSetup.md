# 🛠 开发环境配置指南

## 开发工具链

### 核心开发环境
- **Cocos Creator**: 3.8.3+
- **Node.js**: 16.0+ (推荐使用 LTS 版本)
- **TypeScript**: 4.9+
- **Git**: 2.30+

### 代码编辑器配置
推荐使用 **Visual Studio Code** 配合以下插件：

```json
// .vscode/extensions.json
{
    "recommendations": [
        "ms-vscode.vscode-typescript-next",
        "esbenp.prettier-vscode",
        "ms-vscode.vscode-eslint",
        "bradlc.vscode-tailwindcss",
        "ms-vscode.vscode-json"
    ]
}
```

### 项目配置文件

#### tsconfig.json
```json
{
    "compilerOptions": {
        "target": "ES2020",
        "module": "ESNext",
        "lib": ["ES2020", "DOM"],
        "strict": true,
        "esModuleInterop": true,
        "skipLibCheck": true,
        "forceConsistentCasingInFileNames": true,
        "baseUrl": "./assets/scripts",
        "paths": {
            "@core/*": ["core/*"],
            "@models/*": ["models/*"],
            "@systems/*": ["systems/*"],
            "@ui/*": ["ui/*"],
            "@utils/*": ["utils/*"],
            "@controllers/*": ["controllers/*"],
            "@tools/*": ["tools/*"]
        }
    }
}
```

#### .eslintrc.js
```javascript
module.exports = {
    extends: [
        '@typescript-eslint/recommended',
        'prettier'
    ],
    parser: '@typescript-eslint/parser',
    plugins: ['@typescript-eslint'],
    rules: {
        '@typescript-eslint/no-unused-vars': 'error',
        '@typescript-eslint/explicit-function-return-type': 'warn',
        'prefer-const': 'error',
        'no-var': 'error'
    }
};
```

#### prettier.config.js
```javascript
module.exports = {
    semi: true,
    trailingComma: 'es5',
    singleQuote: true,
    printWidth: 100,
    tabWidth: 4,
    useTabs: false
};
```

## 构建和部署脚本

### package.json 脚本扩展
```json
{
    "scripts": {
        "dev": "cocos preview --mode=dev",
        "build": "cocos build",
        "build:web": "cocos build --platform=web-mobile",
        "build:wechat": "cocos build --platform=wechat-game",
        "test": "jest",
        "test:watch": "jest --watch",
        "test:coverage": "jest --coverage",
        "lint": "eslint assets/scripts --ext .ts",
        "lint:fix": "eslint assets/scripts --ext .ts --fix",
        "format": "prettier --write assets/scripts/**/*.ts",
        "type-check": "tsc --noEmit",
        "migrate-levels": "node tools/runMigration.js",
        "batch-process": "node tools/runBatchProcessor.js",
        "generate-docs": "typedoc assets/scripts",
        "analyze-bundle": "node tools/bundleAnalyzer.js"
    }
}
```

### 自动化脚本

#### tools/runMigration.js
```javascript
const { LevelDataMigrator } = require('../dist/tools/LevelDataMigrator');

async function runMigration() {
    const config = {
        sourcePath: 'legacy/levels',
        outputPath: 'assets/resources/levels',
        batchSize: 50,
        validateAfterMigration: true,
        createBackup: true,
        logProgress: true
    };

    const migrator = new LevelDataMigrator(config);
    
    try {
        console.log('🚀 开始关卡数据迁移...');
        const result = await migrator.migrateAllLevels();
        
        console.log('✅ 迁移完成!');
        console.log(`成功: ${result.successfulMigrations}`);
        console.log(`失败: ${result.failedMigrations}`);
        
        if (result.errors.length > 0) {
            console.log('\n❌ 错误列表:');
            result.errors.forEach(error => {
                console.log(`  Level ${error.levelId}: ${error.error}`);
            });
        }
        
    } catch (error) {
        console.error('❌ 迁移失败:', error);
        process.exit(1);
    }
}

runMigration();
```

## Git 工作流配置

### .gitignore
```gitignore
# Cocos Creator
/library/
/local/
/temp/
/build/
/.creator/

# Node.js
node_modules/
npm-debug.log*
.npm

# TypeScript
*.tsbuildinfo

# 测试覆盖率
/coverage/

# IDE
.vscode/settings.json
.idea/

# 临时文件
*.tmp
*.temp
.DS_Store

# 构建输出
/dist/
/release/
```

### Git Hooks (husky)
```json
// package.json
{
    "husky": {
        "hooks": {
            "pre-commit": "lint-staged",
            "pre-push": "npm run test && npm run type-check"
        }
    },
    "lint-staged": {
        "*.ts": [
            "eslint --fix",
            "prettier --write",
            "git add"
        ]
    }
}
```

## 调试和开发工具

### 游戏内调试面板
```typescript
// tools/DebugPanel.ts
export class DebugPanel {
    private static _instance: DebugPanel;
    private _panel: Node;
    private _isVisible: boolean = false;

    public static getInstance(): DebugPanel {
        if (!DebugPanel._instance) {
            DebugPanel._instance = new DebugPanel();
        }
        return DebugPanel._instance;
    }

    public show(): void {
        if (GameConfig.DEBUG_MODE) {
            this.createPanel();
            this._isVisible = true;
        }
    }

    private createPanel(): void {
        // 创建调试面板UI
        // 显示FPS、内存使用、游戏状态等信息
    }

    public addDebugInfo(key: string, value: any): void {
        if (this._isVisible) {
            // 更新调试信息显示
        }
    }
}
```

### 性能监控工具
```typescript
// tools/PerformanceMonitor.ts
export class PerformanceMonitor {
    private _frameTime: number[] = [];
    private _memoryUsage: number[] = [];
    private _startTime: number = Date.now();

    public startFrame(): void {
        this._frameStartTime = performance.now();
    }

    public endFrame(): void {
        const frameTime = performance.now() - this._frameStartTime;
        this._frameTime.push(frameTime);
        
        if (this._frameTime.length > 60) {
            this._frameTime.shift();
        }
    }

    public getAverageFPS(): number {
        if (this._frameTime.length === 0) return 60;
        
        const avgFrameTime = this._frameTime.reduce((sum, time) => sum + time, 0) / this._frameTime.length;
        return 1000 / avgFrameTime;
    }

    public getMemoryUsage(): number {
        if ('memory' in performance) {
            return (performance as any).memory.usedJSHeapSize / 1024 / 1024; // MB
        }
        return 0;
    }
}
```

## 持续集成配置

### GitHub Actions
```yaml
# .github/workflows/ci.yml
name: CI/CD Pipeline

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '16'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Run tests
      run: npm run test:coverage
    
    - name: Type check
      run: npm run type-check
    
    - name: Lint
      run: npm run lint
    
    - name: Upload coverage
      uses: codecov/codecov-action@v3

  build:
    needs: test
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Build project
      run: |
        npm ci
        npm run build
    
    - name: Archive build
      uses: actions/upload-artifact@v3
      with:
        name: build-files
        path: build/
```

## 开发环境检查清单

### 初始设置检查
- [ ] Node.js 版本 >= 16.0
- [ ] Cocos Creator 版本 = 3.8.3
- [ ] TypeScript 全局安装
- [ ] Git 配置完成
- [ ] VSCode 插件安装完成

### 项目配置检查
- [ ] package.json 依赖安装成功
- [ ] tsconfig.json 配置正确
- [ ] ESLint 和 Prettier 配置生效
- [ ] Git hooks 配置正常
- [ ] 构建脚本可以正常运行

### 开发工具检查
- [ ] 代码提示和补全正常
- [ ] 类型检查无错误
- [ ] 代码格式化自动工作
- [ ] 测试命令可以执行
- [ ] 调试面板可以正常显示

完成这些配置后，开发环境就完全就绪，可以开始高效的开发工作了！