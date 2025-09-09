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
     * 动态生成关卡地图 - 完全替代硬编码的defaultHidelist
     */
    resetHdeList(lv: number) {
        console.log(`生成动态关卡: 第${lv}关`);
        
        // 使用动态生成器替代硬编码数组
        this.hideList = this.levelGenerator.generateLevel(lv);
        
        console.log(`关卡${lv}生成完成，共${this.hideList.length}个障碍点`);
        
        // 可选：如果需要fallback，可以保留一个简单的默认模式
        if (this.hideList.length === 0) {
            console.warn(`关卡${lv}生成失败，使用默认模式`);
            this.hideList = this.generateFallbackLevel(lv);
        }
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

