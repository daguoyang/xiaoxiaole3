import { Prefab, JsonAsset, SpriteFrame, AudioClip, resources } from 'cc';
import { ResLoadHelper } from '../helpers/resLoadHelper';

/**
 * 智能资源预加载器
 * 基于用户行为预测和优先级管理资源加载
 */
export class ResourcePreloader {
    private static instance: ResourcePreloader;
    
    // 预加载状态管理
    private preloadQueue: Map<string, PreloadItem> = new Map();
    private loadedAssets: Map<string, any> = new Map();
    private loadingPromises: Map<string, Promise<any>> = new Map();
    
    // 优先级队列
    private highPriorityQueue: string[] = [];
    private mediumPriorityQueue: string[] = [];
    private lowPriorityQueue: string[] = [];
    
    // 加载统计
    private loadStats = {
        total: 0,
        loaded: 0,
        failed: 0,
        cacheHits: 0
    };
    
    // 用户行为预测
    private userPatterns: Map<string, number> = new Map();
    private lastViewSequence: string[] = [];
    
    public static getInstance(): ResourcePreloader {
        if (!ResourcePreloader.instance) {
            ResourcePreloader.instance = new ResourcePreloader();
        }
        return ResourcePreloader.instance;
    }
    
    private constructor() {
        this.init();
    }
    
    /**
     * 初始化预加载器
     */
    private init() {
        console.log('📦 资源预加载器初始化...');
        
        // 预定义常用资源优先级
        this.setupDefaultPreloadRules();
        
        // 启动智能预加载
        this.startIntelligentPreloading();
    }
    
    /**
     * 设置默认预加载规则
     */
    private setupDefaultPreloadRules() {
        // 高优先级：核心UI资源
        const highPriorityAssets = [
            'ui/homeView',          // 主页
            'ui/gameView',          // 游戏界面
            'ui/resultView',        // 结算界面
            'ui/loadingView'        // 加载界面
        ];
        
        // 中优先级：常用UI资源
        const mediumPriorityAssets = [
            'ui/challengeView',     // 挑战界面
            'ui/settingGameView'    // 设置界面
        ];
        
        // 低优先级：偶尔使用的资源
        const lowPriorityAssets = [
            'ui/tipsView',          // 提示界面
            'ui/acrossView'         // 其他界面
        ];
        
        highPriorityAssets.forEach(asset => this.addToQueue(asset, 'high'));
        mediumPriorityAssets.forEach(asset => this.addToQueue(asset, 'medium'));
        lowPriorityAssets.forEach(asset => this.addToQueue(asset, 'low'));
    }
    
    /**
     * 添加资源到预加载队列
     */
    public addToQueue(resourcePath: string, priority: 'high' | 'medium' | 'low' = 'medium') {
        const item: PreloadItem = {
            path: resourcePath,
            priority,
            addedTime: Date.now(),
            attempts: 0,
            type: this.detectResourceType(resourcePath)
        };
        
        this.preloadQueue.set(resourcePath, item);
        
        // 添加到对应优先级队列
        switch (priority) {
            case 'high':
                if (!this.highPriorityQueue.includes(resourcePath)) {
                    this.highPriorityQueue.push(resourcePath);
                }
                break;
            case 'medium':
                if (!this.mediumPriorityQueue.includes(resourcePath)) {
                    this.mediumPriorityQueue.push(resourcePath);
                }
                break;
            case 'low':
                if (!this.lowPriorityQueue.includes(resourcePath)) {
                    this.lowPriorityQueue.push(resourcePath);
                }
                break;
        }
        
        console.log(`📦 资源加入预加载队列: ${resourcePath} (${priority})`);
    }
    
    /**
     * 检测资源类型
     */
    private detectResourceType(path: string): string {
        if (path.includes('prefab') || !path.includes('.')) {
            return 'prefab';
        }
        if (path.includes('.json')) {
            return 'json';
        }
        if (path.includes('.png') || path.includes('.jpg')) {
            return 'texture';
        }
        if (path.includes('.mp3') || path.includes('.wav')) {
            return 'audio';
        }
        return 'unknown';
    }
    
    /**
     * 启动智能预加载
     */
    private startIntelligentPreloading() {
        // 延迟启动，避免影响初始化性能
        setTimeout(() => {
            try {
                this.processPreloadQueue();
            } catch (error) {
                console.warn('⚠️ 智能预加载启动失败:', error);
            }
        }, 1000);
    }
    
    /**
     * 处理预加载队列
     */
    private async processPreloadQueue() {
        console.log('🚀 开始智能预加载...');
        
        // 按优先级处理队列
        await this.processQueue(this.highPriorityQueue, 'high');
        await this.processQueue(this.mediumPriorityQueue, 'medium');
        await this.processQueue(this.lowPriorityQueue, 'low');
        
        console.log(`✅ 预加载完成! 统计:`, this.loadStats);
    }
    
