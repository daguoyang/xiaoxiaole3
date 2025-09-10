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
            constraints: { minHoles: 2, maxHoles: 6, minConnectedRegions: 1, maxConnectedRegions: 2 }
        },
        {
            name: 'cross_pattern',
            difficulty: 2,
            patterns: [
                { type: 'cross', weight: 0.8, params: { thickness: 1, centerSize: 3 } },
                { type: 'scattered', weight: 0.2, params: { density: 0.05 } }
            ],
            constraints: { minHoles: 4, maxHoles: 10, minConnectedRegions: 1, maxConnectedRegions: 3 }
        },
        {
            name: 'spiral_challenge',
            difficulty: 3,
            patterns: [
                { type: 'spiral', weight: 0.6, params: { turns: 2, startRadius: 1 } },
                { type: 'diamond', weight: 0.4, params: { size: 2 } }
            ],
            constraints: { minHoles: 6, maxHoles: 15, minConnectedRegions: 2, maxConnectedRegions: 4 }
        },
        {
            name: 'wave_formation',
            difficulty: 4,
            patterns: [
                { type: 'wave', weight: 0.7, params: { amplitude: 2, frequency: 1.5 } },
                { type: 'border', weight: 0.3, params: { thickness: 1, corners: false } }
            ],
            constraints: { minHoles: 8, maxHoles: 18, minConnectedRegions: 2, maxConnectedRegions: 5 }
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
        
        // 防御性检查，确保模板存在
        if (!template) {
            console.warn(`⚠️ 关卡${level}模板不存在(索引${templateIndex})，使用默认模板`);
            const fallbackTemplate = this.levelTemplates[0]; // 使用第一个模板作为后备
            return this.generateWithTemplate(fallbackTemplate, level);
        }
        
        console.log(`生成动态关卡: 第${level}关，使用模板"${template.name}"，种子${this.seed}`);
        
        // 生成基础地图
        const holeMap = this.generateBaseMap(template);
        
        // 应用约束验证和调整
        const validatedMap = this.validateAndAdjust(holeMap, template.constraints);
        
        // 转换为游戏需要的格式
        return this.convertToGameFormat(validatedMap);
    }

    /**
     * 使用指定模板生成关卡
     */
    private generateWithTemplate(template: LevelTemplate, level: number): number[][] {
        console.log(`使用模板"${template.name}"生成第${level}关`);
        
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
        const rawSeed = Math.sin(level * 12.9898 + 78.233) * 43758.5453;
        // 确保种子为正数
        return Math.abs(Math.floor(rawSeed % 1000000));
    }

    /**
     * 选择关卡模板 - 新的阶段划分
     */
    private selectTemplate(level: number): number {
        const maxTemplates = this.levelTemplates.length;
        console.log(`📋 选择模板: 关卡${level}, 可用模板数${maxTemplates}`);
        
        if (maxTemplates === 0) {
            console.error('❌ 没有可用的关卡模板！');
            return 0;
        }
        
        let selectedIndex = 0;
        let templateName = '';
        
        // 新的阶段划分
        if (level <= 50) {
            selectedIndex = 0; // corner_focus (1-50关)
            templateName = 'corner_focus';
        } else if (level <= 500) {
            selectedIndex = 1; // cross_pattern (51-500关)
            templateName = 'cross_pattern';
        } else if (level <= 1000) {
            selectedIndex = 2; // spiral_challenge (501-1000关)
            templateName = 'spiral_challenge';
        } else {
            selectedIndex = 3; // wave_formation (1000+关)
            templateName = 'wave_formation';
        }
        
        // 确保索引不会越界
        selectedIndex = Math.min(selectedIndex, maxTemplates - 1);
        
        console.log(`🎯 选中模板索引: ${selectedIndex} (${templateName}) - 关卡${level}`);
        return selectedIndex;
    }

    /**
     * 生成基础地图
     */
    private generateBaseMap(template: LevelTemplate): boolean[][] {
        // 修复数组初始化问题 - 确保每行都是独立的数组
        const map: boolean[][] = [];
        for (let i = 0; i < this.gridHeight; i++) {
            map[i] = [];
            for (let j = 0; j < this.gridWidth; j++) {
                map[i][j] = false;
            }
        }

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

            // 确保边界检查
            if (h >= 0 && h < this.gridHeight && w >= 0 && w < this.gridWidth && map[h] && map[h][w] !== undefined) {
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
                // 确保边界检查
                if (h >= 0 && h < this.gridHeight && j >= 0 && j < this.gridWidth && map[h] && map[h][j] !== undefined) {
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
                    // 设置原始位置
                    if (i >= 0 && i < this.gridHeight && j >= 0 && j < this.gridWidth && map[i]) {
                        map[i][j] = true;
                    }
                    
                    // 水平镜像
                    if (axis === 'horizontal' || axis === 'both') {
                        const mirrorH = this.gridHeight - 1 - i;
                        if (mirrorH >= 0 && mirrorH < this.gridHeight && j >= 0 && j < this.gridWidth && map[mirrorH]) {
                            map[mirrorH][j] = true;
                        }
                    }
                    
                    // 垂直镜像
                    if (axis === 'vertical' || axis === 'both') {
                        const mirrorW = this.gridWidth - 1 - j;
                        if (i >= 0 && i < this.gridHeight && mirrorW >= 0 && mirrorW < this.gridWidth && map[i]) {
                            map[i][mirrorW] = true;
                        }
                    }
                    
                    // 对角镜像
                    if (axis === 'both') {
                        const mirrorH = this.gridHeight - 1 - i;
                        const mirrorW = this.gridWidth - 1 - j;
                        if (mirrorH >= 0 && mirrorH < this.gridHeight && mirrorW >= 0 && mirrorW < this.gridWidth && map[mirrorH]) {
                            map[mirrorH][mirrorW] = true;
                        }
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
            let attempts = 0;
            while (attempts < 10) { // 防止无限循环
                const h = Math.floor(this.seededRandom() * this.gridHeight);
                const w = Math.floor(this.seededRandom() * this.gridWidth);
                
                // 边界检查
                if (h >= 0 && h < this.gridHeight && w >= 0 && w < this.gridWidth) {
                    map[h][w] = true;
                    break;
                }
                attempts++;
            }
        }
    }

    /**
     * 验证和调整地图
     */
    private validateAndAdjust(map: boolean[][], constraints: LevelConstraints): boolean[][] {
        // 首先验证地图完整性
        if (!this.validateMapIntegrity(map)) {
            console.warn('⚠️ 地图完整性验证失败，重新生成基础地图');
            map = this.generateEmptyMap();
        }

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

        // 最终验证
        if (!this.validateMapIntegrity(map)) {
            console.warn('⚠️ 最终验证失败，使用安全的默认地图');
            return this.generateSafeDefaultMap();
        }

        return map;
    }

    /**
     * 验证地图完整性
     */
    private validateMapIntegrity(map: boolean[][]): boolean {
        if (!map || map.length !== this.gridHeight) {
            return false;
        }
        
        for (let i = 0; i < this.gridHeight; i++) {
            if (!map[i] || map[i].length !== this.gridWidth) {
                return false;
            }
            
            for (let j = 0; j < this.gridWidth; j++) {
                if (typeof map[i][j] !== 'boolean') {
                    return false;
                }
            }
        }
        
        return true;
    }

    /**
     * 生成空地图
     */
    private generateEmptyMap(): boolean[][] {
        const map: boolean[][] = [];
        for (let i = 0; i < this.gridHeight; i++) {
            map[i] = [];
            for (let j = 0; j < this.gridWidth; j++) {
                map[i][j] = false;
            }
        }
        return map;
    }

    /**
     * 生成安全的默认地图
     */
    private generateSafeDefaultMap(): boolean[][] {
        const map = this.generateEmptyMap();
        
        // 在边框放置一些洞，确保有基本的挑战性
        for (let i = 0; i < this.gridHeight; i++) {
            for (let j = 0; j < this.gridWidth; j++) {
                if (i === 0 || i === this.gridHeight - 1 || j === 0 || j === this.gridWidth - 1) {
                    if ((i + j) % 3 === 0) { // 每3个位置放一个洞
                        map[i][j] = true;
                    }
                }
            }
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
                
                // 边界检查和空位检查
                if (h >= 0 && h < this.gridHeight && w >= 0 && w < this.gridWidth && 
                    map[h] && map[h][w] !== undefined && !map[h][w]) {
                    map[h][w] = true;
                    break;
                }
                attempts++;
            }
        }
    }

    private removeRandomHoles(map: boolean[][], count: number): void {
        const holes: [number, number][] = [];
        
        // 安全地收集所有洞的位置
        for (let i = 0; i < this.gridHeight; i++) {
            if (map[i]) {
                for (let j = 0; j < this.gridWidth; j++) {
                    if (map[i][j] === true) {
                        holes.push([i, j]);
                    }
                }
            }
        }

        // 安全地移除洞
        for (let i = 0; i < count && holes.length > 0; i++) {
            const index = Math.floor(this.seededRandom() * holes.length);
            if (index >= 0 && index < holes.length) {
                const removed = holes.splice(index, 1);
                if (removed.length > 0) {
                    const [h, w] = removed[0];
                    if (h >= 0 && h < this.gridHeight && w >= 0 && w < this.gridWidth && map[h] && map[h][w] !== undefined) {
                        map[h][w] = false;
                    }
                }
            }
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

    /**
     * 测试关卡生成器是否正常工作
     */
    public testLevelGeneration(startLevel: number = 1, endLevel: number = 100): boolean {
        console.log(`🧪 开始测试关卡生成器 (${startLevel}-${endLevel})`);
        
        let successCount = 0;
        let failCount = 0;
        
        for (let level = startLevel; level <= endLevel; level++) {
            try {
                const result = this.generateLevel(level);
                
                if (!result || !Array.isArray(result)) {
                    console.error(`❌ 第${level}关生成失败：结果为空或非数组`);
                    failCount++;
                    continue;
                }
                
                // 验证结果格式
                let validResult = true;
                for (const hole of result) {
                    if (!Array.isArray(hole) || hole.length !== 2 || 
                        typeof hole[0] !== 'number' || typeof hole[1] !== 'number' ||
                        hole[0] < 0 || hole[0] >= this.gridHeight || 
                        hole[1] < 0 || hole[1] >= this.gridWidth) {
                        validResult = false;
                        break;
                    }
                }
                
                if (validResult) {
                    successCount++;
                    if (level % 10 === 0) {
                        console.log(`✅ 第${level}关生成成功，洞数量：${result.length}`);
                    }
                } else {
                    console.error(`❌ 第${level}关生成失败：结果格式不正确`);
                    failCount++;
                }
                
            } catch (error) {
                console.error(`❌ 第${level}关生成异常:`, error);
                failCount++;
            }
        }
        
        const total = endLevel - startLevel + 1;
        console.log(`📊 测试完成: ${successCount}/${total} 成功, ${failCount}/${total} 失败`);
        console.log(`📊 成功率: ${(successCount / total * 100).toFixed(2)}%`);
        
        return failCount === 0;
    }

    /**
     * 获取关卡生成器状态信息
     */
    public getGeneratorStatus(): { templateCount: number; gridSize: { width: number; height: number } } {
        return {
            templateCount: this.levelTemplates.length,
            gridSize: { width: this.gridWidth, height: this.gridHeight }
        };
    }

    /**
     * 重置关卡生成器到安全状态
     */
    public resetToSafeState(): void {
        console.log('🔄 重置关卡生成器到安全状态');
        this.gridWidth = 9;
        this.gridHeight = 9;
        this.seed = 12345; // 安全的默认种子
        
        // 确保至少有一个模板可用
        if (this.levelTemplates.length === 0) {
            console.warn('⚠️ 没有可用模板，添加默认模板');
            this.levelTemplates.push({
                name: 'emergency_default',
                difficulty: 1,
                patterns: [
                    { type: 'border', weight: 0.5, params: { thickness: 1, corners: false } }
                ],
                constraints: { minHoles: 5, maxHoles: 15, minConnectedRegions: 1, maxConnectedRegions: 3 }
            });
        }
    }
}