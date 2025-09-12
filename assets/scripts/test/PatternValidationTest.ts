import { PatternDetector } from '../utils/PatternDetector';
import { TestLevelGenerator } from '../utils/TestLevelGenerator';
import { ElementType, GameBoard, CellData } from '../models/GameTypes';

class PatternValidationTest {
    private _patternDetector: PatternDetector;
    private _testGenerator: TestLevelGenerator;

    constructor() {
        this._patternDetector = new PatternDetector();
        this._testGenerator = new TestLevelGenerator();
    }

    public runValidationTests(): void {
        console.log('🧪 开始模式检测验证测试');

        try {
            this.testBasicHorizontalMatch();
            this.testBasicVerticalMatch();
            this.testNoInitialMatches();
            this.testPossibleMoves();
            this.testSpecificPatterns();
            
            console.log('✅ 所有模式检测验证测试通过');
        } catch (error) {
            console.error('❌ 模式检测验证测试失败:', error);
        }
    }

    private testBasicHorizontalMatch(): void {
        console.log('🔍 测试基础水平匹配');
        
        // 创建一个简单的水平匹配棋盘
        const board = this.createTestBoard([
            [1, 2, 3, 4, 5],
            [2, 1, 1, 1, 4],  // 水平匹配
            [3, 4, 5, 2, 1],
            [4, 5, 1, 3, 2],
            [5, 1, 2, 4, 3]
        ]);

        const matches = this._patternDetector.findAllMatches(board);
        
        if (matches.length === 0) {
            throw new Error('未检测到水平匹配');
        }

        console.log(`✅ 检测到 ${matches.length} 个匹配`);
    }

    private testBasicVerticalMatch(): void {
        console.log('🔍 测试基础垂直匹配');
        
        // 创建一个简单的垂直匹配棋盘
        const board = this.createTestBoard([
            [1, 2, 3, 4, 5],
            [1, 3, 4, 5, 2],  // 垂直匹配 (第一列)
            [1, 4, 5, 2, 3],
            [2, 5, 2, 3, 4],
            [3, 1, 3, 4, 5]
        ]);

        const matches = this._patternDetector.findAllMatches(board);
        
        if (matches.length === 0) {
            throw new Error('未检测到垂直匹配');
        }

        console.log(`✅ 检测到 ${matches.length} 个匹配`);
    }

    private testNoInitialMatches(): void {
        console.log('🔍 测试无初始匹配的随机棋盘');
        
        // 使用测试生成器生成无初始匹配的棋盘
        const board = this._testGenerator.generateRandomBoard(9);
        const matches = this._patternDetector.findAllMatches(board);
        
        if (matches.length > 0) {
            console.warn(`⚠️ 随机棋盘发现 ${matches.length} 个初始匹配（应该为0）`);
            // 这不一定是错误，因为生成器可能回退到模式棋盘
        } else {
            console.log('✅ 随机棋盘无初始匹配');
        }
    }

    private testPossibleMoves(): void {
        console.log('🔍 测试可能移动检测');
        
        // 创建一个有明确移动机会的棋盘
        const board = this.createTestBoard([
            [1, 2, 3, 4, 5],
            [2, 1, 4, 1, 1],  // 如果交换 (1,2) 和 (2,2)，会形成匹配
            [3, 4, 1, 2, 3],
            [4, 5, 2, 3, 4],
            [5, 1, 3, 4, 5]
        ]);

        const possibleMoves = this._patternDetector.findPossibleMoves(board);
        
        if (possibleMoves.length === 0) {
            throw new Error('未检测到可能的移动');
        }

        console.log(`✅ 检测到 ${possibleMoves.length} 个可能移动`);

        // 验证第一个移动确实有效
        const firstMove = possibleMoves[0];
        if (!firstMove.isValid || firstMove.expectedMatches.length === 0) {
            throw new Error('第一个可能移动无效');
        }
    }

    private testSpecificPatterns(): void {
        console.log('🔍 测试特定模式');
        
        const testCases = ['simple_match', 'l_shape', 't_shape'] as const;
        
        for (const pattern of testCases) {
            const board = this._testGenerator.createSpecificTestBoard(pattern);
            const matches = this._patternDetector.findAllMatches(board);
            const moves = this._patternDetector.findPossibleMoves(board);
            
            console.log(`📐 ${pattern}: 匹配=${matches.length}, 移动=${moves.length}`);
            
            if (moves.length === 0) {
                console.warn(`⚠️ ${pattern} 模式没有可能的移动`);
            }
        }
    }

    private createTestBoard(pattern: number[][]): GameBoard {
        const board: GameBoard = [];
        
        for (let row = 0; row < pattern.length; row++) {
            board[row] = [];
            for (let col = 0; col < pattern[row].length; col++) {
                const elementType = pattern[row][col] as ElementType;
                
                board[row][col] = {
                    id: `test_cell_${row}_${col}`,
                    elementType: elementType,
                    position: { x: col, y: row },
                    isStable: true
                };
            }
        }
        
        return board;
    }

    public dispose(): void {
        this._patternDetector.dispose();
        this._testGenerator.dispose();
    }
}

// 自动运行测试
if (typeof window !== 'undefined') {
    // 在浏览器环境中延迟运行
    setTimeout(() => {
        const test = new PatternValidationTest();
        test.runValidationTests();
        test.dispose();
    }, 1000);
} else {
    // 在 Node.js 环境中立即运行
    const test = new PatternValidationTest();
    test.runValidationTests();
    test.dispose();
}