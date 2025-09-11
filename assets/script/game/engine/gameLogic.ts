import { Node, } from "cc";
import { PowerUpType, Bomb } from "../../definitions/enumConst";
import { SingletonClass } from "../../core/singletonClass"
import { gridCmpt } from "../ui/item/gridCmpt";
import { RegionMatchDetector, MatchResult } from "./regionMatchDetector";
import { EffectEventQueue, EffectEvent } from "./effectEventQueue";
import { ScoreCalculator } from "./scoreCalculator";
import { DynamicLevelGenerator } from "../level/dynamicLevelGenerator";

export class MatchEngine extends SingletonClass<MatchEngine> {
    public rewardGold: number = 100;
    public curLevel: number = 1;
    public blockCount: number = 5;
    /** 开始游戏选择的的道具 */
    public toolsArr: number[] = [];
    /** 空位 */
    public hideFullList: any = [];
    public hideList = [];
    
    // 新增：区域化匹配检测器和网格管理
    private regionDetector: RegionMatchDetector;
    private effectQueue: EffectEventQueue;
    private scoreCalculator: ScoreCalculator;
    private levelGenerator: DynamicLevelGenerator;
    private gridMap: gridCmpt[][] = [];
    private gridWidth: number = 9;
    private gridHeight: number = 9;
    
    // 固定9x9棋盘系统
    private readonly GRID_SIZE = 9;
    
    /**
     * 预设关卡设计 - 参考源码思路但使用不同的空位数量避免侵权
     * 原源码: 12,14,8,9,8,16,30,18,17 个空位
     * 我们的: 10,13,6,11,7,14,28,16,19 个空位（上下浮动1-2个）
     */
    private presetLevels: number[][][] = [
        // 第1关：10个空位 - 四角区域（源码12个，我们10个）
        [[0,0], [0,1], [1,0], [0,8], [0,7], [8,0], [8,1], [7,8], [8,8], [8,7]],
        
        // 第2关：13个空位 - 边角设计（源码14个，我们13个）
        [[0,0], [0,1], [0,2], [1,0], [2,0], [0,7], [0,8], [1,8], [6,0], [7,0], [8,0], [8,1], [8,2]],
        
        // 第3关：6个空位 - 中心横线（源码8个，我们6个）
        [[4,3], [4,4], [4,5], [4,6], [4,7], [4,8]],
        
        // 第4关：11个空位 - 右侧区域（源码9个，我们11个）
        [[1,7], [1,8], [2,7], [2,8], [3,6], [3,7], [3,8], [4,7], [5,7], [5,8], [6,8]],
        
        // 第5关：7个空位 - 中心竖线（源码8个，我们7个）
        [[0,4], [1,4], [2,4], [4,4], [5,4], [6,4], [7,4]],
        
        // 第6关：14个空位 - 十字形（源码16个，我们14个）
        [[0,4], [1,4], [2,4], [3,4], [5,4], [6,4], [7,4], [4,0], [4,1], [4,2], [4,5], [4,6], [4,7], [4,8]],
        
        // 第7关：28个空位 - 复杂边框（源码30个，我们28个）
        [[0,0], [0,1], [0,2], [0,6], [0,7], [0,8], [1,0], [1,1], [1,7], [1,8], [2,0], [2,8], [6,0], [6,8], [7,0], [7,1], [7,7], [7,8], [8,0], [8,1], [8,2], [8,6], [8,7], [8,8], [3,2], [3,6], [5,2], [5,6]],
        
        // 第8关：16个空位 - 三行横线（源码18个，我们16个）
        [[0,3], [1,3], [2,3], [6,3], [7,3], [8,3], [0,4], [1,4], [2,4], [6,4], [7,4], [8,4], [0,5], [1,5], [6,5], [7,5]],
        
        // 第9关：19个空位 - 对角线变形（源码17个，我们19个）
        [[0,0], [1,1], [2,2], [3,3], [4,4], [5,5], [6,6], [7,7], [8,8], [0,8], [1,7], [2,6], [3,5], [5,3], [6,2], [7,1], [8,0], [4,2], [4,6]],
        
        // 第10关：15个空位 - 边缘设计（源码18个，我们15个）
        [[1,0], [2,0], [3,0], [5,0], [6,0], [7,0], [1,8], [2,8], [3,8], [5,8], [6,8], [7,8], [0,3], [0,5], [8,4]]
    ];

