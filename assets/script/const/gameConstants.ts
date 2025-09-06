/** 游戏常量 - 简化版本只做命名更换 */
export class GameConstants {
    static readonly GRID_SIZE: number = 9;
    static readonly GRID_WIDTH: number = 90;
    static readonly ANIMATION_TIME: number = 0.3;
}

export enum PowerUpType {
    None = 0,
    Bomb = 8,
    Horizontal = 9, 
    Vertical = 10,
    Rainbow = 11
}