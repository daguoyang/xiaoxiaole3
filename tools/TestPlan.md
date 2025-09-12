# 🧪 嗨玩消消消 - 测试计划

## 测试阶段概览

### 第一阶段：单元测试 (2天)
### 第二阶段：集成测试 (2天)  
### 第三阶段：系统测试 (1天)

## 📋 详细测试计划

### 1. 单元测试 (Unit Testing)

#### 1.1 核心算法测试
**测试目标**: PatternDetector 匹配算法正确性

```typescript
// 测试用例示例
describe('PatternDetector', () => {
    test('应该正确检测3连匹配', () => {
        const board = createTestBoard([
            [1, 1, 1, 2, 3],
            [2, 3, 2, 1, 2],
            [3, 2, 3, 3, 1]
        ]);
        
        const matches = detector.findAllMatches(board);
        expect(matches).toHaveLength(1);
        expect(matches[0].cells).toHaveLength(3);
        expect(matches[0].type).toBe('horizontal');
    });

    test('应该正确检测L型匹配', () => {
        const board = createTestBoard([
            [1, 1, 1, 2, 3],
            [2, 3, 1, 1, 2],
            [3, 2, 1, 3, 1]
        ]);
        
        const matches = detector.findAllMatches(board);
        expect(matches[0].type).toBe('L_shape');
        expect(matches[0].specialEffect).toBe('bomb');
    });

    test('应该正确找到可能的移动', () => {
        const board = createTestBoard([
            [1, 2, 1, 2, 3],
            [2, 1, 2, 1, 2],
            [3, 2, 1, 3, 1]
        ]);
        
        const moves = detector.findPossibleMoves(board);
        expect(moves.length).toBeGreaterThan(0);
    });
});
```

#### 1.2 游戏状态管理测试
**测试目标**: GameStateManager 状态变更正确性

```typescript
describe('GameStateManager', () => {
    test('关卡开始应该正确初始化状态', async () => {
        const levelConfig = createTestLevelConfig();
        await gameState.startLevel(levelConfig);
        
        expect(gameState.getCurrentState().currentLevel).toBe(1);
        expect(gameState.getCurrentState().playerStats.movesRemaining).toBe(30);
        expect(gameState.getCurrentState().board).toBeDefined();
    });

    test('元素交换应该正确更新棋盘', () => {
        const pos1 = { x: 0, y: 0 };
        const pos2 = { x: 1, y: 0 };
        
        const result = gameState.swapCells(pos1, pos2);
        
        expect(result).toBe(true);
        const board = gameState.getCurrentState().board;
        expect(board[0][0]).not.toBe(board[0][1]);
    });

    test('分数更新应该触发正确事件', (done) => {
        gameState.getEventTarget().on('state_changed', (oldState, newState) => {
            expect(newState.playerStats.score).toBeGreaterThan(oldState.playerStats.score);
            done();
        });

        gameState.updatePlayerStats({ score: 1000 });
    });
});
```

#### 1.3 数据模型测试
**测试目标**: LevelModel 和 ExtendedLevelModel 数据处理

```typescript
describe('ExtendedLevelModel', () => {
    test('应该正确加载关卡配置', async () => {
        const levelConfig = await levelModel.getLevelConfig(1);
        
        expect(levelConfig).toBeDefined();
        expect(levelConfig.levelNumber).toBe(1);
        expect(levelConfig.maxMoves).toBeGreaterThan(0);
        expect(levelConfig.objectives).toHaveLength(1);
    });

    test('应该正确保存关卡配置', async () => {
        const testConfig = createTestLevelConfig();
        const success = await levelModel.saveLevelConfig(999, testConfig);
        
        expect(success).toBe(true);
        
        const loaded = await levelModel.getLevelConfig(999);
        expect(loaded).toEqual(testConfig);
    });

    test('应该正确生成随机棋盘', () => {
        const board = levelModel.generateRandomBoard(9, [1, 2, 3, 4, 5]);
        
        expect(board).toHaveLength(9);
        expect(board[0]).toHaveLength(9);
        
        // 验证没有初始匹配
        const matches = detector.findAllMatches(board);
        expect(matches).toHaveLength(0);
    });
});
```

