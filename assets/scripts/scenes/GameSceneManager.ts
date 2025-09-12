import { Component, Node, director, _decorator } from 'cc';
import { GameController } from '../controllers/GameController';
import { GameBoardView } from '../ui/GameBoardView';
import { GameHUD } from '../ui/GameHUD';
import { AudioSystem, MusicTrack } from '../systems/AudioSystem';
import { AnalyticsSystem } from '../systems/AnalyticsSystem';
import { SaveSystem } from '../systems/SaveSystem';

const { ccclass, property } = _decorator;

export enum GameSceneState {
    LOADING = 'loading',
    PLAYING = 'playing',
    PAUSED = 'paused',
    LEVEL_COMPLETE = 'level_complete',
    LEVEL_FAILED = 'level_failed',
    TRANSITIONING = 'transitioning'
}

@ccclass('GameSceneManager')
export class GameSceneManager extends Component {
    @property({ type: Node, tooltip: 'Game Container' })
    public gameContainer: Node | null = null;

    @property({ type: Node, tooltip: 'UI Container' })
    public uiContainer: Node | null = null;

    @property({ type: GameController, tooltip: 'Game Controller' })
    public gameController: GameController | null = null;

    @property({ type: GameBoardView, tooltip: 'Game Board View' })
    public gameBoardView: GameBoardView | null = null;

    @property({ type: GameHUD, tooltip: 'Game HUD' })
    public gameHUD: GameHUD | null = null;

    @property({ type: Node, tooltip: 'Pause Menu' })
    public pauseMenu: Node | null = null;

    @property({ type: Node, tooltip: 'Level Complete Dialog' })
    public levelCompleteDialog: Node | null = null;

    @property({ type: Node, tooltip: 'Level Failed Dialog' })
    public levelFailedDialog: Node | null = null;

    private _currentState: GameSceneState = GameSceneState.LOADING;
    private _audioSystem: AudioSystem;
    private _analyticsSystem: AnalyticsSystem;
    private _saveSystem: SaveSystem;
    private _currentLevelNumber: number = 1;
    private _levelStartTime: number = 0;

    protected onLoad(): void {
        console.log('🎮 GameSceneManager: 游戏场景加载');
        
        this.initializeSystems();
        this.setupComponents();
        this.setupEventListeners();
    }

    protected onEnable(): void {
        this.setState(GameSceneState.LOADING);
        this.playBackgroundMusic();
    }

    private initializeSystems(): void {
        this._audioSystem = AudioSystem.getInstance();
        this._analyticsSystem = AnalyticsSystem.getInstance();
        this._saveSystem = SaveSystem.getInstance();
    }

    private setupComponents(): void {
        // 获取组件引用（如果未在编辑器中设置）
        if (!this.gameController) {
            this.gameController = this.node.getComponentInChildren(GameController);
        }
        
        if (!this.gameBoardView) {
            this.gameBoardView = this.node.getComponentInChildren(GameBoardView);
        }
        
        if (!this.gameHUD) {
            this.gameHUD = this.node.getComponentInChildren(GameHUD);
        }

        // 验证关键组件
        if (!this.gameController) {
            console.error('❌ GameController 组件未找到');
        }
        
        if (!this.gameBoardView) {
            console.error('❌ GameBoardView 组件未找到');
        }
        
        if (!this.gameHUD) {
            console.error('❌ GameHUD 组件未找到');
        }
    }

    private setupEventListeners(): void {
        // 监听游戏控制器事件
        if (this.gameController) {
            // 关卡完成
            this.gameController.node.on('level_completed', this.onLevelCompleted, this);
            
            // 关卡失败
            this.gameController.node.on('level_failed', this.onLevelFailed, this);
            
            // 游戏暂停请求
            this.gameController.node.on('pause_requested', this.onPauseRequested, this);
        }

        // 监听HUD事件
        if (this.gameHUD) {
            this.gameHUD.node.on('pause_clicked', this.onPauseClicked, this);
            this.gameHUD.node.on('settings_clicked', this.onSettingsClicked, this);
        }

        // 监听系统事件
        director.on(director.EVENT_BEFORE_SCENE_LOADING, this.onBeforeSceneLoading, this);
    }

