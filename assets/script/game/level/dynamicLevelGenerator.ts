/**
 * 动态关卡生成器 - 完全重写的地图生成算法
 * 目标：完全替代硬编码的defaultHidelist，降低相似度
 */

export interface LevelTemplate {
    name: string;
    difficulty: number;
    patterns: PatternRule[];
    constraints: LevelConstraints;
}

export interface PatternRule {
    type: 'symmetry' | 'spiral' | 'cross' | 'border' | 'scattered' | 'wave' | 'diamond';
    weight: number;
    params: any;
}

export interface LevelConstraints {
    minHoles: number;
    maxHoles: number;
    minConnectedRegions: number;
    maxConnectedRegions: number;
    centerKeepRadius?: number;
    avoidCorners?: boolean;
}

export class DynamicLevelGenerator {
    private gridWidth: number = 9;
    private gridHeight: number = 9;
    private seed: number = 0;
    
    // 预定义的关卡模板 - 替代硬编码数组
    private levelTemplates: LevelTemplate[] = [
        {
            name: 'corner_focus',
            difficulty: 1,
            patterns: [
                { type: 'border', weight: 0.7, params: { thickness: 2, corners: true } },
                { type: 'scattered', weight: 0.3, params: { density: 0.1 } }
            ],
            constraints: { minHoles: 8, maxHoles: 15, minConnectedRegions: 2, maxConnectedRegions: 4 }
        },
        {
            name: 'cross_pattern',
            difficulty: 2,
            patterns: [
                { type: 'cross', weight: 0.8, params: { thickness: 1, centerSize: 3 } },
                { type: 'scattered', weight: 0.2, params: { density: 0.05 } }
            ],
            constraints: { minHoles: 10, maxHoles: 20, minConnectedRegions: 1, maxConnectedRegions: 3 }
        },
        {
            name: 'spiral_challenge',
            difficulty: 3,
            patterns: [
                { type: 'spiral', weight: 0.6, params: { turns: 2, startRadius: 1 } },
                { type: 'diamond', weight: 0.4, params: { size: 2 } }
            ],
            constraints: { minHoles: 15, maxHoles: 25, minConnectedRegions: 2, maxConnectedRegions: 5 }
        },
        {
            name: 'wave_formation',
            difficulty: 4,
            patterns: [
                { type: 'wave', weight: 0.7, params: { amplitude: 2, frequency: 1.5 } },
                { type: 'border', weight: 0.3, params: { thickness: 1, corners: false } }
            ],
            constraints: { minHoles: 12, maxHoles: 22, minConnectedRegions: 3, maxConnectedRegions: 6 }
        },
        {
            name: 'symmetry_master',
            difficulty: 5,
            patterns: [
                { type: 'symmetry', weight: 0.8, params: { axis: 'both', complexity: 3 } },
                { type: 'scattered', weight: 0.2, params: { density: 0.08 } }
            ],
            constraints: { minHoles: 18, maxHoles: 30, minConnectedRegions: 4, maxConnectedRegions: 8 }
        }
    ];

    /**
     * 生成动态关卡 - 替代原有的defaultHidelist[level]
     */
    generateLevel(level: number, customSeed?: number): number[][] {
        this.seed = customSeed || this.createSeedFromLevel(level);
        
        // 选择关卡模板（基于等级的循环模式 + 随机变化）
        const templateIndex = this.selectTemplate(level);
        const template = this.levelTemplates[templateIndex];
        
        console.log(`生成关卡${level}：使用模板"${template.name}"，种子${this.seed}`);
        
        // 生成基础地图
        const holeMap = this.generateBaseMap(template);
        
        // 应用约束验证和调整
        const validatedMap = this.validateAndAdjust(holeMap, template.constraints);
        
        // 转换为游戏需要的格式
        return this.convertToGameFormat(validatedMap);
    }

    /**
     * 基于关卡号创建伪随机种子
     */
    private createSeedFromLevel(level: number): number {
        // 使用数学函数创建伪随机但可重现的种子
        return Math.floor(Math.sin(level * 12.9898 + 78.233) * 43758.5453 % 1000000);
    }

    /**
     * 选择关卡模板
     */
    private selectTemplate(level: number): number {
        // 前几关使用简单模板
        if (level <= 5) {
            return 0; // corner_focus
        } else if (level <= 15) {
            return (level - 6) % 2 + 1; // cross_pattern 或 spiral_challenge
        } else {
            // 高级关卡使用复杂模板 + 随机变化
            const random = this.seededRandom();
            return Math.floor(random * this.levelTemplates.length);
        }
    }

