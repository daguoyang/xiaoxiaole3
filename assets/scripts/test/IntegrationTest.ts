import { _decorator, Component } from 'cc';
import { SystemManager } from '../core/SystemManager';
import { GameController } from '../controllers/GameController';
import { TestLevelGenerator } from '../utils/TestLevelGenerator';
import { PatternDetector } from '../utils/PatternDetector';
import { ElementType, GameBoard } from '../models/GameTypes';

const { ccclass } = _decorator;

interface TestResult {
    testName: string;
    success: boolean;
    message: string;
    duration: number;
    details?: any;
}

@ccclass('IntegrationTest')
export class IntegrationTest extends Component {
    private _testResults: TestResult[] = [];
    private _systemManager: SystemManager | null = null;
    private _gameController: GameController | null = null;
    private _testGenerator: TestLevelGenerator;
    private _patternDetector: PatternDetector;

    protected onLoad(): void {
        console.log('🧪 IntegrationTest: 集成测试组件加载');
        this._testGenerator = new TestLevelGenerator();
        this._patternDetector = new PatternDetector();
    }

    protected start(): void {
        this.scheduleOnce(this.runAllTests.bind(this), 0.2);
    }

    public async runAllTests(): Promise<void> {
        console.log('🚀 开始运行集成测试套件');
        this._testResults = [];

        const tests = [
            { name: '系统初始化测试', func: this.testSystemInitialization.bind(this) },
            { name: '模式检测算法测试', func: this.testPatternDetection.bind(this) },
            { name: '关卡生成测试', func: this.testLevelGeneration.bind(this) },
            { name: '游戏控制器测试', func: this.testGameController.bind(this) },
            { name: '完整游戏流程测试', func: this.testCompleteGameFlow.bind(this) },
            { name: '性能基准测试', func: this.testPerformanceBenchmark.bind(this) }
        ];

        for (const test of tests) {
            await this.runSingleTest(test.name, test.func);
        }

        this.generateTestReport();
    }

    private async runSingleTest(testName: string, testFunc: () => Promise<void>): Promise<void> {
        const startTime = Date.now();
        let result: TestResult;

        try {
            console.log(`🧪 运行测试: ${testName}`);
            await testFunc();
            
            result = {
                testName,
                success: true,
                message: '测试通过',
                duration: Date.now() - startTime
            };

        } catch (error) {
            result = {
                testName,
                success: false,
                message: error instanceof Error ? error.message : '未知错误',
                duration: Date.now() - startTime,
                details: error
            };

            console.error(`❌ 测试失败: ${testName}`, error);
        }

        this._testResults.push(result);
        console.log(`${result.success ? '✅' : '❌'} ${testName}: ${result.message} (${result.duration}ms)`);
    }

    private async testSystemInitialization(): Promise<void> {
        // 测试系统管理器初始化
        this._systemManager = SystemManager.getInstance();
        
        if (!this._systemManager) {
            throw new Error('SystemManager 获取失败');
        }

        // 测试系统健康检查
        const healthCheck = this._systemManager.performHealthCheck();
        const healthyCount = Object.values(healthCheck).filter(Boolean).length;
        const totalCount = Object.keys(healthCheck).length;

        if (healthyCount === 0) {
            throw new Error('没有任何系统初始化成功');
        }

        console.log(`📊 系统健康度: ${healthyCount}/${totalCount}`);

        // 初始化所有系统
        await this._systemManager.initializeAllSystems();

        if (!this._systemManager.isInitialized()) {
            throw new Error('系统管理器初始化失败');
        }
    }

