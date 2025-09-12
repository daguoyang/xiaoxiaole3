import { Component, Node, _decorator } from 'cc';
import { BaseUIComponent, UIEventType } from '../ui/BaseUIComponent';
import { GameBoardView } from '../ui/GameBoardView';
import { GameHUD } from '../ui/GameHUD';
import { ElementView } from '../ui/ElementView';
import { PatternDetector } from '../utils/PatternDetector';
import { BalanceConfig } from '../core/BalanceConfig';
import { ExtendedLevelModel, LevelConfig } from '../models/ExtendedLevelModel';
import { AnalyticsSystem } from '../systems/AnalyticsSystem';
import { EffectProcessor } from '../systems/EffectProcessor';
import { AudioSystem, SoundEffect } from '../systems/AudioSystem';
import { ElementType, Position, MatchResult, GameBoard, CellData } from '../models/GameTypes';
import { GameConfig } from '../core/GameConfig';
import { GameStateManager } from '../core/GameStateManager';

const { ccclass, property } = _decorator;

export enum GamePhase {
    LOADING = 'loading',
    INTRO = 'intro',
    PLAYING = 'playing',
    PROCESSING = 'processing',
    PAUSED = 'paused',
    COMPLETED = 'completed',
    FAILED = 'failed'
}

export interface GameControllerConfig {
    enableAnalytics: boolean;
    enableEffects: boolean;
    enableAutoHints: boolean;
    debugMode: boolean;
}

@ccclass('GameController')
export class GameController extends BaseUIComponent {
    @property({ type: GameBoardView, tooltip: 'Game Board View Component' })
    public gameBoardView: GameBoardView | null = null;

    @property({ type: GameHUD, tooltip: 'Game HUD Component' })
    public gameHUD: GameHUD | null = null;

    @property({ type: Node, tooltip: 'Game Board Container' })
    public boardContainer: Node | null = null;

    @property({ type: Node, tooltip: 'HUD Container' })
    public hudContainer: Node | null = null;

    private _gameBoardView: GameBoardView | null = null;
    private _gameHUD: GameHUD | null = null;
    private _patternDetector: PatternDetector = new PatternDetector();
    private _balanceConfig: BalanceConfig = BalanceConfig.getInstance();
    private _levelModel: ExtendedLevelModel = ExtendedLevelModel.getInstance();
    private _analyticsSystem: AnalyticsSystem = AnalyticsSystem.getInstance();
    private _effectProcessor: EffectProcessor = EffectProcessor.getInstance();
    private _audioSystem: AudioSystem = AudioSystem.getInstance();
    protected gameState: GameStateManager = GameStateManager.getInstance();
    
    private _currentPhase: GamePhase = GamePhase.LOADING;
    private _currentLevelNumber: number = 1;
    private _isProcessingMoves: boolean = false;
    private _moveCount: number = 0;
    private _comboCount: number = 0;
    private _hintTimer: number = 0;
    private _config: GameControllerConfig = {
        enableAnalytics: GameConfig.FEATURES.ENABLE_ANALYTICS,
        enableEffects: GameConfig.FEATURES.ENABLE_EFFECTS,
        enableAutoHints: GameConfig.FEATURES.ENABLE_AUTO_HINTS,
        debugMode: GameConfig.DEBUG_MODE
    };
    
    // 交互状态
    private _selectedElement: ElementView | null = null;
    private _possibleMoves: MatchResult[] = [];
    private _lastHintTime: number = 0;

    protected onUILoad(): void {
        this.initializeConfig();
        this.initializeGameDependencies();
        this.initializeUIComponents();
        this.setupGameEventListeners();
        this.initializeLevel();
    }

    protected onUIEnable(): void {
        this.resumeGame();
    }

    protected onUIDisable(): void {
        this.pauseGame();
    }

    protected onUIDestroy(): void {
        this.cleanup();
    }

    protected onGameStateChanged(oldState: any, newState: any): void {
        // 响应游戏状态变化，同步到UI组件
        if (newState.phase !== this._currentPhase) {
            this.onPhaseChanged(this._currentPhase, newState.phase);
        }
    }