    /**
     * 生成基础地图
     */
    private generateBaseMap(template: LevelTemplate): boolean[][] {
        const map: boolean[][] = Array(this.gridHeight).fill(null).map(() => 
            Array(this.gridWidth).fill(false)
        );

        // 应用所有模式规则
        for (const pattern of template.patterns) {
            this.applyPattern(map, pattern);
        }

        return map;
    }

    /**
     * 应用特定模式
     */
    private applyPattern(map: boolean[][], pattern: PatternRule): void {
        const shouldApply = this.seededRandom() < pattern.weight;
        if (!shouldApply) return;

        switch (pattern.type) {
            case 'border':
                this.applyBorderPattern(map, pattern.params);
                break;
            case 'cross':
                this.applyCrossPattern(map, pattern.params);
                break;
            case 'spiral':
                this.applySpiralPattern(map, pattern.params);
                break;
            case 'wave':
                this.applyWavePattern(map, pattern.params);
                break;
            case 'diamond':
                this.applyDiamondPattern(map, pattern.params);
                break;
            case 'symmetry':
                this.applySymmetryPattern(map, pattern.params);
                break;
            case 'scattered':
                this.applyScatteredPattern(map, pattern.params);
                break;
        }
    }

    /**
     * 边框模式
     */
    private applyBorderPattern(map: boolean[][], params: any): void {
        const thickness = params.thickness || 1;
        const corners = params.corners !== false;

        for (let i = 0; i < this.gridHeight; i++) {
            for (let j = 0; j < this.gridWidth; j++) {
                const isTopBorder = i < thickness;
                const isBottomBorder = i >= this.gridHeight - thickness;
                const isLeftBorder = j < thickness;
                const isRightBorder = j >= this.gridWidth - thickness;

                if (corners) {
                    if ((isTopBorder || isBottomBorder) && (isLeftBorder || isRightBorder)) {
                        map[i][j] = true;
                    }
                } else {
                    if (isTopBorder || isBottomBorder || isLeftBorder || isRightBorder) {
                        if (this.seededRandom() < 0.7) {
                            map[i][j] = true;
                        }
                    }
                }
            }
        }
    }

    /**
     * 十字模式
     */
    private applyCrossPattern(map: boolean[][], params: any): void {
        const thickness = params.thickness || 1;
        const centerH = Math.floor(this.gridHeight / 2);
        const centerW = Math.floor(this.gridWidth / 2);

        // 垂直线
        for (let i = 0; i < this.gridHeight; i++) {
            for (let j = centerW - thickness; j <= centerW + thickness; j++) {
                if (j >= 0 && j < this.gridWidth) {
                    map[i][j] = true;
                }
            }
        }

        // 水平线
        for (let j = 0; j < this.gridWidth; j++) {
            for (let i = centerH - thickness; i <= centerH + thickness; i++) {
                if (i >= 0 && i < this.gridHeight) {
                    map[i][j] = true;
                }
            }
        }
    }

    /**
     * 螺旋模式
     */
    private applySpiralPattern(map: boolean[][], params: any): void {
        const turns = params.turns || 2;
        const startRadius = params.startRadius || 1;
        const centerH = Math.floor(this.gridHeight / 2);
        const centerW = Math.floor(this.gridWidth / 2);

        for (let angle = 0; angle < turns * 2 * Math.PI; angle += 0.2) {
            const radius = startRadius + (angle / (2 * Math.PI)) * 2;
            const h = Math.floor(centerH + radius * Math.sin(angle));
            const w = Math.floor(centerW + radius * Math.cos(angle));

            if (h >= 0 && h < this.gridHeight && w >= 0 && w < this.gridWidth) {
                map[h][w] = true;
            }
        }
    }

    /**
     * 波浪模式
     */
    private applyWavePattern(map: boolean[][], params: any): void {
        const amplitude = params.amplitude || 2;
        const frequency = params.frequency || 1;

        for (let j = 0; j < this.gridWidth; j++) {
            const waveHeight = Math.floor(amplitude * Math.sin(j * frequency * Math.PI / this.gridWidth));
            const baseH = Math.floor(this.gridHeight / 2) + waveHeight;

            for (let offset = -1; offset <= 1; offset++) {
                const h = baseH + offset;
                if (h >= 0 && h < this.gridHeight) {
                    map[h][j] = true;
                }
            }
        }
    }

    /**
     * 钻石模式
     */
    private applyDiamondPattern(map: boolean[][], params: any): void {
        const size = params.size || 2;
        const centerH = Math.floor(this.gridHeight / 2);
        const centerW = Math.floor(this.gridWidth / 2);

        for (let i = 0; i < this.gridHeight; i++) {
            for (let j = 0; j < this.gridWidth; j++) {
                const distance = Math.abs(i - centerH) + Math.abs(j - centerW);
                if (distance <= size) {
                    map[i][j] = true;
                }
            }
        }
    }

