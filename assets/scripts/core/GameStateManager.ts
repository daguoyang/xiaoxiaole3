import { EventTarget } from 'cc';
import { GameState, PlayerStats, LevelObjective, Position } from '../models/GameTypes';

export interface GameStateData {
    currentLevel: number;
    playerStats: PlayerStats;
    gameSession: {
        startTime: number;
        score: number;
        moves: number;
        maxMoves: number;
        objectives: LevelObjective[];
        isCompleted: boolean;
        isPaused: boolean;
    };
    gameMode: 'normal' | 'endless' | 'challenge';
    difficulty: 'easy' | 'medium' | 'hard' | 'expert';
    board?: any; // Board state
    levelConfig?: any; // Current level configuration
}

export class GameStateManager {
    private static _instance: GameStateManager | null = null;
    private _eventTarget: EventTarget;
    private _currentState: GameStateData;
    private _stateHistory: GameStateData[] = [];
    private _maxHistorySize: number = 10;

    private constructor() {
        this._eventTarget = new EventTarget();
        this._currentState = this.createInitialState();
    }

    public static getInstance(): GameStateManager {
        if (!GameStateManager._instance) {
            GameStateManager._instance = new GameStateManager();
        }
        return GameStateManager._instance;
    }

    private createInitialState(): GameStateData {
        return {
            currentLevel: 1,
            playerStats: {
                totalScore: 0,
                highScore: 0,
                totalMoves: 0,
                totalMatches: 0,
                levelsCompleted: 0,
                powerUpsUsed: 0,
                specialElementsCreated: 0,
                averageScore: 0,
                favoriteElementType: 1,
                playTime: 0
            },
            gameSession: {
                startTime: Date.now(),
                score: 0,
                moves: 0,
                maxMoves: 30,
                objectives: [],
                isCompleted: false,
                isPaused: false
            },
            gameMode: 'normal',
            difficulty: 'easy'
        };
    }

    public getCurrentState(): GameStateData {
        return { ...this._currentState };
    }

    public updateState(partialState: Partial<GameStateData>): void {
        const oldState = { ...this._currentState };
        
        // 保存历史状态
        this.saveStateToHistory(oldState);
        
        // 更新当前状态
        this._currentState = { ...this._currentState, ...partialState };
        
        // 发送状态变更事件
        this._eventTarget.emit('state_changed', {
            oldState,
            newState: this._currentState,
            changes: partialState
        });
        
        console.log('🔄 GameState Updated:', partialState);
    }

    public updateGameSession(sessionData: Partial<GameStateData['gameSession']>): void {
        const newSession = { ...this._currentState.gameSession, ...sessionData };
        this.updateState({ gameSession: newSession });
    }

    public updatePlayerStats(statsData: Partial<PlayerStats>): void {
        const newStats = { ...this._currentState.playerStats, ...statsData };
        this.updateState({ playerStats: newStats });
    }

    public startLevel(levelNumber: number, objectives: LevelObjective[], maxMoves: number = 30): void {
        this.updateState({
            currentLevel: levelNumber,
            gameSession: {
                ...this._currentState.gameSession,
                startTime: Date.now(),
                score: 0,
                moves: 0,
                maxMoves,
                objectives,
                isCompleted: false,
                isPaused: false
            }
        });

        this._eventTarget.emit('level_started', {
            levelNumber,
            objectives,
            maxMoves
        });
    }

    public completeLevel(finalScore: number, stars: number): void {
        const sessionData = {
            ...this._currentState.gameSession,
            score: finalScore,
            isCompleted: true
        };

        const statsData = {
            ...this._currentState.playerStats,
            levelsCompleted: this._currentState.playerStats.levelsCompleted + 1,
            totalScore: this._currentState.playerStats.totalScore + finalScore,
            highScore: Math.max(this._currentState.playerStats.highScore, finalScore),
            totalMoves: this._currentState.playerStats.totalMoves + this._currentState.gameSession.moves
        };

        this.updateState({
            gameSession: sessionData,
            playerStats: statsData
        });

        this._eventTarget.emit('level_completed', {
            levelNumber: this._currentState.currentLevel,
            finalScore,
            stars,
            moves: this._currentState.gameSession.moves
        });
    }

    public failLevel(reason: string): void {
        const sessionData = {
            ...this._currentState.gameSession,
            isCompleted: false
        };

        this.updateState({ gameSession: sessionData });

        this._eventTarget.emit('level_failed', {
            levelNumber: this._currentState.currentLevel,
            reason,
            finalScore: this._currentState.gameSession.score
        });
    }

