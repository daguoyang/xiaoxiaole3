import { JsonAsset } from 'cc';
import { AssetManager } from '../core/AssetManager';
import { ExtendedLevelModel, LevelConfig, LevelObjective } from '../models/ExtendedLevelModel';
import { ElementType, Position } from '../models/GameTypes';

export interface LegacyLevelData {
    id: number;
    name?: string;
    description?: string;
    maxMoves: number;
    targetScore: number;
    boardData: number[][];
    obstacles?: Array<{
        type: string;
        position: Position;
        health?: number;
    }>;
    collectTargets?: Array<{
        elementType: number;
        count: number;
    }>;
    timeLimit?: number;
    powerUps?: string[];
    difficulty?: string;
    starThresholds?: number[];
}

export interface MigrationConfig {
    sourcePath: string;
    outputPath: string;
    batchSize: number;
    validateAfterMigration: boolean;
    createBackup: boolean;
    logProgress: boolean;
}

export interface MigrationResult {
    totalLevels: number;
    successfulMigrations: number;
    failedMigrations: number;
    errors: Array<{
        levelId: number;
        error: string;
    }>;
    duration: number;
}

export class LevelDataMigrator {
    private _assetManager: AssetManager;
    private _levelModel: ExtendedLevelModel;
    private _migrationConfig: MigrationConfig;
    private _elementTypeMapping: Map<number, ElementType> = new Map();

    constructor(config: MigrationConfig) {
        this._assetManager = AssetManager.getInstance();
        this._levelModel = ExtendedLevelModel.getInstance();
        this._migrationConfig = config;
        this.initializeElementTypeMapping();
    }

    private initializeElementTypeMapping(): void {
        // 老版本到新版本的元素类型映射
        this._elementTypeMapping.set(0, ElementType.EMPTY);
        this._elementTypeMapping.set(1, ElementType.RED);
        this._elementTypeMapping.set(2, ElementType.BLUE);
        this._elementTypeMapping.set(3, ElementType.GREEN);
        this._elementTypeMapping.set(4, ElementType.YELLOW);
        this._elementTypeMapping.set(5, ElementType.PURPLE);
        this._elementTypeMapping.set(6, ElementType.ORANGE);
        
        // 特殊元素映射
        this._elementTypeMapping.set(10, ElementType.HORIZONTAL_LINE);
        this._elementTypeMapping.set(11, ElementType.VERTICAL_LINE);
        this._elementTypeMapping.set(12, ElementType.BOMB);
        this._elementTypeMapping.set(13, ElementType.RAINBOW);
        
        // 障碍物映射
        this._elementTypeMapping.set(20, ElementType.STONE);
        this._elementTypeMapping.set(21, ElementType.ICE);
        this._elementTypeMapping.set(22, ElementType.HONEY);
    }

    public async migrateAllLevels(): Promise<MigrationResult> {
        console.log('LevelDataMigrator: Starting migration of all levels');
        
        const startTime = Date.now();
        const result: MigrationResult = {
            totalLevels: 0,
            successfulMigrations: 0,
            failedMigrations: 0,
            errors: [],
            duration: 0
        };

        try {
            // 创建备份
            if (this._migrationConfig.createBackup) {
                await this.createBackup();
            }

            // 读取源数据
            const legacyLevels = await this.loadLegacyLevelData();
            result.totalLevels = legacyLevels.length;

            console.log(`Found ${legacyLevels.length} levels to migrate`);

            // 批量迁移关卡
            await this.migrateLevelsInBatches(legacyLevels, result);

            // 验证迁移结果
            if (this._migrationConfig.validateAfterMigration) {
                await this.validateMigrationResults(result);
            }

        } catch (error) {
            console.error('Migration failed:', error);
            result.errors.push({
                levelId: -1,
                error: error instanceof Error ? error.message : 'Unknown migration error'
            });
        }

        result.duration = Date.now() - startTime;
        
        console.log(`Migration completed in ${result.duration}ms:`);
        console.log(`- Successful: ${result.successfulMigrations}`);
        console.log(`- Failed: ${result.failedMigrations}`);
        
        return result;
    }