### 2. 集成测试 (Integration Testing)

#### 2.1 UI系统集成测试
**测试目标**: UI组件与游戏逻辑的协同工作

```typescript
describe('UI Integration', () => {
    test('元素点击应该正确选中', () => {
        const elementView = createElementView(ElementType.RED, { x: 0, y: 0 });
        
        // 模拟点击
        elementView.node.emit(Node.EventType.TOUCH_END, mockTouchEvent);
        
        expect(elementView.getState()).toBe(ElementState.SELECTED);
    });

    test('棋盘交换应该触发动画', async () => {
        const gameBoardView = createGameBoardView();
        const swap = mockSwapRequest(pos1, pos2);
        
        gameBoardView.emit(UIEventType.ELEMENT_SWAP_REQUEST, swap);
        
        // 等待动画完成
        await waitForAnimation();
        
        expect(gameBoardView.isAnimating()).toBe(false);
    });

    test('HUD应该正确反映游戏状态', () => {
        const hud = createGameHUD();
        
        gameState.updatePlayerStats({ 
            score: 5000, 
            movesRemaining: 25 
        });
        
        expect(hud.getCurrentData().score).toBe(5000);
        expect(hud.getCurrentData().moves).toBe(25);
    });
});
```

#### 2.2 系统间通信测试
**测试目标**: 事件驱动架构的消息传递

```typescript
describe('System Communication', () => {
    test('匹配消除应该触发连锁反应', async () => {
        const matches = createTestMatches();
        let effectsTriggered = false;
        let audioPlayed = false;
        
        effectProcessor.on('effects_processed', () => {
            effectsTriggered = true;
        });
        
        audioSystem.on('sfx_played', () => {
            audioPlayed = true;
        });
        
        await effectProcessor.processMatches(matches);
        
        expect(effectsTriggered).toBe(true);
        expect(audioPlayed).toBe(true);
    });

    test('关卡完成应该触发存档', async () => {
        let saveTriggered = false;
        
        saveSystem.on('progress_saved', () => {
            saveTriggered = true;
        });
        
        gameState.getEventTarget().emit('level_completed', {
            levelNumber: 1,
            score: 75000,
            stars: 3
        });
        
        await waitFor(() => saveTriggered);
        expect(saveTriggered).toBe(true);
    });
});
```

#### 2.3 性能集成测试
**测试目标**: 系统整体性能表现

```typescript
describe('Performance Integration', () => {
    test('大量动画不应导致帧率下降', async () => {
        const scheduler = AnimationScheduler.getInstance();
        
        // 调度大量动画
        const animations = [];
        for (let i = 0; i < 100; i++) {
            animations.push(
                scheduler.scheduleAnimation('eliminate', mockNode, mockData, 50)
            );
        }
        
        const startTime = performance.now();
        await Promise.all(animations);
        const endTime = performance.now();
        
        const fps = 1000 / ((endTime - startTime) / 100);
        expect(fps).toBeGreaterThan(30); // 至少30FPS
    });

    test('关卡加载应该在合理时间内完成', async () => {
        const startTime = performance.now();
        
        await gameController.loadLevel(100);
        
        const loadTime = performance.now() - startTime;
        expect(loadTime).toBeLessThan(3000); // 3秒内
    });
});
```

### 3. 系统测试 (System Testing)

#### 3.1 完整游戏流程测试
**测试目标**: 从开始到结束的完整游戏体验

