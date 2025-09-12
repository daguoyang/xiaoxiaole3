import { Component, director, Node, _decorator } from 'cc';
import { GameStateManager } from './core/GameStateManager';
import { AssetManager } from './core/AssetManager';
import { BalanceConfig } from './core/BalanceConfig';
import { AnimationScheduler } from './core/AnimationScheduler';
import { AudioSystem } from './systems/AudioSystem';
import { SaveSystem } from './systems/SaveSystem';
import { AnalyticsSystem } from './systems/AnalyticsSystem';
import { EffectProcessor } from './systems/EffectProcessor';
import { ExtendedLevelModel } from './models/ExtendedLevelModel';
import { GameConfig } from './core/GameConfig';

const { ccclass, property } = _decorator;

export enum GameBootstrapPhase {
    LOADING = 'loading',
    INITIALIZING = 'initializing',
    READY = 'ready',
    ERROR = 'error'
}

export interface BootstrapProgress {
    phase: GameBootstrapPhase;
    progress: number; // 0-1
    message: string;
    error?: Error;
}

@ccclass('GameBootstrap')
export class GameBootstrap extends Component {
    @property({ type: Node, tooltip: 'Loading UI Node' })
    public loadingUI: Node | null = null;

    @property({ type: Node, tooltip: 'Error UI Node' })
    public errorUI: Node | null = null;

    private _currentPhase: GameBootstrapPhase = GameBootstrapPhase.LOADING;
    private _progress: number = 0;
    private _bootstrapCallbacks: Array<(progress: BootstrapProgress) => void> = [];

    // 系统初始化顺序
    private readonly INIT_STEPS = [
        { name: '加载游戏配置', weight: 10, func: this.initGameConfig.bind(this) },
        { name: '初始化资源管理器', weight: 15, func: this.initAssetManager.bind(this) },
        { name: '初始化存档系统', weight: 10, func: this.initSaveSystem.bind(this) },
        { name: '初始化音频系统', weight: 15, func: this.initAudioSystem.bind(this) },
        { name: '初始化分析系统', weight: 10, func: this.initAnalyticsSystem.bind(this) },
        { name: '初始化游戏状态管理器', weight: 15, func: this.initGameStateManager.bind(this) },
        { name: '初始化动画调度器', weight: 10, func: this.initAnimationScheduler.bind(this) },
        { name: '初始化特效处理器', weight: 10, func: this.initEffectProcessor.bind(this) },
        { name: '初始化关卡模型', weight: 10, func: this.initLevelModel.bind(this) },
        { name: '加载核心资源', weight: 20, func: this.preloadCoreAssets.bind(this) }
    ];

    protected onLoad(): void {
        console.log('🎮 GameBootstrap: 开始游戏初始化');
        
        // 设置为常驻节点
        director.addPersistRootNode(this.node);
        
        // 开始初始化流程
        this.startBootstrap();
    }

    public onBootstrapProgress(callback: (progress: BootstrapProgress) => void): void {
        this._bootstrapCallbacks.push(callback);
    }

    private async startBootstrap(): Promise<void> {
        try {
            this.setPhase(GameBootstrapPhase.INITIALIZING, 0, '开始初始化游戏系统');
            
            let completedWeight = 0;
            const totalWeight = this.INIT_STEPS.reduce((sum, step) => sum + step.weight, 0);

            for (const step of this.INIT_STEPS) {
                try {
                    this.updateProgress(completedWeight / totalWeight, step.name);
                    
                    console.log(`🔧 执行: ${step.name}`);
                    await step.func();
                    
                    completedWeight += step.weight;
                    this.updateProgress(completedWeight / totalWeight, `${step.name} - 完成`);
                    
                } catch (error) {
                    console.error(`❌ ${step.name} 失败:`, error);
                    this.setPhase(GameBootstrapPhase.ERROR, completedWeight / totalWeight, 
                                `初始化失败: ${step.name}`, error as Error);
                    return;
                }
            }

            // 初始化完成
            this.setPhase(GameBootstrapPhase.READY, 1.0, '游戏系统初始化完成');
            console.log('✅ GameBootstrap: 所有系统初始化完成');
            
            // 延迟1秒后进入主菜单
            this.scheduleOnce(() => {
                this.enterMainMenu();
            }, 1.0);
            
        } catch (error) {
            console.error('💥 GameBootstrap: 初始化过程中发生未处理的错误', error);
            this.setPhase(GameBootstrapPhase.ERROR, this._progress, 
                        '初始化过程中发生错误', error as Error);
        }
    }

