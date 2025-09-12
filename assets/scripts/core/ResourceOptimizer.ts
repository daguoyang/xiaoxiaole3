import { Asset, resources, director } from 'cc';

/**
 * 资源优化管理器
 * 功能:
 * - 智能缓存管理
 * - 内存监控
 * - 预加载优化
 * - 资源释放策略
 */
export class ResourceOptimizer {
    private static _instance: ResourceOptimizer | null = null;
    
    private assetCache = new Map<string, Asset>();
    private assetUsage = new Map<string, number>();
    private preloadQueue: string[] = [];
    private memoryThreshold = 100 * 1024 * 1024; // 100MB
    private maxCacheSize = 50;
    
    // 性能统计
    private stats = {
        cacheHits: 0,
        cacheMisses: 0,
        memoryUsage: 0,
        assetsLoaded: 0,
        assetsReleased: 0
    };

    private constructor() {
        this.startMemoryMonitoring();
    }

    public static getInstance(): ResourceOptimizer {
        if (!ResourceOptimizer._instance) {
            ResourceOptimizer._instance = new ResourceOptimizer();
        }
        return ResourceOptimizer._instance;
    }

    /**
     * 智能资源加载
     */
    public async loadAsset<T extends Asset>(
        path: string, 
        type: new () => T, 
        priority: 'high' | 'normal' | 'low' = 'normal'
    ): Promise<T | null> {
        // 检查缓存
        if (this.assetCache.has(path)) {
            this.stats.cacheHits++;
            this.updateUsage(path);
            return this.assetCache.get(path) as T;
        }

        this.stats.cacheMisses++;

        try {
            // 根据优先级决定加载策略
            const asset = await this.performLoad<T>(path, type, priority);
            
            if (asset) {
                this.cacheAsset(path, asset);
                this.stats.assetsLoaded++;
            }
            
            return asset;
        } catch (error) {
            console.error(`❌ 资源加载失败: ${path}`, error);
            return null;
        }
    }

    /**
     * 批量预加载资源
     */
    public async preloadAssets(paths: string[], onProgress?: (progress: number) => void): Promise<void> {
        console.log(`🔄 开始预加载 ${paths.length} 个资源...`);
        
        const loadPromises = paths.map(async (path, index) => {
            try {
                await this.loadAsset(path, Asset);
                if (onProgress) {
                    onProgress((index + 1) / paths.length);
                }
            } catch (error) {
                console.warn(`⚠️ 预加载失败: ${path}`);
            }
        });

        await Promise.all(loadPromises);
        console.log(`✅ 预加载完成!`);
    }

    /**
     * 智能缓存清理
     */
    public cleanupCache(): void {
        const currentMemory = this.estimateMemoryUsage();
        
        if (currentMemory > this.memoryThreshold || this.assetCache.size > this.maxCacheSize) {
            console.log(`🧹 内存清理: 当前使用 ${(currentMemory / 1024 / 1024).toFixed(2)}MB`);
            this.performCacheCleanup();
        }
    }

    /**
     * 执行缓存清理 - LRU策略
     */
    private performCacheCleanup(): void {
        // 按使用频率排序
        const sortedAssets = Array.from(this.assetUsage.entries())
            .sort((a, b) => a[1] - b[1])
            .slice(0, Math.floor(this.assetCache.size * 0.3)); // 清理30%最少使用的资源

        for (const [path] of sortedAssets) {
            const asset = this.assetCache.get(path);
            if (asset) {
                asset.destroy();
                this.assetCache.delete(path);
                this.assetUsage.delete(path);
                this.stats.assetsReleased++;
            }
        }

        console.log(`✅ 缓存清理完成，释放了 ${sortedAssets.length} 个资源`);
    }

