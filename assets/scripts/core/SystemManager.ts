import { _decorator, Component } from 'cc';
import { GameStateManager } from './GameStateManager';
import { AssetManager } from './AssetManager';
import { AnimationScheduler } from './AnimationScheduler';
import { BalanceConfig } from './BalanceConfig';
import { AudioSystem } from '../systems/AudioSystem';
import { SaveSystem } from '../systems/SaveSystem';
import { AnalyticsSystem } from '../systems/AnalyticsSystem';
import { EffectProcessor } from '../systems/EffectProcessor';
import { ExtendedLevelModel } from '../models/ExtendedLevelModel';

const { ccclass } = _decorator;

/**
 * 系统管理器 - 确保所有单例系统在 Cocos Creator 环境中正确初始化
 */
@ccclass('SystemManager')
export class SystemManager extends Component {
    private static _instance: SystemManager | null = null;
    private _isInitialized: boolean = false;
    
    // 系统实例引用
    private _gameStateManager: GameStateManager | null = null;
    private _assetManager: AssetManager | null = null;
    private _animationScheduler: AnimationScheduler | null = null;
    private _balanceConfig: BalanceConfig | null = null;
    private _audioSystem: AudioSystem | null = null;
    private _saveSystem: SaveSystem | null = null;
    private _analyticsSystem: AnalyticsSystem | null = null;
    private _effectProcessor: EffectProcessor | null = null;
    private _levelModel: ExtendedLevelModel | null = null;

    public static getInstance(): SystemManager {
        return SystemManager._instance!;
    }

    protected onLoad(): void {
        // 确保单例
        if (SystemManager._instance) {
            console.warn('SystemManager already exists, destroying duplicate');
            this.node.destroy();
            return;
        }

        SystemManager._instance = this;
        console.log('🏗 SystemManager: 系统管理器初始化');
    }

    public async initializeAllSystems(): Promise<void> {
        if (this._isInitialized) {
            console.log('SystemManager: 系统已经初始化完成');
            return;
        }

        console.log('🚀 SystemManager: 开始初始化所有系统');

        try {
            // 按依赖顺序初始化系统
            await this.initializeCoreSystems();
            await this.initializeGameSystems();
            await this.initializeUISystems();
            
            this._isInitialized = true;
            console.log('✅ SystemManager: 所有系统初始化完成');
            
        } catch (error) {
            console.error('❌ SystemManager: 系统初始化失败', error);
            throw error;
        }
    }

    private async initializeCoreSystems(): Promise<void> {
        console.log('📦 初始化核心系统');

        // 1. 资源管理器 - 其他系统可能需要加载资源
        this._assetManager = AssetManager.getInstance();

        // 2. 游戏状态管理器 - 核心数据管理
        this._gameStateManager = GameStateManager.getInstance();

        // 3. 动画调度器 - UI 动画支持
        this._animationScheduler = AnimationScheduler.getInstance();

        // 4. 平衡配置 - 游戏参数管理
        this._balanceConfig = BalanceConfig.getInstance();

        console.log('✅ 核心系统初始化完成');
    }

    private async initializeGameSystems(): Promise<void> {
        console.log('🎮 初始化游戏系统');

        // 1. 存档系统 - 需要最早初始化以加载用户数据
        this._saveSystem = SaveSystem.getInstance();

        // 2. 音频系统 - 可能需要根据存档设置音量
        this._audioSystem = AudioSystem.getInstance();

        // 3. 分析系统 - 需要用户ID等信息
        this._analyticsSystem = AnalyticsSystem.getInstance();

        // 4. 特效处理器 - 游戏效果支持
        this._effectProcessor = EffectProcessor.getInstance();

        // 5. 关卡模型 - 关卡数据管理
        this._levelModel = ExtendedLevelModel.getInstance();

        console.log('✅ 游戏系统初始化完成');
    }

    private async initializeUISystems(): Promise<void> {
        console.log('🖼 初始化UI系统');

        // UI 系统通常在组件创建时自动初始化
        // 这里可以做一些全局 UI 配置

        console.log('✅ UI系统初始化完成');
    }

    // 系统访问接口
    public getGameStateManager(): GameStateManager {
        if (!this._gameStateManager) {
            throw new Error('GameStateManager not initialized');
        }
        return this._gameStateManager;
    }