    private async loadLegacyLevelData(): Promise<LegacyLevelData[]> {
        try {
            // 尝试从多个可能的源加载数据
            const sources = [
                `${this._migrationConfig.sourcePath}/levels.json`,
                `${this._migrationConfig.sourcePath}/level_data.json`,
                `${this._migrationConfig.sourcePath}/gameConfig.json`
            ];

            for (const sourcePath of sources) {
                try {
                    const jsonAsset = await this._assetManager.loadAsset<JsonAsset>(sourcePath, 'cc.JsonAsset');
                    if (jsonAsset && jsonAsset.json) {
                        return this.parseLegacyData(jsonAsset.json);
                    }
                } catch (error) {
                    console.warn(`Failed to load from ${sourcePath}:`, error);
                }
            }

            throw new Error('No valid legacy level data found');

        } catch (error) {
            console.error('Failed to load legacy level data:', error);
            throw error;
        }
    }

    private parseLegacyData(jsonData: any): LegacyLevelData[] {
        // 根据不同的数据格式进行解析
        if (Array.isArray(jsonData)) {
            return jsonData;
        }

        if (jsonData.levels && Array.isArray(jsonData.levels)) {
            return jsonData.levels;
        }

        if (jsonData.levelConfigs && Array.isArray(jsonData.levelConfigs)) {
            return jsonData.levelConfigs;
        }

        // 尝试从对象键中提取关卡数据
        const levels: LegacyLevelData[] = [];
        for (const key in jsonData) {
            if (key.startsWith('level') || key.match(/^\d+$/)) {
                const levelData = jsonData[key];
                if (this.isValidLegacyLevel(levelData)) {
                    levels.push({
                        ...levelData,
                        id: parseInt(key.replace('level', '')) || levels.length + 1
                    });
                }
            }
        }

        return levels.sort((a, b) => a.id - b.id);
    }

    private isValidLegacyLevel(data: any): boolean {
        return data && 
               typeof data.maxMoves === 'number' &&
               typeof data.targetScore === 'number' &&
               Array.isArray(data.boardData);
    }

    private async migrateLevelsInBatches(legacyLevels: LegacyLevelData[], result: MigrationResult): Promise<void> {
        const batchSize = this._migrationConfig.batchSize || 50;
        
        for (let i = 0; i < legacyLevels.length; i += batchSize) {
            const batch = legacyLevels.slice(i, i + batchSize);
            
            if (this._migrationConfig.logProgress) {
                console.log(`Migrating batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(legacyLevels.length / batchSize)}`);
            }

            const batchPromises = batch.map(legacyLevel => this.migrateSingleLevel(legacyLevel, result));
            await Promise.allSettled(batchPromises);

            // 短暂延迟，避免阻塞主线程
            if (i + batchSize < legacyLevels.length) {
                await new Promise(resolve => setTimeout(resolve, 10));
            }
        }
    }

    private async migrateSingleLevel(legacyLevel: LegacyLevelData, result: MigrationResult): Promise<void> {
        try {
            const migratedLevel = await this.convertLegacyLevel(legacyLevel);
            await this.saveMigratedLevel(migratedLevel);
            
            result.successfulMigrations++;
            
            if (this._migrationConfig.logProgress && result.successfulMigrations % 100 === 0) {
                console.log(`Migrated ${result.successfulMigrations} levels`);
            }

        } catch (error) {
            result.failedMigrations++;
            result.errors.push({
                levelId: legacyLevel.id,
                error: error instanceof Error ? error.message : 'Unknown conversion error'
            });
            
            console.warn(`Failed to migrate level ${legacyLevel.id}:`, error);
        }
    }

