import { Node, Tween, Vec3, tween, easing } from 'cc';

export interface AnimationData {
    type: string;
    target: Node;
    data: any;
    priority: number;
    duration: number;
    delay?: number;
    easing?: string;
    onComplete?: () => void;
    onStart?: () => void;
}

interface QueuedAnimation extends AnimationData {
    id: string;
    timestamp: number;
    promise: Promise<void>;
    resolve?: () => void;
    reject?: (error: any) => void;
    tween?: Tween<Node>;
}

export class AnimationScheduler {
    private static _instance: AnimationScheduler | null = null;
    private _animationQueue: QueuedAnimation[] = [];
    private _activeAnimations: Map<string, QueuedAnimation> = new Map();
    private _maxConcurrentAnimations: number = 20;
    private _isProcessing: boolean = false;
    private _nextAnimationId: number = 1;

    private constructor() {}

    public static getInstance(): AnimationScheduler {
        if (!AnimationScheduler._instance) {
            AnimationScheduler._instance = new AnimationScheduler();
        }
        return AnimationScheduler._instance;
    }

    public scheduleAnimation(
        type: string,
        target: Node,
        data: any,
        priority: number = 50,
        duration: number = 0.3
    ): Promise<void> {
        const animationData: AnimationData = {
            type,
            target,
            data,
            priority,
            duration,
            delay: data.delay || 0,
            easing: data.easing || 'cubicOut',
            onComplete: data.onComplete,
            onStart: data.onStart
        };

        return this.enqueueAnimation(animationData);
    }

    private enqueueAnimation(animData: AnimationData): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            const queuedAnim: QueuedAnimation = {
                ...animData,
                id: `anim_${this._nextAnimationId++}`,
                timestamp: Date.now(),
                promise: Promise.resolve(),
                resolve,
                reject
            };

            // 插入到正确的优先级位置
            const insertIndex = this.findInsertPosition(queuedAnim.priority);
            this._animationQueue.splice(insertIndex, 0, queuedAnim);

            console.log(`📋 Animation queued: ${queuedAnim.type} (priority: ${queuedAnim.priority})`);

