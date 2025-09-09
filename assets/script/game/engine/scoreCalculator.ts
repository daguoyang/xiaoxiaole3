import { EffectEvent } from "./effectEventQueue";
import { MatchResult } from "./regionMatchDetector";

export interface ScoreConfig {
    baseScore: number;              // 基础分数
    comboMultiplierRate: number;    // 连击系数增长率 (默认0.1)
    specialBonusRate: number;       // 特效合成额外分预期收益 (默认5%)
    matchTypeMultipliers: {         // 不同匹配类型的倍数
        horizontal: number;
        vertical: number;
        L: number;
        T: number;
        cross: number;
    };
    effectTypeMultipliers: {        // 不同特效类型的倍数
        normal_match: number;
        rocket_horizontal: number;
        rocket_vertical: number;
        bomb: number;
        rainbow: number;
    };
}

export class ScoreCalculator {
    private config: ScoreConfig;
    private currentTotalScore: number = 0;
    private currentCombo: number = 0;
    
    constructor(config?: Partial<ScoreConfig>) {
        // 默认配置，保持与原有游戏的"手感"一致
        this.config = {
            baseScore: 100,
            comboMultiplierRate: 0.1,
            specialBonusRate: 0.05,
            matchTypeMultipliers: {
                horizontal: 1.0,
                vertical: 1.0,
                L: 1.5,
                T: 1.8,
                cross: 2.5
            },
            effectTypeMultipliers: {
                normal_match: 1.0,
                rocket_horizontal: 2.0,
                rocket_vertical: 2.0,
                bomb: 3.0,
                rainbow: 5.0
            },
            ...config
        };
    }

    /**
     * 重置分数计算器
     */
    reset(): void {
        this.currentTotalScore = 0;
        this.currentCombo = 0;
    }

    /**
     * 计算匹配得分
     */
    calculateMatchScore(matchResult: MatchResult, chainDepth: number): number {
        const tileCount = matchResult.tiles.length;
        
        // 基础分数 = 消除元素数量 × 基础分数
        let baseScore = tileCount * this.config.baseScore;
        
        // 匹配类型加成
        const matchTypeMultiplier = this.config.matchTypeMultipliers[matchResult.matchType] || 1.0;
        baseScore *= matchTypeMultiplier;
        
        // 连击系数加成
        const comboMultiplier = this.getComboMultiplier(chainDepth);
        
        // 特殊形状额外奖励 (L/T形等)
        const specialBonus = this.calculateSpecialBonus(matchResult);
        
        const finalScore = Math.floor((baseScore + specialBonus) * comboMultiplier);
        
        console.log(`匹配得分计算: 基础(${baseScore}) × 连击(${comboMultiplier.toFixed(1)}) + 特殊(${specialBonus}) = ${finalScore}`);
        
        return finalScore;
    }

    /**
     * 计算特效事件得分
     */
    calculateEffectScore(event: EffectEvent, chainDepth: number): number {
        // 基础分数 = 强度 × 基础分数
        let baseScore = event.strength * this.config.baseScore;
        
        // 特效类型加成
        const effectTypeMultiplier = this.config.effectTypeMultipliers[event.type] || 1.0;
        baseScore *= effectTypeMultiplier;
        
        // 连击系数加成
        const comboMultiplier = this.getComboMultiplier(chainDepth);
        
        // 特效合成额外分预期收益
        const bonusScore = Math.floor(baseScore * this.config.specialBonusRate);
        
        const finalScore = Math.floor((baseScore + bonusScore) * comboMultiplier);
        
        console.log(`特效得分计算: ${event.type} 基础(${baseScore}) × 连击(${comboMultiplier.toFixed(1)}) + 奖励(${bonusScore}) = ${finalScore}`);
        
        return finalScore;
    }

    /**
     * 计算连击系数 comboMultiplier = 1 + 0.1 * (chainDepth - 1)
     */
    getComboMultiplier(chainDepth: number): number {
        return 1 + this.config.comboMultiplierRate * Math.max(0, chainDepth - 1);
    }

    /**
     * 计算特殊形状奖励分数
     */
    private calculateSpecialBonus(matchResult: MatchResult): number {
        switch (matchResult.matchType) {
            case 'L':
                return this.config.baseScore * 0.5; // L形额外50%基础分
            case 'T':
                return this.config.baseScore * 0.8; // T形额外80%基础分
            case 'cross':
                return this.config.baseScore * 1.5; // 十字形额外150%基础分
            default:
                return 0;
        }
    }

    /**
     * 更新总分和连击数
     */
    addScore(score: number, chainDepth: number): void {
        this.currentTotalScore += score;
        this.currentCombo = Math.max(this.currentCombo, chainDepth);
        
        console.log(`总分更新: +${score}, 累计: ${this.currentTotalScore}, 最高连击: ${this.currentCombo}`);
    }

    /**
     * 获取当前总分
     */
    getTotalScore(): number {
        return this.currentTotalScore;
    }

    /**
     * 获取当前最高连击数
     */
    getCurrentCombo(): number {
        return this.currentCombo;
    }

    /**
     * 获取分数统计信息
     */
    getScoreStats(): {
        totalScore: number;
        maxCombo: number;
        averageScorePerChain: number;
        config: ScoreConfig;
    } {
        return {
            totalScore: this.currentTotalScore,
            maxCombo: this.currentCombo,
            averageScorePerChain: this.currentCombo > 0 ? Math.floor(this.currentTotalScore / this.currentCombo) : 0,
            config: { ...this.config }
        };
    }

    /**
     * 导出当前配置用于调试
     */
    exportConfig(): ScoreConfig {
        return { ...this.config };
    }

    /**
     * 更新配置 - 用于实时调整游戏平衡性
     */
    updateConfig(newConfig: Partial<ScoreConfig>): void {
        this.config = { ...this.config, ...newConfig };
        console.log("分数配置已更新:", newConfig);
    }

    /**
     * 模拟旧版分数计算 - 用于对比验证
     */
    simulateLegacyScore(tileCount: number, chainDepth: number): number {
        // 模拟原有的分数计算逻辑
        const legacyBase = tileCount * 100;
        const legacyMultiplier = 1 + (chainDepth - 1) * 0.1;
        return Math.floor(legacyBase * legacyMultiplier);
    }

    /**
     * 验证新旧分数差异
     */
    validateScoreDifference(matchResult: MatchResult, chainDepth: number): {
        newScore: number;
        legacyScore: number;
        difference: number;
        percentDifference: number;
    } {
        const newScore = this.calculateMatchScore(matchResult, chainDepth);
        const legacyScore = this.simulateLegacyScore(matchResult.tiles.length, chainDepth);
        const difference = newScore - legacyScore;
        const percentDifference = ((difference / legacyScore) * 100);
        
        return {
            newScore,
            legacyScore,
            difference,
            percentDifference: Math.round(percentDifference * 100) / 100
        };
    }
}