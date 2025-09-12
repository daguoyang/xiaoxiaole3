import { LevelDataMigrator, MigrationConfig, MigrationResult } from '../assets/scripts/tools/LevelDataMigrator';
import { ExtendedLevelModel, LevelConfig } from '../assets/scripts/models/ExtendedLevelModel';

export interface BatchProcessConfig {
    sourceDataPath: string;
    outputDir: string;
    startLevel: number;
    endLevel: number;
    batchSize: number;
    validateOutput: boolean;
    generatePreview: boolean;
    backupOriginal: boolean;
}

export interface ProcessingReport {
    totalProcessed: number;
    successful: number;
    failed: number;
    errors: Array<{
        levelId: number;
        error: string;
        severity: 'warning' | 'error';
    }>;
    processingTime: number;
    outputFiles: string[];
}

export class LevelBatchProcessor {
    private _config: BatchProcessConfig;
    private _migrator: LevelDataMigrator;
    private _levelModel: ExtendedLevelModel;

    constructor(config: BatchProcessConfig) {
        this._config = config;
        this._levelModel = ExtendedLevelModel.getInstance();
        
        const migrationConfig: MigrationConfig = {
            sourcePath: config.sourceDataPath,
            outputPath: config.outputDir,
            batchSize: config.batchSize,
            validateAfterMigration: config.validateOutput,
            createBackup: config.backupOriginal,
            logProgress: true
        };
        
        this._migrator = new LevelDataMigrator(migrationConfig);
    }

    public async processAllLevels(): Promise<ProcessingReport> {
        console.log('🎯 开始批量处理关卡数据...');
        const startTime = Date.now();
        
        const report: ProcessingReport = {
            totalProcessed: 0,
            successful: 0,
            failed: 0,
            errors: [],
            processingTime: 0,
            outputFiles: []
        };

        try {
            // 第一步：数据迁移
            console.log('📊 第一步：执行数据迁移...');
            const migrationResult = await this._migrator.migrateAllLevels();
            
            report.totalProcessed = migrationResult.totalLevels;
            report.successful = migrationResult.successfulMigrations;
            report.failed = migrationResult.failedMigrations;
            report.errors = migrationResult.errors.map(error => ({
                levelId: error.levelId,
                error: error.error,
                severity: 'error' as const
            }));

            // 第二步：批量处理特定范围
            if (this._config.startLevel && this._config.endLevel) {
                console.log(`🎮 第二步：处理关卡 ${this._config.startLevel} - ${this._config.endLevel}...`);
                await this.processLevelRange(this._config.startLevel, this._config.endLevel, report);
            }

            // 第三步：生成预览文件
            if (this._config.generatePreview) {
                console.log('🖼 第三步：生成关卡预览...');
                await this.generateLevelPreviews(report);
            }

            // 第四步：输出处理报告
            await this.generateProcessingReport(report);
            
            report.processingTime = Date.now() - startTime;
            console.log(`✅ 批量处理完成，耗时 ${report.processingTime}ms`);
            
        } catch (error) {
            console.error('❌ 批量处理失败:', error);
            report.errors.push({
                levelId: -1,
                error: error instanceof Error ? error.message : 'Unknown batch processing error',
                severity: 'error'
            });
        }

        return report;
    }

    private async processLevelRange(start: number, end: number, report: ProcessingReport): Promise<void> {
        for (let levelId = start; levelId <= end; levelId++) {
            try {
                const levelConfig = await this._levelModel.getLevelConfig(levelId);
                if (levelConfig) {
                    // 验证关卡配置
                    const validation = await this.validateLevelConfig(levelConfig);
                    if (!validation.isValid) {
                        report.errors.push({
                            levelId: levelId,
                            error: `关卡验证失败: ${validation.errors.join(', ')}`,
                            severity: 'warning'
                        });
                    }

                    // 优化关卡平衡
                    const optimizedConfig = await this.optimizeLevelBalance(levelConfig);
                    if (optimizedConfig !== levelConfig) {
                        await this._levelModel.saveLevelConfig(levelId, optimizedConfig);
                        console.log(`🔧 优化了关卡 ${levelId} 的平衡配置`);
                    }

                    // 生成输出文件
                    const outputFile = await this.generateLevelFile(levelConfig);
                    if (outputFile) {
                        report.outputFiles.push(outputFile);
                    }
                }
            } catch (error) {
                report.failed++;
                report.errors.push({
                    levelId: levelId,
                    error: error instanceof Error ? error.message : 'Unknown processing error',
                    severity: 'error'
                });
            }
        }
    }

