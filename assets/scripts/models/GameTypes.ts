export enum ElementType {
    EMPTY = 0,
    RED = 1,
    BLUE = 2,
    GREEN = 3,
    YELLOW = 4,
    PURPLE = 5,
    ORANGE = 6,
    // 特殊元素
    BOMB = 10,
    ROW_CLEAR = 11,
    COL_CLEAR = 12,
    COLOR_BOMB = 13,
    RAINBOW = 14
}

export interface Position {
    x: number;
    y: number;
}

export interface CellData {
    id: string;
    elementType: ElementType;
    position: Position;
    isStable: boolean;
    specialType?: string;
    powerLevel?: number;
}

export type GameBoard = CellData[][];

export interface MatchResult {
    id: string;
    cells: CellData[];
    type: MatchType;
    score: number;
    specialElement?: ElementType;
}

export enum MatchType {
    HORIZONTAL = 'horizontal',
    VERTICAL = 'vertical',
    L_SHAPE = 'l_shape',
    T_SHAPE = 't_shape',
    CROSS = 'cross',
    SQUARE = 'square'
}

export interface SwapData {
    from: Position;
    to: Position;
    fromCell: CellData;
    toCell: CellData;
}

export interface MoveData {
    from: Position;
    to: Position;
    expectedMatches: MatchResult[];
    isValid: boolean;
}

export interface GameState {
    board: GameBoard;
    score: number;
    moves: number;
    maxMoves: number;
    level: number;
    objectives: ObjectiveData[];
    powerUps: { [key: string]: number };
    isGameOver: boolean;
    isPaused: boolean;
}

export interface ObjectiveData {
    type: string;
    elementType: ElementType;
    count: number;
    description: string;
    completed?: boolean;
}

export interface LevelObjective {
    type: 'score' | 'collect' | 'clear' | 'special';
    target: number;
    current: number;
    count: number; // for backwards compatibility
    elementType?: ElementType;
    description: string;
}

export interface PlayerStats {
    totalScore: number;
    highScore: number;
    totalMoves: number;
    totalMatches: number;
    levelsCompleted: number;
    powerUpsUsed: number;
    specialElementsCreated: number;
    averageScore: number;
    favoriteElementType: ElementType;
    playTime: number;
    movesRemaining?: number; // Current game moves remaining
    score?: number; // Current game score
}

export interface AnimationData {
    type: string;
    target: any;
    from?: Position;
    to?: Position;
    duration: number;
    delay?: number;
    easing?: string;
    data?: any;
}

export interface EffectData {
    type: string;
    position: Position;
    elementType: ElementType;
    power?: number;
    data?: any;
}

export const BOARD_SIZE = 9;
export const MIN_MATCH_LENGTH = 3;
export const DIRECTIONS = [
    { x: 0, y: -1 },  // up
    { x: 1, y: 0 },   // right
    { x: 0, y: 1 },   // down
    { x: -1, y: 0 }   // left
];