```typescript
describe('Complete Game Flow', () => {
    test('完整关卡游玩流程', async () => {
        // 1. 关卡开始
        await gameController.startLevel(1);
        expect(gameController.getCurrentPhase()).toBe(GamePhase.PLAYING);
        
        // 2. 执行若干步操作
        for (let i = 0; i < 10; i++) {
            const moves = gameController.getPossibleMoves();
            if (moves.length > 0) {
                await gameController.executeMove(moves[0]);
            }
        }
        
        // 3. 检查游戏状态
        const currentState = gameState.getCurrentState();
        expect(currentState.playerStats.score).toBeGreaterThan(0);
        expect(currentState.playerStats.movesRemaining).toBeLessThan(30);
    });

    test('关卡失败流程', async () => {
        // 模拟步数用尽
        gameState.updatePlayerStats({ movesRemaining: 0 });
        
        expect(gameController.getCurrentPhase()).toBe(GamePhase.FAILED);
        
        // 检查存档是否正确记录失败
        const saveData = saveSystem.getCurrentSaveData();
        const levelProgress = saveData.levelProgress[1];
        expect(levelProgress.attempts).toBeGreaterThan(0);
    });
});
```

#### 3.2 边界情况测试
**测试目标**: 异常和边界情况的处理

```typescript
describe('Edge Cases', () => {
    test('空棋盘应该正确处理', () => {
        const emptyBoard = createEmptyBoard(9);
        const matches = detector.findAllMatches(emptyBoard);
        
        expect(matches).toHaveLength(0);
        expect(() => detector.findPossibleMoves(emptyBoard)).not.toThrow();
    });

    test('网络断开应该正确处理', async () => {
        // 模拟网络断开
        mockNetworkOffline();
        
        const result = await analyticsSystem.trackEvent('TEST_EVENT', {});
        
        // 应该缓存事件而不是抛出错误
        expect(result).toBe(false);
        expect(analyticsSystem.getCachedEventsCount()).toBeGreaterThan(0);
    });

    test('存档损坏应该能够恢复', async () => {
        // 模拟损坏的存档数据
        localStorage.setItem('user_progress', 'corrupted_data');
        
        const saveData = await saveSystem.loadGame();
        
        // 应该创建新的默认存档
        expect(saveData).toBeDefined();
        expect(saveData.userProgress.currentLevel).toBe(1);
    });
});
```

## 🎯 测试执行策略

### 自动化测试环境搭建

```typescript
// jest.config.js
module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'jsdom',
    setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
    collectCoverageFrom: [
        'assets/scripts/**/*.ts',
        '!assets/scripts/**/*.d.ts',
    ],
    coverageThreshold: {
        global: {
            branches: 80,
            functions: 80,
            lines: 85,
            statements: 80
        }
    }
};
```

### 测试数据准备

```typescript
// tests/testUtils.ts
export function createTestBoard(data: number[][]): GameBoard {
    return data.map((row, y) => 
        row.map((cellValue, x) => ({
            id: `cell_${x}_${y}`,
            elementType: cellValue as ElementType,
            position: { x, y },
            isStable: true
        }))
    );
}

export function createTestLevelConfig(overrides?: Partial<LevelConfig>): LevelConfig {
    return {
        levelNumber: 1,
        name: "测试关卡",
        boardSize: 9,
        maxMoves: 30,
        targetScore: 50000,
        objectives: [{
            type: 'score',
            elementType: ElementType.EMPTY,
            count: 50000,
            description: '达到50000分'
        }],
        starThresholds: [50000, 75000, 100000],
        difficulty: 'easy',
        ...overrides
    } as LevelConfig;
}
```

## 📊 测试报告要求

每次测试完成后生成详细报告，包含：

1. **覆盖率报告**: 代码覆盖率不低于85%
2. **性能报告**: 帧率、内存使用、加载时间
3. **功能报告**: 各功能模块测试结果
4. **回归报告**: 与上一版本的对比
5. **问题清单**: 发现的bug和待优化项

测试完成后，确保所有核心功能稳定可靠，为下一阶段的性能优化做准备。