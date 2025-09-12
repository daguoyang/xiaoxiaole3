import { ElementType } from '../models/GameTypes';

export interface ScoreBalance {
    baseMatchScore: number;
    comboMultiplier: number;
    specialElementScore: { [key: string]: number };
    chainReactionBonus: number;
}

export interface ElementSpawnConfig {
    weights: { [key in ElementType]?: number };
    specialElementChance: number;
    newElementTypes: ElementType[];
}

export interface LevelBalance {
    movesBase: number;
    movesIncrement: number;
    scoreBase: number;
    scoreMultiplier: number;
    difficultyModifier: { [key: string]: number };
}

export interface PowerUpConfig {
    costs: { [key: string]: number };
    effects: { [key: string]: any };
    cooldowns: { [key: string]: number };
}

export class BalanceConfig {
    private static _instance: BalanceConfig | null = null;
    private _config: {
        score: ScoreBalance;
        elements: ElementSpawnConfig;
        levels: LevelBalance;
        powerUps: PowerUpConfig;
        gameplay: any;
    };

    private constructor() {
        this._config = this.createDefaultConfig();
    }

    public static getInstance(): BalanceConfig {
        if (!BalanceConfig._instance) {
            BalanceConfig._instance = new BalanceConfig();
        }
        return BalanceConfig._instance;
    }

    private createDefaultConfig() {
        return {
            score: {
                baseMatchScore: 100,
                comboMultiplier: 1.5,
                specialElementScore: {
                    'bomb': 500,
                    'line_clear': 300,
                    'color_bomb': 1000,
                    'rainbow': 1500
                },
                chainReactionBonus: 200
            },
            elements: {
                weights: {
                    [ElementType.RED]: 20,
                    [ElementType.BLUE]: 20,
                    [ElementType.GREEN]: 20,
                    [ElementType.YELLOW]: 20,
                    [ElementType.PURPLE]: 20,
                    [ElementType.ORANGE]: 0, // 稍后解锁
                    [ElementType.BOMB]: 0,
                    [ElementType.ROW_CLEAR]: 0,
                    [ElementType.COL_CLEAR]: 0,
                    [ElementType.COLOR_BOMB]: 0,
                    [ElementType.RAINBOW]: 0
                },
                specialElementChance: 0.05, // 5% 概率生成特殊元素
                newElementTypes: [
                    ElementType.RED,
                    ElementType.BLUE,
                    ElementType.GREEN,
                    ElementType.YELLOW,
                    ElementType.PURPLE
                ]
            },
            levels: {
                movesBase: 30,
                movesIncrement: 2,
                scoreBase: 50000,
                scoreMultiplier: 1.2,
                difficultyModifier: {
                    'easy': 0.8,
                    'medium': 1.0,
                    'hard': 1.3,
                    'expert': 1.6
                }
            },
            powerUps: {
                costs: {
                    'hammer': 500,
                    'bomb': 800,
                    'shuffle': 1200,
                    'extra_moves': 300,
                    'color_bomb': 1500
                },
                effects: {
                    'hammer': { type: 'destroy_single', power: 1 },
                    'bomb': { type: 'area_destroy', radius: 2 },
                    'shuffle': { type: 'board_shuffle', power: 1 },
                    'extra_moves': { type: 'add_moves', count: 5 },
                    'color_bomb': { type: 'destroy_color', power: 1 }
                },
                cooldowns: {
                    'hammer': 0,
                    'bomb': 0,
                    'shuffle': 3000, // 3秒冷却
                    'extra_moves': 0,
                    'color_bomb': 0
                }
            },
            gameplay: {
                matchMinLength: 3,
                cascadeDelay: 200,
                eliminationDelay: 300,
                fallSpeed: 500, // pixels per second
                swapDuration: 250,
                hintDelay: 5000,
                noMovesShuffleDelay: 2000,
                comboTimeout: 1500,
                scoreDisplayDuration: 1000
            }
        };
    }

    // 分数相关配置
    public getMatchScore(matchLength: number, matchType: string = 'normal'): number {
        let baseScore = this._config.score.baseMatchScore * matchLength;
        
        // 特殊匹配类型加成
        if (matchType === 'L_SHAPE' || matchType === 'T_SHAPE') {
            baseScore *= 1.5;
        } else if (matchType === 'CROSS') {
            baseScore *= 2.0;
        }

        return Math.floor(baseScore);
    }

    public getComboScore(comboCount: number, baseScore: number): number {
        if (comboCount <= 1) return baseScore;
        
        const multiplier = Math.pow(this._config.score.comboMultiplier, comboCount - 1);
        return Math.floor(baseScore * multiplier);
    }

    public getSpecialElementScore(elementType: string): number {
        return this._config.score.specialElementScore[elementType] || 0;
    }

    public getChainReactionBonus(chainLength: number): number {
        return this._config.score.chainReactionBonus * chainLength;
    }

    // 新增的分数计算方法
    public calculateElementScore(elementType: ElementType, matchLength: number): number {
        const baseScore = this.getMatchScore(matchLength);
        
        // 特殊元素额外分数
        if (elementType >= ElementType.BOMB) {
            const specialScore = this.getSpecialElementScore(ElementType[elementType].toLowerCase());
            return baseScore + specialScore;
        }
        
        return baseScore;
    }