    private setPhase(phase: GameBootstrapPhase, progress: number, message: string, error?: Error): void {
        this._currentPhase = phase;
        this._progress = progress;
        
        const progressInfo: BootstrapProgress = {
            phase,
            progress,
            message,
            error
        };

        // 通知回调
        this._bootstrapCallbacks.forEach(callback => {
            try {
                callback(progressInfo);
            } catch (err) {
                console.warn('Bootstrap callback error:', err);
            }
        });

        // 更新UI
        this.updateUI(progressInfo);
    }

    private updateProgress(progress: number, message: string): void {
        this.setPhase(this._currentPhase, progress, message);
    }

    private updateUI(progress: BootstrapProgress): void {
        // 更新加载UI
        if (this.loadingUI) {
            this.loadingUI.active = progress.phase === GameBootstrapPhase.LOADING || 
                                   progress.phase === GameBootstrapPhase.INITIALIZING;
        }

        // 更新错误UI
        if (this.errorUI) {
            this.errorUI.active = progress.phase === GameBootstrapPhase.ERROR;
        }

        // 这里可以添加更详细的UI更新逻辑
        // 比如更新进度条、状态文本等
    }

    // 系统初始化方法
    private async initGameConfig(): Promise<void> {
        // GameConfig 是静态类，无需初始化
        console.log(`📊 游戏配置加载完成 - Version: ${GameConfig.VERSION}`);
    }

    private async initAssetManager(): Promise<void> {
        const assetManager = AssetManager.getInstance();
        // AssetManager 在 getInstance 时会自动初始化
        console.log('📦 资源管理器初始化完成');
    }

    private async initSaveSystem(): Promise<void> {
        const saveSystem = SaveSystem.getInstance();
        await saveSystem.loadGame();
        console.log('💾 存档系统初始化完成');
    }

    private async initAudioSystem(): Promise<void> {
        const audioSystem = AudioSystem.getInstance();
        await audioSystem.preloadAudioAssets();
        console.log('🔊 音频系统初始化完成');
    }

    private async initAnalyticsSystem(): Promise<void> {
        const analytics = AnalyticsSystem.getInstance();
        analytics.trackEvent('GAME_START', {
            version: GameConfig.VERSION,
            platform: 'cocos-creator',
            timestamp: Date.now()
        });
        console.log('📈 分析系统初始化完成');
    }

    private async initGameStateManager(): Promise<void> {
        const gameState = GameStateManager.getInstance();
        // GameStateManager 在 getInstance 时会自动初始化
        console.log('🎮 游戏状态管理器初始化完成');
    }

    private async initAnimationScheduler(): Promise<void> {
        const scheduler = AnimationScheduler.getInstance();
        // 注册基础动画执行器
        await scheduler.registerBuiltinExecutors();
        console.log('🎬 动画调度器初始化完成');
    }

    private async initEffectProcessor(): Promise<void> {
        const processor = EffectProcessor.getInstance();
        // 注册基础特效处理器
        processor.registerBuiltinHandlers();
        console.log('✨ 特效处理器初始化完成');
    }

    private async initLevelModel(): Promise<void> {
        const levelModel = ExtendedLevelModel.getInstance();
        // 预加载前几个关卡配置
        await levelModel.preloadLevels(1, 5);
        console.log('🎯 关卡模型初始化完成');
    }

    private async preloadCoreAssets(): Promise<void> {
        const assetManager = AssetManager.getInstance();
        
        // 预加载核心UI资源
        const coreAssets = [
            'textures/ui/button_normal',
            'textures/ui/button_pressed',
            'textures/ui/background_main',
            'textures/elements/red',
            'textures/elements/blue',
            'textures/elements/green'
        ];

        await assetManager.preloadAssets(coreAssets);
        console.log('📦 核心资源预加载完成');
    }

    private enterMainMenu(): void {
        console.log('🎮 进入主菜单');
        
        // 切换到主菜单场景
        director.loadScene('MainMenu', (err) => {
            if (err) {
                console.error('加载主菜单场景失败:', err);
                this.setPhase(GameBootstrapPhase.ERROR, 1.0, '无法加载主菜单场景', err);
            } else {
                console.log('✅ 主菜单场景加载成功');
            }
        });
    }

    // 公共接口
    public getCurrentPhase(): GameBootstrapPhase {
        return this._currentPhase;
    }

    public getProgress(): number {
        return this._progress;
    }

    public isReady(): boolean {
        return this._currentPhase === GameBootstrapPhase.READY;
    }

    // 错误恢复
    public retryBootstrap(): void {
        if (this._currentPhase === GameBootstrapPhase.ERROR) {
            console.log('🔄 重试初始化');
            this.startBootstrap();
        }
    }

    // 组件销毁
    protected onDestroy(): void {
        this._bootstrapCallbacks.length = 0;
        console.log('🗑 GameBootstrap: 组件销毁');
    }
}