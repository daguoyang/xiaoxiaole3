import { gridCmpt } from "../ui/item/gridCmpt";

export interface MatchResult {
    tiles: gridCmpt[];
    matchType: 'horizontal' | 'vertical' | 'L' | 'T' | 'cross';
    center?: { h: number; v: number };
}

export class RegionMatchDetector {
    private gridMap: gridCmpt[][] = [];
    private gridWidth: number = 9;
    private gridHeight: number = 9;
    private minMatchSize: number = 3;

    setGridMap(gridMap: gridCmpt[][]) {
        this.gridMap = gridMap;
    }

    setDimensions(width: number, height: number) {
        this.gridWidth = width;
        this.gridHeight = height;
    }

    /**
     * 区域化匹配检测 - 只检测指定点周围的曼哈顿距离范围
     * @param swapPoint1 交换点1
     * @param swapPoint2 交换点2 
     * @param radius 检测半径(默认3)
     */
    detectMatches(swapPoint1: { h: number; v: number }, swapPoint2: { h: number; v: number }, radius: number = 3): MatchResult[] {
        const matches: MatchResult[] = [];
        const visited = new Set<string>();
        
        // 获取需要检测的区域
        const detectionRegion = this.getDetectionRegion([swapPoint1, swapPoint2], radius);
        
        for (const point of detectionRegion) {
            const key = `${point.h},${point.v}`;
            if (visited.has(key)) continue;
            
            const tile = this.getTile(point.h, point.v);
            if (!tile || tile.type === undefined) continue;
            
            // 使用BFS找到同色连通分量
            const connectedComponent = this.findConnectedComponent(point.h, point.v, tile.type, visited);
            
            if (connectedComponent.length >= this.minMatchSize) {
                const matchResult = this.analyzeMatchPattern(connectedComponent);
                if (matchResult) {
                    matches.push(matchResult);
                }
            }
        }
        
        return matches;
    }

    /**
     * 获取检测区域 - 以交换点为中心的曼哈顿距离范围
     */
    private getDetectionRegion(swapPoints: { h: number; v: number }[], radius: number): { h: number; v: number }[] {
        const region = new Set<string>();
        
        for (const center of swapPoints) {
            for (let dh = -radius; dh <= radius; dh++) {
                for (let dv = -radius; dv <= radius; dv++) {
                    const manhattanDistance = Math.abs(dh) + Math.abs(dv);
                    if (manhattanDistance <= radius) {
                        const h = center.h + dh;
                        const v = center.v + dv;
                        
                        if (this.isValidPosition(h, v)) {
                            region.add(`${h},${v}`);
                        }
                    }
                }
            }
        }
        
        return Array.from(region).map(key => {
            const [h, v] = key.split(',').map(Number);
            return { h, v };
        });
    }

    /**
     * BFS查找同色连通分量
     */
    private findConnectedComponent(startH: number, startV: number, tileType: number, globalVisited: Set<string>): gridCmpt[] {
        const component: gridCmpt[] = [];
        const queue: { h: number; v: number }[] = [{ h: startH, v: startV }];
        const localVisited = new Set<string>();
        
        const startKey = `${startH},${startV}`;
        localVisited.add(startKey);
        globalVisited.add(startKey);
        
        while (queue.length > 0) {
            const current = queue.shift()!;
            const tile = this.getTile(current.h, current.v);
            
            if (tile) {
                component.push(tile);
                
                // 检查四个方向的邻居
                const neighbors = [
                    { h: current.h + 1, v: current.v },
                    { h: current.h - 1, v: current.v },
                    { h: current.h, v: current.v + 1 },
                    { h: current.h, v: current.v - 1 }
                ];
                
                for (const neighbor of neighbors) {
                    const neighborKey = `${neighbor.h},${neighbor.v}`;
                    
                    if (!localVisited.has(neighborKey) && this.isValidPosition(neighbor.h, neighbor.v)) {
                        const neighborTile = this.getTile(neighbor.h, neighbor.v);
                        
                        if (neighborTile && neighborTile.type === tileType) {
                            localVisited.add(neighborKey);
                            globalVisited.add(neighborKey);
                            queue.push(neighbor);
                        }
                    }
                }
            }
        }
        
        return component;
    }

    /**
     * 分析匹配模式 - 识别L/T形和直线形
     */
    private analyzeMatchPattern(tiles: gridCmpt[]): MatchResult | null {
        if (tiles.length < this.minMatchSize) return null;
        
        // 按位置排序便于分析
        tiles.sort((a, b) => {
            if (a.h !== b.h) return a.h - b.h;
            return a.v - b.v;
        });
        
        // 检查是否为直线形（水平或垂直）
        const isHorizontalLine = tiles.every(tile => tile.v === tiles[0].v);
        const isVerticalLine = tiles.every(tile => tile.h === tiles[0].h);
        
        if (isHorizontalLine) {
            return {
                tiles,
                matchType: 'horizontal'
            };
        }
        
        if (isVerticalLine) {
            return {
                tiles,
                matchType: 'vertical'
            };
        }
        
        // 检查L/T/十字形 - 连通分量≥5且非纯直线即为特殊形状
        if (tiles.length >= 5) {
            const shapeType = this.detectSpecialShape(tiles);
            return {
                tiles,
                matchType: shapeType,
                center: this.findShapeCenter(tiles)
            };
        }
        
        return null;
    }

    /**
     * 检测特殊形状类型
     */
    private detectSpecialShape(tiles: gridCmpt[]): 'L' | 'T' | 'cross' {
        // 简化的形状检测 - 基于连通分量的分布特征
        const positions = tiles.map(tile => ({ h: tile.h, v: tile.v }));
        
        // 计算水平和垂直覆盖范围
        const hRange = Math.max(...positions.map(p => p.h)) - Math.min(...positions.map(p => p.h));
        const vRange = Math.max(...positions.map(p => p.v)) - Math.min(...positions.map(p => p.v));
        
        // 如果两个方向都有较大范围，可能是十字形或T形
        if (hRange >= 2 && vRange >= 2) {
            // 进一步判断是否有明显的交叉点
            const center = this.findShapeCenter(tiles);
            const crossConnections = positions.filter(p => 
                (p.h === center.h || p.v === center.v)
            ).length;
            
            if (crossConnections >= tiles.length * 0.7) {
                return 'cross';
            } else {
                return 'T';
            }
        }
        
        return 'L';
    }

    /**
     * 找到形状的中心点
     */
    private findShapeCenter(tiles: gridCmpt[]): { h: number; v: number } {
        const positions = tiles.map(tile => ({ h: tile.h, v: tile.v }));
        const avgH = Math.round(positions.reduce((sum, p) => sum + p.h, 0) / positions.length);
        const avgV = Math.round(positions.reduce((sum, p) => sum + p.v, 0) / positions.length);
        
        return { h: avgH, v: avgV };
    }

    private getTile(h: number, v: number): gridCmpt | null {
        if (!this.isValidPosition(h, v)) return null;
        return this.gridMap[h] && this.gridMap[h][v] ? this.gridMap[h][v] : null;
    }

    private isValidPosition(h: number, v: number): boolean {
        return h >= 0 && h < this.gridWidth && v >= 0 && v < this.gridHeight;
    }
}