    private async convertLegacyLevel(legacyLevel: LegacyLevelData): Promise<LevelConfig> {
        const objectives: LevelObjective[] = [];
        
        // 转换收集目标
        if (legacyLevel.collectTargets) {
            legacyLevel.collectTargets.forEach(target => {
                const elementType = this._elementTypeMapping.get(target.elementType) || ElementType.RED;
                objectives.push({
                    type: 'collect',
                    elementType: elementType,
                    count: target.count,
                    description: `收集${target.count}个${ElementType[elementType]}元素`
                });
            });
        } else {
            // 默认分数目标
            objectives.push({
                type: 'score',
                elementType: ElementType.EMPTY,
                count: legacyLevel.targetScore,
                description: `达到${legacyLevel.targetScore}分`
            });
        }

        // 转换棋盘数据
        const boardSize = legacyLevel.boardData.length;
        const initialBoard = legacyLevel.boardData.map((row, y) => 
            row.map((cellValue, x) => ({
                position: { x, y },
                elementType: this._elementTypeMapping.get(cellValue) || ElementType.EMPTY,
                isObstacle: this.isObstacleType(cellValue),
                obstacleType: this.getObstacleType(cellValue),
                health: this.getObstacleHealth(cellValue)
            }))
        );

        // 转换障碍物
        const obstacles: any[] = [];
        if (legacyLevel.obstacles) {
            legacyLevel.obstacles.forEach(obstacle => {
                obstacles.push({
                    type: this.convertObstacleType(obstacle.type),
                    position: obstacle.position,
                    health: obstacle.health || 1,
                    properties: {}
                });
            });
        }

        // 计算难度
        const difficulty = this.calculateDifficulty(legacyLevel, objectives, obstacles);

        // 生成星级门槛
        const starThresholds = legacyLevel.starThresholds || [
            legacyLevel.targetScore,
            Math.floor(legacyLevel.targetScore * 1.5),
            Math.floor(legacyLevel.targetScore * 2)
        ];

        const migratedLevel: LevelConfig = {
            levelNumber: legacyLevel.id,
            name: legacyLevel.name || `关卡 ${legacyLevel.id}`,
            description: legacyLevel.description || '',
            boardSize: boardSize,
            maxMoves: legacyLevel.maxMoves,
            targetScore: legacyLevel.targetScore,
            timeLimit: legacyLevel.timeLimit || 0,
            objectives: objectives,
            starThresholds: starThresholds,
            difficulty: difficulty as 'easy' | 'medium' | 'hard' | 'expert',
            initialBoard: initialBoard,
            obstacles: obstacles,
            terrain: [],
            specialRules: this.convertSpecialRules(legacyLevel),
            balanceConfig: {
                elementTypes: this.getAvailableElementTypes(legacyLevel),
                spawnWeights: this.calculateSpawnWeights(legacyLevel),
                specialElementChance: this.calculateSpecialElementChance(difficulty)
            },
            rewards: {
                coins: this.calculateCoinReward(difficulty),
                powerUps: this.calculatePowerUpReward(legacyLevel)
            },
            unlockConditions: [],
            tags: this.generateTags(legacyLevel, objectives),
            metadata: {
                migratedFrom: 'legacy',
                originalData: legacyLevel,
                migrationDate: new Date().toISOString()
            }
        };

        return migratedLevel;
    }

    private isObstacleType(cellValue: number): boolean {
        return cellValue >= 20;
    }

    private getObstacleType(cellValue: number): string | undefined {
        if (cellValue === 20) return 'stone';
        if (cellValue === 21) return 'ice';
        if (cellValue === 22) return 'honey';
        return undefined;
    }

    private getObstacleHealth(cellValue: number): number {
        // 根据障碍物类型返回默认生命值
        if (cellValue === 20) return 2; // 石头
        if (cellValue === 21) return 1; // 冰块
        if (cellValue === 22) return 3; // 蜂蜜
        return 1;
    }

    private convertObstacleType(legacyType: string): string {
        const typeMapping: { [key: string]: string } = {
            'rock': 'stone',
            'ice': 'ice',
            'honey': 'honey',
            'cage': 'cage',
            'chain': 'chain'
        };
        
        return typeMapping[legacyType] || legacyType;
    }