    /**
     * 对称模式
     */
    private applySymmetryPattern(map: boolean[][], params: any): void {
        const axis = params.axis || 'vertical'; // 'vertical', 'horizontal', 'both'
        const complexity = params.complexity || 2;

        // 在一半区域随机生成，然后镜像到另一半
        const halfH = Math.floor(this.gridHeight / 2);
        const halfW = Math.floor(this.gridWidth / 2);

        for (let i = 0; i < halfH; i++) {
            for (let j = 0; j < (axis === 'both' ? halfW : this.gridWidth); j++) {
                if (this.seededRandom() < complexity * 0.1) {
                    map[i][j] = true;
                    
                    if (axis === 'horizontal' || axis === 'both') {
                        map[this.gridHeight - 1 - i][j] = true;
                    }
                    if (axis === 'vertical' || axis === 'both') {
                        map[i][this.gridWidth - 1 - j] = true;
                    }
                    if (axis === 'both') {
                        map[this.gridHeight - 1 - i][this.gridWidth - 1 - j] = true;
                    }
                }
            }
        }
    }

    /**
     * 散点模式
     */
    private applyScatteredPattern(map: boolean[][], params: any): void {
        const density = params.density || 0.1;
        const totalCells = this.gridHeight * this.gridWidth;
        const targetHoles = Math.floor(totalCells * density);

        for (let count = 0; count < targetHoles; count++) {
            const h = Math.floor(this.seededRandom() * this.gridHeight);
            const w = Math.floor(this.seededRandom() * this.gridWidth);
            map[h][w] = true;
        }
    }

    /**
     * 验证和调整地图
     */
    private validateAndAdjust(map: boolean[][], constraints: LevelConstraints): boolean[][] {
        const holeCount = this.countHoles(map);
        
        // 如果洞太少，添加一些
        if (holeCount < constraints.minHoles) {
            this.addRandomHoles(map, constraints.minHoles - holeCount);
        }
        
        // 如果洞太多，移除一些
        if (holeCount > constraints.maxHoles) {
            this.removeRandomHoles(map, holeCount - constraints.maxHoles);
        }

        // 确保中心区域的可玩性
        if (constraints.centerKeepRadius) {
            this.ensureCenterPlayable(map, constraints.centerKeepRadius);
        }

        return map;
    }

    /**
     * 转换为游戏格式
     */
    private convertToGameFormat(map: boolean[][]): number[][] {
        const result: number[][] = [];
        
        for (let i = 0; i < this.gridHeight; i++) {
            for (let j = 0; j < this.gridWidth; j++) {
                if (map[i][j]) {
                    result.push([i, j]);
                }
            }
        }
        
        return result;
    }

    // 辅助方法
    private seededRandom(): number {
        this.seed = (this.seed * 9301 + 49297) % 233280;
        return this.seed / 233280;
    }

    private countHoles(map: boolean[][]): number {
        let count = 0;
        for (let i = 0; i < this.gridHeight; i++) {
            for (let j = 0; j < this.gridWidth; j++) {
                if (map[i][j]) count++;
            }
        }
        return count;
    }

    private addRandomHoles(map: boolean[][], count: number): void {
        for (let i = 0; i < count; i++) {
            let attempts = 0;
            while (attempts < 50) {
                const h = Math.floor(this.seededRandom() * this.gridHeight);
                const w = Math.floor(this.seededRandom() * this.gridWidth);
                if (!map[h][w]) {
                    map[h][w] = true;
                    break;
                }
                attempts++;
            }
        }
    }

    private removeRandomHoles(map: boolean[][], count: number): void {
        const holes: [number, number][] = [];
        for (let i = 0; i < this.gridHeight; i++) {
            for (let j = 0; j < this.gridWidth; j++) {
                if (map[i][j]) {
                    holes.push([i, j]);
                }
            }
        }

        for (let i = 0; i < count && holes.length > 0; i++) {
            const index = Math.floor(this.seededRandom() * holes.length);
            const [h, w] = holes.splice(index, 1)[0];
            map[h][w] = false;
        }
    }

    private ensureCenterPlayable(map: boolean[][], radius: number): void {
        const centerH = Math.floor(this.gridHeight / 2);
        const centerW = Math.floor(this.gridWidth / 2);

        for (let i = centerH - radius; i <= centerH + radius; i++) {
            for (let j = centerW - radius; j <= centerW + radius; j++) {
                if (i >= 0 && i < this.gridHeight && j >= 0 && j < this.gridWidth) {
                    map[i][j] = false; // 确保中心可玩
                }
            }
        }
    }
}