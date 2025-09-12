import { sys, native } from 'cc';
import { GameConfig } from '../core/GameConfig';
import { AnalyticsSystem } from './AnalyticsSystem';

export enum StorageKey {
    USER_PROGRESS = 'user_progress',
    GAME_SETTINGS = 'game_settings',
    LEVEL_PROGRESS = 'level_progress',
    PLAYER_STATS = 'player_stats',
    PURCHASE_DATA = 'purchase_data',
    ACHIEVEMENT_DATA = 'achievement_data'
}

export interface UserProgress {
    playerId: string;
    playerName: string;
    currentLevel: number;
    maxUnlockedLevel: number;
    totalScore: number;
    totalStars: number;
    totalPlayTime: number; // in seconds
    gamesPlayed: number;
    lastPlayDate: string;
    createdAt: string;
    version: string;
}

export interface LevelProgress {
    levelNumber: number;
    bestScore: number;
    stars: number;
    completed: boolean;
    attempts: number;
    fastestTime?: number;
    completedAt?: string;
}

export interface PlayerStats {
    totalMatches: number;
    totalCombos: number;
    maxComboCount: number;
    totalPowerUpsUsed: number;
    totalSpecialElementsCreated: number;
    averageScore: number;
    favoriteElementType: number;
    powerUpUsageStats: { [key: string]: number };
}

export interface GameSettings {
    musicVolume: number;
    sfxVolume: number;
    musicEnabled: boolean;
    sfxEnabled: boolean;
    vibrationEnabled: boolean;
    notificationsEnabled: boolean;
    language: string;
    graphics: 'low' | 'medium' | 'high';
    showHints: boolean;
    autoSave: boolean;
}

export interface PurchaseData {
    purchases: Array<{
        productId: string;
        purchaseDate: string;
        transactionId: string;
        verified: boolean;
    }>;
    powerUps: { [key: string]: number };
    currency: number;
    premiumFeatures: string[];
}

export interface Achievement {
    id: string;
    unlockedAt?: string;
    progress: number;
    maxProgress: number;
    claimed: boolean;
}

export interface SaveData {
    userProgress: UserProgress;
    levelProgress: { [levelNumber: number]: LevelProgress };
    playerStats: PlayerStats;
    gameSettings: GameSettings;
    purchaseData: PurchaseData;
    achievements: { [id: string]: Achievement };
    lastSaveTime: string;
    saveVersion: number;
}

export class SaveSystem {
    private static _instance: SaveSystem | null = null;
    
    private _currentSaveData: SaveData | null = null;
    private _analyticsSystem: AnalyticsSystem;
    private _saveInProgress: boolean = false;
    private _autoSaveInterval: number = 0;
    private _isDirty: boolean = false;
    
    // 版本管理
    private readonly CURRENT_SAVE_VERSION = 1;
    private readonly SUPPORTED_VERSIONS = [1];
    
    // 平台特定存储
    private _useCloudSave: boolean = false;
    private _encryptionKey: string = '';

    public static getInstance(): SaveSystem {
        if (!SaveSystem._instance) {
            SaveSystem._instance = new SaveSystem();
        }
        return SaveSystem._instance;
    }

    private constructor() {
        this._analyticsSystem = AnalyticsSystem.getInstance();
        this._useCloudSave = GameConfig.SAVE_SYSTEM.ENABLE_CLOUD_SAVE;
        this._encryptionKey = this.generateEncryptionKey();
        this.initializeAutoSave();
    }

    private generateEncryptionKey(): string {
        // 生成基于设备的加密密钥
        const deviceInfo = sys.getBrowserType() + sys.getOS() + sys.getPlatform();
        return this.simpleHash(deviceInfo + 'hi_play_match_game_2024');
    }

    private simpleHash(str: string): string {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return Math.abs(hash).toString(16);
    }

    private initializeAutoSave(): void {
        if (GameConfig.SAVE_SYSTEM.AUTO_SAVE_INTERVAL > 0) {
            this._autoSaveInterval = window.setInterval(() => {
                if (this._isDirty && !this._saveInProgress) {
                    this.saveGame();
                }
            }, GameConfig.SAVE_SYSTEM.AUTO_SAVE_INTERVAL * 1000);
        }
    }