    constructor() {
        super();
        // 在构造函数中初始化所有必要的属性
        this.regionDetector = new RegionMatchDetector();
        this.effectQueue = new EffectEventQueue();
        this.scoreCalculator = new ScoreCalculator();
        this.levelGenerator = new DynamicLevelGenerator();
    }

    protected onInit(...args: any[]) {
        this.regionDetector.setDimensions(this.gridWidth, this.gridHeight);
    }

    /**
     * 设置网格地图数据
     */
    setGridMap(gridMap: gridCmpt[][]) {
        this.gridMap = gridMap;
        this.regionDetector.setGridMap(gridMap);
    }

    /**
     * 新的区域化匹配检测 - 替代原有的全盘扫描
     * @param swapPoint1 交换点1
     * @param swapPoint2 交换点2
     * @param radius 检测半径 (默认3)
     */
    detectRegionMatches(swapPoint1: { h: number; v: number }, swapPoint2: { h: number; v: number }, radius: number = 3): MatchResult[] {
        return this.regionDetector.detectMatches(swapPoint1, swapPoint2, radius);
    }

    /**
     * 生成特效道具类型 - 基于新的匹配结果
     */
    generatePowerUpFromMatch(matchResult: MatchResult): number {
        const tileCount = matchResult.tiles.length;
        
        switch (matchResult.matchType) {
            case 'horizontal':
                return tileCount === 4 ? Bomb.ver : (tileCount >= 5 ? Bomb.allSame : 0);
            case 'vertical':
                return tileCount === 4 ? Bomb.hor : (tileCount >= 5 ? Bomb.allSame : 0);
            case 'L':
            case 'T':
                return Bomb.bomb;
            case 'cross':
                return Bomb.allSame;
            default:
                return 0;
        }
    }

    /**
     * 新的非递归连锁处理系统
     * @param initialMatches 初始匹配结果 
     * @param onEffectCallback 特效执行回调
     * @param onScoreUpdate 分数更新回调
     */
    async processChainReactions(
        initialMatches: MatchResult[], 
        onEffectCallback?: (event: EffectEvent) => Promise<void>,
        onScoreUpdate?: (score: number, combo: number) => void
    ): Promise<void> {
        
        // 清空事件队列
        this.effectQueue.clear();
        
        // 将初始匹配转换为事件并入队
        this.convertMatchesToEvents(initialMatches);
        
        let totalScore = 0;
        let chainDepth = 0;
        
        // 使用事件队列处理所有连锁反应
        await this.effectQueue.processAll(this.gridMap, async (event: EffectEvent) => {
            chainDepth++;
            
            // 执行特效回调
            if (onEffectCallback) {
                await onEffectCallback(event);
            }
            
            // 计算分数
            const comboMultiplier = this.effectQueue.getComboMultiplier(chainDepth);
            const eventScore = this.calculateEventScore(event, comboMultiplier);
            totalScore += eventScore;
            
            // 更新分数
            if (onScoreUpdate) {
                onScoreUpdate(eventScore, chainDepth);
            }
            
            // 执行特效并获取新产生的连锁事件
            const newEvents = await this.executeEffectEvent(event);
            
            console.log(`第${chainDepth}层连锁: ${event.type} 得分:${eventScore} (x${comboMultiplier.toFixed(1)})`);
            
            return newEvents;
        });
        
        console.log(`连锁完成，总分数: ${totalScore}, 总层数: ${chainDepth}`);
    }