    private async playBackgroundMusic(): Promise<void> {
        try {
            await this._audioSystem.playMusic(MusicTrack.GAME, {
                loop: true,
                fadeIn: true
            });
        } catch (error) {
            console.warn('播放游戏背景音乐失败:', error);
        }
    }

    // 状态管理
    private setState(newState: GameSceneState): void {
        const oldState = this._currentState;
        this._currentState = newState;
        
        console.log(`🔄 GameScene状态变更: ${oldState} -> ${newState}`);
        
        this.onStateChanged(oldState, newState);
    }

    private onStateChanged(oldState: GameSceneState, newState: GameSceneState): void {
        // 更新UI显示状态
        this.updateUIVisibility();
        
        // 记录状态变更
        this._analyticsSystem.trackEvent('GAME_SCENE_STATE_CHANGED', {
            oldState,
            newState,
            levelNumber: this._currentLevelNumber,
            timestamp: Date.now()
        });
    }

    private updateUIVisibility(): void {
        // 暂停菜单
        if (this.pauseMenu) {
            this.pauseMenu.active = this._currentState === GameSceneState.PAUSED;
        }

        // 完成对话框
        if (this.levelCompleteDialog) {
            this.levelCompleteDialog.active = this._currentState === GameSceneState.LEVEL_COMPLETE;
        }

        // 失败对话框
        if (this.levelFailedDialog) {
            this.levelFailedDialog.active = this._currentState === GameSceneState.LEVEL_FAILED;
        }

        // 游戏界面
        if (this.gameContainer) {
            this.gameContainer.active = [
                GameSceneState.PLAYING,
                GameSceneState.PAUSED
            ].includes(this._currentState);
        }
    }