    public calculateChainBonus(chainCount: number): number {
        return this.getChainReactionBonus(chainCount);
    }

    public calculateComboBonus(comboCount: number, baseScore: number): number {
        return this.getComboScore(comboCount, baseScore);
    }

    // 元素生成配置
    public generateRandomElement(): ElementType {
        const availableTypes = this._config.elements.newElementTypes;
        const weights = this._config.elements.weights;
        
        // 计算总权重
        let totalWeight = 0;
        for (const type of availableTypes) {
            totalWeight += weights[type] || 0;
        }

        if (totalWeight === 0) {
            return ElementType.RED; // 默认返回红色
        }

        // 随机选择
        let random = Math.random() * totalWeight;
        
        for (const type of availableTypes) {
            const weight = weights[type] || 0;
            random -= weight;
            if (random <= 0) {
                return type;
            }
        }

        return availableTypes[0]; // fallback
    }

    public shouldGenerateSpecialElement(): boolean {
        return Math.random() < this._config.elements.specialElementChance;
    }

    public getElementSpawnWeight(elementType: ElementType): number {
        return this._config.elements.weights[elementType] || 0;
    }

    public setElementSpawnWeight(elementType: ElementType, weight: number): void {
        this._config.elements.weights[elementType] = weight;
    }

    // 关卡配置
    public getLevelMoves(levelNumber: number, difficulty: string = 'medium'): number {
        const modifier = this._config.levels.difficultyModifier[difficulty] || 1.0;
        const baseMoves = this._config.levels.movesBase;
        const increment = this._config.levels.movesIncrement * Math.floor(levelNumber / 10);
        
        return Math.floor((baseMoves + increment) * modifier);
    }

    public getLevelTargetScore(levelNumber: number, difficulty: string = 'medium'): number {
        const modifier = this._config.levels.difficultyModifier[difficulty] || 1.0;
        const baseScore = this._config.levels.scoreBase;
        const multiplier = Math.pow(this._config.levels.scoreMultiplier, Math.floor(levelNumber / 10));
        
        return Math.floor(baseScore * multiplier * modifier);
    }

    public getLevelStarThresholds(targetScore: number): [number, number, number] {
        return [
            targetScore,
            Math.floor(targetScore * 1.5),
            Math.floor(targetScore * 2.2)
        ];
    }

    // 道具配置
    public getPowerUpCost(powerUpType: string): number {
        return this._config.powerUps.costs[powerUpType] || 0;
    }

    public getPowerUpEffect(powerUpType: string): any {
        return this._config.powerUps.effects[powerUpType];
    }

    public getPowerUpCooldown(powerUpType: string): number {
        return this._config.powerUps.cooldowns[powerUpType] || 0;
    }

    // 游戏玩法配置
    public getGameplayConfig(key: string): any {
        return this._config.gameplay[key];
    }

    public getCascadeDelay(): number {
        return this._config.gameplay.cascadeDelay;
    }

    public getEliminationDelay(): number {
        return this._config.gameplay.eliminationDelay;
    }

    public getFallSpeed(): number {
        return this._config.gameplay.fallSpeed;
    }

    public getSwapDuration(): number {
        return this._config.gameplay.swapDuration;
    }

    public getHintDelay(): number {
        return this._config.gameplay.hintDelay;
    }

    // 难度调整
    public adjustDifficultyForLevel(levelNumber: number): void {
        if (levelNumber > 50) {
            // 高级关卡减少特殊元素生成概率
            this._config.elements.specialElementChance = Math.max(0.02, this._config.elements.specialElementChance * 0.9);
        }

        if (levelNumber > 100) {
            // 超高级关卡引入更多元素类型
            if (!this._config.elements.newElementTypes.includes(ElementType.ORANGE)) {
                this._config.elements.newElementTypes.push(ElementType.ORANGE);
                this._config.elements.weights[ElementType.ORANGE] = 15;
            }
        }
    }

    // A/B 测试支持
    public applyABTestConfig(testGroup: string, config: any): void {
        console.log(`Applying A/B test config for group: ${testGroup}`);
        
        if (config.score) {
            Object.assign(this._config.score, config.score);
        }
        
        if (config.elements) {
            Object.assign(this._config.elements, config.elements);
        }
        
        if (config.levels) {
            Object.assign(this._config.levels, config.levels);
        }
    }

    // 配置导入导出
    public exportConfig(): string {
        return JSON.stringify(this._config, null, 2);
    }

    public importConfig(configJson: string): boolean {
        try {
            const newConfig = JSON.parse(configJson);
            this._config = { ...this._config, ...newConfig };
            console.log('✅ Balance config imported successfully');
            return true;
        } catch (error) {
            console.error('❌ Failed to import balance config:', error);
            return false;
        }
    }

    public resetToDefault(): void {
        this._config = this.createDefaultConfig();
        console.log('🔄 Balance config reset to default');
    }

    public dispose(): void {
        BalanceConfig._instance = null;
    }
}