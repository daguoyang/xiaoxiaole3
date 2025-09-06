import { BaseSystem } from './baseSystem';

/**
 * 时间控制器 - 全新的时间管理系统
 */
export class TimeController extends BaseSystem {
    private timers: Map<string, Timer> = new Map();
    private intervals: Map<string, Timer> = new Map();
    private timeScale: number = 1.0;
    private paused: boolean = false;
    private lastTime: number = 0;

    protected async onInitialize(): Promise<void> {
        this.lastTime = Date.now();
        console.log('TimeController system initialized');
    }

    protected async onDestroy(): Promise<void> {
        this.clearAllTimers();
        this.clearAllIntervals();
    }

    /**
     * 更新时间系统
     */
    update(deltaTime: number): void {
        if (this.paused) return;

        const scaledDelta = deltaTime * this.timeScale;
        this.updateTimers(scaledDelta);
        this.updateIntervals(scaledDelta);
    }

    /**
     * 创建定时器
     */
    createTimer(id: string, duration: number, callback: () => void, autoStart: boolean = true): Timer {
        if (this.timers.has(id)) {
            console.warn(`Timer with id ${id} already exists`);
            this.timers.get(id)?.stop();
        }

        const timer = new Timer(duration, callback, false);
        this.timers.set(id, timer);
        
        if (autoStart) {
            timer.start();
        }

        return timer;
    }

    /**
     * 创建循环定时器
     */
    createInterval(id: string, duration: number, callback: () => void, autoStart: boolean = true): Timer {
        if (this.intervals.has(id)) {
            console.warn(`Interval with id ${id} already exists`);
            this.intervals.get(id)?.stop();
        }

        const interval = new Timer(duration, callback, true);
        this.intervals.set(id, interval);
        
        if (autoStart) {
            interval.start();
        }

        return interval;
    }

    /**
     * 延迟执行
     */
    delay(duration: number): Promise<void> {
        return new Promise(resolve => {
            const id = `delay_${Date.now()}_${Math.random()}`;
            this.createTimer(id, duration, () => {
                this.removeTimer(id);
                resolve();
            });
        });
    }

    /**
     * 获取定时器
     */
    getTimer(id: string): Timer | null {
        return this.timers.get(id) || null;
    }

    /**
     * 获取循环定时器
     */
    getInterval(id: string): Timer | null {
        return this.intervals.get(id) || null;
    }

    /**
     * 移除定时器
     */
    removeTimer(id: string): boolean {
        const timer = this.timers.get(id);
        if (timer) {
            timer.stop();
            this.timers.delete(id);
            return true;
        }
        return false;
    }

    /**
     * 移除循环定时器
     */
    removeInterval(id: string): boolean {
        const interval = this.intervals.get(id);
        if (interval) {
            interval.stop();
            this.intervals.delete(id);
            return true;
        }
        return false;
    }

    /**
     * 清除所有定时器
     */
    clearAllTimers(): void {
        this.timers.forEach(timer => timer.stop());
        this.timers.clear();
    }

    /**
     * 清除所有循环定时器
     */
    clearAllIntervals(): void {
        this.intervals.forEach(interval => interval.stop());
        this.intervals.clear();
    }

    /**
     * 暂停时间系统
     */
    pause(): void {
        this.paused = true;
        this.timers.forEach(timer => timer.pause());
        this.intervals.forEach(interval => interval.pause());
    }

    /**
     * 恢复时间系统
     */
    resume(): void {
        this.paused = false;
        this.timers.forEach(timer => timer.resume());
        this.intervals.forEach(interval => interval.resume());
    }

    /**
     * 设置时间缩放
     */
    setTimeScale(scale: number): void {
        this.timeScale = Math.max(0, scale);
    }

    /**
     * 获取时间缩放
     */
    getTimeScale(): number {
        return this.timeScale;
    }

    /**
     * 是否暂停
     */
    isPaused(): boolean {
        return this.paused;
    }

    /**
     * 更新定时器
     */
    private updateTimers(deltaTime: number): void {
        const toRemove: string[] = [];
        
        this.timers.forEach((timer, id) => {
            timer.update(deltaTime);
            if (timer.isCompleted()) {
                toRemove.push(id);
            }
        });

        toRemove.forEach(id => this.timers.delete(id));
    }

    /**
     * 更新循环定时器
     */
    private updateIntervals(deltaTime: number): void {
        this.intervals.forEach(interval => {
            interval.update(deltaTime);
        });
    }

    /**
     * 获取当前时间戳
     */
    getCurrentTime(): number {
        return Date.now();
    }

    /**
     * 格式化时间显示
     */
    formatTime(seconds: number): string {
        const minutes = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
}

/**
 * 定时器类
 */
export class Timer {
    private duration: number;
    private callback: () => void;
    private isLoop: boolean;
    private elapsedTime: number = 0;
    private isRunning: boolean = false;
    private isPausedState: boolean = false;
    private completed: boolean = false;

    constructor(duration: number, callback: () => void, isLoop: boolean = false) {
        this.duration = duration;
        this.callback = callback;
        this.isLoop = isLoop;
    }

    /**
     * 启动定时器
     */
    start(): void {
        this.isRunning = true;
        this.isPausedState = false;
        this.elapsedTime = 0;
        this.completed = false;
    }

    /**
     * 停止定时器
     */
    stop(): void {
        this.isRunning = false;
        this.isPausedState = false;
        this.elapsedTime = 0;
        this.completed = true;
    }

    /**
     * 暂停定时器
     */
    pause(): void {
        this.isPausedState = true;
    }

    /**
     * 恢复定时器
     */
    resume(): void {
        this.isPausedState = false;
    }

    /**
     * 重置定时器
     */
    reset(): void {
        this.elapsedTime = 0;
        this.completed = false;
    }

    /**
     * 更新定时器
     */
    update(deltaTime: number): void {
        if (!this.isRunning || this.isPausedState) return;

        this.elapsedTime += deltaTime;

        if (this.elapsedTime >= this.duration) {
            this.callback();
            
            if (this.isLoop) {
                this.elapsedTime = 0; // 重置循环定时器
            } else {
                this.completed = true;
                this.isRunning = false;
            }
        }
    }

    /**
     * 获取剩余时间
     */
    getRemainingTime(): number {
        return Math.max(0, this.duration - this.elapsedTime);
    }

    /**
     * 获取进度 (0-1)
     */
    getProgress(): number {
        return Math.min(1, this.elapsedTime / this.duration);
    }

    /**
     * 是否正在运行
     */
    isActive(): boolean {
        return this.isRunning && !this.isPausedState;
    }

    /**
     * 是否已完成
     */
    isCompleted(): boolean {
        return this.completed;
    }

    /**
     * 是否循环
     */
    isLooping(): boolean {
        return this.isLoop;
    }
}