    private initializeConfig(): void {
        this._config = {
            enableAnalytics: GameConfig.FEATURES.ENABLE_ANALYTICS,
            enableEffects: GameConfig.FEATURES.ENABLE_EFFECTS,
            enableAutoHints: GameConfig.FEATURES.ENABLE_AUTO_HINTS,
            debugMode: GameConfig.DEBUG_MODE
        };
    }

    private initializeGameDependencies(): void {
        // 依赖项已在属性声明时初始化，这里进行额外配置
        console.log('🔧 Game dependencies initialized');
    }

    private initializeUIComponents(): void {
        // 优先使用属性中设置的组件引用
        this._gameBoardView = this.gameBoardView;
        this._gameHUD = this.gameHUD;
        
        // 如果属性中没有设置，尝试从子节点中查找
        if (!this._gameBoardView && this.boardContainer) {
            this._gameBoardView = this.boardContainer.getComponent(GameBoardView);
        }
        
        if (!this._gameHUD && this.hudContainer) {
            this._gameHUD = this.hudContainer.getComponent(GameHUD);
        }
        
        // 最后尝试从场景中查找
        if (!this._gameBoardView) {
            const boardNode = this.validateNode('game_board') || this.node.getChildByName('GameBoard');
            if (boardNode) {
                this._gameBoardView = boardNode.getComponent(GameBoardView);
            }
        }
        
        if (!this._gameHUD) {
            const hudNode = this.validateNode('game_hud') || this.node.getChildByName('GameHUD');
            if (hudNode) {
                this._gameHUD = hudNode.getComponent(GameHUD);
            }
        }
        
        // 验证组件
        if (!this._gameBoardView) {
            console.error('❌ GameController: GameBoardView 组件未找到');
        } else {
            console.log('✅ GameController: GameBoardView 组件已连接');
        }
        
        if (!this._gameHUD) {
            console.error('❌ GameController: GameHUD 组件未找到');
        } else {
            console.log('✅ GameController: GameHUD 组件已连接');
        }
    }

    private setupGameEventListeners(): void {
        // 监听UI事件
        this.subscribe(UIEventType.ELEMENT_SELECTED, this.onElementSelected.bind(this));
        this.subscribe(UIEventType.ELEMENT_SWAP_REQUEST, this.onElementSwapRequest.bind(this));
        this.subscribe(UIEventType.SPECIAL_EFFECT_TRIGGER, this.onSpecialEffectTrigger.bind(this));
        this.subscribe(UIEventType.POWER_UP_ACTIVATED, this.onPowerUpActivated.bind(this));
        this.subscribe(UIEventType.PAUSE_REQUESTED, this.onPauseRequested.bind(this));
        
        // 监听游戏状态变化
        this.gameState.getEventTarget().on('matches_found', this.onMatchesFound, this);
        this.gameState.getEventTarget().on('no_moves_available', this.onNoMovesAvailable, this);
        this.gameState.getEventTarget().on('level_objective_progress', this.onObjectiveProgress, this);
    }

    // 公共接口：开始指定关卡
    public async startLevel(levelNumber: number): Promise<void> {
        console.log(`🎯 GameController: 开始关卡 ${levelNumber}`);
        
        this._currentLevelNumber = levelNumber;
        await this.initializeLevel();
    }

