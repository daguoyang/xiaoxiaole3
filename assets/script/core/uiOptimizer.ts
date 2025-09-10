import { Node, director, Component, TweenAction, sys, tween, Tween, view } from 'cc';

/**
 * UI性能优化管理器
 * 统一管理UI系统的性能优化策略
 */
export class UIOptimizer {
    private static instance: UIOptimizer;
    
    // 性能监控
    private currentFPS: number = 60;
    private lastFrameTime: number = 0;
    private frameCount: number = 0;
    
    // 资源管理
    private preloadedAssets: Map<string, any> = new Map();
    private loadingPromises: Map<string, Promise<any>> = new Map();
    
    // 动画管理
    private runningAnimations: Set<TweenAction> = new Set();
    private animationQuality: 'high' | 'medium' | 'low' = 'high';
    private animationQueue: Array<{node: Node, animation: Function}> = [];
    private isProcessingAnimations: boolean = false;
    
    // 事件管理
    private clickThrottleMap: Map<Node, number> = new Map();
    private eventListeners: WeakMap<Node, Function[]> = new WeakMap();
    private eventPool: Set<Function> = new Set();
    
    // 渲染优化
    private renderQueue: Set<Node> = new Set();
    private isRendering: boolean = false;
    private cullingBounds: {x: number, y: number, width: number, height: number} = {x: 0, y: 0, width: 0, height: 0};
    private renderBatchSize: number = 10;
    
    public static getInstance(): UIOptimizer {
        if (!UIOptimizer.instance) {
            UIOptimizer.instance = new UIOptimizer();
        }
        return UIOptimizer.instance;
    }
    
    private constructor() {
        this.init();
    }
    
    /**
     * 初始化优化器
     */
    private init() {
        try {
            console.log('🎨 UI优化器初始化...');
            
            // 根据设备性能调整初始质量
            this.adjustPerformanceLevel();
            
            // 延迟初始化需要游戏环境的功能
            setTimeout(() => {
                try {
                    // 启动FPS监控
                    this.startFPSMonitoring();
                    
                    // 初始化渲染边界
                    this.updateCullingBounds();
                } catch (error) {
                    console.warn('⚠️ UI优化器延迟初始化失败:', error);
                }
            }, 100);
            
            console.log(`📱 设备性能级别: ${this.getDevicePerformanceLevel()}`);
            console.log(`🎬 动画质量: ${this.animationQuality}`);
        } catch (error) {
            console.error('❌ UI优化器初始化失败:', error);
        }
    }
    
    /**
     * 获取设备性能级别
     */
    private getDevicePerformanceLevel(): 'high' | 'medium' | 'low' {
        const platform = sys.platform;
        const memory = sys.getNetworkType(); // 简化的性能判断
        
        // iOS设备通常性能较好
        if (platform === sys.Platform.IOS) {
            return 'high';
        }
        
        // Android设备根据具体情况判断
        if (platform === sys.Platform.ANDROID) {
            return 'medium';
        }
        
        // Web和其他平台
        return 'medium';
    }
    
    /**
     * 根据设备性能调整设置
     */
    private adjustPerformanceLevel() {
        const level = this.getDevicePerformanceLevel();
        
        switch (level) {
            case 'low':
                this.animationQuality = 'low';
                break;
            case 'medium':
                this.animationQuality = 'medium';
                break;
            case 'high':
            default:
                this.animationQuality = 'high';
                break;
        }
    }
    
    /**
     * 启动FPS监控
     */
    private startFPSMonitoring() {
        const updateFPS = () => {
            const now = Date.now();
            this.frameCount++;
            
            if (now - this.lastFrameTime >= 1000) {
                this.currentFPS = Math.round((this.frameCount * 1000) / (now - this.lastFrameTime));
                this.frameCount = 0;
                this.lastFrameTime = now;
                
                // 根据FPS动态调整质量
                this.dynamicQualityAdjustment();
            }
        };
        
        director.getScheduler().schedule(updateFPS, this, 0, false);
    }
    
    /**
     * 动态质量调整
     */
    private dynamicQualityAdjustment() {
        const oldQuality = this.animationQuality;
        
        if (this.currentFPS < 25) {
            this.animationQuality = 'low';
        } else if (this.currentFPS < 45) {
            this.animationQuality = 'medium';
        } else if (this.currentFPS > 55) {
            this.animationQuality = 'high';
        }
        
        if (oldQuality !== this.animationQuality) {
            console.log(`🎬 动画质量调整: ${oldQuality} → ${this.animationQuality} (FPS: ${this.currentFPS})`);
        }
    }
    
