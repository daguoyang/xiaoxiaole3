import { director, game } from 'cc';

/**
 * 性能监控器
 * 监控游戏运行时的性能指标
 */
export class PerformanceMonitor {
    private static _instance: PerformanceMonitor | null = null;
    
    private frameCount: number = 0;
    private lastFrameTime: number = 0;
    private frameRateHistory: number[] = [];
    private memoryHistory: number[] = [];
    private isMonitoring: boolean = false;
    
    private metrics = {
        fps: 60,
        avgFps: 60,
        minFps: 60,
        maxFps: 60,
        frameTime: 16.67,
        memoryUsage: 0,
        drawCalls: 0,
        activeNodes: 0,
        lagSpikes: 0
    };

    private thresholds = {
        lowFps: 30,
        highFrameTime: 33.33, // 30 FPS
        memoryWarning: 150 * 1024 * 1024, // 150MB
        lagSpikeThreshold: 100 // ms
    };

    private constructor() {
        this.bindEvents();
    }

    public static getInstance(): PerformanceMonitor {
        if (!PerformanceMonitor._instance) {
            PerformanceMonitor._instance = new PerformanceMonitor();
        }
        return PerformanceMonitor._instance;
    }

    /**
     * 开始性能监控
     */
    public startMonitoring(): void {
        if (this.isMonitoring) return;
        
        console.log('📊 性能监控已启动');
        this.isMonitoring = true;
        this.lastFrameTime = Date.now();
        
        // 启动监控循环
        this.scheduleUpdate();
    }

    /**
     * 停止性能监控
     */
    public stopMonitoring(): void {
        this.isMonitoring = false;
        console.log('⏹ 性能监控已停止');
    }

    /**
     * 更新性能指标
     */
    private update(): void {
        if (!this.isMonitoring) return;

        const currentTime = Date.now();
        const deltaTime = currentTime - this.lastFrameTime;
        
        // 更新帧率
        this.updateFrameRate(deltaTime);
        
        // 更新内存使用
        this.updateMemoryUsage();
        
        // 检测性能问题
        this.checkPerformanceIssues(deltaTime);
        
        this.lastFrameTime = currentTime;
        this.frameCount++;
    }

    /**
     * 更新帧率统计
     */
    private updateFrameRate(deltaTime: number): void {
        if (deltaTime > 0) {
            this.metrics.fps = 1000 / deltaTime;
            this.metrics.frameTime = deltaTime;
            
            // 记录帧率历史
            this.frameRateHistory.push(this.metrics.fps);
            if (this.frameRateHistory.length > 100) {
                this.frameRateHistory.shift();
            }
            
            // 计算统计值
            this.calculateFrameRateStats();
        }
    }

    /**
     * 计算帧率统计
     */
    private calculateFrameRateStats(): void {
        if (this.frameRateHistory.length === 0) return;
        
        const sum = this.frameRateHistory.reduce((a, b) => a + b, 0);
        this.metrics.avgFps = sum / this.frameRateHistory.length;
        this.metrics.minFps = Math.min(...this.frameRateHistory);
        this.metrics.maxFps = Math.max(...this.frameRateHistory);
    }

    /**
     * 更新内存使用统计
     */
    private updateMemoryUsage(): void {
        // 简化的内存使用估算
        if (typeof (performance as any)?.memory !== 'undefined') {
            this.metrics.memoryUsage = (performance as any).memory.usedJSHeapSize;
        } else {
            // Fallback估算
            this.metrics.memoryUsage = this.estimateMemoryUsage();
        }
        
        this.memoryHistory.push(this.metrics.memoryUsage);
        if (this.memoryHistory.length > 50) {
            this.memoryHistory.shift();
        }
    }

    /**
     * 估算内存使用
     */
    private estimateMemoryUsage(): number {
        // 基于节点数量和资源的简单估算
        const scene = director.getScene();
        if (scene) {
            this.metrics.activeNodes = this.countActiveNodes(scene);
            return this.metrics.activeNodes * 1024 * 10; // 每个节点约10KB
        }
        return 0;
    }

    /**
     * 计算活跃节点数量
     */
    private countActiveNodes(node: any): number {
        let count = node.active ? 1 : 0;
        if (node.children) {
            for (const child of node.children) {
                count += this.countActiveNodes(child);
            }
        }
        return count;
    }

