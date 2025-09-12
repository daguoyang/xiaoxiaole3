import { Component, Node, Button, Label, director, _decorator } from 'cc';
import { GameBootstrap } from '../GameBootstrap';
import { SaveSystem, UserProgress } from '../systems/SaveSystem';
import { AudioSystem, MusicTrack, SoundEffect } from '../systems/AudioSystem';
import { AnalyticsSystem } from '../systems/AnalyticsSystem';

const { ccclass, property } = _decorator;

@ccclass('MainMenuScene')
export class MainMenuScene extends Component {
    @property({ type: Node, tooltip: 'UI Container' })
    public uiContainer: Node | null = null;

    @property({ type: Button, tooltip: 'Start Game Button' })
    public startButton: Button | null = null;

    @property({ type: Button, tooltip: 'Continue Game Button' })
    public continueButton: Button | null = null;

    @property({ type: Button, tooltip: 'Settings Button' })
    public settingsButton: Button | null = null;

    @property({ type: Button, tooltip: 'Achievements Button' })
    public achievementsButton: Button | null = null;

    @property({ type: Label, tooltip: 'Player Level Label' })
    public playerLevelLabel: Label | null = null;

    @property({ type: Label, tooltip: 'Player Score Label' })
    public playerScoreLabel: Label | null = null;

    private _saveSystem: SaveSystem;
    private _audioSystem: AudioSystem;
    private _analyticsSystem: AnalyticsSystem;
    private _userProgress: UserProgress | null = null;

    protected onLoad(): void {
        console.log('🏠 MainMenuScene: 场景加载');
        
        this.initializeSystems();
        this.ensureGameBootstrap();
        this.setupEventListeners();
        this.loadUserProgress();
    }

    protected onEnable(): void {
        this.playBackgroundMusic();
        this.updateUI();
    }

    private initializeSystems(): void {
        this._saveSystem = SaveSystem.getInstance();
        this._audioSystem = AudioSystem.getInstance();
        this._analyticsSystem = AnalyticsSystem.getInstance();
    }

    private setupEventListeners(): void {
        // 开始游戏按钮
        if (this.startButton) {
            this.startButton.node.on(Button.EventType.CLICK, this.onStartGameClicked, this);
        }

        // 继续游戏按钮
        if (this.continueButton) {
            this.continueButton.node.on(Button.EventType.CLICK, this.onContinueGameClicked, this);
        }

        // 设置按钮
        if (this.settingsButton) {
            this.settingsButton.node.on(Button.EventType.CLICK, this.onSettingsClicked, this);
        }

        // 成就按钮
        if (this.achievementsButton) {
            this.achievementsButton.node.on(Button.EventType.CLICK, this.onAchievementsClicked, this);
        }
    }

    private loadUserProgress(): void {
        const saveData = this._saveSystem.getCurrentSaveData();
        if (saveData) {
            this._userProgress = saveData.userProgress;
        }
    }

    private updateUI(): void {
        if (!this._userProgress) return;

        // 更新玩家等级显示
        if (this.playerLevelLabel) {
            this.playerLevelLabel.string = `等级 ${this._userProgress.currentLevel}`;
        }

        // 更新玩家分数显示
        if (this.playerScoreLabel) {
            this.playerScoreLabel.string = this.formatScore(this._userProgress.totalScore);
        }

        // 更新按钮状态
        if (this.continueButton) {
            // 如果有存档进度则显示继续按钮
            this.continueButton.node.active = this._userProgress.currentLevel > 1;
        }
    }

    private formatScore(score: number): string {
        if (score >= 1000000) {
            return (score / 1000000).toFixed(1) + 'M';
        } else if (score >= 1000) {
            return (score / 1000).toFixed(1) + 'K';
        }
        return score.toString();
    }

    private async playBackgroundMusic(): Promise<void> {
        try {
            await this._audioSystem.playMusic(MusicTrack.MENU, {
                loop: true,
                fadeIn: true
            });
        } catch (error) {
            console.warn('播放背景音乐失败:', error);
        }
    }

    // 按钮事件处理
    private async onStartGameClicked(): Promise<void> {
        await this.playButtonSound();
        
        this._analyticsSystem.trackEvent('MAIN_MENU_START_CLICKED', {
            playerLevel: this._userProgress?.currentLevel || 1,
            totalScore: this._userProgress?.totalScore || 0
        });

        // 从第一关开始
        this.startGameFromLevel(1);
    }

    private async onContinueGameClicked(): Promise<void> {
        await this.playButtonSound();
        
        if (!this._userProgress) {
            console.warn('没有存档数据，无法继续游戏');
            return;
        }

        this._analyticsSystem.trackEvent('MAIN_MENU_CONTINUE_CLICKED', {
            playerLevel: this._userProgress.currentLevel,
            totalScore: this._userProgress.totalScore
        });

        // 从当前关卡继续
        this.startGameFromLevel(this._userProgress.currentLevel);
    }

