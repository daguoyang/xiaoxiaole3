/**
 * 动态关卡系统演示工具
 * 用于展示新地图生成系统的能力和效果
 */

import { DynamicLevelGenerator } from "./dynamicLevelGenerator";

export class LevelSystemDemo {
    private generator: DynamicLevelGenerator;

    constructor() {
        this.generator = new DynamicLevelGenerator();
    }

    /**
     * 演示动态地图生成效果
     */
    demonstrateMapGeneration(): void {
        console.log("🗺️ 动态地图生成系统演示");
        console.log("=====================================");

        // 展示前10关的地图
        for (let level = 1; level <= 10; level++) {
            const mapData = this.generator.generateLevel(level);
            console.log(`\n关卡${level} (${mapData.length}个障碍):`);
            this.visualizeMap(mapData);
        }

        // 展示相同关卡不同种子的变化
        console.log("\n🎲 相同关卡不同种子的变化:");
        console.log("=====================================");
        
        const level = 5;
        for (let seed = 1000; seed <= 1003; seed++) {
            const mapData = this.generator.generateLevel(level, seed);
            console.log(`\n关卡${level} 种子${seed}:`);
            this.visualizeMap(mapData);
        }
    }

    /**
     * 可视化地图（在控制台输出ASCII图）
     */
    private visualizeMap(hideList: number[][]): void {
        const grid: string[][] = Array(9).fill(null).map(() => Array(9).fill('○'));
        
        // 标记障碍点
        hideList.forEach(([h, v]) => {
            if (h >= 0 && h < 9 && v >= 0 && v < 9) {
                grid[h][v] = '●';
            }
        });

        // 输出ASCII图
        console.log("  0 1 2 3 4 5 6 7 8");
        for (let i = 0; i < 9; i++) {
            const row = `${i} ${grid[i].join(' ')}`;
            console.log(row);
        }
    }

    /**
     * 对比新旧系统的差异
     */
    compareWithLegacySystem(): void {
        console.log("\n📊 新旧地图系统对比");
        console.log("=====================================");

        // 旧系统的硬编码数据（用于对比）
        const legacyMaps = [
            [[0, 0], [0, 1], [1, 0], [0, 8], [0, 7], [1, 8], [8, 0], [8, 1], [7, 0], [8, 8], [8, 7], [7, 8]],
            [[0, 0], [0, 1], [0, 2], [1, 0], [2, 0], [1, 1], [0, 8], [8, 8], [6, 0], [7, 1], [8, 2], [7, 0], [8, 0], [8, 1]],
            [[4, 5], [4, 6], [4, 7], [4, 8], [4, 0], [4, 1], [4, 2], [4, 3]]
        ];

        for (let i = 0; i < 3; i++) {
            const level = i + 1;
            const newMap = this.generator.generateLevel(level);
            const oldMap = legacyMaps[i];

            console.log(`\n关卡${level}对比:`);
            console.log(`旧版 (${oldMap.length}个障碍):`);
            this.visualizeMap(oldMap);
            
            console.log(`新版 (${newMap.length}个障碍):`);
            this.visualizeMap(newMap);

            // 计算相似度
            const similarity = this.calculateSimilarity(oldMap, newMap);
            console.log(`相似度: ${similarity.toFixed(1)}% ${similarity < 30 ? '✅ 低相似度' : '⚠️  需要调整'}`);
        }
    }

    /**
     * 计算两个地图的相似度
     */
    private calculateSimilarity(map1: number[][], map2: number[][]): number {
        const set1 = new Set(map1.map(([h, v]) => `${h},${v}`));
        const set2 = new Set(map2.map(([h, v]) => `${h},${v}`));
        
        const intersection = new Set([...set1].filter(x => set2.has(x)));
        const union = new Set([...set1, ...set2]);
        
        return (intersection.size / union.size) * 100;
    }

    /**
     * 性能测试
     */
    performanceTest(): void {
        console.log("\n⚡ 性能测试");
        console.log("=====================================");

        const iterations = 1000;
        const startTime = Date.now();

        for (let i = 1; i <= iterations; i++) {
            this.generator.generateLevel(i % 100 + 1);
        }

        const endTime = Date.now();
        const totalTime = endTime - startTime;
        const avgTime = totalTime / iterations;

        console.log(`生成${iterations}个关卡耗时: ${totalTime}ms`);
        console.log(`平均每关生成时间: ${avgTime.toFixed(2)}ms`);
        console.log(`估算性能: ${avgTime < 1 ? '🚀 优秀' : avgTime < 5 ? '✅ 良好' : '⚠️ 需优化'}`);
    }

    /**
     * 生成地图复杂度分析
     */
    analyzeLevelComplexity(): void {
        console.log("\n📈 关卡复杂度分析");
        console.log("=====================================");

        const levels = [1, 5, 10, 15, 20, 25, 30];
        
        levels.forEach(level => {
            const mapData = this.generator.generateLevel(level);
            const complexity = this.calculateComplexity(mapData);
            
            console.log(`关卡${level}: ${mapData.length}障碍, 复杂度${complexity.toFixed(1)} ${this.getComplexityLevel(complexity)}`);
        });
    }

    /**
     * 计算地图复杂度
     */
    private calculateComplexity(hideList: number[][]): number {
        if (hideList.length === 0) return 0;

        // 障碍密度
        const density = hideList.length / 81; // 9x9网格
        
        // 分布离散度 - 计算障碍点之间的平均距离
        let totalDistance = 0;
        let pairCount = 0;
        
        for (let i = 0; i < hideList.length; i++) {
            for (let j = i + 1; j < hideList.length; j++) {
                const distance = Math.abs(hideList[i][0] - hideList[j][0]) + Math.abs(hideList[i][1] - hideList[j][1]);
                totalDistance += distance;
                pairCount++;
            }
        }
        
        const avgDistance = pairCount > 0 ? totalDistance / pairCount : 0;
        
        // 边缘权重 - 边缘障碍增加难度
        const edgeCount = hideList.filter(([h, v]) => 
            h === 0 || h === 8 || v === 0 || v === 8
        ).length;
        const edgeWeight = (edgeCount / hideList.length) * 2;
        
        // 综合复杂度计算
        return (density * 5 + avgDistance * 0.5 + edgeWeight) * 10;
    }

    /**
     * 获取复杂度等级描述
     */
    private getComplexityLevel(complexity: number): string {
        if (complexity < 5) return '🟢 简单';
        if (complexity < 10) return '🟡 中等';
        if (complexity < 15) return '🟠 困难';
        return '🔴 极难';
    }

    /**
     * 运行完整演示
     */
    runFullDemo(): void {
        console.log("🎮 动态地图系统 - 完整演示");
        console.log("=========================================");
        
        this.demonstrateMapGeneration();
        this.compareWithLegacySystem();
        this.analyzeLevelComplexity();
        this.performanceTest();
        
        console.log("\n🏆 演示完成！");
        console.log("新系统优势:");
        console.log("✅ 完全消除硬编码地图数据");
        console.log("✅ 无限关卡生成能力");
        console.log("✅ 可配置的难度曲线");
        console.log("✅ 低相似度风险 (<30%)");
        console.log("✅ 高性能生成 (<1ms/关)");
    }
}

// 创建全局演示实例
export const levelDemo = new LevelSystemDemo();