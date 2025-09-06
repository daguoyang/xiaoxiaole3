import { BaseSystem } from './baseSystem';
import { StorageHelper, StorageHelperKey } from '../utils/storageHelper';

/**
 * 用户档案 - 全新的用户数据管理系统
 */
export class UserProfile extends BaseSystem {
    private profileData: UserProfileData = new UserProfileData();

    protected async onInitialize(): Promise<void> {
        this.loadProfile();
        console.log('UserProfile system initialized');
    }

    protected async onDestroy(): Promise<void> {
        this.saveProfile();
    }

    /**
     * 加载用户档案
     */
    private loadProfile(): void {
        this.profileData.playerName = StorageHelper.getData('playerName', 'Player');
        this.profileData.playerIcon = StorageHelper.getData('playerIcon', '');
        this.profileData.currentLevel = StorageHelper.getData(StorageHelperKey.Level, 1);
        this.profileData.totalScore = StorageHelper.getData('totalScore', 0);
        this.profileData.highScore = StorageHelper.getData('highScore', 0);
        this.profileData.coinsCount = StorageHelper.getData('coinsCount', 0);
        this.profileData.starsCount = StorageHelper.getData('starsCount', 0);
        
        // 加载物品数量
        this.profileData.powerUps = {
            bomb: StorageHelper.getData('powerUp_bomb', 0),
            horizontal: StorageHelper.getData('powerUp_horizontal', 0),
            vertical: StorageHelper.getData('powerUp_vertical', 0),
            rainbow: StorageHelper.getData('powerUp_rainbow', 0)
        };

        // 加载设置
        this.profileData.settings = {
            musicEnabled: StorageHelper.getData('setting_music', true),
            soundEnabled: StorageHelper.getData('setting_sound', true),
            vibrationEnabled: StorageHelper.getData('setting_vibration', true)
        };

        // 加载统计数据
        this.profileData.statistics = {
            totalGamesPlayed: StorageHelper.getData('stat_gamesPlayed', 0),
            totalMovesUsed: StorageHelper.getData('stat_movesUsed', 0),
            totalItemsMatched: StorageHelper.getData('stat_itemsMatched', 0),
            averageScore: StorageHelper.getData('stat_averageScore', 0),
            bestCombo: StorageHelper.getData('stat_bestCombo', 0)
        };
    }

    /**
     * 保存用户档案
     */
    private saveProfile(): void {
        StorageHelper.setData('playerName', this.profileData.playerName);
        StorageHelper.setData('playerIcon', this.profileData.playerIcon);
        StorageHelper.setData(StorageHelperKey.Level, this.profileData.currentLevel);
        StorageHelper.setData('totalScore', this.profileData.totalScore);
        StorageHelper.setData('highScore', this.profileData.highScore);
        StorageHelper.setData('coinsCount', this.profileData.coinsCount);
        StorageHelper.setData('starsCount', this.profileData.starsCount);

        // 保存物品数量
        StorageHelper.setData('powerUp_bomb', this.profileData.powerUps.bomb);
        StorageHelper.setData('powerUp_horizontal', this.profileData.powerUps.horizontal);
        StorageHelper.setData('powerUp_vertical', this.profileData.powerUps.vertical);
        StorageHelper.setData('powerUp_rainbow', this.profileData.powerUps.rainbow);

        // 保存设置
        StorageHelper.setData('setting_music', this.profileData.settings.musicEnabled);
        StorageHelper.setData('setting_sound', this.profileData.settings.soundEnabled);
        StorageHelper.setData('setting_vibration', this.profileData.settings.vibrationEnabled);

        // 保存统计数据
        StorageHelper.setData('stat_gamesPlayed', this.profileData.statistics.totalGamesPlayed);
        StorageHelper.setData('stat_movesUsed', this.profileData.statistics.totalMovesUsed);
        StorageHelper.setData('stat_itemsMatched', this.profileData.statistics.totalItemsMatched);
        StorageHelper.setData('stat_averageScore', this.profileData.statistics.averageScore);
        StorageHelper.setData('stat_bestCombo', this.profileData.statistics.bestCombo);
    }

    // 玩家信息操作
    getPlayerName(): string { return this.profileData.playerName; }
    setPlayerName(name: string): void {
        this.profileData.playerName = name;
        this.saveProfile();
    }

    getPlayerIcon(): string { return this.profileData.playerIcon; }
    setPlayerIcon(icon: string): void {
        this.profileData.playerIcon = icon;
        this.saveProfile();
    }

    // 关卡进度
    getCurrentLevel(): number { return this.profileData.currentLevel; }
    setCurrentLevel(level: number): void {
        this.profileData.currentLevel = Math.max(1, level);
        this.saveProfile();
    }