    /**
     * 获取当前FPS
     */
    public getCurrentFPS(): number {
        return this.currentFPS;
    }
    
    /**
     * 获取动画配置
     */
    public getAnimationConfig(): { duration: number; easing: string } {
        switch (this.animationQuality) {
            case 'low':
                return { duration: 0.1, easing: 'linear' };
            case 'medium':
                return { duration: 0.15, easing: 'sineOut' };
            case 'high':
            default:
                return { duration: 0.2, easing: 'backOut' };
        }
    }
    
    /**
     * 获取性能统计
     */
    public getPerformanceStats() {
        return {
            fps: this.currentFPS,
            animationQuality: this.animationQuality,
            runningAnimations: this.runningAnimations.size,
            preloadedAssets: this.preloadedAssets.size,
            pendingLoads: this.loadingPromises.size,
            renderQueueSize: this.renderQueue.size
        };
    }
    
    /**
     * 输出性能报告
     */
    public logPerformanceReport() {
        const stats = this.getPerformanceStats();
        console.log('📊 UI性能报告:', stats);
    }
    
    /**
     * 智能事件处理 - 防抖动点击
     */
    public optimizedButtonClick(node: Node, callback: Function, throttleTime: number = 300): void {
        const now = Date.now();
        const lastClickTime = this.clickThrottleMap.get(node) || 0;
        
        if (now - lastClickTime < throttleTime) {
            console.log('🚫 点击被节流拦截');
            return;
        }
        
        this.clickThrottleMap.set(node, now);
        callback();
    }
    
    /**
     * 批量事件处理
     */
    public batchEventHandler(events: Array<{node: Node, callback: Function}>) {
        if (events.length === 0) return;
        
        // 按优先级分批处理
        const highPriority = events.filter(e => e.node.name.includes('important'));
        const normalPriority = events.filter(e => !e.node.name.includes('important'));
        
        // 立即处理高优先级事件
        highPriority.forEach(event => event.callback());
        
        // 延迟处理普通事件
        if (normalPriority.length > 0) {
            setTimeout(() => {
                normalPriority.forEach(event => event.callback());
            }, 16); // 下一帧处理
        }
    }
    
    /**
     * 添加优化的事件监听器
     */
    public addOptimizedListener(node: Node, eventType: string, callback: Function, useCapture: boolean = false) {
        // 使用事件池减少内存分配
        const optimizedCallback = this.getPooledCallback(callback);
        
        node.on(eventType, optimizedCallback, null, useCapture);
        
        // 记录监听器用于清理
        const listeners = this.eventListeners.get(node) || [];
        listeners.push(optimizedCallback);
        this.eventListeners.set(node, listeners);
        
        console.log(`📡 添加优化事件监听器: ${node.name}.${eventType}`);
    }
    
    /**
     * 从事件池获取回调函数
     */
    private getPooledCallback(originalCallback: Function): Function {
        for (const pooledCallback of this.eventPool) {
            if ((pooledCallback as any).__original === originalCallback) {
                return pooledCallback;
            }
        }
        
        // 创建新的池化回调
        const pooledCallback = (...args: any[]) => originalCallback.apply(this, args);
        (pooledCallback as any).__original = originalCallback;
        this.eventPool.add(pooledCallback);
        
        return pooledCallback;
    }
    
    /**
     * 清理节点的所有事件监听器
     */
    public cleanupNodeListeners(node: Node) {
        const listeners = this.eventListeners.get(node);
        if (listeners) {
            listeners.forEach(listener => {
                node.off('', listener);
                this.eventPool.delete(listener);
            });
            this.eventListeners.delete(node);
            console.log(`🧹 清理节点事件监听器: ${node.name}`);
        }
    }
    
    /**
     * 内存优化 - 清理缓存
     */
    public cleanupCache() {
        const now = Date.now();
        const maxAge = 30000; // 30秒过期
        
        // 清理点击节流缓存
        for (const [node, timestamp] of this.clickThrottleMap.entries()) {
            if (now - timestamp > maxAge) {
                this.clickThrottleMap.delete(node);
            }
        }
        
        // 清理预加载资源缓存
        for (const [path, asset] of this.preloadedAssets.entries()) {
            if (asset && asset.isValid === false) {
                this.preloadedAssets.delete(path);
            }
        }
        
        console.log('🧹 UI缓存清理完成');
    }
    
    /**
     * 内存压力检测和自动清理
     */
    public checkMemoryPressure() {
        const stats = this.getPerformanceStats();
        
        // 基于性能指标判断内存压力
        if (stats.fps < 30 || stats.preloadedAssets > 100 || stats.runningAnimations > 10) {
            console.log('⚠️ 检测到内存压力，开始自动清理');
            this.cleanupCache();
            
            // 降低动画质量
            if (this.animationQuality === 'high') {
                this.animationQuality = 'medium';
                console.log('🎬 自动降低动画质量到 medium');
            }
        }
    }
    