    /**
     * 根据优先级执行加载
     */
    private async performLoad<T extends Asset>(path: string, type: new () => T, priority: string): Promise<T | null> {
        return new Promise((resolve, reject) => {
            if (priority === 'high') {
                // 高优先级：立即加载
                resources.load(path, type, (error, asset) => {
                    if (error) {
                        reject(error);
                    } else {
                        resolve(asset as T);
                    }
                });
            } else {
                // 普通/低优先级：可以延迟加载
                setTimeout(() => {
                    resources.load(path, type, (error, asset) => {
                        if (error) {
                            reject(error);
                        } else {
                            resolve(asset as T);
                        }
                    });
                }, priority === 'low' ? 100 : 0);
            }
        });
    }

    /**
     * 缓存资源
     */
    private cacheAsset(path: string, asset: Asset): void {
        if (this.assetCache.size >= this.maxCacheSize) {
            this.performCacheCleanup();
        }
        
        this.assetCache.set(path, asset);
        this.assetUsage.set(path, 1);
    }

    /**
     * 更新使用统计
     */
    private updateUsage(path: string): void {
        const currentUsage = this.assetUsage.get(path) || 0;
        this.assetUsage.set(path, currentUsage + 1);
    }

    /**
     * 估算内存使用
     */
    private estimateMemoryUsage(): number {
        // 简化的内存估算
        let totalSize = 0;
        
        for (const asset of this.assetCache.values()) {
            // 根据资源类型估算大小
            if (asset.constructor.name.includes('Texture')) {
                totalSize += 1024 * 1024; // 1MB per texture
            } else if (asset.constructor.name.includes('Audio')) {
                totalSize += 512 * 1024; // 512KB per audio
            } else {
                totalSize += 100 * 1024; // 100KB for others
            }
        }
        
        this.stats.memoryUsage = totalSize;
        return totalSize;
    }

    /**
     * 内存监控
     */
    private startMemoryMonitoring(): void {
        setInterval(() => {
            const memoryUsage = this.estimateMemoryUsage();
            
            if (memoryUsage > this.memoryThreshold * 0.8) {
                console.warn(`⚠️ 内存使用接近阈值: ${(memoryUsage / 1024 / 1024).toFixed(2)}MB`);
                this.cleanupCache();
            }
        }, 30000); // 每30秒检查一次
    }

    /**
     * 获取性能统计
     */
    public getStats() {
        return {
            ...this.stats,
            cacheSize: this.assetCache.size,
            cacheHitRate: this.stats.cacheHits > 0 ? 
                (this.stats.cacheHits / (this.stats.cacheHits + this.stats.cacheMisses)) * 100 : 0,
            memoryUsageMB: (this.stats.memoryUsage / 1024 / 1024).toFixed(2)
        };
    }

    /**
     * 场景切换优化
     */
    public onSceneChange(newSceneName: string): void {
        console.log(`🔄 场景切换到: ${newSceneName}`);
        
        // 保留通用资源，清理场景特定资源
        const commonAssets = ['ui/', 'audio/common/', 'textures/elements/'];
        const assetsToKeep = new Map<string, Asset>();
        
        for (const [path, asset] of this.assetCache.entries()) {
            const shouldKeep = commonAssets.some(prefix => path.startsWith(prefix));
            if (shouldKeep) {
                assetsToKeep.set(path, asset);
            } else {
                asset.destroy();
                this.stats.assetsReleased++;
            }
        }
        
        this.assetCache = assetsToKeep;
        console.log(`✅ 场景切换优化完成，保留 ${assetsToKeep.size} 个通用资源`);
    }

    /**
     * 释放所有资源
     */
    public dispose(): void {
        for (const asset of this.assetCache.values()) {
            asset.destroy();
        }
        
        this.assetCache.clear();
        this.assetUsage.clear();
        
        console.log('🗑 ResourceOptimizer已释放所有资源');
        ResourceOptimizer._instance = null;
    }

    /**
     * 资源预加载策略配置
     */
    public configurePreloadStrategy(config: {
        memoryThreshold?: number;
        maxCacheSize?: number;
        commonAssets?: string[];
    }): void {
        if (config.memoryThreshold) {
            this.memoryThreshold = config.memoryThreshold;
        }
        
        if (config.maxCacheSize) {
            this.maxCacheSize = config.maxCacheSize;
        }
        
        console.log(`⚙️ 资源优化策略已更新`, config);
    }
}