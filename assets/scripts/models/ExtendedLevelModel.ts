import { ElementType, GameBoard, LevelObjective } from './GameTypes';

export interface LevelConfig {
    levelNumber: number;
    name: string;
    description: string;
    boardSize: number;
    maxMoves: number;
    targetScore: number;
    timeLimit: number;
    objectives: LevelObjective[];
    starThresholds: number[];
    difficulty: string;
    initialBoard: GameBoard;
    obstacles: any[];
    terrain: any[];
    specialRules: any[];
    balanceConfig: {
        elementTypes: ElementType[];
        spawnWeights: { [key in ElementType]?: number };
        specialElementChance: number;
    };
    rewards: {
        coins: number;
        powerUps: { [key: string]: number };
    };
    unlockConditions: any[];
    tags: string[];
    metadata: {
        generatedAt: string;
        generator: string;
        version: string;
    };
}

export class ExtendedLevelModel {
    private static _instance: ExtendedLevelModel | null = null;
    private _levelConfigs: Map<number, LevelConfig> = new Map();
    private _loadedLevels: Set<number> = new Set();

    private constructor() {}

    public static getInstance(): ExtendedLevelModel {
        if (!ExtendedLevelModel._instance) {
            ExtendedLevelModel._instance = new ExtendedLevelModel();
        }
        return ExtendedLevelModel._instance;
    }

    public async loadLevelConfig(levelNumber: number): Promise<LevelConfig | null> {
        if (this._levelConfigs.has(levelNumber)) {
            return this._levelConfigs.get(levelNumber)!;
        }

        // 在实际项目中，这里会从资源或服务器加载关卡配置
        console.log(`📋 Loading level config for level ${levelNumber}`);
        
        // 返回 null 表示需要动态生成
        return null;
    }

    public async getLevelConfig(levelNumber: number): Promise<LevelConfig | null> {
        return this.loadLevelConfig(levelNumber);
    }

    public async saveLevelConfig(levelNumber: number, config: LevelConfig): Promise<void> {
        this._levelConfigs.set(levelNumber, config);
        this._loadedLevels.add(levelNumber);
        console.log(`💾 Level ${levelNumber} config saved`);
    }

    public hasLevelConfig(levelNumber: number): boolean {
        return this._levelConfigs.has(levelNumber);
    }

    public getAllLoadedLevels(): number[] {
        return Array.from(this._loadedLevels);
    }

    public dispose(): void {
        this._levelConfigs.clear();
        this._loadedLevels.clear();
        ExtendedLevelModel._instance = null;
    }
}