    /**
     * 优化的动画播放
     */
    public playOptimizedAnimation(node: Node, animationConfig: any, onComplete?: Function): void {
        const config = this.getAnimationConfig();
        
        // 检查是否需要跳过动画（性能过低时）
        if (this.animationQuality === 'low' && this.currentFPS < 20) {
            console.log('⚡ 跳过动画 - 性能过低');
            onComplete && onComplete();
            return;
        }
        
        const optimizedTween = tween(node)
            .to(config.duration, animationConfig, { easing: config.easing })
            .call(() => {
                this.runningAnimations.delete(optimizedTween as any);
                onComplete && onComplete();
            })
            .start();
        
        this.runningAnimations.add(optimizedTween as any);
        console.log(`🎬 播放优化动画: ${node.name} (质量: ${this.animationQuality})`);
    }
    
    /**
     * 批量动画处理队列
     */
    public queueAnimation(node: Node, animation: Function) {
        this.animationQueue.push({ node, animation });
        
        if (!this.isProcessingAnimations) {
            this.processAnimationQueue();
        }
    }
    
    /**
     * 处理动画队列
     */
    private async processAnimationQueue() {
        if (this.isProcessingAnimations) return;
        this.isProcessingAnimations = true;
        
        console.log(`🎬 开始处理动画队列 (${this.animationQueue.length}项)`);
        
        while (this.animationQueue.length > 0) {
            const batchSize = this.animationQuality === 'high' ? 3 : 
                            this.animationQuality === 'medium' ? 2 : 1;
            
            const batch = this.animationQueue.splice(0, batchSize);
            
            // 并行执行批次动画
            const promises = batch.map(item => {
                return new Promise<void>(resolve => {
                    item.animation();
                    // 根据动画质量调整间隔
                    setTimeout(resolve, this.getAnimationConfig().duration * 1000);
                });
            });
            
            await Promise.all(promises);
            
            // 批次间隔，避免卡顿
            if (this.animationQueue.length > 0) {
                await new Promise(resolve => setTimeout(resolve, 16)); // 一帧间隔
            }
        }
        
        this.isProcessingAnimations = false;
        console.log('✅ 动画队列处理完成');
    }
    
    /**
     * 停止所有动画
     */
    public stopAllAnimations() {
        this.runningAnimations.forEach(animation => {
            if (animation.stop) {
                animation.stop();
            }
        });
        this.runningAnimations.clear();
        this.animationQueue.length = 0;
        this.isProcessingAnimations = false;
        console.log('🛑 所有动画已停止');
    }
    
    /**
     * 智能动画优化 - 根据设备性能调整
     */
    public optimizeAnimationForDevice(node: Node, targetProps: any, duration?: number): Tween<Node> {
        const deviceLevel = this.getDevicePerformanceLevel();
        const config = this.getAnimationConfig();
        
        // 根据设备性能调整动画参数
        let optimizedDuration = duration || config.duration;
        let optimizedEasing = config.easing;
        
        if (deviceLevel === 'low') {
            optimizedDuration *= 0.5; // 缩短动画时间
            optimizedEasing = 'linear'; // 简化缓动
        }
        
        const optimizedTween = tween(node)
            .to(optimizedDuration, targetProps, { easing: optimizedEasing });
        
        this.runningAnimations.add(optimizedTween as any);
        
        return optimizedTween;
    }
    
    /**
     * 动画预热 - 提前准备常用动画
     */
    public preloadCommonAnimations() {
        const commonAnimations = [
            'fadeIn', 'fadeOut', 'scaleIn', 'scaleOut', 'slideUp', 'slideDown'
        ];
        
        console.log('🔥 动画预热开始...');
        
        commonAnimations.forEach(animType => {
            // 创建虚拟节点进行动画预热
            const dummyNode = new Node(`dummy_${animType}`);
            
            switch (animType) {
                case 'fadeIn':
                    tween(dummyNode).to(0.1, { opacity: 255 }).start().stop();
                    break;
                case 'fadeOut':
                    tween(dummyNode).to(0.1, { opacity: 0 }).start().stop();
                    break;
                case 'scaleIn':
                    tween(dummyNode).to(0.1, { scale: { x: 1, y: 1 } }).start().stop();
                    break;
                case 'scaleOut':
                    tween(dummyNode).to(0.1, { scale: { x: 0, y: 0 } }).start().stop();
                    break;
            }
            
            dummyNode.destroy();
        });
        
        console.log('✅ 动画预热完成');
    }
    