    // 游戏流程控制
    public async startLevel(levelNumber: number): Promise<void> {
        console.log(`🎯 开始关卡 ${levelNumber}`);
        
        this._currentLevelNumber = levelNumber;
        this._levelStartTime = Date.now();
        
        try {
            // 记录关卡开始
            this._analyticsSystem.trackEvent('LEVEL_START', {
                levelNumber: levelNumber,
                timestamp: this._levelStartTime
            });

            // 设置游戏状态为加载中
            this.setState(GameSceneState.LOADING);
            
            // 通过游戏控制器开始关卡
            if (this.gameController) {
                await this.gameController.startLevel(levelNumber);
                
                // 关卡加载完成，开始游戏
                this.setState(GameSceneState.PLAYING);
            } else {
                throw new Error('GameController 未初始化');
            }

        } catch (error) {
            console.error(`关卡 ${levelNumber} 加载失败:`, error);
            
            this._analyticsSystem.trackEvent('LEVEL_START_FAILED', {
                levelNumber: levelNumber,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            
            // 返回主菜单
            this.returnToMainMenu();
        }
    }

    // 事件处理
    private onLevelCompleted(eventData: any): void {
        console.log(`🎉 关卡 ${this._currentLevelNumber} 完成`, eventData);
        
        this.setState(GameSceneState.LEVEL_COMPLETE);
        
        // 计算游戏时长
        const playTime = Date.now() - this._levelStartTime;
        
        // 记录关卡完成
        this._analyticsSystem.trackEvent('LEVEL_COMPLETE', {
            levelNumber: this._currentLevelNumber,
            score: eventData.score,
            stars: eventData.stars,
            playTime: playTime,
            moves: eventData.movesUsed
        });

        // 保存进度
        this._saveSystem.updateLevelProgress(this._currentLevelNumber, {
            levelNumber: this._currentLevelNumber,
            bestScore: eventData.score,
            stars: eventData.stars,
            completed: true,
            attempts: 1,
            completedAt: new Date().toISOString()
        });

        // 显示完成界面
        this.showLevelCompleteDialog(eventData);
    }

    private onLevelFailed(eventData: any): void {
        console.log(`💥 关卡 ${this._currentLevelNumber} 失败`, eventData);
        
        this.setState(GameSceneState.LEVEL_FAILED);
        
        // 计算游戏时长
        const playTime = Date.now() - this._levelStartTime;
        
        // 记录关卡失败
        this._analyticsSystem.trackEvent('LEVEL_FAILED', {
            levelNumber: this._currentLevelNumber,
            reason: eventData.reason,
            playTime: playTime,
            finalScore: eventData.finalScore
        });

        // 更新尝试次数
        const currentProgress = this._saveSystem.getLevelProgress(this._currentLevelNumber);
        this._saveSystem.updateLevelProgress(this._currentLevelNumber, {
            levelNumber: this._currentLevelNumber,
            bestScore: Math.max(currentProgress?.bestScore || 0, eventData.finalScore || 0),
            stars: currentProgress?.stars || 0,
            completed: false,
            attempts: (currentProgress?.attempts || 0) + 1
        });

        // 显示失败界面
        this.showLevelFailedDialog(eventData);
    }

    private onPauseRequested(): void {
        this.pauseGame();
    }

    private onPauseClicked(): void {
        this.pauseGame();
    }

    private onSettingsClicked(): void {
        this.pauseGame();
        // TODO: 打开设置界面
    }

    // 游戏控制
    public pauseGame(): void {
        if (this._currentState === GameSceneState.PLAYING) {
            console.log('⏸ 暂停游戏');
            
            this.setState(GameSceneState.PAUSED);
            
            if (this.gameController) {
                this.gameController.pauseGame();
            }

            this._analyticsSystem.trackEvent('GAME_PAUSED', {
                levelNumber: this._currentLevelNumber,
                playTime: Date.now() - this._levelStartTime
            });
        }
    }

    public resumeGame(): void {
        if (this._currentState === GameSceneState.PAUSED) {
            console.log('▶️ 恢复游戏');
            
            this.setState(GameSceneState.PLAYING);
            
            if (this.gameController) {
                this.gameController.resumeGame();
            }

            this._analyticsSystem.trackEvent('GAME_RESUMED', {
                levelNumber: this._currentLevelNumber
            });
        }
    }

    public restartLevel(): void {
        console.log('🔄 重新开始关卡');
        
        this._analyticsSystem.trackEvent('LEVEL_RESTART', {
            levelNumber: this._currentLevelNumber
        });

        this.startLevel(this._currentLevelNumber);
    }

    public nextLevel(): void {
        const nextLevelNumber = this._currentLevelNumber + 1;
        console.log(`➡️ 进入下一关: ${nextLevelNumber}`);
        
        this.startLevel(nextLevelNumber);
    }

    public returnToMainMenu(): void {
        console.log('🏠 返回主菜单');
        
        this._analyticsSystem.trackEvent('RETURN_TO_MAIN_MENU', {
            fromLevel: this._currentLevelNumber,
            gameState: this._currentState
        });

        // 停止背景音乐
        this._audioSystem.stopMusic(true);
        
        // 切换场景
        director.loadScene('MainMenu', (err) => {
            if (err) {
                console.error('返回主菜单失败:', err);
            }
        });
    }

    // 对话框显示
    private showLevelCompleteDialog(eventData: any): void {
        // TODO: 实现完成对话框显示逻辑
        console.log('显示关卡完成对话框', eventData);
    }

    private showLevelFailedDialog(eventData: any): void {
        // TODO: 实现失败对话框显示逻辑
        console.log('显示关卡失败对话框', eventData);
    }

    // 场景生命周期
    private onBeforeSceneLoading(): void {
        // 场景切换前的清理工作
        if (this.gameController) {
            this.gameController.pauseGame();
        }
    }

    protected onDestroy(): void {
        // 清理事件监听
        if (this.gameController) {
            this.gameController.node.off('level_completed', this.onLevelCompleted, this);
            this.gameController.node.off('level_failed', this.onLevelFailed, this);
            this.gameController.node.off('pause_requested', this.onPauseRequested, this);
        }

        if (this.gameHUD) {
            this.gameHUD.node.off('pause_clicked', this.onPauseClicked, this);
            this.gameHUD.node.off('settings_clicked', this.onSettingsClicked, this);
        }

        director.off(director.EVENT_BEFORE_SCENE_LOADING, this.onBeforeSceneLoading, this);

        console.log('🗑 GameSceneManager: 场景管理器销毁');
    }

    // 公共接口
    public getCurrentState(): GameSceneState {
        return this._currentState;
    }

    public getCurrentLevelNumber(): number {
        return this._currentLevelNumber;
    }

    public isPlaying(): boolean {
        return this._currentState === GameSceneState.PLAYING;
    }

    public isPaused(): boolean {
        return this._currentState === GameSceneState.PAUSED;
    }
}