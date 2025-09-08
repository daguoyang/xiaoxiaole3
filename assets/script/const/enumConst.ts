//----------------------------------------大厅

/** 窗口类型 */
export enum WindowType {
    /** 大厅 */
    eMap = 1,
    /** 窗口 */
    eView,
    /** 弹窗 */
    eTips,
    /** 跑马灯 */
    eMarquee,
    /** 飘字 */
    eToast,
    eNetwork,
}

/** 窗口打开类型 */
export enum WindowOpenType {
    /** 只能展示这个，立即打开 */
    eSingle = 1,
    /** 可以多个同时存在，一个关闭另一个再打开 */
    eMultiple,
}

//-----------------------------------------游戏
/** 语言 */
export const enum Language {
    /** 葡萄牙语 */
    Portuguese = 0,
    /** 英语 */
    English,
    /** 中文 */
    Chinese
}

/** 游戏运行环境 */
export enum PlatFormType {
    android = 1,
    ios,
    web,
}

/** 分享 */
export interface ShareInfo {
    /** 0:链接，1:图片 */
    type: number;
    /** 链接地址 */
    url: string;
    /** 图片地址 */
    imgPath: string;
}



/** 三元消除方向 */
export enum Direction {
    left,
    right,
    up,
    down
}

/** 全局常量 */
export let Constant = {
    /**  交换时间 */
    changeTime: 0.3,
    /** 格子行列数 */
    layCount: 9,
    Width: 75,
}

/**
 *  关卡配置
 */
export interface LevelCfgData {
    level?: number,
}

/** 领取金币类型 */
export enum GoldType {
    /** 分享 */
    share = 0,
    /** 等级 */
    level,
    /** 星级 */
    star,
}

/** 排行数据 */
export interface RankData {
    star?: number,
    id?: number,
    level?: number,
    icon?: number,
    name?: string,
    gold?: number,
    rank?: number,
    time?: string,
}


interface mapData {
    m_id: number[],
    m_ct: number[],
    m_mk: number[],
}

export interface LevelData {
    mapCount: number,
    blockCount: number,
    moveCount: number,
    scores: number[],
    blockRatio: number[],
    mapData: mapData[]
}

/** 能量道具类型枚举 */
export enum PowerUpType {
    /** 垂直爆破 */
    VERTICAL_BLAST = 8,
    /** 水平爆破 */
    HORIZONTAL_BLAST = 9,
    /** 区域炸弹 */
    AREA_BOMB = 10,
    /** 彩虹消除 */
    RAINBOW_STRIKE = 11,
}

/** 向后兼容 - 保持原有接口 */
export const Bomb = {
    /** 垂直爆破 */
    ver: PowerUpType.VERTICAL_BLAST,
    /** 水平爆破 */
    hor: PowerUpType.HORIZONTAL_BLAST,
    /** 区域炸弹 */
    bomb: PowerUpType.AREA_BOMB,
    /** 彩虹消除 */
    allSame: PowerUpType.RAINBOW_STRIKE,
};

/** 界面导航枚举 */
export enum NavigationIndex {
    SHOP_SECTION = 0,
    RANKING_SECTION,
    HOME_SECTION,
    SOCIAL_SECTION,
    CONFIG_SECTION,
}

/** 向后兼容 - 保持原有接口 */
export const PageIndex = NavigationIndex;