    public getAssetManager(): AssetManager {
        if (!this._assetManager) {
            throw new Error('AssetManager not initialized');
        }
        return this._assetManager;
    }

    public getAnimationScheduler(): AnimationScheduler {
        if (!this._animationScheduler) {
            throw new Error('AnimationScheduler not initialized');
        }
        return this._animationScheduler;
    }

    public getBalanceConfig(): BalanceConfig {
        if (!this._balanceConfig) {
            throw new Error('BalanceConfig not initialized');
        }
        return this._balanceConfig;
    }

    public getAudioSystem(): AudioSystem {
        if (!this._audioSystem) {
            throw new Error('AudioSystem not initialized');
        }
        return this._audioSystem;
    }

    public getSaveSystem(): SaveSystem {
        if (!this._saveSystem) {
            throw new Error('SaveSystem not initialized');
        }
        return this._saveSystem;
    }

    public getAnalyticsSystem(): AnalyticsSystem {
        if (!this._analyticsSystem) {
            throw new Error('AnalyticsSystem not initialized');
        }
        return this._analyticsSystem;
    }

    public getEffectProcessor(): EffectProcessor {
        if (!this._effectProcessor) {
            throw new Error('EffectProcessor not initialized');
        }
        return this._effectProcessor;
    }

    public getLevelModel(): ExtendedLevelModel {
        if (!this._levelModel) {
            throw new Error('ExtendedLevelModel not initialized');
        }
        return this._levelModel;
    }

    // 系统状态检查
    public isInitialized(): boolean {
        return this._isInitialized;
    }

    public getInitializedSystemsCount(): number {
        let count = 0;
        if (this._gameStateManager) count++;
        if (this._assetManager) count++;
        if (this._animationScheduler) count++;
        if (this._balanceConfig) count++;
        if (this._audioSystem) count++;
        if (this._saveSystem) count++;
        if (this._analyticsSystem) count++;
        if (this._effectProcessor) count++;
        if (this._levelModel) count++;
        return count;
    }

    // 系统健康检查
    public performHealthCheck(): { [systemName: string]: boolean } {
        const healthStatus = {
            gameStateManager: !!this._gameStateManager,
            assetManager: !!this._assetManager,
            animationScheduler: !!this._animationScheduler,
            balanceConfig: !!this._balanceConfig,
            audioSystem: !!this._audioSystem,
            saveSystem: !!this._saveSystem,
            analyticsSystem: !!this._analyticsSystem,
            effectProcessor: !!this._effectProcessor,
            levelModel: !!this._levelModel
        };

        const healthyCount = Object.values(healthStatus).filter(Boolean).length;
        const totalCount = Object.keys(healthStatus).length;

        console.log(`🏥 SystemManager健康检查: ${healthyCount}/${totalCount} 系统正常`);

        return healthStatus;
    }

    // 系统重启（用于错误恢复）
    public async restartSystem(systemName: string): Promise<void> {
        console.log(`🔄 重启系统: ${systemName}`);

        try {
            switch (systemName) {
                case 'gameStateManager':
                    this._gameStateManager = GameStateManager.getInstance();
                    break;
                case 'assetManager':
                    this._assetManager = AssetManager.getInstance();
                    break;
                case 'audioSystem':
                    this._audioSystem = AudioSystem.getInstance();
                    break;
                // 可以添加更多系统的重启逻辑
                default:
                    throw new Error(`Unknown system: ${systemName}`);
            }

            console.log(`✅ 系统重启成功: ${systemName}`);

        } catch (error) {
            console.error(`❌ 系统重启失败: ${systemName}`, error);
            throw error;
        }
    }

    protected onDestroy(): void {
        console.log('🗑 SystemManager: 系统管理器销毁');
        
        // 清理系统引用
        this._gameStateManager = null;
        this._assetManager = null;
        this._animationScheduler = null;
        this._balanceConfig = null;
        this._audioSystem = null;
        this._saveSystem = null;
        this._analyticsSystem = null;
        this._effectProcessor = null;
        this._levelModel = null;
        
        SystemManager._instance = null;
        this._isInitialized = false;
    }
}