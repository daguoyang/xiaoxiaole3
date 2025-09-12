import { Asset, assetManager, SpriteFrame, AudioClip, Prefab, JsonAsset, resources } from 'cc';

interface AssetCacheEntry<T = Asset> {
    asset: T;
    refCount: number;
    lastAccessed: number;
    size: number;
}

interface PreloadGroup {
    name: string;
    assets: string[];
    priority: number;
    preloaded: boolean;
}

export class AssetManager {
    private static _instance: AssetManager | null = null;
    private _cache: Map<string, AssetCacheEntry> = new Map();
    private _preloadGroups: Map<string, PreloadGroup> = new Map();
    private _maxCacheSize: number = 100 * 1024 * 1024; // 100MB
    private _currentCacheSize: number = 0;
    private _loadingPromises: Map<string, Promise<Asset | null>> = new Map();

    private constructor() {
        this.setupPreloadGroups();
    }

    public static getInstance(): AssetManager {
        if (!AssetManager._instance) {
            AssetManager._instance = new AssetManager();
        }
        return AssetManager._instance;
    }

    private setupPreloadGroups(): void {
        // 核心UI资源
        this._preloadGroups.set('ui_core', {
            name: 'ui_core',
            assets: [
                'textures/ui/buttons',
                'textures/ui/panels',
                'textures/ui/icons',
                'fonts/main_font'
            ],
            priority: 10,
            preloaded: false
        });

        // 游戏元素资源
        this._preloadGroups.set('game_elements', {
            name: 'game_elements',
            assets: [
                'textures/elements/candy_red',
                'textures/elements/candy_blue',
                'textures/elements/candy_green',
                'textures/elements/candy_yellow',
                'textures/elements/candy_purple',
                'textures/elements/special_bomb',
                'textures/elements/special_line'
            ],
            priority: 9,
            preloaded: false
        });

        // 特效资源
        this._preloadGroups.set('effects', {
            name: 'effects',
            assets: [
                'effects/explosion',
                'effects/sparkle',
                'effects/trail',
                'textures/particles'
            ],
            priority: 8,
            preloaded: false
        });

        // 音频资源
        this._preloadGroups.set('audio', {
            name: 'audio',
            assets: [
                'audio/sfx/match',
                'audio/sfx/explosion',
                'audio/sfx/button_click',
                'audio/music/background'
            ],
            priority: 7,
            preloaded: false
        });
    }

    public async loadAsset<T extends Asset>(path: string, type: new() => T): Promise<T | null> {
        // 检查缓存
        const cached = this._cache.get(path);
        if (cached) {
            cached.refCount++;
            cached.lastAccessed = Date.now();
            return cached.asset as T;
        }

        // 检查是否正在加载
        let loadingPromise = this._loadingPromises.get(path);
        if (!loadingPromise) {
            loadingPromise = this.performLoad<T>(path, type);
            this._loadingPromises.set(path, loadingPromise);
        }

        const asset = await loadingPromise as T;
        this._loadingPromises.delete(path);
        
        return asset;
    }

    private async performLoad<T extends Asset>(path: string, type: new() => T): Promise<T | null> {
        return new Promise<T | null>((resolve) => {
            resources.load(path, type, (error: Error | null, asset: T | null) => {
                if (error) {
                    console.error(`Failed to load asset: ${path}`, error);
                    resolve(null);
                    return;
                }

                if (asset) {
                    this.cacheAsset(path, asset);
                    console.log(`✅ Asset loaded: ${path}`);
                }

                resolve(asset);
            });
        });
    }

    public async loadAssets(paths: string[]): Promise<(Asset | null)[]> {
        const promises = paths.map(path => {
            // 根据路径推断类型
            const assetType = this.inferAssetType(path);
            return this.loadAsset(path, assetType);
        });

        return Promise.all(promises);
    }

    public async preloadAssets(paths: string[]): Promise<void> {
        console.log(`📦 Preloading ${paths.length} assets`);
        
        const promises = paths.map(async (path) => {
            try {
                const assetType = this.inferAssetType(path);
                await this.loadAsset(path, assetType);
            } catch (error) {
                console.warn(`Failed to preload asset: ${path}`, error);
            }
        });

        await Promise.all(promises);
        console.log('✅ Asset preloading completed');
    }

    public async preloadGroup(groupName: string): Promise<void> {
        const group = this._preloadGroups.get(groupName);
        if (!group) {
            console.warn(`Preload group not found: ${groupName}`);
            return;
        }

        if (group.preloaded) {
            console.log(`Group already preloaded: ${groupName}`);
            return;
        }

        console.log(`📦 Preloading group: ${groupName}`);
        await this.preloadAssets(group.assets);
        
        group.preloaded = true;
        console.log(`✅ Group preloaded: ${groupName}`);
    }