    private async initializeLevel(): Promise<void> {
        try {
            this.setPhase(GamePhase.LOADING);
            
            // 加载关卡数据
            const levelData = await this._levelModel.getLevelConfig(this._currentLevelNumber);
            if (!levelData) {
                console.error(`❌ 无法加载关卡 ${this._currentLevelNumber}`);
                this.setPhase(GamePhase.FAILED);
                return;
            }
            
            console.log(`📋 关卡 ${this._currentLevelNumber} 数据加载完成:`, levelData.name);
            
            // 初始化游戏状态
            this.gameState.startLevel(this._currentLevelNumber, levelData.objectives, levelData.maxMoves);
            
            // 初始化UI
            if (this._gameHUD) {
                this._gameHUD.updateHUD({
                    levelNumber: this._currentLevelNumber,
                    targetScore: levelData.targetScore,
                    moves: levelData.maxMoves,
                    score: 0,
                    stars: 0,
                    powerUps: levelData.rewards?.powerUps || {}
                });
            }
            
            // 初始化游戏板
            if (this._gameBoardView && levelData.initialBoard) {
                await this._gameBoardView.initializeBoard(levelData.initialBoard);
            }
            
            // 分析可能的移动
            this.analyzePossibleMoves();
            
            // 开始游戏
            this.setPhase(GamePhase.INTRO);
            await this.playIntroAnimation();
            this.setPhase(GamePhase.PLAYING);
            
            // 播放关卡开始音效
            if (this._config.enableAnalytics) {
                await this._audioSystem.playSFX(SoundEffect.LEVEL_START);
            }
            
            // 记录分析事件
            if (this._config.enableAnalytics) {
                this._analyticsSystem.trackEvent('LEVEL_START', {
                    level: this._currentLevelNumber,
                    difficulty: levelData.difficulty,
                    objectives: levelData.objectives
                });
                // new analytics bridge (non-blocking)
                (async () => {
                    try {
                        const { AnalyticsEx } = await import('../../new-scripts/systems/AnalyticsSystem');
                        AnalyticsEx.track('level_start', { level: this._currentLevelNumber });
                    } catch {}
                })();
            }
            
            console.log(`✅ 关卡 ${this._currentLevelNumber} 初始化完成`);
            
        } catch (error) {
            console.error('❌ 关卡初始化失败:', error);
            this.setPhase(GamePhase.FAILED);
            
            // 发出失败事件
            this.node.emit('level_failed', {
                levelNumber: this._currentLevelNumber,
                reason: 'initialization_failed',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }

    private onElementSelected(eventData: any): void {
        if (this._currentPhase !== GamePhase.PLAYING || this._isProcessingMoves) return;
        
        const { elementId, isSelected } = eventData.data;
        const element = this.findElementById(elementId);
        
        if (!element) return;
        
        if (isSelected) {
            // 选择元素
            if (this._selectedElement && this._selectedElement !== element) {
                this._selectedElement.setSelected(false);
            }
            this._selectedElement = element;
            
            // 高亮可能的匹配
            this.highlightPossibleMatches(element);
            
        } else {
            // 取消选择
            if (this._selectedElement === element) {
                this._selectedElement = null;
                this.clearHighlights();
            }
        }
    }

    private async onElementSwapRequest(eventData: any): Promise<void> {
        if (this._currentPhase !== GamePhase.PLAYING || this._isProcessingMoves) return;
        
        const swapData = eventData.data;
        
        // 验证交换的有效性
        const isValidSwap = await this.validateSwap(swapData);
        
        if (isValidSwap) {
            await this.executeSwap(swapData);
        } else {
            await this.rejectSwap(swapData);
        }
    }

    private onSpecialEffectTrigger(eventData: any): void {
        if (this._currentPhase !== GamePhase.PLAYING || this._isProcessingMoves) return;
        
        const { effectType, elementId, position } = eventData.data;
        
        if (effectType === 'hint') {
            this.showHint();
        } else {
            this.triggerSpecialEffect(effectType, position);
        }
    }

    private onPowerUpActivated(eventData: any): void {
        if (this._currentPhase !== GamePhase.PLAYING) return;
        
        const { powerUpType } = eventData.data;
        this.activatePowerUp(powerUpType);
    }

    private onPauseRequested(): void {
        if (this._currentPhase === GamePhase.PLAYING) {
            this.pauseGame();
        } else if (this._currentPhase === GamePhase.PAUSED) {
            this.resumeGame();
        }
    }

    private async validateSwap(swapData: any): Promise<boolean> {
        const { element1, element2 } = swapData;
        
        // 检查位置相邻性
        const pos1 = element1.position;
        const pos2 = element2.position;
        
        const deltaX = Math.abs(pos1.x - pos2.x);
        const deltaY = Math.abs(pos1.y - pos2.y);
        
        if ((deltaX === 1 && deltaY === 0) || (deltaX === 0 && deltaY === 1)) {
            // 模拟交换并检查是否产生匹配
            const testBoard = this.createTestBoard(swapData);
            const matches = this._patternDetector.findAllMatches(testBoard);
            return matches.length > 0;
        }
        
        return false;
    }

    private async executeSwap(swapData: any): Promise<void> {
        this._isProcessingMoves = true;
        this.setPhase(GamePhase.PROCESSING);
        
        try {
            // 执行交换动画
            await this.playSwapAnimation(swapData, true);
            
            // 更新游戏状态
            this.gameState.swapCells(
                swapData.element1.position,
                swapData.element2.position
            );
            
            // 增加移动计数
            this._moveCount++;
            const currentMoves = this.gameState.getCurrentState().playerStats.movesRemaining || 0;
            this.gameState.updatePlayerStats({
                movesRemaining: Math.max(0, currentMoves - 1)
            });
            
            // 处理匹配和连击
            await this.processMatches();
            
            // 检查游戏结束条件
            this.checkGameEndConditions();
            
        } catch (error) {
            console.error('Error executing swap:', error);
        } finally {
            this._isProcessingMoves = false;
            if (this._currentPhase === GamePhase.PROCESSING) {
                this.setPhase(GamePhase.PLAYING);
            }
        }
    }

    private async rejectSwap(swapData: any): Promise<void> {
        // 播放交换失败动画
        await this.playSwapAnimation(swapData, false);
        
        // 取消选择状态
        if (this._selectedElement) {
            this._selectedElement.setSelected(false);
            this._selectedElement = null;
        }
        
        this.clearHighlights();
    }

    private async processMatches(): Promise<void> {
        let currentBoard = this.gameState.getCurrentState().board;
        let totalScore = 0;
        let matchRound = 0;
        
        while (true) {
            // 查找匹配
            const matches = this._patternDetector.findAllMatches(currentBoard);
            if (matches.length === 0) break;
            
            matchRound++;
            this._comboCount = matchRound > 1 ? this._comboCount + 1 : 0;
            
            // 处理特效
            if (this._config.enableEffects) {
                await this._effectProcessor.processMatches(matches);
            }
            
            // 消除匹配的元素
            await this.eliminateMatches(matches);
            
            // 计算分数
            const roundScore = this.calculateScore(matches, this._comboCount);
            totalScore += roundScore;
            
            // 让元素下落
            currentBoard = await this.processFalls(currentBoard);
            
            // 生成新元素
            currentBoard = await this.spawnNewElements(currentBoard);
            
            // 更新游戏状态
            this.gameState.updateBoard(currentBoard);
            
            // 短暂延迟，让玩家看到效果
            await this.delay(GameConfig.ANIMATION.MATCH_PROCESSING_DELAY / 1000);
        }
        
        // 更新总分
        if (totalScore > 0) {
            const currentStats = this.gameState.getCurrentState().playerStats;
            this.gameState.updatePlayerStats({
                score: (currentStats.score || 0) + totalScore
            });
            
            // 记录分析数据
            if (this._config.enableAnalytics) {
                this._analyticsSystem.trackEvent('SCORE_GAINED', {
                    score: totalScore,
                    combo: this._comboCount,
                    round: matchRound
                });
            }
        }
        
        // 重置连击计数
        if (matchRound === 0) {
            this._comboCount = 0;
        }
        
        // 重新分析可能的移动
        this.analyzePossibleMoves();
    }

    private async eliminateMatches(matches: MatchResult[]): Promise<void> {
        const eliminatePromises: Promise<void>[] = [];
        
        matches.forEach(match => {
            match.cells.forEach(cell => {
                const element = this.findElementByPosition(cell.position);
                if (element) {
                    eliminatePromises.push(
                        this.scheduleAnimation('eliminate', element.node, {
                            elementType: cell.elementType,
                            matchType: match.type
                        })
                    );
                }
            });
        });
        
        await Promise.all(eliminatePromises);
    }

    private async processFalls(board: GameBoard): Promise<GameBoard> {
        const newBoard = JSON.parse(JSON.stringify(board));
        const fallAnimations: Promise<void>[] = [];
        
        // 计算每列的下落情况
        for (let col = 0; col < newBoard[0].length; col++) {
            let writeIndex = newBoard.length - 1;
            
            for (let row = newBoard.length - 1; row >= 0; row--) {
                if (newBoard[row][col] && newBoard[row][col].elementType !== ElementType.EMPTY) {
                    if (writeIndex !== row) {
                        // 需要下落
                        newBoard[writeIndex][col] = newBoard[row][col];
                        newBoard[row][col] = null;
                        
                        const element = this.findElementByPosition({ x: col, y: row });
                        if (element) {
                            fallAnimations.push(
                                this.scheduleAnimation('fall', element.node, {
                                    fromPosition: { x: col, y: row },
                                    toPosition: { x: col, y: writeIndex },
                                    fallDistance: writeIndex - row
                                })
                            );
                        }
                    }
                    writeIndex--;
                }
            }
        }
        
        await Promise.all(fallAnimations);
        return newBoard;
    }

    private async spawnNewElements(board: GameBoard): Promise<GameBoard> {
        const newBoard = JSON.parse(JSON.stringify(board));
        const spawnAnimations: Promise<void>[] = [];
        
        for (let col = 0; col < newBoard[0].length; col++) {
            for (let row = 0; row < newBoard.length; row++) {
                if (!newBoard[row][col] || newBoard[row][col].elementType === ElementType.EMPTY) {
                    // 生成新元素
                    const elementType = this._balanceConfig.generateRandomElement();
                    const newCell: CellData = {
                        id: `element_${Date.now()}_${row}_${col}`,
                        elementType: elementType,
                        position: { x: col, y: row },
                        isStable: true
                    };
                    
                    newBoard[row][col] = newCell;
                    
                    // 创建新元素并播放生成动画
                    spawnAnimations.push(
                        this.scheduleAnimation('spawn', this.node, {
                            elementType: elementType,
                            position: { x: col, y: row },
                            cellData: newCell
                        })
                    );
                }
            }
        }
        
        await Promise.all(spawnAnimations);
        return newBoard;
    }

    private calculateScore(matches: MatchResult[], comboCount: number): number {
        let totalScore = 0;
        
        matches.forEach(match => {
            const baseScore = this._balanceConfig.calculateElementScore(
                match.cells[0].elementType,
                match.cells.length
            );
            
            const chainBonus = this._balanceConfig.calculateChainBonus(match.cells.length);
            const comboBonus = this._balanceConfig.calculateComboBonus(comboCount);
            
            totalScore += baseScore * (1 + chainBonus + comboBonus);
        });
        
        return Math.floor(totalScore);
    }

    private analyzePossibleMoves(): void {
        const currentBoard = this.gameState.getCurrentState().board;
        this._possibleMoves = this._patternDetector.findPossibleMoves(currentBoard);
        
        if (this._possibleMoves.length === 0 && this._currentPhase === GamePhase.PLAYING) {
            // 无可用移动，需要重新生成棋盘或结束游戏
            this.handleNoMovesAvailable();
        }
    }

    private showHint(): void {
        const now = Date.now();
        if (now - this._lastHintTime < GameConfig.UI.HINT_COOLDOWN * 1000) {
            return; // 冷却中
        }
        
        if (this._possibleMoves.length === 0) {
            this.analyzePossibleMoves();
        }
        
        if (this._possibleMoves.length > 0) {
            const randomMove = this._possibleMoves[Math.floor(Math.random() * this._possibleMoves.length)];
            this.highlightMove(randomMove);
            this._lastHintTime = now;
            
            if (this._config.enableAnalytics) {
                this._analyticsSystem.trackEvent('HINT_USED', {
                    level: this._currentLevelNumber,
                    movesRemaining: this.gameState.getCurrentState().playerStats.movesRemaining
                });
            }
        }
    }

    private checkGameEndConditions(): void {
        const currentState = this.gameState.getCurrentState();
        const playerStats = currentState.playerStats;
        const levelConfig = currentState.levelConfig;
        
        // 检查胜利条件
        if (this.checkWinConditions(playerStats, levelConfig)) {
            this.completeLevel();
            return;
        }
        
        // 检查失败条件
        if (playerStats.movesRemaining <= 0) {
            this.failLevel('no_moves');
            return;
        }
        
        if (levelConfig.timeLimit && levelConfig.timeRemaining <= 0) {
            this.failLevel('no_time');
            return;
        }
        
        // 检查无可用移动
        if (this._possibleMoves.length === 0) {
            this.handleNoMovesAvailable();
        }
    }

    private checkWinConditions(playerStats: any, levelConfig: any): boolean {
        // 检查分数目标
        if (levelConfig.targetScore && playerStats.score >= levelConfig.targetScore) {
            return true;
        }
        
        // 检查其他目标（收集特定元素、清除障碍等）
        if (levelConfig.objectives) {
            return levelConfig.objectives.every((objective: any) => 
                this.checkObjective(objective, playerStats)
            );
        }
        
        return false;
    }

    private checkObjective(objective: any, playerStats: any): boolean {
        switch (objective.type) {
            case 'collect':
                return playerStats.collected?.[objective.elementType] >= objective.count;
            case 'clear_obstacles':
                return playerStats.obstaclesCleared >= objective.count;
            default:
                return true;
        }
    }

    private async completeLevel(): Promise<void> {
        this.setPhase(GamePhase.COMPLETED);
        
        const finalStats = this.gameState.getCurrentState().playerStats;
        const stars = this.calculateStars(finalStats.score);
        
        // 更新HUD
        if (this._gameHUD) {
            this._gameHUD.updateHUD({ stars });
        }
        
        // 记录完成事件
        if (this._config.enableAnalytics) {
            this._analyticsSystem.trackEvent('LEVEL_COMPLETE', {
                level: this._currentLevelNumber,
                score: finalStats.score,
                moves: this._moveCount,
                stars: stars
            });
            (async () => {
                try {
                    const { AnalyticsEx } = await import('../../new-scripts/systems/AnalyticsSystem');
                    AnalyticsEx.track('level_complete', { level: this._currentLevelNumber, score: finalStats.score, stars });
                } catch {}
            })();
        }
        
        // 播放完成动画
        await this.playLevelCompleteAnimation();
        
        // 触发完成事件
        this.gameState.getEventTarget().emit('level_completed', {
            levelNumber: this._currentLevelNumber,
            score: finalStats.score,
            stars: stars
        });
    }

    private async failLevel(reason: string): Promise<void> {
        this.setPhase(GamePhase.FAILED);
        
        // 记录失败事件
        if (this._config.enableAnalytics) {
            this._analyticsSystem.trackEvent('LEVEL_FAILED', {
                level: this._currentLevelNumber,
                reason: reason,
                moves: this._moveCount
            });
            (async () => {
                try {
                    const { AnalyticsEx } = await import('../../new-scripts/systems/AnalyticsSystem');
                    AnalyticsEx.track('level_failed', { level: this._currentLevelNumber, reason });
                } catch {}
            })();
        }
        
        // 播放失败动画
        await this.playLevelFailedAnimation();
        
        // 触发失败事件
        this.gameState.getEventTarget().emit('level_failed', {
            levelNumber: this._currentLevelNumber,
            reason: reason
        });
    }

    private calculateStars(score: number): number {
        const levelConfig = this.gameState.getCurrentState().levelConfig;
        const starThresholds = levelConfig.starThresholds || [
            levelConfig.targetScore,
            levelConfig.targetScore * 1.5,
            levelConfig.targetScore * 2
        ];
        
        if (score >= starThresholds[2]) return 3;
        if (score >= starThresholds[1]) return 2;
        if (score >= starThresholds[0]) return 1;
        return 0;
    }

    private setPhase(phase: GamePhase): void {
        const oldPhase = this._currentPhase;
        this._currentPhase = phase;
        this.onPhaseChanged(oldPhase, phase);
    }

    private onPhaseChanged(oldPhase: GamePhase, newPhase: GamePhase): void {
        console.log(`Game phase changed: ${oldPhase} -> ${newPhase}`);
        
        // 根据阶段变化调整UI和逻辑
        switch (newPhase) {
            case GamePhase.PLAYING:
                this.startAutoHintTimer();
                break;
            case GamePhase.PAUSED:
                this.stopAutoHintTimer();
                break;
            case GamePhase.PROCESSING:
                this.stopAutoHintTimer();
                break;
        }
    }

    private startAutoHintTimer(): void {
        if (!this._config.enableAutoHints) return;
        
        this.stopAutoHintTimer();
        this._hintTimer = window.setTimeout(() => {
            if (this._currentPhase === GamePhase.PLAYING && !this._isProcessingMoves) {
                this.showHint();
                this.startAutoHintTimer();
            }
        }, GameConfig.UI.AUTO_HINT_INTERVAL * 1000);
    }

    private stopAutoHintTimer(): void {
        if (this._hintTimer) {
            clearTimeout(this._hintTimer);
            this._hintTimer = 0;
        }
    }

    // 公共接口：暂停游戏
    public pauseGame(): void {
        if (this._currentPhase === GamePhase.PLAYING) {
            console.log('⏸ GameController: 暂停游戏');
            this.setPhase(GamePhase.PAUSED);
            this.stopAutoHintTimer();
            
            // 暂停UI动画
            if (this._gameBoardView) {
                this.node.pauseSystemEvents();
            }
        }
    }

    // 公共接口：恢复游戏
    public resumeGame(): void {
        if (this._currentPhase === GamePhase.PAUSED) {
            console.log('▶️ GameController: 恢复游戏');
            this.setPhase(GamePhase.PLAYING);
            this.startAutoHintTimer();
            
            // 恢复UI动画
            if (this._gameBoardView) {
                this.node.resumeSystemEvents();
            }
        }
    }

    // 辅助方法
    private findElementById(elementId: string): ElementView | null {
        // 实现查找元素的逻辑
        return null; // 占位实现
    }

    private findElementByPosition(position: Position): ElementView | null {
        // 实现根据位置查找元素的逻辑
        return null; // 占位实现
    }

    private createTestBoard(swapData: any): GameBoard {
        // 创建测试棋盘用于验证交换
        const board = JSON.parse(JSON.stringify(this.gameState.getCurrentState().board));
        // 实现交换逻辑
        return board;
    }

    private async playSwapAnimation(swapData: any, success: boolean): Promise<void> {
        // 播放交换动画
        await this.delay(0.3);
    }

    private async playIntroAnimation(): Promise<void> {
        // 播放关卡介绍动画
        await this.delay(1.0);
    }

    private async playLevelCompleteAnimation(): Promise<void> {
        // 播放关卡完成动画
        await this.delay(2.0);
    }

    private async playLevelFailedAnimation(): Promise<void> {
        // 播放关卡失败动画
        await this.delay(1.5);
    }

    private highlightPossibleMatches(element: ElementView): void {
        // 高亮显示可能的匹配
    }

    private clearHighlights(): void {
        // 清除高亮显示
    }

    private highlightMove(move: MatchResult): void {
        // 高亮显示提示移动
    }

    private activatePowerUp(type: string): void {
        // 激活道具
    }

    private triggerSpecialEffect(effectType: string, position: Position): void {
        // 触发特效
    }

    private handleNoMovesAvailable(): void {
        // 处理无可用移动的情况
        console.log('No moves available - implementing shuffle or game end logic');
    }

    private onMatchesFound(matches: MatchResult[]): void {
        // 处理找到匹配的事件
    }

    private onNoMovesAvailable(): void {
        this.handleNoMovesAvailable();
    }

    private onObjectiveProgress(progress: any): void {
        // 更新目标进度
        if (this._gameHUD) {
            // 更新HUD显示目标进度
        }
    }

    private delay(seconds: number): Promise<void> {
        return new Promise(resolve => {
            this.scheduleOnce(() => resolve(), seconds);
        });
    }

    private cleanup(): void {
        this.stopAutoHintTimer();
        
        // 清理事件监听
        this.gameState.getEventTarget().off('matches_found', this.onMatchesFound, this);
        this.gameState.getEventTarget().off('no_moves_available', this.onNoMovesAvailable, this);
        this.gameState.getEventTarget().off('level_objective_progress', this.onObjectiveProgress, this);
    }

    // 公共接口
    public getCurrentPhase(): GamePhase {
        return this._currentPhase;
    }

    public getCurrentLevelNumber(): number {
        return this._currentLevelNumber;
    }

    public isProcessingMoves(): boolean {
        return this._isProcessingMoves;
    }

    public getPossibleMovesCount(): number {
        return this._possibleMoves.length;
    }
}