    /**
     * 处理特定优先级队列
     */
    private async processQueue(queue: string[], priority: string) {
        console.log(`📋 处理${priority}优先级队列 (${queue.length}项)`);
        
        const concurrency = priority === 'high' ? 3 : priority === 'medium' ? 2 : 1;
        
        for (let i = 0; i < queue.length; i += concurrency) {
            const batch = queue.slice(i, i + concurrency);
            const promises = batch.map(path => this.preloadResource(path));
            
            try {
                await Promise.allSettled(promises);
                
                // 高优先级资源之间稍作间隔，避免阻塞
                if (priority === 'high') {
                    await this.delay(50);
                }
            } catch (error) {
                console.warn(`❌ ${priority}优先级批次加载失败:`, error);
            }
        }
    }
    
    /**
     * 预加载单个资源
     */
    private async preloadResource(resourcePath: string): Promise<any> {
        // 检查是否已加载
        if (this.loadedAssets.has(resourcePath)) {
            this.loadStats.cacheHits++;
            return this.loadedAssets.get(resourcePath);
        }
        
        // 检查是否正在加载
        if (this.loadingPromises.has(resourcePath)) {
            return this.loadingPromises.get(resourcePath);
        }
        
        const item = this.preloadQueue.get(resourcePath);
        if (!item) return null;
        
        item.attempts++;
        this.loadStats.total++;
        
        // 创建加载Promise
        const loadPromise = this.loadResourceByType(resourcePath, item.type);
        this.loadingPromises.set(resourcePath, loadPromise);
        
        try {
            const asset = await loadPromise;
            
            // 加载成功
            this.loadedAssets.set(resourcePath, asset);
            this.loadStats.loaded++;
            
            console.log(`✅ 预加载成功: ${resourcePath} (${item.type})`);
            
            return asset;
        } catch (error) {
            this.loadStats.failed++;
            
            // 只在第一次失败时输出详细错误，避免重复日志
            if (item.attempts === 1) {
                console.warn(`❌ 预加载失败: ${resourcePath}`, error.message || error);
            }
            
            // 简化重试机制，减少重试次数
            if (item.attempts < 2) {
                setTimeout(() => {
                    this.preloadResource(resourcePath);
                }, 1000 * item.attempts);
            }
            
            return null;
        } finally {
            this.loadingPromises.delete(resourcePath);
        }
    }
    
    /**
     * 根据类型加载资源
     */
    private async loadResourceByType(path: string, type: string): Promise<any> {
        switch (type) {
            case 'prefab':
                return await ResLoadHelper.loadPrefabSync(path);
            case 'json':
                return await ResLoadHelper.loadCommonAssetSync(path, JsonAsset);
            case 'texture':
                return await ResLoadHelper.loadCommonAssetSync(path, SpriteFrame);
            case 'audio':
                return await ResLoadHelper.loadCommonAssetSync(path, AudioClip);
            default:
                // 尝试通用加载
                return await ResLoadHelper.loadCommonAssetSync(path, Prefab);
        }
    }
    
    /**
     * 获取预加载的资源
     */
    public getPreloadedAsset(resourcePath: string): any {
        if (this.loadedAssets.has(resourcePath)) {
            this.loadStats.cacheHits++;
            console.log(`🎯 缓存命中: ${resourcePath}`);
            return this.loadedAssets.get(resourcePath);
        }
        return null;
    }
    
    /**
     * 记录用户访问模式
     */
    public recordUserPattern(viewName: string) {
        // 更新访问次数
        const count = this.userPatterns.get(viewName) || 0;
        this.userPatterns.set(viewName, count + 1);
        
        // 记录访问序列
        this.lastViewSequence.push(viewName);
        if (this.lastViewSequence.length > 10) {
            this.lastViewSequence.shift();
        }
        
        // 预测下一个可能访问的界面
        this.predictNextViews(viewName);
    }
    
    /**
     * 预测下一个可能的界面
     */
    private predictNextViews(currentView: string) {
        const predictions: { [key: string]: string[] } = {
            'ui/homeView': ['ui/challengeView', 'ui/settingGameView'],
            'ui/challengeView': ['ui/gameView'],
            'ui/gameView': ['ui/resultView', 'ui/settingGameView'],
            'ui/resultView': ['ui/homeView', 'ui/gameView', 'ui/challengeView']
        };
        
        const nextViews = predictions[currentView];
        if (nextViews) {
            nextViews.forEach(view => {
                if (!this.loadedAssets.has(view)) {
                    this.addToQueue(view, 'medium');
                }
            });
        }
    }
    
    /**
     * 延迟工具函数
     */
    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    /**
     * 获取加载统计
     */
    public getLoadStats() {
        return { ...this.loadStats };
    }
    
    /**
     * 清理未使用的资源
     */
    public cleanup() {
        const now = Date.now();
        const maxAge = 5 * 60 * 1000; // 5分钟
        
        for (const [path, item] of this.preloadQueue.entries()) {
            if (now - item.addedTime > maxAge && !this.loadedAssets.has(path)) {
                this.preloadQueue.delete(path);
                console.log(`🗑️ 清理过期预加载项: ${path}`);
            }
        }
    }
}

interface PreloadItem {
    path: string;
    priority: 'high' | 'medium' | 'low';
    addedTime: number;
    attempts: number;
    type: string;
}

// 导出单例实例
export const resourcePreloader = ResourcePreloader.getInstance();