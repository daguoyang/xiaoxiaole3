import { SingletonClass } from './singletonClass';
import { GlobalFuncHelper } from '../utils/globalFuncHelper';
import { StorageHelper, StorageHelperKey } from '../utils/storageHelper';

/**
 * 简化版体力管理器 - 避免循环依赖
 */
export class SimpleHeartManager extends SingletonClass<SimpleHeartManager> {
    /** 最大体力值 */
    public static readonly MAX_HEART = 5;
    
    /** 体力恢复间隔（毫秒）- 5分钟恢复1点体力 */
    public static readonly HEART_RECOVER_INTERVAL = 5 * 60 * 1000;
    
    private checkTimerInterval: any = null;
    
    protected onInit(...args: any[]) {
        console.log('SimpleHeartManager system initialized');
        
        // 初始化体力恢复时间戳
        if (!StorageHelper.getData(StorageHelperKey.HeartRecoverTime)) {
            StorageHelper.setData(StorageHelperKey.HeartRecoverTime, Date.now().toString());
        }
        
        // 启动时检查一次体力恢复
        this.checkHeartRecover();
        
        // 设置定期检查（每分钟）
        this.checkTimerInterval = setInterval(() => {
            this.checkHeartRecover();
        }, 60 * 1000);
    }
    
    protected onDestroy() {
        // 清理定时器
        if (this.checkTimerInterval) {
            clearInterval(this.checkTimerInterval);
            this.checkTimerInterval = null;
        }
    }
    
    /**
     * 检查体力恢复
     */
    private checkHeartRecover(): void {
        const currentHeart = this.getCurrentHeart();
        if (currentHeart >= SimpleHeartManager.MAX_HEART) {
            return; // 体力已满，无需恢复
        }
        
        const lastRecoverTime = +StorageHelper.getData(StorageHelperKey.HeartRecoverTime, Date.now().toString());
        const currentTime = Date.now();
        const timeDiff = currentTime - lastRecoverTime;
        
        // 计算可恢复的体力数量
        const recoverCount = Math.floor(timeDiff / SimpleHeartManager.HEART_RECOVER_INTERVAL);
        
        if (recoverCount > 0) {
            const newHeart = Math.min(currentHeart + recoverCount, SimpleHeartManager.MAX_HEART);
            GlobalFuncHelper.setHeart(newHeart - currentHeart);
            
            // 更新恢复时间戳
            const newRecoverTime = lastRecoverTime + (recoverCount * SimpleHeartManager.HEART_RECOVER_INTERVAL);
            StorageHelper.setData(StorageHelperKey.HeartRecoverTime, newRecoverTime.toString());
            
            console.log(`体力恢复：${currentHeart} -> ${newHeart}`);
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
            return false;
        }
        
        // 如果当前是满体力，开始计时
        if (currentHeart === SimpleHeartManager.MAX_HEART) {
            StorageHelper.setData(StorageHelperKey.HeartRecoverTime, Date.now().toString());
        }
        
        GlobalFuncHelper.setHeart(-count);
        console.log(`消耗体力：${count}，剩余：${currentHeart - count}`);
        
        return true;
    }
    
    /**
     * 增加体力
     * @param count 增加数量
     */
    addHeart(count: number): void {
        const currentHeart = this.getCurrentHeart();
        const newHeart = Math.min(currentHeart + count, SimpleHeartManager.MAX_HEART);
        const actualAdd = newHeart - currentHeart;
        
        if (actualAdd > 0) {
            GlobalFuncHelper.setHeart(actualAdd);
            console.log(`增加体力：${actualAdd}，当前：${newHeart}`);
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
        return SimpleHeartManager.MAX_HEART;
    }
    
    /**
     * 获取下次恢复倒计时（秒）
     */
    getNextRecoverCountdown(): number {
        const currentHeart = this.getCurrentHeart();
        if (currentHeart >= SimpleHeartManager.MAX_HEART) {
            return 0; // 体力已满
        }
        
        const lastRecoverTime = +StorageHelper.getData(StorageHelperKey.HeartRecoverTime, Date.now().toString());
        const currentTime = Date.now();
        const timeSinceLastRecover = currentTime - lastRecoverTime;
        
        const timeUntilNextRecover = SimpleHeartManager.HEART_RECOVER_INTERVAL - (timeSinceLastRecover % SimpleHeartManager.HEART_RECOVER_INTERVAL);
        
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
     * 检查是否有足够体力
     */
    hasEnoughHeart(required: number = 1): boolean {
        return this.getCurrentHeart() >= required;
    }
}