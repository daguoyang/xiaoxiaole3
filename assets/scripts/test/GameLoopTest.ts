import { _decorator, Component, Node, Button, Label } from 'cc';
import { GameController } from '../controllers/GameController';
import { SystemManager } from '../core/SystemManager';
import { TestLevelGenerator } from '../utils/TestLevelGenerator';
import { PatternDetector } from '../utils/PatternDetector';
import { ElementType } from '../models/GameTypes';
import { ExtendedLevelModel } from '../models/ExtendedLevelModel';

const { ccclass, property } = _decorator;

@ccclass('GameLoopTest')
export class GameLoopTest extends Component {
    @property({ type: Button, tooltip: 'Start Test Button' })
    public startTestButton: Button | null = null;

    @property({ type: Button, tooltip: 'Generate Level Button' })
    public generateLevelButton: Button | null = null;

    @property({ type: Button, tooltip: 'Test Pattern Detection Button' })
    public testPatternButton: Button | null = null;

    @property({ type: Label, tooltip: 'Test Results Label' })
    public testResultsLabel: Label | null = null;

    @property({ type: GameController, tooltip: 'Game Controller' })
    public gameController: GameController | null = null;

    private _testGenerator: TestLevelGenerator;
    private _patternDetector: PatternDetector;
    private _systemManager: SystemManager | null = null;
    private _testResults: string[] = [];

    protected onLoad(): void {
        console.log('🧪 GameLoopTest: 测试组件加载');
        
        this._testGenerator = new TestLevelGenerator();
        this._patternDetector = new PatternDetector();
        
        this.setupEventListeners();
        this.updateResultsDisplay();
    }

    protected start(): void {
        // 等待系统管理器初始化
        this.scheduleOnce(() => {
            this._systemManager = SystemManager.getInstance();
            this.addTestResult('✅ 测试组件初始化完成');
        }, 0.1);
    }

    private setupEventListeners(): void {
        if (this.startTestButton) {
            this.startTestButton.node.on(Button.EventType.CLICK, this.runFullGameLoopTest, this);
        }

        if (this.generateLevelButton) {
            this.generateLevelButton.node.on(Button.EventType.CLICK, this.testLevelGeneration, this);
        }

        if (this.testPatternButton) {
            this.testPatternButton.node.on(Button.EventType.CLICK, this.testPatternDetection, this);
        }
    }

    private addTestResult(message: string): void {
        const timestamp = new Date().toLocaleTimeString();
        const fullMessage = `[${timestamp}] ${message}`;
        
        this._testResults.push(fullMessage);
        console.log(fullMessage);
        
        // 只保留最近的10条结果
        if (this._testResults.length > 10) {
            this._testResults.shift();
        }
        
        this.updateResultsDisplay();
    }

    private updateResultsDisplay(): void {
        if (this.testResultsLabel) {
            this.testResultsLabel.string = this._testResults.join('\n');
        }
    }