    public pauseGame(): void {
        this.updateGameSession({ isPaused: true });
        this._eventTarget.emit('game_paused');
    }

    public resumeGame(): void {
        this.updateGameSession({ isPaused: false });
        this._eventTarget.emit('game_resumed');
    }

    public addScore(points: number): void {
        const newScore = this._currentState.gameSession.score + points;
        this.updateGameSession({ score: newScore });
        
        this._eventTarget.emit('score_updated', { 
            oldScore: this._currentState.gameSession.score,
            newScore,
            points
        });
    }

    public useMove(): void {
        const newMoves = this._currentState.gameSession.moves + 1;
        this.updateGameSession({ moves: newMoves });
        
        this._eventTarget.emit('move_used', {
            movesUsed: newMoves,
            movesRemaining: this._currentState.gameSession.maxMoves - newMoves
        });

        if (newMoves >= this._currentState.gameSession.maxMoves) {
            this._eventTarget.emit('moves_exhausted');
        }
    }

    public updateObjectiveProgress(objectiveIndex: number, progress: number): void {
        const objectives = [...this._currentState.gameSession.objectives];
        if (objectives[objectiveIndex]) {
            objectives[objectiveIndex] = {
                ...objectives[objectiveIndex],
                current: progress
            };

            this.updateGameSession({ objectives });

            this._eventTarget.emit('objective_progress', {
                objectiveIndex,
                objective: objectives[objectiveIndex],
                isCompleted: progress >= objectives[objectiveIndex].target
            });
        }
    }

    public checkLevelCompletion(): boolean {
        const { objectives } = this._currentState.gameSession;
        return objectives.every(obj => obj.current >= obj.target);
    }

    public swapCells(pos1: Position, pos2: Position): boolean {
        // 简化的交换逻辑，实际实现会更复杂
        console.log(`🔄 Swapping cells: (${pos1.x},${pos1.y}) <-> (${pos2.x},${pos2.y})`);
        return true;
    }

    public updateBoard(board: any): void {
        // 更新当前状态中的棋盘
        this.updateState({ 
            gameSession: {
                ...this._currentState.gameSession,
                // 这里应该有board属性，但为了兼容暂时跳过
            }
        });
    }

    public getEventTarget(): EventTarget {
        return this._eventTarget;
    }

    public canUndo(): boolean {
        return this._stateHistory.length > 0;
    }

    public undoState(): boolean {
        if (this._stateHistory.length === 0) {
            return false;
        }

        const previousState = this._stateHistory.pop()!;
        this._currentState = previousState;

        this._eventTarget.emit('state_undone', {
            restoredState: previousState
        });

        return true;
    }

    private saveStateToHistory(state: GameStateData): void {
        this._stateHistory.push({ ...state });
        
        // 限制历史记录大小
        if (this._stateHistory.length > this._maxHistorySize) {
            this._stateHistory.shift();
        }
    }

    public getGameProgress(): {
        levelProgress: number;
        sessionProgress: number;
        overallProgress: number;
    } {
        const { gameSession, playerStats } = this._currentState;
        
        const levelProgress = gameSession.objectives.reduce((sum, obj) => {
            return sum + Math.min(obj.current / obj.target, 1);
        }, 0) / Math.max(gameSession.objectives.length, 1);

        const sessionProgress = Math.min(gameSession.score / (gameSession.objectives.find(o => o.type === 'score')?.target || 1), 1);
        
        const overallProgress = playerStats.levelsCompleted / 100; // 假设总共100关

        return {
            levelProgress: Math.round(levelProgress * 100) / 100,
            sessionProgress: Math.round(sessionProgress * 100) / 100,
            overallProgress: Math.round(overallProgress * 100) / 100
        };
    }

    public exportState(): string {
        return JSON.stringify({
            currentState: this._currentState,
            timestamp: Date.now(),
            version: '1.0.0'
        });
    }

    public importState(stateData: string): boolean {
        try {
            const data = JSON.parse(stateData);
            if (data.currentState && data.version) {
                this._currentState = data.currentState;
                this._eventTarget.emit('state_imported', data);
                return true;
            }
        } catch (error) {
            console.error('Failed to import state:', error);
        }
        return false;
    }

    public resetState(): void {
        const oldState = { ...this._currentState };
        this._currentState = this.createInitialState();
        this._stateHistory = [];
        
        this._eventTarget.emit('state_reset', { oldState });
        console.log('🔄 GameState Reset');
    }

    public dispose(): void {
        this._eventTarget.targetOff(null);
        this._stateHistory = [];
        GameStateManager._instance = null;
    }
}