import { SingletonClass } from './singletonClass';
import { EventName } from '../const/eventName';
import { GlobalFuncHelper } from '../utils/globalFuncHelper';
import { StorageHelper, StorageHelperKey } from '../utils/storageHelper';

/**
 * 体力管理器 - 完整的体力系统
 */
export class HeartManager extends SingletonClass<HeartManager> {
    /** 最大体力值 */
    public static readonly MAX_HEART = 5;
    
    /** 体力恢复间隔（毫秒）- 5分钟恢复1点体力 */
    public static readonly HEART_RECOVER_INTERVAL = 5 * 60 * 1000;
    
    /** 检查间隔（毫秒）- 每1分钟检查一次 */
    private static readonly CHECK_INTERVAL = 60 * 1000;
    
    private checkTimerInterval: any = null;
    
    protected onInit(...args: any[]) {
        console.log('HeartManager system initialized');
        
        // 初始化体力恢复时间戳
        if (!StorageHelper.getData(StorageHelperKey.HeartRecoverTime)) {
            StorageHelper.setData(StorageHelperKey.HeartRecoverTime, Date.now().toString());
        }
        
        // 启动时检查一次体力恢复
        this.checkHeartRecover();
        
        // 设置定期检查
        this.scheduleHeartCheck();
    }
    
    protected onDestroy() {
        // 清理定时器
        if (this.checkTimerInterval) {
            clearInterval(this.checkTimerInterval);
            this.checkTimerInterval = null;
        }
    }
    
    private scheduleHeartCheck() {
        // 使用原生JavaScript的setInterval
        this.checkTimerInterval = setInterval(() => {
            this.checkHeartRecover();
        }, HeartManager.CHECK_INTERVAL);
    }
    
    /**
     * 检查体力恢复
     */
    private checkHeartRecover(): void {
        const currentHeart = this.getCurrentHeart();
        if (currentHeart >= HeartManager.MAX_HEART) {
            return; // 体力已满，无需恢复
        }
        
        const lastRecoverTime = +StorageHelper.getData(StorageHelperKey.HeartRecoverTime, Date.now().toString());
        const currentTime = Date.now();
        const timeDiff = currentTime - lastRecoverTime;
        
        // 计算可恢复的体力数量
        const recoverCount = Math.floor(timeDiff / HeartManager.HEART_RECOVER_INTERVAL);
        
        if (recoverCount > 0) {
            const newHeart = Math.min(currentHeart + recoverCount, HeartManager.MAX_HEART);
            GlobalFuncHelper.setHeart(newHeart - currentHeart);
            
            // 更新恢复时间戳
            const newRecoverTime = lastRecoverTime + (recoverCount * HeartManager.HEART_RECOVER_INTERVAL);
            StorageHelper.setData(StorageHelperKey.HeartRecoverTime, newRecoverTime.toString());
            
            console.log(`体力恢复：${currentHeart} -> ${newHeart}`);
            
            // 通知UI更新
            this.emitHeartUpdateEvent();
        }
    }
    
    /**
     * 消耗体力
     * @param count 消耗数量，默认1
     * @returns 是否消耗成功
     */
    consumeHeart(count: number = 1): boolean {
        const currentHeart = this.getCurrentHeart();
        
        if (currentHeart < count) {
            console.log('体力不足，无法消耗');
            this.showHeartInsufficientTips();
            return false;
        }
        
        // 如果当前是满体力，开始计时
        if (currentHeart === HeartManager.MAX_HEART) {
            StorageHelper.setData(StorageHelperKey.HeartRecoverTime, Date.now().toString());
        }
        
        GlobalFuncHelper.setHeart(-count);
        console.log(`消耗体力：${count}，剩余：${currentHeart - count}`);
        
        // 通知UI更新
        this.emitHeartUpdateEvent();
        return true;
    }
    
    /**
     * 增加体力
     * @param count 增加数量
     */
    addHeart(count: number): void {
        const currentHeart = this.getCurrentHeart();
        const newHeart = Math.min(currentHeart + count, HeartManager.MAX_HEART);
        const actualAdd = newHeart - currentHeart;
        
        if (actualAdd > 0) {
            GlobalFuncHelper.setHeart(actualAdd);
            console.log(`增加体力：${actualAdd}，当前：${newHeart}`);
            
            // 通知UI更新
            this.emitHeartUpdateEvent();
        }
    }
    
    /**
     * 获取当前体力
     */
    getCurrentHeart(): number {
        return GlobalFuncHelper.getHeart();
    }
    
    /**
     * 获取最大体力
     */
    getMaxHeart(): number {
        return HeartManager.MAX_HEART;
    }
    
    /**
     * 获取下次恢复倒计时（秒）
     */
    getNextRecoverCountdown(): number {
        const currentHeart = this.getCurrentHeart();
        if (currentHeart >= HeartManager.MAX_HEART) {
            return 0; // 体力已满
        }
        
        const lastRecoverTime = +StorageHelper.getData(StorageHelperKey.HeartRecoverTime, Date.now().toString());
        const currentTime = Date.now();
        const timeSinceLastRecover = currentTime - lastRecoverTime;
        
        const timeUntilNextRecover = HeartManager.HEART_RECOVER_INTERVAL - (timeSinceLastRecover % HeartManager.HEART_RECOVER_INTERVAL);
        
        return Math.ceil(timeUntilNextRecover / 1000);
    }
    
    /**
     * 格式化倒计时显示
     */
    formatCountdown(seconds: number): string {
        if (seconds <= 0) return "00:00";
        
        const minutes = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    
    /**
     * 体力不足提示
     */
    showHeartInsufficientTips(): void {
        console.log("体力不足！");
        this.showMessageTips("体力不足！");
        // 可以在这里添加跳转到商店的逻辑
    }
    
    /**
     * 体力不足提示（带广告选项）
     */
    showHeartInsufficientTipsWithAd(): void {
        // TODO: 实现观看广告获取体力的弹窗
        console.log("体力不足！可以在商店购买体力或等待恢复");
        this.showMessageTips("体力不足！可以在商店购买体力或等待恢复");
    }
    
    /**
     * 检查是否有足够体力
     */
    hasEnoughHeart(required: number = 1): boolean {
        return this.getCurrentHeart() >= required;
    }
    
    /**
     * 强制刷新体力显示
     */
    refreshHeartDisplay(): void {
        this.emitHeartUpdateEvent();
    }
    
    /**
     * 发送体力更新事件 - 避免循环依赖
     */
    private emitHeartUpdateEvent(): void {
        // 使用全局事件管理器，避免直接引用App
        if (typeof window !== 'undefined' && window['StarMatchEngine']) {
            window['StarMatchEngine'].event.emit(EventName.Game.HeartUpdate);
        }
    }
    
    /**
     * 显示消息提示 - 避免循环依赖
     */
    private showMessageTips(message: string): void {
        // 使用全局事件管理器，避免直接引用App
        if (typeof window !== 'undefined' && window['StarMatchEngine']) {
            window['StarMatchEngine'].view.showMsgTips(message);
        }
    }
}