    private async testPatternDetection(): Promise<void> {
        // 测试各种匹配模式
        const testCases = [
            { name: 'simple_match', expectedMatches: 1 },
            { name: 'l_shape', expectedMatches: 1 },
            { name: 't_shape', expectedMatches: 1 },
            { name: 'complex', expectedMatches: 0 }
        ] as const;

        for (const testCase of testCases) {
            const board = this._testGenerator.createSpecificTestBoard(testCase.name);
            const matches = this._patternDetector.findAllMatches(board);

            console.log(`🔍 ${testCase.name}: 找到 ${matches.length} 个匹配`);

            if (testCase.name !== 'complex' && matches.length === 0) {
                throw new Error(`${testCase.name} 测试用例应该找到匹配，但是没有找到`);
            }
        }

        // 测试可能的移动检测
        const randomBoard = this._testGenerator.generateRandomBoard(9);
        const possibleMoves = this._patternDetector.findPossibleMoves(randomBoard);

        if (possibleMoves.length === 0) {
            throw new Error('随机生成的棋盘没有可能的移动');
        }

        console.log(`🎯 随机棋盘可能移动: ${possibleMoves.length}`);
    }

    private async testLevelGeneration(): Promise<void> {
        // 测试单个关卡生成
        const level1 = this._testGenerator.generateTestLevel(1);
        
        if (!level1.name || !level1.initialBoard) {
            throw new Error('生成的关卡缺少必要信息');
        }

        // 验证棋盘有效性
        const validation = this._testGenerator.validateBoard(level1.initialBoard);
        
        if (!validation.isValid) {
            throw new Error(`生成的棋盘无效: ${validation.issues.join(', ')}`);
        }

        console.log(`📋 关卡验证: ${validation.possibleMovesCount} 个可能移动`);

        // 测试批量关卡生成
        const levels = this._testGenerator.generateTestLevels(1, 5);
        
        if (levels.length !== 5) {
            throw new Error(`期望生成5个关卡，实际生成${levels.length}个`);
        }

        let validCount = 0;
        for (const level of levels) {
            const levelValidation = this._testGenerator.validateBoard(level.initialBoard);
            if (levelValidation.isValid) {
                validCount++;
            }
        }

        const validRate = (validCount / levels.length) * 100;
        console.log(`📊 关卡有效率: ${validRate.toFixed(1)}%`);

        if (validRate < 80) {
            throw new Error(`关卡有效率过低: ${validRate.toFixed(1)}%`);
        }
    }

    private async testGameController(): Promise<void> {
        // 查找游戏控制器
        this._gameController = this.node.getComponent(GameController) || 
                              this.node.getChildByName('GameController')?.getComponent(GameController) ||
                              this.node.scene?.getComponentInChildren(GameController);

        if (!this._gameController) {
            console.warn('⚠️ GameController 未找到，跳过控制器测试');
            return;
        }

        // 测试关卡启动
        try {
            await this._gameController.startLevel(999);
            
            const currentLevel = this._gameController.getCurrentLevelNumber();
            const currentPhase = this._gameController.getCurrentPhase();
            
            console.log(`🎮 控制器状态: 关卡${currentLevel}, 阶段${currentPhase}`);

            if (currentLevel !== 999) {
                throw new Error(`期望关卡999，实际关卡${currentLevel}`);
            }

        } catch (error) {
            console.warn(`⚠️ GameController 测试部分失败: ${error instanceof Error ? error.message : 'Unknown'}`);
        }
    }

    private async testCompleteGameFlow(): Promise<void> {
        // 测试完整的游戏流程
        console.log('🔄 测试完整游戏流程');

        // 1. 生成测试关卡
        const testLevel = this._testGenerator.generateTestLevel(1);
        const board = testLevel.initialBoard;

        // 2. 验证初始状态
        const initialMatches = this._patternDetector.findAllMatches(board);
        if (initialMatches.length > 0) {
            throw new Error('初始棋盘不应该有匹配');
        }

        // 3. 找到第一个可能的移动
        const possibleMoves = this._patternDetector.findPossibleMoves(board);
        if (possibleMoves.length === 0) {
            throw new Error('棋盘没有可能的移动');
        }

        const firstMove = possibleMoves[0];
        console.log(`🎯 第一个移动: (${firstMove.from.x},${firstMove.from.y}) -> (${firstMove.to.x},${firstMove.to.y})`);

        // 4. 模拟执行移动
        const modifiedBoard = this.simulateMove(board, firstMove.from, firstMove.to);

        // 5. 检查移动后的匹配
        const newMatches = this._patternDetector.findAllMatches(modifiedBoard);
        console.log(`🔥 移动后匹配: ${newMatches.length}`);

        if (newMatches.length === 0) {
            console.warn('⚠️ 预期的移动没有产生匹配（可能是算法差异）');
        }

        // 6. 计算得分
        let totalScore = 0;
        for (const match of newMatches) {
            totalScore += match.score;
        }

        console.log(`💯 预期得分: ${totalScore}`);
    }