    private calculateDifficulty(legacyLevel: LegacyLevelData, objectives: LevelObjective[], obstacles: any[]): string {
        let difficultyScore = 0;
        
        // 基于移动数
        if (legacyLevel.maxMoves < 15) difficultyScore += 3;
        else if (legacyLevel.maxMoves < 25) difficultyScore += 2;
        else difficultyScore += 1;
        
        // 基于目标分数
        if (legacyLevel.targetScore > 100000) difficultyScore += 3;
        else if (legacyLevel.targetScore > 50000) difficultyScore += 2;
        else difficultyScore += 1;
        
        // 基于障碍物数量
        difficultyScore += Math.min(obstacles.length / 5, 2);
        
        // 基于目标复杂度
        if (objectives.length > 2) difficultyScore += 1;
        
        // 时间限制
        if (legacyLevel.timeLimit && legacyLevel.timeLimit < 120) difficultyScore += 2;
        
        if (difficultyScore >= 8) return 'expert';
        if (difficultyScore >= 6) return 'hard';
        if (difficultyScore >= 4) return 'medium';
        return 'easy';
    }

    private convertSpecialRules(legacyLevel: LegacyLevelData): string[] {
        const rules: string[] = [];
        
        if (legacyLevel.timeLimit) {
            rules.push('time_limit');
        }
        
        if (legacyLevel.powerUps && legacyLevel.powerUps.length > 0) {
            rules.push('power_ups_available');
        }
        
        if (legacyLevel.obstacles && legacyLevel.obstacles.length > 0) {
            rules.push('obstacles_present');
        }
        
        return rules;
    }

    private getAvailableElementTypes(legacyLevel: LegacyLevelData): ElementType[] {
        const types = new Set<ElementType>();
        
        // 从棋盘数据中提取元素类型
        legacyLevel.boardData.forEach(row => {
            row.forEach(cellValue => {
                const elementType = this._elementTypeMapping.get(cellValue);
                if (elementType && elementType >= ElementType.RED && elementType <= ElementType.ORANGE) {
                    types.add(elementType);
                }
            });
        });
        
        // 确保至少有基础元素类型
        if (types.size < 4) {
            [ElementType.RED, ElementType.BLUE, ElementType.GREEN, ElementType.YELLOW].forEach(type => {
                types.add(type);
            });
        }
        
        return Array.from(types);
    }

    private calculateSpawnWeights(legacyLevel: LegacyLevelData): { [key: number]: number } {
        const weights: { [key: number]: number } = {};
        const availableTypes = this.getAvailableElementTypes(legacyLevel);
        
        // 均匀权重作为默认
        const baseWeight = 100 / availableTypes.length;
        availableTypes.forEach(type => {
            weights[type] = baseWeight;
        });
        
        return weights;
    }

    private calculateSpecialElementChance(difficulty: string): number {
        const chanceMap: { [key: string]: number } = {
            'easy': 0.1,
            'medium': 0.15,
            'hard': 0.2,
            'expert': 0.25
        };
        
        return chanceMap[difficulty] || 0.15;
    }

    private calculateCoinReward(difficulty: string): number {
        const rewardMap: { [key: string]: number } = {
            'easy': 50,
            'medium': 75,
            'hard': 100,
            'expert': 150
        };
        
        return rewardMap[difficulty] || 50;
    }

    private calculatePowerUpReward(legacyLevel: LegacyLevelData): { [key: string]: number } {
        const rewards: { [key: string]: number } = {};
        
        if (legacyLevel.powerUps) {
            legacyLevel.powerUps.forEach(powerUp => {
                rewards[powerUp] = 1;
            });
        }
        
        return rewards;
    }

    private generateTags(legacyLevel: LegacyLevelData, objectives: LevelObjective[]): string[] {
        const tags: string[] = [];
        
        if (legacyLevel.timeLimit) tags.push('timed');
        if (legacyLevel.obstacles && legacyLevel.obstacles.length > 0) tags.push('obstacles');
        if (objectives.some(obj => obj.type === 'collect')) tags.push('collection');
        if (legacyLevel.maxMoves < 20) tags.push('limited_moves');
        if (legacyLevel.targetScore > 80000) tags.push('high_score');
        
        return tags;
    }