            // 开始处理队列
            this.processQueue();
        });
    }

    private findInsertPosition(priority: number): number {
        for (let i = 0; i < this._animationQueue.length; i++) {
            if (this._animationQueue[i].priority < priority) {
                return i;
            }
        }
        return this._animationQueue.length;
    }

    private async processQueue(): Promise<void> {
        if (this._isProcessing) {
            return;
        }

        this._isProcessing = true;

        while (this._animationQueue.length > 0 && 
               this._activeAnimations.size < this._maxConcurrentAnimations) {
            
            const animation = this._animationQueue.shift()!;
            await this.executeAnimation(animation);
        }

        this._isProcessing = false;

        // 如果还有队列中的动画，稍后继续处理
        if (this._animationQueue.length > 0) {
            setTimeout(() => this.processQueue(), 16); // 下一帧
        }
    }

    private async executeAnimation(animation: QueuedAnimation): Promise<void> {
        this._activeAnimations.set(animation.id, animation);

        try {
            if (animation.onStart) {
                animation.onStart();
            }

            console.log(`▶️ Executing animation: ${animation.type}`);

            // 根据动画类型执行不同的动画
            await this.performAnimation(animation);

            // 动画完成
            if (animation.resolve) {
                animation.resolve();
            }

            if (animation.onComplete) {
                animation.onComplete();
            }

            console.log(`✅ Animation completed: ${animation.type}`);

        } catch (error) {
            console.error(`❌ Animation failed: ${animation.type}`, error);
            
            if (animation.reject) {
                animation.reject(error);
            }
        } finally {
            this._activeAnimations.delete(animation.id);
        }
    }

    private async performAnimation(animation: QueuedAnimation): Promise<void> {
        const { type, target, data, duration, delay, easing: easingType } = animation;

        // 延迟执行
        if (delay && delay > 0) {
            await this.wait(delay);
        }

        // 获取缓动函数
        const easingFunc = this.getEasingFunction(easingType || 'cubicOut');

        return new Promise<void>((resolve, reject) => {
            try {
                let animTween: Tween<Node>;

                switch (type) {
                    case 'move':
                        animTween = this.createMoveAnimation(target, data, duration, easingFunc);
                        break;
                    
                    case 'scale':
                        animTween = this.createScaleAnimation(target, data, duration, easingFunc);
                        break;
                    
                    case 'fade':
                        animTween = this.createFadeAnimation(target, data, duration, easingFunc);
                        break;
                    
                    case 'rotate':
                        animTween = this.createRotateAnimation(target, data, duration, easingFunc);
                        break;
                    
                    case 'bounce':
                        animTween = this.createBounceAnimation(target, data, duration);
                        break;
                    
                    case 'shake':
                        animTween = this.createShakeAnimation(target, data, duration);
                        break;
                    
                    case 'pop':
                        animTween = this.createPopAnimation(target, data, duration);
                        break;
                    
                    case 'fall':
                        animTween = this.createFallAnimation(target, data, duration, easingFunc);
                        break;

                    case 'eliminate':
                        animTween = this.createEliminateAnimation(target, data, duration);
                        break;

                    default:
                        console.warn(`Unknown animation type: ${type}`);
                        resolve();
                        return;
                }

                animation.tween = animTween;

                animTween
                    .call(() => resolve())
                    .start();

            } catch (error) {
                reject(error);
            }
        });
    }

    private createMoveAnimation(target: Node, data: any, duration: number, easingFunc: any): Tween<Node> {
        const targetPos = new Vec3(data.x || target.position.x, data.y || target.position.y, data.z || target.position.z);
        return tween(target).to(duration, { position: targetPos }, { easing: easingFunc });
    }

    private createScaleAnimation(target: Node, data: any, duration: number, easingFunc: any): Tween<Node> {
        const targetScale = new Vec3(data.x || data.scale || 1, data.y || data.scale || 1, data.z || 1);
        return tween(target).to(duration, { scale: targetScale }, { easing: easingFunc });
    }

    private createFadeAnimation(target: Node, data: any, duration: number, easingFunc: any): Tween<Node> {
        // 注意：Cocos Creator 中透明度是通过 UIOpacity 组件控制的
        const targetOpacity = data.opacity !== undefined ? data.opacity : (data.targetOpacity || 255);
        
        // 直接对节点进行透明度动画
        const uiOpacity = target.getComponent('cc.UIOpacity');
        if (!uiOpacity) {
            target.addComponent('cc.UIOpacity');
        }
        
        return tween(target)
            .call(() => {
                const opacity = target.getComponent('cc.UIOpacity');
                if (opacity) {
                    opacity.opacity = targetOpacity;
                }
            });
    }

    private createRotateAnimation(target: Node, data: any, duration: number, easingFunc: any): Tween<Node> {
        const targetRotation = new Vec3(
            data.x || target.eulerAngles.x,
            data.y || target.eulerAngles.y,
            data.z !== undefined ? data.z : (data.angle || target.eulerAngles.z)
        );
        return tween(target).to(duration, { eulerAngles: targetRotation }, { easing: easingFunc });
    }

    private createBounceAnimation(target: Node, data: any, duration: number): Tween<Node> {
        const originalScale = target.scale.clone();
        const bounceScale = data.scale || 1.2;

        return tween(target)
            .to(duration * 0.3, { scale: new Vec3(bounceScale, bounceScale, 1) }, { easing: 'quadOut' })
            .to(duration * 0.7, { scale: originalScale }, { easing: 'elasticOut' });
    }

    private createShakeAnimation(target: Node, data: any, duration: number): Tween<Node> {
        const originalPos = target.position.clone();
        const intensity = data.intensity || 10;
        const shakeCount = data.count || 6;
        const shakeDuration = duration / shakeCount;

        let shakeTween = tween(target);

        for (let i = 0; i < shakeCount; i++) {
            const randomX = (Math.random() - 0.5) * intensity;
            const randomY = (Math.random() - 0.5) * intensity;
            const shakePos = originalPos.clone().add(new Vec3(randomX, randomY, 0));
            
            shakeTween = shakeTween.to(shakeDuration, { position: shakePos });
        }

        return shakeTween.to(shakeDuration, { position: originalPos });
    }

    private createPopAnimation(target: Node, data: any, duration: number): Tween<Node> {
        const originalScale = target.scale.clone();
        target.setScale(0, 0, 1);

        return tween(target)
            .to(duration, { scale: originalScale }, { easing: 'backOut' });
    }

    private createFallAnimation(target: Node, data: any, duration: number, easingFunc: any): Tween<Node> {
        const targetY = data.targetY || (target.position.y - data.distance || 100);
        
        return tween(target)
            .to(duration, { position: new Vec3(target.position.x, targetY, target.position.z) }, { easing: easingFunc });
    }

    private createEliminateAnimation(target: Node, data: any, duration: number): Tween<Node> {
        const fadeOut = tween(target)
            .to(duration * 0.5, { scale: new Vec3(1.2, 1.2, 1) })
            .to(duration * 0.5, { scale: new Vec3(0, 0, 1) });

        // 可以添加粒子效果等
        return fadeOut;
    }

    private getEasingFunction(easingType: string): any {
        const easingMap: { [key: string]: any } = {
            'linear': 'linear',
            'quadIn': 'quadIn',
            'quadOut': 'quadOut',
            'cubicIn': 'cubicIn',
            'cubicOut': 'cubicOut',
            'quartIn': 'quartIn',
            'quartOut': 'quartOut',
            'quintIn': 'quintIn',
            'quintOut': 'quintOut',
            'sineIn': 'sineIn',
            'sineOut': 'sineOut',
            'expoIn': 'expoIn',
            'expoOut': 'expoOut',
            'circIn': 'circIn',
            'circOut': 'circOut',
            'elasticIn': 'elasticIn',
            'elasticOut': 'elasticOut',
            'backIn': 'backIn',
            'backOut': 'backOut',
            'bounceIn': 'bounceIn',
            'bounceOut': 'bounceOut'
        };

        return easingMap[easingType] || 'cubicOut';
    }

    private wait(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    public cancelAnimation(target: Node): void {
        for (const [id, animation] of this._activeAnimations) {
            if (animation.target === target) {
                if (animation.tween) {
                    animation.tween.stop();
                }
                this._activeAnimations.delete(id);
                console.log(`🛑 Animation cancelled: ${animation.type}`);
            }
        }

        // 从队列中移除
        this._animationQueue = this._animationQueue.filter(anim => anim.target !== target);
    }

    public cancelAllAnimations(): void {
        for (const animation of this._activeAnimations.values()) {
            if (animation.tween) {
                animation.tween.stop();
            }
        }
        
        this._activeAnimations.clear();
        this._animationQueue = [];
        console.log('🛑 All animations cancelled');
    }

    public getQueueStatus(): {
        queueLength: number;
        activeCount: number;
        maxConcurrent: number;
    } {
        return {
            queueLength: this._animationQueue.length,
            activeCount: this._activeAnimations.size,
            maxConcurrent: this._maxConcurrentAnimations
        };
    }

    public setMaxConcurrentAnimations(max: number): void {
        this._maxConcurrentAnimations = Math.max(1, max);
    }

    public dispose(): void {
        this.cancelAllAnimations();
        AnimationScheduler._instance = null;
        console.log('🗑 AnimationScheduler disposed');
    }
}