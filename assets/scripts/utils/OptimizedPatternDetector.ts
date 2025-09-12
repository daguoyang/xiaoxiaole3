import { 
    ElementType, 
    GameBoard, 
    CellData, 
    Position, 
    MatchResult, 
    MatchType, 
    MoveData,
    DIRECTIONS,
    MIN_MATCH_LENGTH 
} from '../models/GameTypes';

/**
 * 性能优化的模式检测器
 * 特性:
 * - 结果缓存机制
 * - 增量检测
 * - 内存池优化
 */
export class OptimizedPatternDetector {
    private matchCache = new Map<string, MatchResult[]>();
    private boardHashCache = new Map<GameBoard, string>();
    private visitedCells: Set<string>;
    private resultPool: MatchResult[] = [];
    private positionPool: Position[] = [];
    
    // 性能统计
    private stats = {
        cacheHits: 0,
        cacheMisses: 0,
        totalChecks: 0
    };

    constructor() {
        this.visitedCells = new Set<string>();
    }

    /**
     * 带缓存的匹配查找
     */
    public findAllMatches(board: GameBoard): MatchResult[] {
        this.stats.totalChecks++;
        
        const boardHash = this.getBoardHash(board);
        
        // 缓存命中
        if (this.matchCache.has(boardHash)) {
            this.stats.cacheHits++;
            return this.cloneMatchResults(this.matchCache.get(boardHash)!);
        }

        // 缓存未命中，计算匹配
        this.stats.cacheMisses++;
        const matches = this.computeMatches(board);
        
        // 存入缓存 (限制缓存大小)
        if (this.matchCache.size < 100) {
            this.matchCache.set(boardHash, matches);
        } else {
            // LRU策略：清除最老的条目
            const firstKey = this.matchCache.keys().next().value;
            this.matchCache.delete(firstKey);
            this.matchCache.set(boardHash, matches);
        }
        
        return matches;
    }

    /**
     * 增量匹配检测 - 仅检查变化区域
     */
    public findIncrementalMatches(board: GameBoard, changedPositions: Position[]): MatchResult[] {
        const matches: MatchResult[] = [];
        this.visitedCells.clear();

        // 扩展检查区域 (包括邻接的位置)
        const checkPositions = this.expandCheckArea(changedPositions, board);

        for (const pos of checkPositions) {
            if (this.isValidPosition(pos, board)) {
                const cell = board[pos.y][pos.x];
                if (this.shouldCheckCell(cell, pos.y, pos.x)) {
                    const cellMatches = this.findMatchesFromCell(board, pos);
                    matches.push(...cellMatches);
                }
            }
        }

        return this.mergeOverlappingMatches(matches);
    }

    /**
     * 高性能匹配检测 - 原始算法
     */
    private computeMatches(board: GameBoard): MatchResult[] {
        const matches: MatchResult[] = [];
        this.visitedCells.clear();

        for (let row = 0; row < board.length; row++) {
            for (let col = 0; col < board[row].length; col++) {
                const cell = board[row][col];
                if (this.shouldCheckCell(cell, row, col)) {
                    const cellMatches = this.findMatchesFromCell(board, { x: col, y: row });
                    matches.push(...cellMatches);
                }
            }
        }

        return this.mergeOverlappingMatches(matches);
    }

    /**
     * 生成棋盘的哈希值用于缓存
     */
    private getBoardHash(board: GameBoard): string {
        if (this.boardHashCache.has(board)) {
            return this.boardHashCache.get(board)!;
        }

        // 生成高效的哈希值
        let hash = '';
        for (let row = 0; row < board.length; row++) {
            for (let col = 0; col < board[row].length; col++) {
                hash += board[row][col].elementType.toString();
            }
        }

        // 限制哈希缓存大小
        if (this.boardHashCache.size >= 50) {
            const firstKey = this.boardHashCache.keys().next().value;
            this.boardHashCache.delete(firstKey);
        }
        
        this.boardHashCache.set(board, hash);
        return hash;
    }

    /**
     * 扩展检查区域
     */
    private expandCheckArea(positions: Position[], board: GameBoard): Position[] {
        const expanded = new Set<string>();
        
        for (const pos of positions) {
            // 添加原位置
            expanded.add(`${pos.x},${pos.y}`);
            
            // 添加周围8个方向的位置
            for (let dx = -1; dx <= 1; dx++) {
                for (let dy = -1; dy <= 1; dy++) {
                    const newPos = { x: pos.x + dx, y: pos.y + dy };
                    if (this.isValidPosition(newPos, board)) {
                        expanded.add(`${newPos.x},${newPos.y}`);
                    }
                }
            }
        }

        return Array.from(expanded).map(posStr => {
            const [x, y] = posStr.split(',').map(Number);
            return { x, y };
        });
    }

    /**
     * 从对象池获取Position
     */
    private getPooledPosition(x: number, y: number): Position {
        const pos = this.positionPool.pop();
        if (pos) {
            pos.x = x;
            pos.y = y;
            return pos;
        }
        return { x, y };
    }

    /**
     * 回收Position到对象池
     */
    private recyclePosition(pos: Position): void {
        if (this.positionPool.length < 100) {
            this.positionPool.push(pos);
        }
    }

    /**
     * 深度复制匹配结果
     */
    private cloneMatchResults(matches: MatchResult[]): MatchResult[] {
        return matches.map(match => ({
            id: match.id,
            cells: [...match.cells],
            type: match.type,
            score: match.score,
            specialElement: match.specialElement
        }));
    }