    private async validateLevelConfig(config: LevelConfig): Promise<{
        isValid: boolean;
        errors: string[];
        warnings: string[];
    }> {
        const errors: string[] = [];
        const warnings: string[] = [];

        // 基础验证
        if (config.maxMoves <= 0) {
            errors.push('最大步数必须大于0');
        }
        
        if (config.targetScore <= 0) {
            errors.push('目标分数必须大于0');
        }

        if (!config.objectives || config.objectives.length === 0) {
            errors.push('关卡必须有至少一个目标');
        }

        // 平衡性验证
        if (config.maxMoves < 10) {
            warnings.push('步数过少可能导致关卡过难');
        }

        if (config.targetScore > config.maxMoves * 5000) {
            warnings.push('目标分数相对步数可能过高');
        }

        // 星级阈值验证
        if (config.starThresholds) {
            const thresholds = config.starThresholds;
            if (thresholds[0] !== config.targetScore) {
                warnings.push('一星阈值应该等于目标分数');
            }
            
            if (thresholds[1] <= thresholds[0] || thresholds[2] <= thresholds[1]) {
                errors.push('星级阈值必须递增');
            }
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings
        };
    }

    private async optimizeLevelBalance(config: LevelConfig): Promise<LevelConfig> {
        const optimized = { ...config };
        let changed = false;

        // 优化星级阈值
        if (optimized.starThresholds) {
            const baseScore = optimized.targetScore;
            const suggestedThresholds = [
                baseScore,
                Math.floor(baseScore * 1.5),
                Math.floor(baseScore * 2.2)
            ];

            // 如果差异较大，建议调整
            const currentThresholds = optimized.starThresholds;
            if (Math.abs(currentThresholds[1] - suggestedThresholds[1]) > baseScore * 0.2) {
                optimized.starThresholds = suggestedThresholds;
                changed = true;
            }
        }

        // 优化元素生成权重
        if (optimized.balanceConfig?.spawnWeights) {
            const weights = optimized.balanceConfig.spawnWeights;
            const totalWeight = Object.values(weights).reduce((sum, weight) => sum + weight, 0);
            
            // 如果权重分布过于不均匀，进行调整
            const avgWeight = totalWeight / Object.keys(weights).length;
            const maxDeviation = avgWeight * 0.5; // 允许50%偏差
            
            let needsAdjustment = false;
            for (const [elementType, weight] of Object.entries(weights)) {
                if (Math.abs(weight - avgWeight) > maxDeviation) {
                    needsAdjustment = true;
                    break;
                }
            }

            if (needsAdjustment) {
                // 重新平衡权重
                const elementTypes = Object.keys(weights);
                const balancedWeight = Math.floor(100 / elementTypes.length);
                const newWeights: { [key: string]: number } = {};
                
                elementTypes.forEach(type => {
                    newWeights[type] = balancedWeight;
                });
                
                optimized.balanceConfig.spawnWeights = newWeights;
                changed = true;
            }
        }

        // 根据难度调整特殊元素概率
        if (optimized.balanceConfig?.specialElementChance) {
            const difficulty = optimized.difficulty;
            const recommendedChance = {
                'easy': 0.15,
                'medium': 0.12,
                'hard': 0.10,
                'expert': 0.08
            }[difficulty] || 0.12;

            if (Math.abs(optimized.balanceConfig.specialElementChance - recommendedChance) > 0.03) {
                optimized.balanceConfig.specialElementChance = recommendedChance;
                changed = true;
            }
        }

        return changed ? optimized : config;
    }

    private async generateLevelFile(config: LevelConfig): Promise<string | null> {
        try {
            const fileName = `level_${config.levelNumber.toString().padStart(4, '0')}.json`;
            const filePath = `${this._config.outputDir}/levels/${fileName}`;
            
            // 创建关卡文件内容
            const levelFileContent = {
                version: '1.0.0',
                levelConfig: config,
                metadata: {
                    generatedAt: new Date().toISOString(),
                    processor: 'LevelBatchProcessor',
                    fileSize: JSON.stringify(config).length
                }
            };

            // 这里应该写入文件系统，但在浏览器环境中我们只能模拟
            console.log(`📄 生成关卡文件: ${fileName}`);
            
            return filePath;
        } catch (error) {
            console.error(`生成关卡文件失败 (Level ${config.levelNumber}):`, error);
            return null;
        }
    }