    /**
     * 更新渲染剔除边界
     */
    private updateCullingBounds() {
        try {
            const visibleSize = view.getVisibleSize();
            this.cullingBounds = {
                x: -visibleSize.width / 2,
                y: -visibleSize.height / 2,
                width: visibleSize.width,
                height: visibleSize.height
            };
        } catch (error) {
            console.warn('⚠️ 获取可视区域大小失败，使用默认值');
            this.cullingBounds = {
                x: -400,
                y: -300,
                width: 800,
                height: 600
            };
        }
    }
    
    /**
     * 检查节点是否在可视区域内
     */
    public isNodeInViewport(node: Node): boolean {
        const worldPos = node.worldPosition;
        const bounds = this.cullingBounds;
        
        return worldPos.x >= bounds.x && 
               worldPos.x <= bounds.x + bounds.width &&
               worldPos.y >= bounds.y && 
               worldPos.y <= bounds.y + bounds.height;
    }
    
    /**
     * 添加节点到渲染队列
     */
    public addToRenderQueue(node: Node) {
        if (this.isNodeInViewport(node)) {
            this.renderQueue.add(node);
            
            if (!this.isRendering) {
                this.processRenderQueue();
            }
        }
    }
    
    /**
     * 批量处理渲染队列
     */
    private async processRenderQueue() {
        if (this.isRendering) return;
        this.isRendering = true;
        
        console.log(`🎨 开始批量渲染 (${this.renderQueue.size}个节点)`);
        
        const nodes = Array.from(this.renderQueue);
        this.renderQueue.clear();
        
        // 按批次处理渲染
        for (let i = 0; i < nodes.length; i += this.renderBatchSize) {
            const batch = nodes.slice(i, i + this.renderBatchSize);
            
            // 批量更新节点可见性
            batch.forEach(node => {
                if (node.isValid) {
                    const inViewport = this.isNodeInViewport(node);
                    if (node.active !== inViewport) {
                        node.active = inViewport;
                    }
                }
            });
            
            // 避免一帧内处理过多节点
            if (i + this.renderBatchSize < nodes.length) {
                await new Promise(resolve => setTimeout(resolve, 16));
            }
        }
        
        this.isRendering = false;
        console.log('✅ 批量渲染完成');
    }
    
    /**
     * 优化渲染批次大小
     */
    public optimizeRenderBatchSize() {
        if (this.currentFPS < 30) {
            this.renderBatchSize = Math.max(5, this.renderBatchSize - 2);
        } else if (this.currentFPS > 50) {
            this.renderBatchSize = Math.min(20, this.renderBatchSize + 1);
        }
        
        console.log(`🎨 渲染批次大小调整为: ${this.renderBatchSize}`);
    }
    
    /**
     * 视口剔除优化
     */
    public performViewportCulling(nodes: Node[]) {
        let culledCount = 0;
        
        nodes.forEach(node => {
            const shouldBeVisible = this.isNodeInViewport(node);
            
            if (node.active !== shouldBeVisible) {
                node.active = shouldBeVisible;
                if (!shouldBeVisible) culledCount++;
            }
        });
        
        console.log(`✂️ 视口剔除完成，隐藏 ${culledCount} 个节点`);
        return culledCount;
    }
    
    /**
     * 智能渲染调度
     */
    public scheduleRender(nodes: Node[], priority: 'high' | 'medium' | 'low' = 'medium') {
        const filteredNodes = nodes.filter(node => node.isValid);
        
        if (filteredNodes.length === 0) return;
        
        switch (priority) {
            case 'high':
                // 高优先级立即渲染
                filteredNodes.forEach(node => this.addToRenderQueue(node));
                break;
                
            case 'medium':
                // 中优先级下一帧渲染
                setTimeout(() => {
                    filteredNodes.forEach(node => this.addToRenderQueue(node));
                }, 16);
                break;
                
            case 'low':
                // 低优先级延迟渲染
                setTimeout(() => {
                    filteredNodes.forEach(node => this.addToRenderQueue(node));
                }, 100);
                break;
        }
        
        console.log(`📋 调度 ${filteredNodes.length} 个节点渲染 (优先级: ${priority})`);
    }
    
    /**
     * 渲染性能监控
     */
    public getRenderStats() {
        return {
            queueSize: this.renderQueue.size,
            batchSize: this.renderBatchSize,
            isProcessing: this.isRendering,
            cullingBounds: this.cullingBounds
        };
    }
}

// 导出单例实例
export const uiOptimizer = UIOptimizer.getInstance();