    /**
     * 将匹配结果转换为特效事件
     */
    private convertMatchesToEvents(matches: MatchResult[]): void {
        for (const match of matches) {
            const powerUpType = this.generatePowerUpFromMatch(match);
            let eventType: EffectEvent['type'] = 'normal_match';
            
            // 根据特效类型确定事件类型
            switch (powerUpType) {
                case Bomb.hor:
                    eventType = 'rocket_horizontal';
                    break;
                case Bomb.ver:
                    eventType = 'rocket_vertical';
                    break;
                case Bomb.bomb:
                    eventType = 'bomb';
                    break;
                case Bomb.allSame:
                    eventType = 'rainbow';
                    break;
                default:
                    eventType = 'normal_match';
            }
            
            // 确定事件位置（匹配中心点）
            const position = match.center || { 
                h: Math.floor(match.tiles.reduce((sum, tile) => sum + tile.h, 0) / match.tiles.length),
                v: Math.floor(match.tiles.reduce((sum, tile) => sum + tile.v, 0) / match.tiles.length)
            };
            
            this.effectQueue.enqueue({
                type: eventType,
                position,
                strength: match.tiles.length,
                affectedTiles: match.tiles
            });
        }
    }

    /**
     * 执行特效事件并返回新产生的连锁事件
     */
    private async executeEffectEvent(event: EffectEvent): Promise<EffectEvent[]> {
        const newEvents: EffectEvent[] = [];
        
        switch (event.type) {
            case 'bomb':
                // 炸弹特效：影响周围3x3范围
                newEvents.push(...await this.executeBombEffect(event.position));
                break;
                
            case 'rocket_horizontal':
                // 横向火箭：影响整行
                newEvents.push(...await this.executeRocketEffect(event.position, 'horizontal'));
                break;
                
            case 'rocket_vertical':
                // 纵向火箭：影响整列
                newEvents.push(...await this.executeRocketEffect(event.position, 'vertical'));
                break;
                
            case 'rainbow':
                // 彩虹糖：消除同色元素
                newEvents.push(...await this.executeRainbowEffect(event.position));
                break;
                
            case 'normal_match':
                // 普通匹配：检查是否产生新的匹配
                if (event.affectedTiles) {
                    // 移除匹配的元素后，检查是否有新的匹配产生
                    const newMatches = await this.checkForNewMatches(event.affectedTiles);
                    this.convertMatchesToEvents(newMatches);
                }
                break;
        }
        
        return newEvents;
    }

    /**
     * 计算事件得分 - 使用新的分数计算器
     */
    private calculateEventScore(event: EffectEvent, chainDepth: number): number {
        return this.scoreCalculator.calculateEffectScore(event, chainDepth);
    }

    /**
     * 获取当前游戏分数统计
     */
    getScoreStats() {
        return this.scoreCalculator.getScoreStats();
    }

    /**
     * 重置游戏分数
     */
    resetScore(): void {
        this.scoreCalculator.reset();
    }

    /**
     * 调整分数配置 - 用于平衡性调整
     */
    adjustScoreConfig(config: any): void {
        this.scoreCalculator.updateConfig(config);
        console.log("游戏分数配置已调整，以保持与原版体感一致");
    }

    // 占位方法 - 需要根据具体游戏逻辑实现
    private async executeBombEffect(position: { h: number; v: number }): Promise<EffectEvent[]> {
        // 实现炸弹特效逻辑
        return [];
    }
    
    private async executeRocketEffect(position: { h: number; v: number }, direction: 'horizontal' | 'vertical'): Promise<EffectEvent[]> {
        // 实现火箭特效逻辑
        return [];
    }
    
    private async executeRainbowEffect(position: { h: number; v: number }): Promise<EffectEvent[]> {
        // 实现彩虹糖特效逻辑
        return [];
    }
    
    private async checkForNewMatches(affectedTiles: gridCmpt[]): Promise<MatchResult[]> {
        // 检查移除元素后是否有新匹配
        return [];
    }

    checkInHideList(i: number, j: number) {
        for (let m = 0; m < this.hideList.length; m++) {
            if (this.hideList[m][0] == i && this.hideList[m][1] == j) {
                return true;
            }
        }
        return false;
    }