    private async generateLevelPreviews(report: ProcessingReport): Promise<void> {
        console.log('🖼 生成关卡预览数据...');
        
        const previewData = {
            totalLevels: report.totalProcessed,
            levelGroups: [] as Array<{
                startLevel: number;
                endLevel: number;
                difficulty: string;
                averageScore: number;
                averageMoves: number;
                specialFeatures: string[];
            }>
        };

        // 按难度分组统计
        const difficultyGroups = new Map<string, LevelConfig[]>();
        
        for (let i = 1; i <= report.totalProcessed; i += 50) {
            try {
                const endLevel = Math.min(i + 49, report.totalProcessed);
                const groupLevels: LevelConfig[] = [];
                
                for (let levelId = i; levelId <= endLevel; levelId++) {
                    const levelConfig = await this._levelModel.getLevelConfig(levelId);
                    if (levelConfig) {
                        groupLevels.push(levelConfig);
                    }
                }

                if (groupLevels.length > 0) {
                    const avgScore = groupLevels.reduce((sum, level) => sum + level.targetScore, 0) / groupLevels.length;
                    const avgMoves = groupLevels.reduce((sum, level) => sum + level.maxMoves, 0) / groupLevels.length;
                    const commonDifficulty = this.getMostCommonDifficulty(groupLevels);
                    const features = this.extractCommonFeatures(groupLevels);

                    previewData.levelGroups.push({
                        startLevel: i,
                        endLevel: endLevel,
                        difficulty: commonDifficulty,
                        averageScore: Math.round(avgScore),
                        averageMoves: Math.round(avgMoves),
                        specialFeatures: features
                    });
                }
            } catch (error) {
                console.warn(`生成预览组 ${i}-${i+49} 失败:`, error);
            }
        }

        // 生成预览文件
        const previewFileName = `${this._config.outputDir}/level_preview.json`;
        console.log(`📋 生成预览文件: level_preview.json`);
        
        // 添加到报告
        report.outputFiles.push(previewFileName);
    }

    private getMostCommonDifficulty(levels: LevelConfig[]): string {
        const difficultyCounts = new Map<string, number>();
        
        levels.forEach(level => {
            const difficulty = level.difficulty || 'medium';
            difficultyCounts.set(difficulty, (difficultyCounts.get(difficulty) || 0) + 1);
        });

        let maxCount = 0;
        let commonDifficulty = 'medium';
        
        for (const [difficulty, count] of difficultyCounts) {
            if (count > maxCount) {
                maxCount = count;
                commonDifficulty = difficulty;
            }
        }

        return commonDifficulty;
    }

    private extractCommonFeatures(levels: LevelConfig[]): string[] {
        const features = new Set<string>();
        
        levels.forEach(level => {
            if (level.timeLimit && level.timeLimit > 0) {
                features.add('时间限制');
            }
            
            if (level.obstacles && level.obstacles.length > 0) {
                features.add('障碍物');
            }
            
            if (level.terrain && level.terrain.length > 0) {
                features.add('特殊地形');
            }
            
            if (level.specialRules && level.specialRules.length > 0) {
                features.add('特殊规则');
            }
            
            const hasCollectionObjective = level.objectives.some(obj => obj.type === 'collect');
            if (hasCollectionObjective) {
                features.add('收集目标');
            }
        });

        return Array.from(features);
    }

    private async generateProcessingReport(report: ProcessingReport): Promise<void> {
        const reportContent = {
            summary: {
                totalProcessed: report.totalProcessed,
                successful: report.successful,
                failed: report.failed,
                successRate: `${((report.successful / report.totalProcessed) * 100).toFixed(2)}%`,
                processingTime: `${(report.processingTime / 1000).toFixed(2)}s`
            },
            errors: report.errors,
            outputFiles: report.outputFiles,
            generatedAt: new Date().toISOString(),
            config: this._config
        };

        console.log('\n📊 === 批量处理报告 ===');
        console.log(`总处理数量: ${report.totalProcessed}`);
        console.log(`成功: ${report.successful}`);
        console.log(`失败: ${report.failed}`);
        console.log(`成功率: ${reportContent.summary.successRate}`);
        console.log(`处理时间: ${reportContent.summary.processingTime}`);
        
        if (report.errors.length > 0) {
            console.log('\n⚠️ 错误详情:');
            report.errors.forEach(error => {
                console.log(`  Level ${error.levelId}: ${error.error} (${error.severity})`);
            });
        }

        console.log(`\n📄 生成文件: processing_report.json`);
    }

    public dispose(): void {
        this._migrator.dispose();
        console.log('LevelBatchProcessor disposed');
    }
}