    /**
     * 检查性能问题
     */
    private checkPerformanceIssues(deltaTime: number): void {
        // 检测卡顿峰值
        if (deltaTime > this.thresholds.lagSpikeThreshold) {
            this.metrics.lagSpikes++;
            console.warn(`🐌 检测到卡顿峰值: ${deltaTime.toFixed(2)}ms`);
            this.onPerformanceIssue('lag_spike', { deltaTime });
        }
        
        // 检测低帧率
        if (this.metrics.fps < this.thresholds.lowFps) {
            console.warn(`📉 低帧率警告: ${this.metrics.fps.toFixed(2)} FPS`);
            this.onPerformanceIssue('low_fps', { fps: this.metrics.fps });
        }
        
        // 检测内存过高
        if (this.metrics.memoryUsage > this.thresholds.memoryWarning) {
            console.warn(`🧠 内存使用过高: ${(this.metrics.memoryUsage / 1024 / 1024).toFixed(2)}MB`);
            this.onPerformanceIssue('high_memory', { memory: this.metrics.memoryUsage });
        }
    }

    /**
     * 性能问题处理
     */
    private onPerformanceIssue(type: string, data: any): void {
        // 可以在这里添加自动优化逻辑
        switch (type) {
            case 'lag_spike':
                // 可能的优化：暂停非关键动画
                break;
            case 'low_fps':
                // 可能的优化：降低特效质量
                break;
            case 'high_memory':
                // 可能的优化：触发垃圾回收
                this.suggestGarbageCollection();
                break;
        }
    }

    /**
     * 建议垃圾回收
     */
    private suggestGarbageCollection(): void {
        if (typeof window !== 'undefined' && (window as any).gc) {
            console.log('🗑 执行垃圾回收');
            (window as any).gc();
        }
    }

    /**
     * 绑定游戏事件
     */
    private bindEvents(): void {
        game.on(game.EVENT_PAUSE, this.onGamePause, this);
        game.on(game.EVENT_RESUME, this.onGameResume, this);
    }

    /**
     * 游戏暂停处理
     */
    private onGamePause(): void {
        console.log('⏸ 游戏暂停，性能监控暂停');
        this.isMonitoring = false;
    }

    /**
     * 游戏恢复处理
     */
    private onGameResume(): void {
        console.log('▶️ 游戏恢复，性能监控恢复');
        if (!this.isMonitoring) {
            this.startMonitoring();
        }
    }

    /**
     * 调度更新
     */
    private scheduleUpdate(): void {
        const updateLoop = () => {
            if (this.isMonitoring) {
                this.update();
                setTimeout(updateLoop, 1000); // 每秒更新一次
            }
        };
        updateLoop();
    }

    /**
     * 获取性能报告
     */
    public getPerformanceReport(): any {
        const memoryMB = (this.metrics.memoryUsage / 1024 / 1024).toFixed(2);
        
        return {
            ...this.metrics,
            memoryMB,
            frameRateStable: this.metrics.minFps > this.thresholds.lowFps,
            memoryHealthy: this.metrics.memoryUsage < this.thresholds.memoryWarning,
            overallHealth: this.calculateOverallHealth()
        };
    }

    /**
     * 计算整体健康度
     */
    private calculateOverallHealth(): string {
        let score = 100;
        
        if (this.metrics.avgFps < 45) score -= 20;
        if (this.metrics.minFps < 30) score -= 20;
        if (this.metrics.memoryUsage > this.thresholds.memoryWarning) score -= 20;
        if (this.metrics.lagSpikes > 5) score -= 10;
        
        if (score >= 90) return '优秀';
        if (score >= 70) return '良好';
        if (score >= 50) return '一般';
        return '需要优化';
    }

    /**
     * 生成性能诊断建议
     */
    public getDiagnosticAdvice(): string[] {
        const advice: string[] = [];
        
        if (this.metrics.avgFps < 45) {
            advice.push('建议降低特效质量以提升帧率');
        }
        
        if (this.metrics.memoryUsage > this.thresholds.memoryWarning) {
            advice.push('内存使用过高，建议清理资源缓存');
        }
        
        if (this.metrics.lagSpikes > 5) {
            advice.push('存在较多卡顿峰值，建议优化主线程逻辑');
        }
        
        if (this.metrics.activeNodes > 1000) {
            advice.push('节点数量较多，建议使用对象池优化');
        }
        
        if (advice.length === 0) {
            advice.push('性能表现良好，继续保持!');
        }
        
        return advice;
    }

    /**
     * 配置性能阈值
     */
    public configureThresholds(config: Partial<typeof this.thresholds>): void {
        Object.assign(this.thresholds, config);
        console.log('⚙️ 性能阈值已更新', this.thresholds);
    }

    /**
     * 重置统计数据
     */
    public resetStats(): void {
        this.frameRateHistory = [];
        this.memoryHistory = [];
        this.frameCount = 0;
        this.metrics.lagSpikes = 0;
        console.log('🔄 性能统计已重置');
    }

    /**
     * 销毁监控器
     */
    public dispose(): void {
        this.stopMonitoring();
        game.off(game.EVENT_PAUSE, this.onGamePause, this);
        game.off(game.EVENT_RESUME, this.onGameResume, this);
        PerformanceMonitor._instance = null;
    }
}