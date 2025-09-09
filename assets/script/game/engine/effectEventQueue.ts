import { gridCmpt } from "../ui/item/gridCmpt";

export interface EffectEvent {
    type: 'bomb' | 'rocket_horizontal' | 'rocket_vertical' | 'rainbow' | 'normal_match';
    position: { h: number; v: number };
    strength: number;
    createdAt: number;
    priority: number;
    sourceMatchId?: string;
    affectedTiles?: gridCmpt[];
}

export class EffectEventQueue {
    private queue: EffectEvent[] = [];
    private processing: boolean = false;
    private eventCounter: number = 0;
    
    // 优先级定义：数值越高优先级越高
    private readonly PRIORITIES = {
        rainbow: 100,        // 彩虹糖最高优先级
        bomb: 80,           // 炸弹类特效
        rocket_horizontal: 60,  // 横向火箭
        rocket_vertical: 60,    // 纵向火箭
        normal_match: 40        // 普通消除
    };

    /**
     * 向队列添加效果事件
     */
    enqueue(event: Omit<EffectEvent, 'createdAt' | 'priority'>): void {
        const fullEvent: EffectEvent = {
            ...event,
            createdAt: ++this.eventCounter,
            priority: this.PRIORITIES[event.type] || 0
        };
        
        this.queue.push(fullEvent);
        this.sortQueue();
        
        console.log(`事件入队: ${event.type} at (${event.position.h},${event.position.v}), 优先级: ${fullEvent.priority}`);
    }

    /**
     * 批量添加事件
     */
    enqueueBatch(events: Omit<EffectEvent, 'createdAt' | 'priority'>[]): void {
        events.forEach(event => this.enqueue(event));
    }

    /**
     * 处理队列中的所有事件 - 非递归实现
     */
    async processAll(
        gridMap: gridCmpt[][], 
        onEffectExecute: (event: EffectEvent) => Promise<EffectEvent[]>
    ): Promise<void> {
        if (this.processing) {
            console.warn('事件队列已在处理中，跳过重复调用');
            return;
        }

        this.processing = true;
        let chainDepth = 0;
        
        try {
            while (this.queue.length > 0) {
                chainDepth++;
                console.log(`连锁第${chainDepth}层开始，队列中有${this.queue.length}个事件`);
                
                const currentEvent = this.dequeue();
                if (!currentEvent) break;

                // 执行当前事件，可能产生新的连锁事件
                const newEvents = await onEffectExecute(currentEvent);
                
                if (newEvents && newEvents.length > 0) {
                    console.log(`事件${currentEvent.type}产生了${newEvents.length}个新的连锁事件`);
                    this.enqueueBatch(newEvents);
                }

                // 防止无限连锁的安全机制
                if (chainDepth > 50) {
                    console.warn('连锁深度超过50层，强制结束以防止无限循环');
                    break;
                }
            }
            
            console.log(`连锁处理完成，总共${chainDepth}层`);
            
        } finally {
            this.processing = false;
            this.clear(); // 确保队列清空
        }
    }

    /**
     * 获取当前连击系数
     */
    getComboMultiplier(chainDepth: number): number {
        return 1 + 0.1 * Math.max(0, chainDepth - 1);
    }

    /**
     * 从队列取出优先级最高的事件
     */
    private dequeue(): EffectEvent | null {
        if (this.queue.length === 0) return null;
        
        this.sortQueue();
        return this.queue.shift() || null;
    }

    /**
     * 按优先级和创建时间排序队列
     */
    private sortQueue(): void {
        this.queue.sort((a, b) => {
            // 首先按优先级降序排列
            if (a.priority !== b.priority) {
                return b.priority - a.priority;
            }
            // 优先级相同时，按创建时间升序排列（先进先出）
            return a.createdAt - b.createdAt;
        });
    }

    /**
     * 清空队列
     */
    clear(): void {
        this.queue = [];
        this.eventCounter = 0;
    }

    /**
     * 获取队列状态信息
     */
    getStatus(): { length: number; processing: boolean; nextEvent?: EffectEvent } {
        return {
            length: this.queue.length,
            processing: this.processing,
            nextEvent: this.queue.length > 0 ? this.queue[0] : undefined
        };
    }

    /**
     * 检查是否为空队列
     */
    isEmpty(): boolean {
        return this.queue.length === 0;
    }

    /**
     * 检查是否正在处理
     */
    isProcessing(): boolean {
        return this.processing;
    }
}