    private async onSettingsClicked(): Promise<void> {
        await this.playButtonSound();
        
        this._analyticsSystem.trackEvent('MAIN_MENU_SETTINGS_CLICKED', {});
        
        // TODO: 打开设置界面
        console.log('打开设置界面 (待实现)');
    }

    private async onAchievementsClicked(): Promise<void> {
        await this.playButtonSound();
        
        this._analyticsSystem.trackEvent('MAIN_MENU_ACHIEVEMENTS_CLICKED', {});
        
        // TODO: 打开成就界面
        console.log('打开成就界面 (待实现)');
    }

    private async playButtonSound(): Promise<void> {
        try {
            await this._audioSystem.playSFX(SoundEffect.BUTTON_CLICK);
        } catch (error) {
            console.warn('播放按钮音效失败:', error);
        }
    }

    private startGameFromLevel(levelNumber: number): void {
        console.log(`🎮 开始游戏 - 关卡 ${levelNumber}`);
        
        // 停止背景音乐
        this._audioSystem.stopMusic(true);
        
        // 切换到游戏场景
        director.loadScene('GameScene', (err) => {
            if (err) {
                console.error('加载游戏场景失败:', err);
                this._analyticsSystem.trackEvent('SCENE_LOAD_FAILED', {
                    targetScene: 'GameScene',
                    error: err.message
                });
                return;
            }

            // 场景加载成功后，通知游戏控制器开始指定关卡
            const gameScene = director.getScene();
            if (gameScene) {
                const gameController = gameScene.getComponentInChildren('GameController');
                if (gameController) {
                    gameController.startLevel(levelNumber);
                }
            }

            // 场景切换后延迟释放未使用资源（新资源管理器），避免切换瞬间的资源仍在用
            this.scheduleOnce(async () => {
                try {
                    const { AssetMgr } = await import('../../new-scripts/core/AssetManager');
                    AssetMgr.releaseUnused();
                    console.log('🧹 资源清理完成 (releaseUnused)');
                } catch {}
            }, 1.0);
        });
    }

    // 场景入场动画
    public async playEnterAnimation(): Promise<void> {
        if (!this.uiContainer) return;

        console.log('🎬 播放主菜单入场动画');
        
        // 简单的入场动画 - 从下方滑入
        this.uiContainer.setPosition(0, -1920, 0);
        
        return new Promise(resolve => {
            const duration = 0.8;
            // 使用 Cocos Creator 的 tween 系统
            // tween(this.uiContainer)
            //     .to(duration, { position: cc.v3(0, 0, 0) }, { easing: 'backOut' })
            //     .call(() => resolve())
            //     .start();
            
            // 临时简化实现
            this.uiContainer.setPosition(0, 0, 0);
            this.scheduleOnce(() => resolve(), duration);
        });
    }

    // 场景退出动画
    public async playExitAnimation(): Promise<void> {
        if (!this.uiContainer) return;

        console.log('🎬 播放主菜单退出动画');
        
        return new Promise(resolve => {
            const duration = 0.5;
            // 简化实现
            this.scheduleOnce(() => resolve(), duration);
        });
    }

    // 检查游戏初始化状态
    private checkGameBootstrapStatus(): void {
        const bootstrap = director.getScene()?.getComponentInChildren(GameBootstrap);
        if (!bootstrap || !bootstrap.isReady()) {
            console.warn('游戏系统尚未完全初始化');
            
            // 禁用所有按钮直到初始化完成
            this.setButtonsInteractable(false);
            
            // 等待初始化完成
            if (bootstrap) {
                bootstrap.onBootstrapProgress(progress => {
                    if (progress.phase === 'ready') {
                        this.setButtonsInteractable(true);
                    }
                });
            }
        }
    }

    // 若场景中未挂载 GameBootstrap，则在此自动创建一个常驻引导节点
    private ensureGameBootstrap(): void {
        const scene = director.getScene();
        if (!scene) return;
        const exists = scene.getComponentInChildren(GameBootstrap);
        if (exists) return;
        const node = new Node('Bootstrap');
        scene.addChild(node);
        node.addComponent(GameBootstrap);
        console.log('⚙️ 已自动创建 GameBootstrap 节点');
    }

    private setButtonsInteractable(interactable: boolean): void {
        const buttons = [this.startButton, this.continueButton, this.settingsButton, this.achievementsButton];
        buttons.forEach(button => {
            if (button) {
                button.interactable = interactable;
            }
        });
    }

    // 生命周期清理
    protected onDestroy(): void {
        // 清理事件监听
        if (this.startButton) {
            this.startButton.node.off(Button.EventType.CLICK, this.onStartGameClicked, this);
        }
        if (this.continueButton) {
            this.continueButton.node.off(Button.EventType.CLICK, this.onContinueGameClicked, this);
        }
        if (this.settingsButton) {
            this.settingsButton.node.off(Button.EventType.CLICK, this.onSettingsClicked, this);
        }
        if (this.achievementsButton) {
            this.achievementsButton.node.off(Button.EventType.CLICK, this.onAchievementsClicked, this);
        }

        console.log('🗑 MainMenuScene: 场景销毁');
    }
}