    public async initializeNewGame(): Promise<SaveData> {
        console.log('SaveSystem: Initializing new game save data');
        
        const now = new Date().toISOString();
        const playerId = this.generatePlayerId();
        
        const defaultSaveData: SaveData = {
            userProgress: {
                playerId: playerId,
                playerName: 'Player',
                currentLevel: 1,
                maxUnlockedLevel: 1,
                totalScore: 0,
                totalStars: 0,
                totalPlayTime: 0,
                gamesPlayed: 0,
                lastPlayDate: now,
                createdAt: now,
                version: GameConfig.VERSION
            },
            levelProgress: {},
            playerStats: {
                totalMatches: 0,
                totalCombos: 0,
                maxComboCount: 0,
                totalPowerUpsUsed: 0,
                totalSpecialElementsCreated: 0,
                averageScore: 0,
                favoriteElementType: 1,
                powerUpUsageStats: {}
            },
            gameSettings: {
                musicVolume: GameConfig.AUDIO.MUSIC_VOLUME,
                sfxVolume: GameConfig.AUDIO.SFX_VOLUME,
                musicEnabled: GameConfig.AUDIO.MUSIC_ENABLED,
                sfxEnabled: GameConfig.AUDIO.SFX_ENABLED,
                vibrationEnabled: true,
                notificationsEnabled: true,
                language: 'zh-CN',
                graphics: 'high',
                showHints: true,
                autoSave: true
            },
            purchaseData: {
                purchases: [],
                powerUps: {
                    hammer: 3,
                    bomb: 2,
                    rainbow: 1,
                    shuffle: 1
                },
                currency: 100,
                premiumFeatures: []
            },
            achievements: this.initializeAchievements(),
            lastSaveTime: now,
            saveVersion: this.CURRENT_SAVE_VERSION
        };
        
        this._currentSaveData = defaultSaveData;
        await this.saveGame();
        
        // 记录新游戏创建
        this._analyticsSystem.trackEvent('NEW_GAME_CREATED', {
            playerId: playerId,
            platform: sys.getPlatform()
        });
        
        return defaultSaveData;
    }

    private generatePlayerId(): string {
        const timestamp = Date.now().toString();
        const random = Math.random().toString(36).substring(2);
        return `player_${timestamp}_${random}`;
    }

    private initializeAchievements(): { [id: string]: Achievement } {
        const achievements: { [id: string]: Achievement } = {};
        
        // 定义成就列表
        const achievementDefs = [
            { id: 'first_win', maxProgress: 1 },
            { id: 'score_10k', maxProgress: 1 },
            { id: 'score_100k', maxProgress: 1 },
            { id: 'complete_10_levels', maxProgress: 10 },
            { id: 'complete_50_levels', maxProgress: 50 },
            { id: 'earn_100_stars', maxProgress: 100 },
            { id: 'combo_master', maxProgress: 1 },
            { id: 'power_user', maxProgress: 100 }
        ];
        
        achievementDefs.forEach(def => {
            achievements[def.id] = {
                id: def.id,
                progress: 0,
                maxProgress: def.maxProgress,
                claimed: false
            };
        });
        
        return achievements;
    }

