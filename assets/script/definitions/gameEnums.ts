/** 游戏常量 - 全新命名 */
export class GameConstants {
    /** 网格大小 */
    static readonly GRID_SIZE: number = 9;
    /** 网格宽度 */
    static readonly GRID_WIDTH: number = 90;
    /** 动画切换时间 */
    static readonly ANIMATION_TIME: number = 0.3;
    /** 最小匹配数量 */
    static readonly MIN_MATCH_COUNT: number = 3;
}

/** 道具类型 */
export enum PowerUpType {
    None = 0,
    Bomb = 1,           // 炸弹 (原Bomb.bomb)
    Horizontal = 2,     // 横向消除 (原Bomb.hor) 
    Vertical = 3,       // 纵向消除 (原Bomb.ver)
    Rainbow = 4         // 彩虹消除 (原Bomb.allSame)
}

/** 方向枚举 */
export enum Direction {
    Up = 'up',
    Down = 'down', 
    Left = 'left',
    Right = 'right'
}

/** 页面索引 */
export enum PageIndex {
    Home = 1,
    Shop = 2,
    Settings = 3
}

/** 关卡数据接口 */
export interface LevelConfiguration {
    levelNumber: number;
    tileCount: number;
    maxMoves: number;
    targetScores: number[];
    tileRatios: number[];
    mapData: Array<{
        m_id: number[];
        m_ct: number[];
        m_mk: number[];
    }>;
}

/** 游戏模式 */
export enum GameMode {
    Normal = 'normal',
    Challenge = 'challenge',
    Endless = 'endless'
}

/** 音效类型 */
export enum AudioType {
    Music = 'music',
    Effect = 'effect'
}