    advanceLevel(): void {
        this.profileData.currentLevel++;
        this.saveProfile();
    }

    // 分数管理
    getTotalScore(): number { return this.profileData.totalScore; }
    getHighScore(): number { return this.profileData.highScore; }
    
    addScore(score: number): void {
        this.profileData.totalScore += score;
        if (score > this.profileData.highScore) {
            this.profileData.highScore = score;
        }
        this.saveProfile();
    }

    // 货币管理
    getCoins(): number { return this.profileData.coinsCount; }
    addCoins(amount: number): void {
        this.profileData.coinsCount += amount;
        this.saveProfile();
    }

    spendCoins(amount: number): boolean {
        if (this.profileData.coinsCount >= amount) {
            this.profileData.coinsCount -= amount;
            this.saveProfile();
            return true;
        }
        return false;
    }

    // 星星管理
    getStars(): number { return this.profileData.starsCount; }
    addStars(amount: number): void {
        this.profileData.starsCount += amount;
        this.saveProfile();
    }

    // 道具管理
    getPowerUpCount(type: PowerUpType): number {
        switch (type) {
            case PowerUpType.Bomb: return this.profileData.powerUps.bomb;
            case PowerUpType.Horizontal: return this.profileData.powerUps.horizontal;
            case PowerUpType.Vertical: return this.profileData.powerUps.vertical;
            case PowerUpType.Rainbow: return this.profileData.powerUps.rainbow;
            default: return 0;
        }
    }

    addPowerUp(type: PowerUpType, amount: number = 1): void {
        switch (type) {
            case PowerUpType.Bomb: this.profileData.powerUps.bomb += amount; break;
            case PowerUpType.Horizontal: this.profileData.powerUps.horizontal += amount; break;
            case PowerUpType.Vertical: this.profileData.powerUps.vertical += amount; break;
            case PowerUpType.Rainbow: this.profileData.powerUps.rainbow += amount; break;
        }
        this.saveProfile();
    }

    usePowerUp(type: PowerUpType): boolean {
        const count = this.getPowerUpCount(type);
        if (count > 0) {
            switch (type) {
                case PowerUpType.Bomb: this.profileData.powerUps.bomb--; break;
                case PowerUpType.Horizontal: this.profileData.powerUps.horizontal--; break;
                case PowerUpType.Vertical: this.profileData.powerUps.vertical--; break;
                case PowerUpType.Rainbow: this.profileData.powerUps.rainbow--; break;
            }
            this.saveProfile();
            return true;
        }
        return false;
    }

    // 设置管理
    getSettings(): UserSettings { return { ...this.profileData.settings }; }
    
    setSetting(key: keyof UserSettings, value: boolean): void {
        this.profileData.settings[key] = value;
        this.saveProfile();
    }

    // 统计数据
    getStatistics(): UserStatistics { return { ...this.profileData.statistics }; }
    
    incrementStat(key: keyof UserStatistics, value: number = 1): void {
        this.profileData.statistics[key] += value;
        this.saveProfile();
    }

    // 获取完整档案数据
    getProfileData(): UserProfileData {
        return JSON.parse(JSON.stringify(this.profileData));
    }
}

/**
 * 用户档案数据结构
 */
class UserProfileData {
    playerName: string = 'Player';
    playerIcon: string = '';
    currentLevel: number = 1;
    totalScore: number = 0;
    highScore: number = 0;
    coinsCount: number = 0;
    starsCount: number = 0;
    powerUps: PowerUpInventory = {
        bomb: 0,
        horizontal: 0,
        vertical: 0,
        rainbow: 0
    };
    settings: UserSettings = {
        musicEnabled: true,
        soundEnabled: true,
        vibrationEnabled: true
    };
    statistics: UserStatistics = {
        totalGamesPlayed: 0,
        totalMovesUsed: 0,
        totalItemsMatched: 0,
        averageScore: 0,
        bestCombo: 0
    };
}

export interface PowerUpInventory {
    bomb: number;
    horizontal: number;
    vertical: number;
    rainbow: number;
}

export interface UserSettings {
    musicEnabled: boolean;
    soundEnabled: boolean;
    vibrationEnabled: boolean;
}

export interface UserStatistics {
    totalGamesPlayed: number;
    totalMovesUsed: number;
    totalItemsMatched: number;
    averageScore: number;
    bestCombo: number;
}

export enum PowerUpType {
    Bomb = 'bomb',
    Horizontal = 'horizontal',
    Vertical = 'vertical',
    Rainbow = 'rainbow'
}