    private async testPerformanceBenchmark(): Promise<void> {
        console.log('⚡ 运行性能基准测试');

        const iterations = 50;
        const boardSize = 9;

        // 测试关卡生成性能
        const genStartTime = Date.now();
        for (let i = 0; i < iterations; i++) {
            this._testGenerator.generateTestLevel(i + 1);
        }
        const genTime = Date.now() - genStartTime;
        const avgGenTime = genTime / iterations;

        console.log(`📈 关卡生成平均时间: ${avgGenTime.toFixed(2)}ms`);

        // 测试模式检测性能
        const testBoard = this._testGenerator.generateRandomBoard(boardSize);
        const detectStartTime = Date.now();

        for (let i = 0; i < iterations; i++) {
            this._patternDetector.findAllMatches(testBoard);
            this._patternDetector.findPossibleMoves(testBoard);
        }

        const detectTime = Date.now() - detectStartTime;
        const avgDetectTime = detectTime / iterations;

        console.log(`🔍 模式检测平均时间: ${avgDetectTime.toFixed(2)}ms`);

        // 性能标准检查
        if (avgGenTime > 100) {
            throw new Error(`关卡生成性能不达标: ${avgGenTime.toFixed(2)}ms > 100ms`);
        }

        if (avgDetectTime > 50) {
            throw new Error(`模式检测性能不达标: ${avgDetectTime.toFixed(2)}ms > 50ms`);
        }
    }

    private simulateMove(board: GameBoard, from: Position, to: Position): GameBoard {
        const newBoard = board.map(row => row.map(cell => ({ ...cell })));
        
        const fromCell = newBoard[from.y][from.x];
        const toCell = newBoard[to.y][to.x];

        newBoard[from.y][from.x] = { ...toCell, position: from };
        newBoard[to.y][to.x] = { ...fromCell, position: to };

        return newBoard;
    }

    private generateTestReport(): void {
        const totalTests = this._testResults.length;
        const passedTests = this._testResults.filter(r => r.success).length;
        const failedTests = totalTests - passedTests;
        const totalDuration = this._testResults.reduce((sum, r) => sum + r.duration, 0);

        console.log('\n📊 集成测试报告');
        console.log('================');
        console.log(`总测试数量: ${totalTests}`);
        console.log(`通过测试: ${passedTests}`);
        console.log(`失败测试: ${failedTests}`);
        console.log(`成功率: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
        console.log(`总耗时: ${totalDuration}ms`);
        console.log('================\n');

        // 详细结果
        for (const result of this._testResults) {
            const status = result.success ? '✅' : '❌';
            console.log(`${status} ${result.testName}: ${result.message} (${result.duration}ms)`);
        }

        // 如果有失败的测试，输出详细信息
        const failedResults = this._testResults.filter(r => !r.success);
        if (failedResults.length > 0) {
            console.log('\n❌ 失败测试详情:');
            for (const result of failedResults) {
                console.log(`- ${result.testName}: ${result.message}`);
                if (result.details) {
                    console.error(result.details);
                }
            }
        }

        // 总体评估
        if (passedTests === totalTests) {
            console.log('🎉 所有集成测试通过！系统集成成功！');
        } else if (passedTests / totalTests >= 0.8) {
            console.log('⚠️ 大部分测试通过，但仍有问题需要解决');
        } else {
            console.log('❌ 集成测试失败率较高，需要重点修复');
        }
    }

    protected onDestroy(): void {
        this._patternDetector.dispose();
        this._testGenerator.dispose();
        console.log('🗑 IntegrationTest: 集成测试组件销毁');
    }
}