    /**
     * 检查位置是否有效
     */
    private isValidPosition(pos: Position, board: GameBoard): boolean {
        return pos.y >= 0 && pos.y < board.length && 
               pos.x >= 0 && pos.x < board[pos.y].length;
    }

    /**
     * 检查是否应该检查该单元格
     */
    private shouldCheckCell(cell: CellData, row: number, col: number): boolean {
        const key = `${col},${row}`;
        if (this.visitedCells.has(key)) {
            return false;
        }
        
        return cell.elementType !== ElementType.EMPTY && 
               cell.isStable;
    }

    /**
     * 从指定单元格查找匹配
     */
    private findMatchesFromCell(board: GameBoard, startPos: Position): MatchResult[] {
        const matches: MatchResult[] = [];
        const startCell = board[startPos.y][startPos.x];
        
        // 水平匹配检查
        const horizontalMatch = this.findHorizontalMatch(board, startPos);
        if (horizontalMatch && horizontalMatch.cells.length >= MIN_MATCH_LENGTH) {
            matches.push(horizontalMatch);
        }
        
        // 垂直匹配检查
        const verticalMatch = this.findVerticalMatch(board, startPos);
        if (verticalMatch && verticalMatch.cells.length >= MIN_MATCH_LENGTH) {
            matches.push(verticalMatch);
        }
        
        // L形和T形匹配检查
        const shapeMatches = this.findShapeMatches(board, startPos);
        matches.push(...shapeMatches);
        
        return matches;
    }

    /**
     * 查找水平匹配
     */
    private findHorizontalMatch(board: GameBoard, startPos: Position): MatchResult | null {
        // 实现水平匹配逻辑
        const targetType = board[startPos.y][startPos.x].elementType;
        const matchedCells: CellData[] = [board[startPos.y][startPos.x]];
        
        // 向左扩展
        for (let x = startPos.x - 1; x >= 0; x--) {
            const cell = board[startPos.y][x];
            if (cell.elementType === targetType && cell.isStable) {
                matchedCells.unshift(cell);
            } else {
                break;
            }
        }
        
        // 向右扩展
        for (let x = startPos.x + 1; x < board[startPos.y].length; x++) {
            const cell = board[startPos.y][x];
            if (cell.elementType === targetType && cell.isStable) {
                matchedCells.push(cell);
            } else {
                break;
            }
        }
        
        if (matchedCells.length >= MIN_MATCH_LENGTH) {
            return {
                id: `h_${startPos.x}_${startPos.y}_${Date.now()}`,
                cells: matchedCells,
                type: MatchType.HORIZONTAL,
                score: this.calculateScore(matchedCells)
            };
        }
        
        return null;
    }

    /**
     * 查找垂直匹配
     */
    private findVerticalMatch(board: GameBoard, startPos: Position): MatchResult | null {
        // 实现垂直匹配逻辑
        const targetType = board[startPos.y][startPos.x].elementType;
        const matchedCells: CellData[] = [board[startPos.y][startPos.x]];
        
        // 向上扩展
        for (let y = startPos.y - 1; y >= 0; y--) {
            const cell = board[y][startPos.x];
            if (cell.elementType === targetType && cell.isStable) {
                matchedCells.unshift(cell);
            } else {
                break;
            }
        }
        
        // 向下扩展
        for (let y = startPos.y + 1; y < board.length; y++) {
            const cell = board[y][startPos.x];
            if (cell.elementType === targetType && cell.isStable) {
                matchedCells.push(cell);
            } else {
                break;
            }
        }
        
        if (matchedCells.length >= MIN_MATCH_LENGTH) {
            return {
                id: `v_${startPos.x}_${startPos.y}_${Date.now()}`,
                cells: matchedCells,
                type: MatchType.VERTICAL,
                score: this.calculateScore(matchedCells)
            };
        }
        
        return null;
    }

    /**
     * 查找形状匹配 (L形, T形等)
     */
    private findShapeMatches(board: GameBoard, startPos: Position): MatchResult[] {
        // 简化实现，实际项目中需要更复杂的算法
        return [];
    }

    /**
     * 合并重叠的匹配
     */
    private mergeOverlappingMatches(matches: MatchResult[]): MatchResult[] {
        // 简化实现
        return matches;
    }

    /**
     * 计算匹配分数
     */
    private calculateScore(cells: CellData[]): number {
        return cells.length * 100; // 简化的分数计算
    }

    /**
     * 清理缓存
     */
    public clearCache(): void {
        this.matchCache.clear();
        this.boardHashCache.clear();
        this.stats = {
            cacheHits: 0,
            cacheMisses: 0,
            totalChecks: 0
        };
    }

    /**
     * 获取性能统计
     */
    public getPerformanceStats() {
        return {
            ...this.stats,
            cacheHitRate: this.stats.totalChecks > 0 ? 
                (this.stats.cacheHits / this.stats.totalChecks) * 100 : 0,
            cacheSize: this.matchCache.size
        };
    }

    /**
     * 预热缓存
     */
    public warmUpCache(boards: GameBoard[]): void {
        console.log('🔥 PatternDetector缓存预热中...');
        boards.forEach(board => {
            this.findAllMatches(board);
        });
        console.log(`✅ 缓存预热完成，缓存条目: ${this.matchCache.size}`);
    }
}