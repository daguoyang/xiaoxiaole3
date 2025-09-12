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

export class PatternDetector {
    private visitedCells: Set<string>;

    constructor() {
        this.visitedCells = new Set<string>();
    }

    public findAllMatches(board: GameBoard): MatchResult[] {
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

    public findConnectedCells(startPos: Position, board: GameBoard): CellData[] {
        const visited = new Set<string>();
        const queue: Position[] = [startPos];
        const connectedCells: CellData[] = [];
        
        if (!this.isValidPosition(startPos, board)) {
            return connectedCells;
        }

        const targetType = board[startPos.y][startPos.x].elementType;
        
        if (targetType === ElementType.EMPTY) {
            return connectedCells;
        }

        while (queue.length > 0) {
            const pos = queue.shift()!;
            const key = `${pos.x},${pos.y}`;
            
            if (visited.has(key)) continue;
            visited.add(key);
            
            const cell = board[pos.y][pos.x];
            if (cell.elementType === targetType) {
                connectedCells.push(cell);
                
                // 添加相邻位置到队列
                for (const dir of DIRECTIONS) {
                    const newPos: Position = {
                        x: pos.x + dir.x,
                        y: pos.y + dir.y
                    };
                    
                    if (this.isValidPosition(newPos, board) && !visited.has(`${newPos.x},${newPos.y}`)) {
                        queue.push(newPos);
                    }
                }
            }
        }

        return connectedCells;
    }

    public findPossibleMoves(board: GameBoard): MoveData[] {
        const possibleMoves: MoveData[] = [];

        for (let row = 0; row < board.length; row++) {
            for (let col = 0; col < board[row].length; col++) {
                const currentPos: Position = { x: col, y: row };
                
                // 检查每个方向的交换
                for (const dir of DIRECTIONS) {
                    const adjacentPos: Position = {
                        x: col + dir.x,
                        y: row + dir.y
                    };

                    if (this.isValidPosition(adjacentPos, board)) {
                        const moveData = this.evaluateSwap(board, currentPos, adjacentPos);
                        if (moveData.isValid) {
                            possibleMoves.push(moveData);
                        }
                    }
                }
            }
        }

        return possibleMoves;
    }

    private findMatchesFromCell(board: GameBoard, startPos: Position): MatchResult[] {
        const matches: MatchResult[] = [];
        const cell = board[startPos.y][startPos.x];
        
        // 水平匹配检测
        const horizontalCells = this.findHorizontalMatch(board, startPos);
        if (horizontalCells.length >= MIN_MATCH_LENGTH) {
            matches.push(this.createMatchResult(horizontalCells, MatchType.HORIZONTAL));
        }

        // 垂直匹配检测
        const verticalCells = this.findVerticalMatch(board, startPos);
        if (verticalCells.length >= MIN_MATCH_LENGTH) {
            matches.push(this.createMatchResult(verticalCells, MatchType.VERTICAL));
        }

        // 形状匹配检测（L、T、十字形）
        const shapeMatches = this.findShapeMatches(board, startPos);
        matches.push(...shapeMatches);

        return matches;
    }

    private findHorizontalMatch(board: GameBoard, startPos: Position): CellData[] {
        const cells: CellData[] = [];
        const targetType = board[startPos.y][startPos.x].elementType;
        
        // 向左扫描
        for (let col = startPos.x; col >= 0; col--) {
            const cell = board[startPos.y][col];
            if (cell.elementType === targetType) {
                cells.unshift(cell);
            } else {
                break;
            }
        }

        // 向右扫描（跳过起始位置）
        for (let col = startPos.x + 1; col < board[startPos.y].length; col++) {
            const cell = board[startPos.y][col];
            if (cell.elementType === targetType) {
                cells.push(cell);
            } else {
                break;
            }
        }

        return cells;
    }

    private findVerticalMatch(board: GameBoard, startPos: Position): CellData[] {
        const cells: CellData[] = [];
        const targetType = board[startPos.y][startPos.x].elementType;
        
        // 向上扫描
        for (let row = startPos.y; row >= 0; row--) {
            const cell = board[row][startPos.x];
            if (cell.elementType === targetType) {
                cells.unshift(cell);
            } else {
                break;
            }
        }

        // 向下扫描（跳过起始位置）
        for (let row = startPos.y + 1; row < board.length; row++) {
            const cell = board[row][startPos.x];
            if (cell.elementType === targetType) {
                cells.push(cell);
            } else {
                break;
            }
        }

        return cells;
    }

    private findShapeMatches(board: GameBoard, startPos: Position): MatchResult[] {
        const matches: MatchResult[] = [];
        const horizontalCells = this.findHorizontalMatch(board, startPos);
        const verticalCells = this.findVerticalMatch(board, startPos);

        // L型匹配
        if (horizontalCells.length >= MIN_MATCH_LENGTH && verticalCells.length >= MIN_MATCH_LENGTH) {
            // 找到交叉点，创建L型或T型匹配
            const allCells = [...new Set([...horizontalCells, ...verticalCells])];
            
            if (allCells.length >= 5) {
                matches.push(this.createMatchResult(allCells, MatchType.CROSS));
            } else if (this.isLShapeMatch(horizontalCells, verticalCells, startPos)) {
                matches.push(this.createMatchResult(allCells, MatchType.L_SHAPE));
            } else if (this.isTShapeMatch(horizontalCells, verticalCells, startPos)) {
                matches.push(this.createMatchResult(allCells, MatchType.T_SHAPE));
            }
        }

        return matches;
    }

    private isLShapeMatch(horizontal: CellData[], vertical: CellData[], center: Position): boolean {
        // L型：一条线的端点是另一条线的端点
        const hStart = horizontal[0].position;
        const hEnd = horizontal[horizontal.length - 1].position;
        const vStart = vertical[0].position;
        const vEnd = vertical[vertical.length - 1].position;

        return (
            (hStart.x === center.x && hStart.y === center.y) ||
            (hEnd.x === center.x && hEnd.y === center.y) ||
            (vStart.x === center.x && vStart.y === center.y) ||
            (vEnd.x === center.x && vEnd.y === center.y)
        );
    }

    private isTShapeMatch(horizontal: CellData[], vertical: CellData[], center: Position): boolean {
        // T型：中心点在两条线的中间
        const hMiddle = Math.floor(horizontal.length / 2);
        const vMiddle = Math.floor(vertical.length / 2);

        return (
            horizontal[hMiddle].position.x === center.x && horizontal[hMiddle].position.y === center.y &&
            vertical[vMiddle].position.x === center.x && vertical[vMiddle].position.y === center.y
        );
    }

    private evaluateSwap(board: GameBoard, pos1: Position, pos2: Position): MoveData {
        // 创建测试棋盘
        const testBoard = this.cloneBoard(board);
        
        // 执行交换
        const cell1 = testBoard[pos1.y][pos1.x];
        const cell2 = testBoard[pos2.y][pos2.x];
        
        testBoard[pos1.y][pos1.x] = { ...cell2, position: pos1 };
        testBoard[pos2.y][pos2.x] = { ...cell1, position: pos2 };

        // 检查是否产生匹配
        const matches1 = this.findMatchesFromCell(testBoard, pos1);
        const matches2 = this.findMatchesFromCell(testBoard, pos2);
        const allMatches = [...matches1, ...matches2];

        return {
            from: pos1,
            to: pos2,
            expectedMatches: allMatches,
            isValid: allMatches.length > 0
        };
    }

    private createMatchResult(cells: CellData[], type: MatchType): MatchResult {
        const score = this.calculateMatchScore(cells, type);
        const specialElement = this.determineSpecialElement(cells, type);
        
        return {
            id: `match_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            cells: cells,
            type: type,
            score: score,
            specialElement: specialElement
        };
    }

    private calculateMatchScore(cells: CellData[], type: MatchType): number {
        const baseScore = cells.length * 100;
        const typeMultiplier = {
            [MatchType.HORIZONTAL]: 1.0,
            [MatchType.VERTICAL]: 1.0,
            [MatchType.L_SHAPE]: 1.5,
            [MatchType.T_SHAPE]: 2.0,
            [MatchType.CROSS]: 3.0,
            [MatchType.SQUARE]: 2.5
        }[type] || 1.0;

        return Math.floor(baseScore * typeMultiplier);
    }

    private determineSpecialElement(cells: CellData[], type: MatchType): ElementType | undefined {
        if (cells.length >= 5) {
            return ElementType.COLOR_BOMB;
        } else if (type === MatchType.T_SHAPE || type === MatchType.L_SHAPE) {
            return ElementType.BOMB;
        } else if (cells.length === 4) {
            return type === MatchType.HORIZONTAL ? ElementType.ROW_CLEAR : ElementType.COL_CLEAR;
        }
        return undefined;
    }

    private mergeOverlappingMatches(matches: MatchResult[]): MatchResult[] {
        // 合并重叠的匹配结果
        const merged: MatchResult[] = [];
        const processedIds = new Set<string>();

        for (const match of matches) {
            if (processedIds.has(match.id)) continue;
            
            let currentMatch = match;
            processedIds.add(match.id);

            // 查找重叠的匹配
            for (const otherMatch of matches) {
                if (processedIds.has(otherMatch.id)) continue;
                
                if (this.hasOverlap(currentMatch.cells, otherMatch.cells)) {
                    currentMatch = this.mergeMatches(currentMatch, otherMatch);
                    processedIds.add(otherMatch.id);
                }
            }

            merged.push(currentMatch);
        }

        return merged;
    }

    private hasOverlap(cells1: CellData[], cells2: CellData[]): boolean {
        const ids1 = new Set(cells1.map(cell => cell.id));
        return cells2.some(cell => ids1.has(cell.id));
    }

    private mergeMatches(match1: MatchResult, match2: MatchResult): MatchResult {
        const allCells = [...match1.cells];
        const existingIds = new Set(match1.cells.map(cell => cell.id));

        for (const cell of match2.cells) {
            if (!existingIds.has(cell.id)) {
                allCells.push(cell);
            }
        }

        return {
            id: `merged_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            cells: allCells,
            type: allCells.length >= 5 ? MatchType.CROSS : match1.type,
            score: match1.score + match2.score,
            specialElement: this.determineSpecialElement(allCells, MatchType.CROSS)
        };
    }

    private shouldCheckCell(cell: CellData, row: number, col: number): boolean {
        const key = `${col},${row}`;
        if (this.visitedCells.has(key)) return false;
        if (cell.elementType === ElementType.EMPTY) return false;
        
        this.visitedCells.add(key);
        return true;
    }

    private isValidPosition(pos: Position, board: GameBoard): boolean {
        return pos.x >= 0 && pos.x < board[0].length && 
               pos.y >= 0 && pos.y < board.length;
    }

    private cloneBoard(board: GameBoard): GameBoard {
        return board.map(row => row.map(cell => ({ ...cell })));
    }

    public dispose(): void {
        this.visitedCells.clear();
    }
}