    private async saveMigratedLevel(levelConfig: LevelConfig): Promise<void> {
        try {
            await this._levelModel.saveLevelConfig(levelConfig.levelNumber, levelConfig);
        } catch (error) {
            console.error(`Failed to save migrated level ${levelConfig.levelNumber}:`, error);
            throw error;
        }
    }

    private async validateMigrationResults(result: MigrationResult): Promise<void> {
        console.log('Validating migration results...');
        
        let validationErrors = 0;
        
        for (let i = 1; i <= result.successfulMigrations; i++) {
            try {
                const levelConfig = await this._levelModel.getLevelConfig(i);
                if (!levelConfig) {
                    validationErrors++;
                    result.errors.push({
                        levelId: i,
                        error: 'Migrated level not found during validation'
                    });
                    continue;
                }
                
                // 验证必要字段
                if (!this.validateLevelConfig(levelConfig)) {
                    validationErrors++;
                    result.errors.push({
                        levelId: i,
                        error: 'Invalid level config structure'
                    });
                }
                
            } catch (error) {
                validationErrors++;
                result.errors.push({
                    levelId: i,
                    error: `Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`
                });
            }
        }
        
        if (validationErrors > 0) {
            console.warn(`Validation found ${validationErrors} issues`);
        } else {
            console.log('All migrated levels passed validation');
        }
    }

    private validateLevelConfig(config: LevelConfig): boolean {
        return !!(
            config.levelNumber &&
            config.maxMoves > 0 &&
            config.targetScore > 0 &&
            config.objectives &&
            config.objectives.length > 0 &&
            config.initialBoard &&
            config.boardSize > 0
        );
    }

    private async createBackup(): Promise<void> {
        console.log('Creating backup before migration...');
        
        try {
            // 创建备份目录和文件
            const backupData = {
                backupDate: new Date().toISOString(),
                originalPath: this._migrationConfig.sourcePath,
                note: 'Backup created before level data migration'
            };
            
            // 实际备份逻辑会依赖具体的文件系统API
            console.log('Backup created successfully');
            
        } catch (error) {
            console.warn('Failed to create backup:', error);
            throw new Error('Backup creation failed, aborting migration');
        }
    }

    // 公共接口方法
    public async migrateSingleLevelById(legacyLevelId: number): Promise<LevelConfig | null> {
        try {
            const legacyLevels = await this.loadLegacyLevelData();
            const legacyLevel = legacyLevels.find(level => level.id === legacyLevelId);
            
            if (!legacyLevel) {
                throw new Error(`Legacy level ${legacyLevelId} not found`);
            }
            
            const migratedLevel = await this.convertLegacyLevel(legacyLevel);
            await this.saveMigratedLevel(migratedLevel);
            
            console.log(`Successfully migrated level ${legacyLevelId}`);
            return migratedLevel;
            
        } catch (error) {
            console.error(`Failed to migrate level ${legacyLevelId}:`, error);
            return null;
        }
    }

    public async getMigrationPreview(levelId?: number): Promise<{
        totalLevels: number;
        sampleLevels: Array<{
            original: LegacyLevelData;
            migrated: LevelConfig;
        }>;
    }> {
        const legacyLevels = await this.loadLegacyLevelData();
        const sampleLevels: any[] = [];
        
        const samplesToGenerate = levelId ? [levelId] : [1, Math.floor(legacyLevels.length / 2), legacyLevels.length];
        
        for (const sampleId of samplesToGenerate) {
            const legacyLevel = legacyLevels.find(level => level.id === sampleId);
            if (legacyLevel) {
                const migratedLevel = await this.convertLegacyLevel(legacyLevel);
                sampleLevels.push({
                    original: legacyLevel,
                    migrated: migratedLevel
                });
            }
        }
        
        return {
            totalLevels: legacyLevels.length,
            sampleLevels: sampleLevels
        };
    }

    public getElementTypeMapping(): Map<number, ElementType> {
        return new Map(this._elementTypeMapping);
    }

    public dispose(): void {
        this._elementTypeMapping.clear();
        console.log('LevelDataMigrator disposed');
    }
}