    private async runFullGameLoopTest(): Promise<void> {
        this.addTestResult('🚀 开始完整游戏循环测试');
        
        try {
            // 1. 测试系统初始化
            await this.testSystemInitialization();
            
            // 2. 测试关卡生成
            await this.testLevelGeneration();
            
            // 3. 测试模式检测
            await this.testPatternDetection();
            
            // 4. 测试游戏控制器
            await this.testGameController();
            
            this.addTestResult('✅ 完整游戏循环测试完成');
            
        } catch (error) {
            this.addTestResult(`❌ 测试失败: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    private async testSystemInitialization(): Promise<void> {
        this.addTestResult('🔧 测试系统初始化');
        
        if (!this._systemManager) {
            throw new Error('SystemManager 未初始化');
        }

        const healthCheck = this._systemManager.performHealthCheck();
        const healthyCount = Object.values(healthCheck).filter(Boolean).length;
        const totalCount = Object.keys(healthCheck).length;
        
        this.addTestResult(`📊 系统健康度: ${healthyCount}/${totalCount}`);
        
        if (healthyCount < totalCount) {
            const unhealthySystems = Object.entries(healthCheck)
                .filter(([_, isHealthy]) => !isHealthy)
                .map(([name, _]) => name);
            
            this.addTestResult(`⚠️ 异常系统: ${unhealthySystems.join(', ')}`);
        } else {
            this.addTestResult('✅ 所有系统正常');
        }
    }

    private async testLevelGeneration(): Promise<void> {
        this.addTestResult('🎯 测试关卡生成');
        
        try {
            // 生成测试关卡
            const testLevel = this._testGenerator.generateTestLevel(1);
            this.addTestResult(`📋 生成关卡: ${testLevel.name}`);
            
            // 验证棋盘
            const validation = this._testGenerator.validateBoard(testLevel.initialBoard);
            
            if (validation.isValid) {
                this.addTestResult(`✅ 棋盘有效，可能移动: ${validation.possibleMovesCount}`);
            } else {
                this.addTestResult(`⚠️ 棋盘问题: ${validation.issues.join(', ')}`);
            }
            
            // 保存到关卡模型（用于后续测试）
            const levelModel = ExtendedLevelModel.getInstance();
            await levelModel.saveLevelConfig(999, testLevel);
            
            this.addTestResult('💾 测试关卡已保存');
            
        } catch (error) {
            throw new Error(`关卡生成测试失败: ${error instanceof Error ? error.message : 'Unknown'}`);
        }
    }

    private async testPatternDetection(): Promise<void> {
        this.addTestResult('🔍 测试模式检测算法');
        
        try {
            // 测试不同的匹配模式
            const testCases = ['simple_match', 'l_shape', 't_shape', 'complex'] as const;
            
            for (const testCase of testCases) {
                const testBoard = this._testGenerator.createSpecificTestBoard(testCase);
                
                // 检测匹配
                const matches = this._patternDetector.findAllMatches(testBoard);
                
                // 检测可能移动
                const possibleMoves = this._patternDetector.findPossibleMoves(testBoard);
                
                this.addTestResult(`📐 ${testCase}: 匹配=${matches.length}, 移动=${possibleMoves.length}`);
            }
            
            this.addTestResult('✅ 模式检测测试完成');
            
        } catch (error) {
            throw new Error(`模式检测测试失败: ${error instanceof Error ? error.message : 'Unknown'}`);
        }
    }

    private async testGameController(): Promise<void> {
        this.addTestResult('🎮 测试游戏控制器');
        
        if (!this.gameController) {
            this.addTestResult('⚠️ GameController 未设置，跳过测试');
            return;
        }
        
        try {
            // 测试开始关卡
            this.addTestResult('🎯 测试开始关卡功能');
            
            // 启动测试关卡
            await this.gameController.startLevel(999);
            
            // 检查控制器状态
            const currentPhase = this.gameController.getCurrentPhase();
            const currentLevel = this.gameController.getCurrentLevelNumber();
            const possibleMoves = this.gameController.getPossibleMovesCount();
            
            this.addTestResult(`📊 状态: ${currentPhase}, 关卡: ${currentLevel}, 移动: ${possibleMoves}`);
            
            if (currentPhase === 'playing') {
                this.addTestResult('✅ GameController 测试成功');
            } else {
                this.addTestResult(`⚠️ 意外状态: ${currentPhase}`);
            }
            
        } catch (error) {
            throw new Error(`GameController测试失败: ${error instanceof Error ? error.message : 'Unknown'}`);
        }
    }

    // 单独的测试方法
    private async testLevelGeneration(): Promise<void> {
        this.addTestResult('🎲 单独测试关卡生成');
        
        try {
            const levels = this._testGenerator.generateTestLevels(1, 3);
            
            for (const level of levels) {
                const validation = this._testGenerator.validateBoard(level.initialBoard);
                this.addTestResult(`📋 关卡${level.levelNumber}: ${validation.isValid ? '✅' : '❌'} ${validation.possibleMovesCount}移动`);
            }
            
        } catch (error) {
            this.addTestResult(`❌ 关卡生成失败: ${error instanceof Error ? error.message : 'Unknown'}`);
        }
    }

    private async testPatternDetection(): Promise<void> {
        this.addTestResult('🧩 单独测试模式检测');
        
        try {
            // 创建测试棋盘
            const testBoard = this._testGenerator.createSpecificTestBoard('simple_match');
            
            // 测试匹配检测
            const matches = this._patternDetector.findAllMatches(testBoard);
            this.addTestResult(`🔍 找到匹配: ${matches.length}`);
            
            // 测试移动检测
            const moves = this._patternDetector.findPossibleMoves(testBoard);
            this.addTestResult(`🎯 可能移动: ${moves.length}`);
            
            // 测试连通性检测
            if (testBoard[4] && testBoard[4][4]) {
                const connected = this._patternDetector.findConnectedCells(
                    testBoard[4][4].position, 
                    testBoard
                );
                this.addTestResult(`🔗 连通单元: ${connected.length}`);
            }
            
        } catch (error) {
            this.addTestResult(`❌ 模式检测失败: ${error instanceof Error ? error.message : 'Unknown'}`);
        }
    }

    // 性能测试
    public async runPerformanceTest(): Promise<void> {
        this.addTestResult('⚡ 开始性能测试');
        
        const iterations = 100;
        const startTime = Date.now();
        
        try {
            // 测试关卡生成性能
            for (let i = 0; i < iterations; i++) {
                this._testGenerator.generateTestLevel(i + 1);
            }
            
            const endTime = Date.now();
            const avgTime = (endTime - startTime) / iterations;
            
            this.addTestResult(`📈 平均生成时间: ${avgTime.toFixed(2)}ms`);
            
            // 测试模式检测性能
            const testBoard = this._testGenerator.generateRandomBoard(9);
            const detectStartTime = Date.now();
            
            for (let i = 0; i < iterations; i++) {
                this._patternDetector.findAllMatches(testBoard);
                this._patternDetector.findPossibleMoves(testBoard);
            }
            
            const detectEndTime = Date.now();
            const avgDetectTime = (detectEndTime - detectStartTime) / iterations;
            
            this.addTestResult(`🔍 平均检测时间: ${avgDetectTime.toFixed(2)}ms`);
            
        } catch (error) {
            this.addTestResult(`❌ 性能测试失败: ${error instanceof Error ? error.message : 'Unknown'}`);
        }
    }

    // 压力测试
    public async runStressTest(): Promise<void> {
        this.addTestResult('💪 开始压力测试');
        
        try {
            // 生成大量关卡
            const levels = this._testGenerator.generateTestLevels(1, 100);
            this.addTestResult(`📦 生成 ${levels.length} 个关卡`);
            
            // 验证所有关卡
            let validCount = 0;
            let invalidCount = 0;
            
            for (const level of levels) {
                const validation = this._testGenerator.validateBoard(level.initialBoard);
                if (validation.isValid) {
                    validCount++;
                } else {
                    invalidCount++;
                }
            }
            
            const validRate = (validCount / levels.length * 100).toFixed(1);
            this.addTestResult(`📊 有效率: ${validRate}% (${validCount}/${levels.length})`);
            
            if (parseFloat(validRate) >= 90) {
                this.addTestResult('✅ 压力测试通过');
            } else {
                this.addTestResult('⚠️ 压力测试需要优化');
            }
            
        } catch (error) {
            this.addTestResult(`❌ 压力测试失败: ${error instanceof Error ? error.message : 'Unknown'}`);
        }
    }

    protected onDestroy(): void {
        // 清理测试资源
        if (this._testGenerator) {
            this._testGenerator.dispose();
        }

        // 清理事件监听
        if (this.startTestButton) {
            this.startTestButton.node.off(Button.EventType.CLICK, this.runFullGameLoopTest, this);
        }
        if (this.generateLevelButton) {
            this.generateLevelButton.node.off(Button.EventType.CLICK, this.testLevelGeneration, this);
        }
        if (this.testPatternButton) {
            this.testPatternButton.node.off(Button.EventType.CLICK, this.testPatternDetection, this);
        }

        console.log('🗑 GameLoopTest: 测试组件销毁');
    }
}