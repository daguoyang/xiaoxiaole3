import { ElementType, GameBoard, CellData, Position } from '../models/GameTypes';
import { LevelConfig } from '../models/ExtendedLevelModel';
import { PatternDetector } from './PatternDetector';

export class TestLevelGenerator {
    private _patternDetector: PatternDetector;

    constructor() {
        this._patternDetector = new PatternDetector();
    }

    /**
     * 生成测试关卡配置
     */
    public generateTestLevel(levelNumber: number): LevelConfig {
        const difficulty = this.getDifficultyForLevel(levelNumber);
        const boardSize = 9; // 标准 9x9 棋盘
        
        return {
            levelNumber: levelNumber,
            name: `测试关卡 ${levelNumber}`,
            description: `这是第 ${levelNumber} 个测试关卡`,
            boardSize: boardSize,
            maxMoves: this.getMovesForDifficulty(difficulty),
            targetScore: this.getTargetScoreForLevel(levelNumber, difficulty),
            timeLimit: 0, // 无时间限制
            objectives: [
                {
                    type: 'score',
                    elementType: ElementType.EMPTY,
                    count: this.getTargetScoreForLevel(levelNumber, difficulty),
                    description: `达到 ${this.getTargetScoreForLevel(levelNumber, difficulty)} 分`
                }
            ],
            starThresholds: this.getStarThresholds(levelNumber, difficulty),
            difficulty: difficulty,
            initialBoard: this.generateRandomBoard(boardSize),
            obstacles: [],
            terrain: [],
            specialRules: [],
            balanceConfig: {
                elementTypes: [
                    ElementType.RED,
                    ElementType.BLUE,
                    ElementType.GREEN,
                    ElementType.YELLOW,
                    ElementType.PURPLE
                ],
                spawnWeights: {
                    [ElementType.RED]: 20,
                    [ElementType.BLUE]: 20,
                    [ElementType.GREEN]: 20,
                    [ElementType.YELLOW]: 20,
                    [ElementType.PURPLE]: 20
                },
                specialElementChance: this.getSpecialElementChance(difficulty)
            },
            rewards: {
                coins: this.getCoinReward(difficulty),
                powerUps: this.getPowerUpRewards(difficulty)
            },
            unlockConditions: [],
            tags: [`difficulty_${difficulty}`, 'test_level'],
            metadata: {
                generatedAt: new Date().toISOString(),
                generator: 'TestLevelGenerator',
                version: '1.0.0'
            }
        };
    }

    /**
     * 生成随机棋盘（确保没有初始匹配）
     */
    public generateRandomBoard(size: number): GameBoard {
        const maxAttempts = 100;
        let attempts = 0;
        
        while (attempts < maxAttempts) {
            const board = this.createRandomBoardAttempt(size);
            
            // 检查是否有初始匹配
            const matches = this._patternDetector.findAllMatches(board);
            if (matches.length === 0) {
                // 确保有可能的移动
                const possibleMoves = this._patternDetector.findPossibleMoves(board);
                if (possibleMoves.length > 0) {
                    console.log(`✅ 生成有效棋盘，尝试次数: ${attempts + 1}, 可能移动: ${possibleMoves.length}`);
                    return board;
                }
            }
            
            attempts++;
        }
        
        console.warn(`⚠️ 无法生成无匹配的随机棋盘，使用模式棋盘`);
        return this.generatePatternBoard(size);
    }

    private createRandomBoardAttempt(size: number): GameBoard {
        const board: GameBoard = [];
        const elementTypes = [
            ElementType.RED,
            ElementType.BLUE,
            ElementType.GREEN,
            ElementType.YELLOW,
            ElementType.PURPLE
        ];

        for (let row = 0; row < size; row++) {
            board[row] = [];
            for (let col = 0; col < size; col++) {
                const randomType = elementTypes[Math.floor(Math.random() * elementTypes.length)];
                
                board[row][col] = {
                    id: `cell_${row}_${col}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                    elementType: randomType,
                    position: { x: col, y: row },
                    isStable: true
                };
            }
        }

        return board;
    }

    /**
     * 生成模式棋盘（确保有解）
     */
    private generatePatternBoard(size: number): GameBoard {
        const board: GameBoard = [];
        const elementTypes = [
            ElementType.RED,
            ElementType.BLUE,
            ElementType.GREEN,
            ElementType.YELLOW,
            ElementType.PURPLE
        ];

        // 创建棋盘模式，避免初始匹配但保证有解
        for (let row = 0; row < size; row++) {
            board[row] = [];
            for (let col = 0; col < size; col++) {
                // 使用简单的模式避免连续相同元素
                let elementType: ElementType;
                
                if (row % 2 === 0) {
                    elementType = elementTypes[(col % 2 === 0) ? 0 : 1];
                } else {
                    elementType = elementTypes[(col % 2 === 0) ? 2 : 3];
                }
                
                // 添加一些随机性
                if (Math.random() < 0.3) {
                    elementType = elementTypes[Math.floor(Math.random() * elementTypes.length)];
                }

                board[row][col] = {
                    id: `cell_${row}_${col}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                    elementType: elementType,
                    position: { x: col, y: row },
                    isStable: true
                };
            }
        }

        return board;
    }

    private getDifficultyForLevel(levelNumber: number): 'easy' | 'medium' | 'hard' | 'expert' {
        if (levelNumber <= 10) return 'easy';
        if (levelNumber <= 30) return 'medium';
        if (levelNumber <= 60) return 'hard';
        return 'expert';
    }

    private getMovesForDifficulty(difficulty: string): number {
        const movesMap = {
            'easy': 35,
            'medium': 30,
            'hard': 25,
            'expert': 20
        };
        return movesMap[difficulty] || 30;
    }