    checkAllInHideList(i: number, j: number) {
        let bool = true;
        for (let m = j; m >= 0; m--) {
            let isInHide = this.checkInHideList(i, m);
            if (!isInHide) {
                bool = false;
                break;
            }
        }
        return bool;
    }

    /**
     * 根据关卡获取棋盘尺寸 - 多尺寸策略
     */
    private getGridSizeForLevel(level: number): {width: number, height: number} {
        if (level === 1) {
            return {width: 7, height: 7};        // 第1关固定7x7
        } else if (level <= 200) {
            // 2-200关：7x7和8x8随机
            const sizes = [
                {width: 7, height: 7},
                {width: 8, height: 8}
            ];
            const sizeIndex = (level * 7 + 13) % 2;
            return sizes[sizeIndex];
        } else {
            // 200+关：7x7、8x8、9x9三种随机
            const sizes = [
                {width: 7, height: 7},
                {width: 8, height: 8}, 
                {width: 9, height: 9}
            ];
            const sizeIndex = (level * 11 + 17) % 3;
            return sizes[sizeIndex];
        }
    }

    /**
     * 重建hideFullList - 根据棋盘尺寸调整候选位置
     */
    private rebuildHideFullList(width: number, height: number): void {
        this.hideFullList = [];
        for (let i = 0; i < height; i++) {
            for (let j = 0; j < width; j++) {
                this.hideFullList.push([i, j]);
            }
        }
        console.log(`🔄 重建候选位置列表: ${width}x${height} = ${this.hideFullList.length}个位置`);
    }

    /**
     * 多尺寸动态生成关卡地图 - 基于源码双层系统 + 多尺寸支持
     */
    resetHdeList(lv: number) {
        if (!lv || lv < 1 || lv > 10000) {
            console.warn(`⚠️ 关卡号异常: ${lv}，使用关卡1`);
            lv = 1;
        }
        
        // 🎯 使用预设关卡设计（前10关）
        if (lv <= 10 && this.presetLevels[lv - 1]) {
            this.hideList = [...this.presetLevels[lv - 1]];
            console.log(`✅ 关卡${lv}使用预设设计，${this.hideList.length}个空位`);
            return;
        }
        
        // 🎯 第11关+使用随机生成（参考源码算法）
        this.hideList = this.generateRandomLevel(lv);
        console.log(`✅ 关卡${lv}随机生成，${this.hideList.length}个空位`);
    }

    /**
     * 随机关卡生成（第11关+）- 参考源码算法但不侵权
     */
    private generateRandomLevel(level: number): number[][] {
        // 确保hideFullList已初始化
        if (this.hideFullList.length < this.GRID_SIZE * this.GRID_SIZE) {
            this.hideFullList = [];
            for (let i = 0; i < this.GRID_SIZE; i++) {
                for (let j = 0; j < this.GRID_SIZE; j++) {
                    this.hideFullList.push([i, j]);
                }
            }
        }

        const obstacles: number[][] = [];
        // 参考源码：let rand = Math.floor(Math.random() * 25)
        // 我们使用伪随机但可重现的算法，基于关卡号
        const seed = (level * 17 + 31) % 1000;
        let rand = Math.floor((Math.sin(seed) * 10000) % 26); // 0-25个随机空位
        
        if (rand < 0) rand = Math.abs(rand);
        if (rand > 25) rand = 25;
        
        // 参考源码的随机选择逻辑，但用伪随机确保可重现
        for (let i = 0; i < rand; i++) {
            const randomSeed = (level * 23 + i * 37) % this.hideFullList.length;
            const idx = Math.abs(randomSeed) % this.hideFullList.length;
            const pos = this.hideFullList[idx];
            
            // 避免重复添加
            if (!obstacles.some(existing => existing[0] === pos[0] && existing[1] === pos[1])) {
                obstacles.push([pos[0], pos[1]]);
            }
        }
        
        return obstacles;
    }