    public async loadGame(): Promise<SaveData | null> {
        console.log('SaveSystem: Loading game data');
        
        try {
            // 尝试加载本地存储
            let saveData = await this.loadFromLocalStorage();
            
            // 如果启用云存储，尝试云端同步
            if (this._useCloudSave && saveData) {
                saveData = await this.syncWithCloud(saveData);
            }
            
            if (saveData) {
                // 验证和迁移存档数据
                saveData = await this.validateAndMigrateSaveData(saveData);
                this._currentSaveData = saveData;
                
                // 记录加载成功
                this._analyticsSystem.trackEvent('GAME_LOADED', {
                    playerId: saveData.userProgress.playerId,
                    saveVersion: saveData.saveVersion,
                    lastSaveTime: saveData.lastSaveTime
                });
                
                return saveData;
            }
            
        } catch (error) {
            console.error('Failed to load game data:', error);
            
            // 记录加载失败
            this._analyticsSystem.trackEvent('GAME_LOAD_FAILED', {
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
        
        // 加载失败，创建新游戏
        return await this.initializeNewGame();
    }

    private async loadFromLocalStorage(): Promise<SaveData | null> {
        try {
            const encryptedData = localStorage.getItem(StorageKey.USER_PROGRESS);
            if (!encryptedData) return null;
            
            const decryptedData = this.decryptData(encryptedData);
            return JSON.parse(decryptedData);
            
        } catch (error) {
            console.error('Failed to load from localStorage:', error);
            
            // 尝试加载备份
            return await this.loadFromBackup();
        }
    }

    private async loadFromBackup(): Promise<SaveData | null> {
        try {
            const backupData = localStorage.getItem(StorageKey.USER_PROGRESS + '_backup');
            if (!backupData) return null;
            
            const decryptedData = this.decryptData(backupData);
            const saveData = JSON.parse(decryptedData);
            
            console.log('SaveSystem: Loaded from backup');
            return saveData;
            
        } catch (error) {
            console.error('Failed to load from backup:', error);
            return null;
        }
    }

    public async saveGame(): Promise<boolean> {
        if (this._saveInProgress || !this._currentSaveData) {
            return false;
        }
        
        this._saveInProgress = true;
        
        try {
            // 更新保存时间
            this._currentSaveData.lastSaveTime = new Date().toISOString();
            
            // 保存到本地存储
            await this.saveToLocalStorage(this._currentSaveData);
            
            // 如果启用云存储，保存到云端
            if (this._useCloudSave) {
                await this.saveToCloud(this._currentSaveData);
            }
            
            this._isDirty = false;
            
            console.log('SaveSystem: Game saved successfully');
            
            // 记录保存成功
            this._analyticsSystem.trackEvent('GAME_SAVED', {
                playerId: this._currentSaveData.userProgress.playerId,
                saveSize: JSON.stringify(this._currentSaveData).length
            });
            
            return true;
            
        } catch (error) {
            console.error('Failed to save game:', error);
            
            // 记录保存失败
            this._analyticsSystem.trackEvent('GAME_SAVE_FAILED', {
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            
            return false;
            
        } finally {
            this._saveInProgress = false;
        }
    }

    private async saveToLocalStorage(saveData: SaveData): Promise<void> {
        // 创建备份
        const currentData = localStorage.getItem(StorageKey.USER_PROGRESS);
        if (currentData) {
            localStorage.setItem(StorageKey.USER_PROGRESS + '_backup', currentData);
        }
        
        // 加密并保存新数据
        const encryptedData = this.encryptData(JSON.stringify(saveData));
        localStorage.setItem(StorageKey.USER_PROGRESS, encryptedData);
    }

    private async syncWithCloud(localSaveData: SaveData): Promise<SaveData> {
        // 云存储同步逻辑的占位符
        // 实际实现需要根据具体的云存储服务（如微信云开发）进行开发
        console.log('SaveSystem: Cloud sync not implemented yet');
        return localSaveData;
    }

    private async saveToCloud(saveData: SaveData): Promise<void> {
        // 云存储保存逻辑的占位符
        console.log('SaveSystem: Cloud save not implemented yet');
    }

    private async validateAndMigrateSaveData(saveData: any): Promise<SaveData> {
        // 检查版本兼容性
        if (!saveData.saveVersion || !this.SUPPORTED_VERSIONS.includes(saveData.saveVersion)) {
            console.warn(`Unsupported save version: ${saveData.saveVersion}, migrating...`);
            saveData = await this.migrateSaveData(saveData);
        }
        
        // 验证必要字段
        if (!saveData.userProgress || !saveData.userProgress.playerId) {
            throw new Error('Invalid save data: missing user progress');
        }
        
        // 补充缺失字段
        saveData = this.fillMissingFields(saveData);
        
        return saveData;
    }

    private async migrateSaveData(oldSaveData: any): Promise<SaveData> {
        // 数据迁移逻辑
        console.log('SaveSystem: Migrating save data from old version');
        
        // 创建新的存档结构
        const newSaveData = await this.initializeNewGame();
        
        // 迁移用户进度
        if (oldSaveData.userProgress) {
            Object.assign(newSaveData.userProgress, {
                playerId: oldSaveData.userProgress.playerId || newSaveData.userProgress.playerId,
                currentLevel: oldSaveData.userProgress.currentLevel || 1,
                maxUnlockedLevel: oldSaveData.userProgress.maxUnlockedLevel || 1,
                totalScore: oldSaveData.userProgress.totalScore || 0
            });
        }
        
        // 迁移关卡进度
        if (oldSaveData.levelProgress) {
            newSaveData.levelProgress = oldSaveData.levelProgress;
        }
        
        // 迁移设置
        if (oldSaveData.gameSettings) {
            Object.assign(newSaveData.gameSettings, oldSaveData.gameSettings);
        }
        
        return newSaveData;
    }

    private fillMissingFields(saveData: SaveData): SaveData {
        const defaultSaveData = this.initializeNewGame();
        
        // 使用深度合并填充缺失字段
        return this.deepMerge(defaultSaveData, saveData);
    }

    private deepMerge(target: any, source: any): any {
        const result = { ...target };
        
        for (const key in source) {
            if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                result[key] = this.deepMerge(target[key] || {}, source[key]);
            } else {
                result[key] = source[key];
            }
        }
        
        return result;
    }

    private encryptData(data: string): string {
        if (!GameConfig.SAVE_SYSTEM.ENABLE_ENCRYPTION) {
            return data;
        }
        
        // 简单的XOR加密
        let encrypted = '';
        for (let i = 0; i < data.length; i++) {
            const keyChar = this._encryptionKey.charCodeAt(i % this._encryptionKey.length);
            const dataChar = data.charCodeAt(i);
            encrypted += String.fromCharCode(dataChar ^ keyChar);
        }
        
        return btoa(encrypted);
    }

    private decryptData(encryptedData: string): string {
        if (!GameConfig.SAVE_SYSTEM.ENABLE_ENCRYPTION) {
            return encryptedData;
        }
        
        try {
            const encrypted = atob(encryptedData);
            let decrypted = '';
            
            for (let i = 0; i < encrypted.length; i++) {
                const keyChar = this._encryptionKey.charCodeAt(i % this._encryptionKey.length);
                const encryptedChar = encrypted.charCodeAt(i);
                decrypted += String.fromCharCode(encryptedChar ^ keyChar);
            }
            
            return decrypted;
        } catch (error) {
            throw new Error('Failed to decrypt save data');
        }
    }

    // 数据更新方法
    public updateUserProgress(updates: Partial<UserProgress>): void {
        if (!this._currentSaveData) return;
        
        Object.assign(this._currentSaveData.userProgress, updates);
        this._currentSaveData.userProgress.lastPlayDate = new Date().toISOString();
        this._isDirty = true;
    }

    public updateLevelProgress(levelNumber: number, progress: Partial<LevelProgress>): void {
        if (!this._currentSaveData) return;
        
        if (!this._currentSaveData.levelProgress[levelNumber]) {
            this._currentSaveData.levelProgress[levelNumber] = {
                levelNumber,
                bestScore: 0,
                stars: 0,
                completed: false,
                attempts: 0
            };
        }
        
        Object.assign(this._currentSaveData.levelProgress[levelNumber], progress);
        this._isDirty = true;
        
        // 更新解锁关卡
        if (progress.completed) {
            const nextLevel = levelNumber + 1;
            if (nextLevel > this._currentSaveData.userProgress.maxUnlockedLevel) {
                this._currentSaveData.userProgress.maxUnlockedLevel = nextLevel;
            }
        }
    }

    public updatePlayerStats(updates: Partial<PlayerStats>): void {
        if (!this._currentSaveData) return;
        
        Object.assign(this._currentSaveData.playerStats, updates);
        this._isDirty = true;
    }

    public updateGameSettings(updates: Partial<GameSettings>): void {
        if (!this._currentSaveData) return;
        
        Object.assign(this._currentSaveData.gameSettings, updates);
        this._isDirty = true;
    }

    public updateAchievementProgress(achievementId: string, progress: number): void {
        if (!this._currentSaveData) return;
        
        const achievement = this._currentSaveData.achievements[achievementId];
        if (achievement && !achievement.claimed) {
            achievement.progress = Math.min(progress, achievement.maxProgress);
            
            // 检查是否完成成就
            if (achievement.progress >= achievement.maxProgress && !achievement.unlockedAt) {
                achievement.unlockedAt = new Date().toISOString();
                
                // 记录成就解锁
                this._analyticsSystem.trackEvent('ACHIEVEMENT_UNLOCKED', {
                    achievementId: achievementId,
                    playerId: this._currentSaveData.userProgress.playerId
                });
            }
            
            this._isDirty = true;
        }
    }

    // 数据访问方法
    public getCurrentSaveData(): SaveData | null {
        return this._currentSaveData;
    }

    public getUserProgress(): UserProgress | null {
        return this._currentSaveData?.userProgress || null;
    }

    public getLevelProgress(levelNumber: number): LevelProgress | null {
        return this._currentSaveData?.levelProgress[levelNumber] || null;
    }

    public getPlayerStats(): PlayerStats | null {
        return this._currentSaveData?.playerStats || null;
    }

    public getGameSettings(): GameSettings | null {
        return this._currentSaveData?.gameSettings || null;
    }

    public getAchievements(): { [id: string]: Achievement } {
        return this._currentSaveData?.achievements || {};
    }

    // 数据导出/导入
    public async exportSaveData(): Promise<string> {
        if (!this._currentSaveData) {
            throw new Error('No save data to export');
        }
        
        const exportData = {
            ...this._currentSaveData,
            exportedAt: new Date().toISOString(),
            exportVersion: this.CURRENT_SAVE_VERSION
        };
        
        return JSON.stringify(exportData, null, 2);
    }

    public async importSaveData(importData: string): Promise<boolean> {
        try {
            const parsedData = JSON.parse(importData);
            
            // 验证导入数据
            if (!parsedData.userProgress || !parsedData.saveVersion) {
                throw new Error('Invalid import data format');
            }
            
            // 迁移并验证数据
            const validatedData = await this.validateAndMigrateSaveData(parsedData);
            
            // 备份当前数据
            if (this._currentSaveData) {
                const backupData = JSON.stringify(this._currentSaveData);
                localStorage.setItem('save_backup_before_import', backupData);
            }
            
            // 应用导入数据
            this._currentSaveData = validatedData;
            await this.saveGame();
            
            console.log('SaveSystem: Successfully imported save data');
            
            // 记录导入事件
            this._analyticsSystem.trackEvent('SAVE_DATA_IMPORTED', {
                playerId: validatedData.userProgress.playerId,
                importVersion: parsedData.saveVersion
            });
            
            return true;
            
        } catch (error) {
            console.error('Failed to import save data:', error);
            
            // 记录导入失败
            this._analyticsSystem.trackEvent('SAVE_IMPORT_FAILED', {
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            
            return false;
        }
    }

    // 清理和重置
    public async resetGameData(): Promise<void> {
        console.log('SaveSystem: Resetting game data');
        
        // 记录重置事件
        if (this._currentSaveData) {
            this._analyticsSystem.trackEvent('GAME_DATA_RESET', {
                playerId: this._currentSaveData.userProgress.playerId
            });
        }
        
        // 清除本地存储
        localStorage.removeItem(StorageKey.USER_PROGRESS);
        localStorage.removeItem(StorageKey.USER_PROGRESS + '_backup');
        
        // 初始化新游戏
        await this.initializeNewGame();
    }

    public dispose(): void {
        // 清理自动保存定时器
        if (this._autoSaveInterval) {
            clearInterval(this._autoSaveInterval);
            this._autoSaveInterval = 0;
        }
        
        // 执行最后一次保存
        if (this._isDirty && this._currentSaveData) {
            this.saveGame();
        }
        
        console.log('SaveSystem disposed');
    }
}