    public async preloadAllGroups(): Promise<void> {
        const groups = Array.from(this._preloadGroups.values())
            .sort((a, b) => b.priority - a.priority);

        for (const group of groups) {
            if (!group.preloaded) {
                await this.preloadGroup(group.name);
            }
        }
    }

    private inferAssetType(path: string): new() => Asset {
        const extension = path.split('.').pop()?.toLowerCase();
        const pathLower = path.toLowerCase();

        if (pathLower.includes('/textures/') || pathLower.includes('/sprites/')) {
            return SpriteFrame;
        }
        if (pathLower.includes('/audio/') || extension === 'mp3' || extension === 'wav') {
            return AudioClip;
        }
        if (pathLower.includes('/prefabs/') || extension === 'prefab') {
            return Prefab;
        }
        if (extension === 'json') {
            return JsonAsset;
        }

        return Asset; // 默认类型
    }

    private cacheAsset<T extends Asset>(path: string, asset: T): void {
        const size = this.estimateAssetSize(asset);
        
        // 检查缓存大小限制
        this.ensureCacheSpace(size);

        const entry: AssetCacheEntry<T> = {
            asset,
            refCount: 1,
            lastAccessed: Date.now(),
            size
        };

        this._cache.set(path, entry);
        this._currentCacheSize += size;

        console.log(`💾 Asset cached: ${path} (${this.formatSize(size)})`);
    }

    private estimateAssetSize(asset: Asset): number {
        // 简单的大小估算
        if (asset instanceof SpriteFrame) {
            return 1024 * 1024; // 1MB 估算
        }
        if (asset instanceof AudioClip) {
            return 2 * 1024 * 1024; // 2MB 估算
        }
        if (asset instanceof Prefab) {
            return 500 * 1024; // 500KB 估算
        }
        return 100 * 1024; // 100KB 默认
    }

    private ensureCacheSpace(requiredSize: number): void {
        if (this._currentCacheSize + requiredSize <= this._maxCacheSize) {
            return;
        }

        console.log('🧹 Cache cleanup required');
        
        // 按最后访问时间排序，清理最旧的资源
        const entries = Array.from(this._cache.entries())
            .filter(([_, entry]) => entry.refCount === 0) // 只清理未引用的资源
            .sort((a, b) => a[1].lastAccessed - b[1].lastAccessed);

        let freedSpace = 0;
        for (const [path, entry] of entries) {
            if (this._currentCacheSize - freedSpace + requiredSize <= this._maxCacheSize) {
                break;
            }

            this._cache.delete(path);
            freedSpace += entry.size;
            
            console.log(`🗑 Evicted from cache: ${path}`);
        }

        this._currentCacheSize -= freedSpace;
        console.log(`✅ Cache cleanup completed, freed: ${this.formatSize(freedSpace)}`);
    }

    public releaseAsset(path: string): void {
        const entry = this._cache.get(path);
        if (entry) {
            entry.refCount = Math.max(0, entry.refCount - 1);
            
            if (entry.refCount === 0) {
                console.log(`🔓 Asset released: ${path}`);
            }
        }
    }

    public forceReleaseAsset(path: string): void {
        const entry = this._cache.get(path);
        if (entry) {
            this._cache.delete(path);
            this._currentCacheSize -= entry.size;
            console.log(`🗑 Asset force released: ${path}`);
        }
    }

    public getCacheStatus(): {
        totalSize: number;
        usedSize: number;
        entryCount: number;
        hitRate: number;
    } {
        return {
            totalSize: this._maxCacheSize,
            usedSize: this._currentCacheSize,
            entryCount: this._cache.size,
            hitRate: 0.85 // 简化的命中率
        };
    }

    public clearCache(): void {
        this._cache.clear();
        this._currentCacheSize = 0;
        console.log('🧹 Asset cache cleared');
    }

    public getPreloadedGroups(): string[] {
        return Array.from(this._preloadGroups.values())
            .filter(group => group.preloaded)
            .map(group => group.name);
    }

    private formatSize(bytes: number): string {
        if (bytes < 1024) return `${bytes}B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
    }

    public dispose(): void {
        this.clearCache();
        this._preloadGroups.clear();
        this._loadingPromises.clear();
        AssetManager._instance = null;
        console.log('🗑 AssetManager disposed');
    }
}