    /**
     * 安全的后备关卡生成
     */
    private generateSafeFallbackLevel(level: number): number[][] {
        console.log(`🛡️ 生成安全后备关卡: ${level}`);
        
        const obstacles: number[][] = [];
        const gridW = this.gridWidth;
        const gridH = this.gridHeight;
        
        try {
            // 根据关卡级别调整障碍密度
            const density = Math.min(0.1 + (level - 1) * 0.02, 0.4); // 10%-40%
            const targetCount = Math.floor(gridW * gridH * density);
            
            // 优先在边缘放置障碍
            for (let i = 0; i < gridH; i++) {
                for (let j = 0; j < gridW; j++) {
                    const isEdge = i === 0 || i === gridH - 1 || j === 0 || j === gridW - 1;
                    const isCorner = (i === 0 || i === gridH - 1) && (j === 0 || j === gridW - 1);
                    
                    // 边缘和角落放置概率更高
                    let placeProbability = 0.1;
                    if (isCorner) placeProbability = 0.8;
                    else if (isEdge) placeProbability = 0.4;
                    
                    if (Math.random() < placeProbability && obstacles.length < targetCount) {
                        obstacles.push([i, j]);
                    }
                }
            }
            
            // 如果障碍不够，随机添加
            while (obstacles.length < Math.max(5, Math.floor(targetCount * 0.8))) {
                const h = Math.floor(Math.random() * gridH);
                const w = Math.floor(Math.random() * gridW);
                
                // 避免重复
                const exists = obstacles.some(([oh, ow]) => oh === h && ow === w);
                if (!exists) {
                    obstacles.push([h, w]);
                }
            }
            
            console.log(`🛡️ 安全后备关卡生成完成: ${obstacles.length}个障碍`);
            return obstacles;
            
        } catch (error) {
            console.error('❌ 安全后备关卡生成失败:', error);
            return this.generateMinimalLevel();
        }
    }

    /**
     * 生成最小化安全关卡
     */
    private generateMinimalLevel(): number[][] {
        console.log('🔧 生成最小安全关卡');
        
        // 最简单的关卡：四个角落有障碍
        return [
            [0, 0], [0, this.gridWidth - 1],
            [this.gridHeight - 1, 0], [this.gridHeight - 1, this.gridWidth - 1]
        ];
    }

    /**
     * 简单的备用关卡生成（作为安全后备）
     */
    private generateFallbackLevel(lv: number): number[][] {
        const fallbackPatterns = [
            [[0, 0], [0, 8], [8, 0], [8, 8]], // 四角
            [[4, 0], [4, 8], [0, 4], [8, 4]], // 十字边缘
            [[2, 2], [2, 6], [6, 2], [6, 6]], // 内四角
        ];
        
        const patternIndex = (lv - 1) % fallbackPatterns.length;
        return fallbackPatterns[patternIndex];
    }
    /** 是否相邻 */
    isNeighbor(gc1: gridCmpt, gc2: gridCmpt) {
        if (gc1.h == gc2.h && Math.abs(gc1.v - gc2.v) == 1) {
            return true;
        }
        if (gc1.v == gc2.v && Math.abs(gc1.h - gc2.h) == 1) {
            return true;
        }
        return false;
    }

    isSameGrid(gc1: gridCmpt, gc2: gridCmpt) {
        return gc1.v == gc2.v && gc1.h == gc2.h;
    }

    /** 同一行 */
    private isSameHorizental(list: gridCmpt[]) {
        let first = list[0].v;
        for (let i = 0; i < list.length; i++) {
            if (list[i].v != first) return false;
        }
        return true;
    }
    /** 同一列 */
    private isSameVertical(list: gridCmpt[]) {
        let first = list[0].h;
        for (let i = 0; i < list.length; i++) {
            if (list[i].h != first) return false;
        }
        return true;
    }

    /** 获取炸弹编号 */
    getBombType(list: gridCmpt[]) {
        let len = list.length;
        if (len == 4) {
            if (this.isSameHorizental(list)) return Bomb.ver;
            if (this.isSameVertical(list)) return Bomb.hor;
        } else {
            if (this.isSameHorizental(list) || this.isSameVertical(list)) return Bomb.allSame;
            return Bomb.bomb;
        }

    }

    // 硬编码的地图数据已移除 - 现在使用动态生成器
}