    private getTargetScoreForLevel(levelNumber: number, difficulty: string): number {
        const baseScore = 50000;
        const levelMultiplier = Math.floor((levelNumber - 1) / 10) * 10000;
        const difficultyMultiplier = {
            'easy': 1.0,
            'medium': 1.2,
            'hard': 1.5,
            'expert': 1.8
        }[difficulty] || 1.0;

        return Math.floor((baseScore + levelMultiplier) * difficultyMultiplier);
    }

    private getStarThresholds(levelNumber: number, difficulty: string): number[] {
        const targetScore = this.getTargetScoreForLevel(levelNumber, difficulty);
        return [
            targetScore,
            Math.floor(targetScore * 1.5),
            Math.floor(targetScore * 2.2)
        ];
    }

    private getSpecialElementChance(difficulty: string): number {
        const chanceMap = {
            'easy': 0.15,
            'medium': 0.12,
            'hard': 0.10,
            'expert': 0.08
        };
        return chanceMap[difficulty] || 0.12;
    }

    private getCoinReward(difficulty: string): number {
        const rewardMap = {
            'easy': 100,
            'medium': 150,
            'hard': 200,
            'expert': 300
        };
        return rewardMap[difficulty] || 100;
    }

    private getPowerUpRewards(difficulty: string): { [key: string]: number } {
        const baseRewards = {
            'hammer': 1,
            'bomb': 1,
            'rainbow': 0,
            'shuffle': 0
        };

        if (difficulty === 'hard' || difficulty === 'expert') {
            baseRewards.rainbow = 1;
            baseRewards.shuffle = 1;
        }

        return baseRewards;
    }

    /**
     * 生成多个测试关卡
     */
    public generateTestLevels(startLevel: number, count: number): LevelConfig[] {
        const levels: LevelConfig[] = [];
        
        for (let i = 0; i < count; i++) {
            const levelNumber = startLevel + i;
            levels.push(this.generateTestLevel(levelNumber));
        }
        
        console.log(`📋 生成了 ${count} 个测试关卡 (${startLevel} - ${startLevel + count - 1})`);
        return levels;
    }

    /**
     * 验证棋盘是否有效（无初始匹配，有可能的移动）
     */
    public validateBoard(board: GameBoard): {
        isValid: boolean;
        hasInitialMatches: boolean;
        possibleMovesCount: number;
        issues: string[];
    } {
        const issues: string[] = [];
        
        // 检查初始匹配
        const initialMatches = this._patternDetector.findAllMatches(board);
        const hasInitialMatches = initialMatches.length > 0;
        
        if (hasInitialMatches) {
            issues.push(`发现 ${initialMatches.length} 个初始匹配`);
        }
        
        // 检查可能的移动
        const possibleMoves = this._patternDetector.findPossibleMoves(board);
        const possibleMovesCount = possibleMoves.length;
        
        if (possibleMovesCount === 0) {
            issues.push('没有可能的移动');
        } else if (possibleMovesCount < 3) {
            issues.push(`可能的移动太少: ${possibleMovesCount}`);
        }
        
        const isValid = !hasInitialMatches && possibleMovesCount >= 3;
        
        return {
            isValid,
            hasInitialMatches,
            possibleMovesCount,
            issues
        };
    }

    /**
     * 创建特定情况的测试棋盘
     */
    public createSpecificTestBoard(testCase: 'simple_match' | 'l_shape' | 't_shape' | 'complex'): GameBoard {
        const size = 9;
        const board: GameBoard = [];

        // 先创建一个基础棋盘
        for (let row = 0; row < size; row++) {
            board[row] = [];
            for (let col = 0; col < size; col++) {
                board[row][col] = {
                    id: `cell_${row}_${col}_test`,
                    elementType: ElementType.RED,
                    position: { x: col, y: row },
                    isStable: true
                };
            }
        }

        switch (testCase) {
            case 'simple_match':
                // 创建一个简单的3连匹配场景
                board[4][3].elementType = ElementType.BLUE;
                board[4][4].elementType = ElementType.RED;  // 移动这个可以形成匹配
                board[4][5].elementType = ElementType.BLUE;
                board[5][4].elementType = ElementType.BLUE;
                break;

            case 'l_shape':
                // 创建L型匹配场景
                board[3][3].elementType = ElementType.GREEN;
                board[3][4].elementType = ElementType.RED;  // 移动目标
                board[3][5].elementType = ElementType.GREEN;
                board[4][3].elementType = ElementType.GREEN;
                board[4][4].elementType = ElementType.GREEN;
                break;

            case 't_shape':
                // 创建T型匹配场景
                board[3][4].elementType = ElementType.YELLOW;
                board[4][3].elementType = ElementType.YELLOW;
                board[4][4].elementType = ElementType.RED;  // 移动目标
                board[4][5].elementType = ElementType.YELLOW;
                board[5][4].elementType = ElementType.YELLOW;
                break;

            case 'complex':
                // 创建复杂匹配场景
                this.fillBoardWithPattern(board);
                break;
        }

        return board;
    }

    private fillBoardWithPattern(board: GameBoard): void {
        const elementTypes = [
            ElementType.RED,
            ElementType.BLUE,
            ElementType.GREEN,
            ElementType.YELLOW,
            ElementType.PURPLE
        ];

        for (let row = 0; row < board.length; row++) {
            for (let col = 0; col < board[row].length; col++) {
                // 创建一个有趣的模式
                const typeIndex = (row + col * 2) % elementTypes.length;
                board[row][col].elementType = elementTypes[typeIndex];
            }
        }
    }

    public dispose(): void {
        console.log('TestLevelGenerator disposed');
    }
}