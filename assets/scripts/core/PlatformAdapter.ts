import { sys, view, game } from 'cc';

/**
 * 平台适配器
 * 处理不同平台的兼容性问题
 */
export enum Platform {
    WEB_DESKTOP = 'web-desktop',
    WEB_MOBILE = 'web-mobile',
    WECHAT_MINI_GAME = 'wechat-mini-game',
    ANDROID = 'android',
    IOS = 'ios',
    UNKNOWN = 'unknown'
}

export interface PlatformConfig {
    enableVibration: boolean;
    enableNotifications: boolean;
    maxTextureSize: number;
    audioChannels: number;
    performanceMode: 'high' | 'medium' | 'low';
    storageType: 'localStorage' | 'fileSystem' | 'cloud';
}

export class PlatformAdapter {
    private static _instance: PlatformAdapter | null = null;
    private currentPlatform: Platform;
    private platformConfig: PlatformConfig;
    
    // 平台特性检测
    private features = {
        touchSupport: false,
        accelerometerSupport: false,
        notificationSupport: false,
        vibrationSupport: false,
        cloudSaveSupport: false,
        socialShareSupport: false
    };

    private constructor() {
        this.currentPlatform = this.detectPlatform();
        this.platformConfig = this.createPlatformConfig();
        this.detectFeatures();
        this.adaptToCurrentPlatform();
    }

    public static getInstance(): PlatformAdapter {
        if (!PlatformAdapter._instance) {
            PlatformAdapter._instance = new PlatformAdapter();
        }
        return PlatformAdapter._instance;
    }

    /**
     * 检测当前平台
     */
    private detectPlatform(): Platform {
        if (sys.platform === sys.Platform.WECHAT_GAME) {
            return Platform.WECHAT_MINI_GAME;
        }
        
        if (sys.platform === sys.Platform.ANDROID) {
            return Platform.ANDROID;
        }
        
        if (sys.platform === sys.Platform.IOS) {
            return Platform.IOS;
        }
        
        if (sys.isBrowser) {
            return sys.isMobile ? Platform.WEB_MOBILE : Platform.WEB_DESKTOP;
        }
        
        return Platform.UNKNOWN;
    }

    /**
     * 创建平台特定配置
     */
    private createPlatformConfig(): PlatformConfig {
        const baseConfig: PlatformConfig = {
            enableVibration: false,
            enableNotifications: false,
            maxTextureSize: 2048,
            audioChannels: 4,
            performanceMode: 'medium',
            storageType: 'localStorage'
        };

        switch (this.currentPlatform) {
            case Platform.WECHAT_MINI_GAME:
                return {
                    ...baseConfig,
                    enableVibration: true,
                    maxTextureSize: 1024, // 微信小游戏内存限制
                    audioChannels: 2,
                    performanceMode: 'low',
                    storageType: 'cloud'
                };

            case Platform.ANDROID:
            case Platform.IOS:
                return {
                    ...baseConfig,
                    enableVibration: true,
                    enableNotifications: true,
                    maxTextureSize: 2048,
                    audioChannels: 8,
                    performanceMode: 'high',
                    storageType: 'fileSystem'
                };

            case Platform.WEB_MOBILE:
                return {
                    ...baseConfig,
                    maxTextureSize: 1024,
                    audioChannels: 2,
                    performanceMode: 'medium'
                };

            default:
                return baseConfig;
        }
    }

    /**
     * 检测平台特性
     */
    private detectFeatures(): void {
        // 触摸支持
        this.features.touchSupport = sys.hasFeature(sys.Feature.INPUT_TOUCH);
        
        // 加速度计支持
        this.features.accelerometerSupport = sys.hasFeature(sys.Feature.EVENT_ACCELEROMETER);
        
        // 振动支持
        this.features.vibrationSupport = this.platformConfig.enableVibration && 
            (typeof navigator !== 'undefined' && 'vibrate' in navigator);
        
        // 通知支持
        this.features.notificationSupport = this.platformConfig.enableNotifications &&
            (typeof Notification !== 'undefined');
        
        // 云存档支持
        this.features.cloudSaveSupport = this.currentPlatform === Platform.WECHAT_MINI_GAME ||
            this.currentPlatform === Platform.ANDROID ||
            this.currentPlatform === Platform.IOS;
        
        // 社交分享支持
        this.features.socialShareSupport = this.currentPlatform === Platform.WECHAT_MINI_GAME;

        console.log('🔍 平台特性检测完成:', this.features);
    }

    /**
     * 适配当前平台
     */
    private adaptToCurrentPlatform(): void {
        console.log(`🎯 适配平台: ${this.currentPlatform}`);
        
        // 设置设计分辨率策略
        this.setResolutionPolicy();
        
        // 设置音频配置
        this.configureAudio();
        
        // 设置输入处理
        this.configureInput();
        
        // 设置性能优化
        this.configurePerformance();
    }

    /**
     * 设置分辨率策略
     */
    private setResolutionPolicy(): void {
        const designSize = { width: 1080, height: 1920 };
        
        switch (this.currentPlatform) {
            case Platform.WEB_DESKTOP:
                view.setDesignResolutionSize(designSize.width, designSize.height, 
                    view.ResolutionPolicy.SHOW_ALL);
                break;
                
            case Platform.WEB_MOBILE:
            case Platform.ANDROID:
            case Platform.IOS:
                view.setDesignResolutionSize(designSize.width, designSize.height, 
                    view.ResolutionPolicy.FIXED_WIDTH);
                break;
                
            case Platform.WECHAT_MINI_GAME:
                // 微信小游戏特殊处理
                view.setDesignResolutionSize(designSize.width, designSize.height, 
                    view.ResolutionPolicy.FIXED_WIDTH);
                this.handleWeChatSafeArea();
                break;
        }
    }

    /**
     * 处理微信安全区域
     */
    private handleWeChatSafeArea(): void {
        if (typeof wx !== 'undefined' && wx.getSystemInfo) {
            wx.getSystemInfo({
                success: (res: any) => {
                    const safeArea = res.safeArea;
                    if (safeArea) {
                        console.log('📱 微信安全区域:', safeArea);
                        // 可以在这里调整UI布局
                    }
                }
            });
        }
    }

    /**
     * 配置音频
     */
    private configureAudio(): void {
        // 根据平台配置音频参数
        const audioConfig = {
            channels: this.platformConfig.audioChannels,
            enableWebAudio: this.currentPlatform !== Platform.WECHAT_MINI_GAME
        };
        
        console.log('🔊 音频配置:', audioConfig);
    }

    /**
     * 配置输入
     */
    private configureInput(): void {
        if (this.features.touchSupport) {
            console.log('👆 启用触摸输入');
        }
        
        if (this.features.accelerometerSupport) {
            console.log('📱 启用重力感应');
        }
    }

    /**
     * 配置性能
     */
    private configurePerformance(): void {
        switch (this.platformConfig.performanceMode) {
            case 'high':
                // 高性能模式：启用所有特效
                console.log('⚡ 高性能模式');
                break;
                
            case 'medium':
                // 中性能模式：适中特效
                console.log('🔋 中性能模式');
                break;
                
            case 'low':
                // 低性能模式：最小特效
                console.log('🐌 低性能模式');
                break;
        }
    }

    /**
     * 振动反馈
     */
    public vibrate(duration: number = 100): void {
        if (!this.features.vibrationSupport) return;
        
        switch (this.currentPlatform) {
            case Platform.WECHAT_MINI_GAME:
                if (typeof wx !== 'undefined' && wx.vibrateShort) {
                    wx.vibrateShort();
                }
                break;
                
            case Platform.WEB_MOBILE:
            case Platform.WEB_DESKTOP:
                if (navigator.vibrate) {
                    navigator.vibrate(duration);
                }
                break;
        }
    }

    /**
     * 显示通知
     */
    public showNotification(title: string, body: string): void {
        if (!this.features.notificationSupport) return;
        
        if (Notification.permission === 'granted') {
            new Notification(title, { body });
        } else if (Notification.permission !== 'denied') {
            Notification.requestPermission().then(permission => {
                if (permission === 'granted') {
                    new Notification(title, { body });
                }
            });
        }
    }

    /**
     * 社交分享
     */
    public shareToSocial(data: { title: string; imageUrl?: string }): Promise<boolean> {
        return new Promise((resolve) => {
            if (!this.features.socialShareSupport) {
                resolve(false);
                return;
            }
            
            switch (this.currentPlatform) {
                case Platform.WECHAT_MINI_GAME:
                    if (typeof wx !== 'undefined' && wx.shareAppMessage) {
                        wx.shareAppMessage({
                            title: data.title,
                            imageUrl: data.imageUrl,
                            success: () => resolve(true),
                            fail: () => resolve(false)
                        });
                    } else {
                        resolve(false);
                    }
                    break;
                    
                default:
                    resolve(false);
            }
        });
    }

    /**
     * 获取存储接口
     */
    public getStorage(): any {
        switch (this.platformConfig.storageType) {
            case 'cloud':
                // 微信云存档
                return {
                    setItem: (key: string, value: string) => {
                        if (typeof wx !== 'undefined' && wx.setStorage) {
                            wx.setStorage({ key, data: value });
                        }
                    },
                    getItem: (key: string) => {
                        if (typeof wx !== 'undefined' && wx.getStorage) {
                            return new Promise(resolve => {
                                wx.getStorage({
                                    key,
                                    success: (res: any) => resolve(res.data),
                                    fail: () => resolve(null)
                                });
                            });
                        }
                        return null;
                    }
                };
                
            case 'fileSystem':
                // 原生文件系统 (需要具体实现)
                return localStorage;
                
            default:
                return localStorage;
        }
    }

    /**
     * 获取设备信息
     */
    public getDeviceInfo() {
        return {
            platform: this.currentPlatform,
            features: this.features,
            config: this.platformConfig,
            screenSize: {
                width: view.getCanvasSize().width,
                height: view.getCanvasSize().height
            },
            devicePixelRatio: sys.devicePixelRatio || 1,
            language: sys.language,
            isPortrait: view.getCanvasSize().height > view.getCanvasSize().width
        };
    }

    /**
     * 平台特定的退出处理
     */
    public handleExit(): void {
        switch (this.currentPlatform) {
            case Platform.ANDROID:
                // Android返回键处理
                if (typeof cc !== 'undefined' && (cc as any).sys.os === (cc as any).sys.OS_ANDROID) {
                    // 实现Android返回键逻辑
                }
                break;
                
            case Platform.WECHAT_MINI_GAME:
                // 微信小游戏不允许主动退出
                console.log('微信小游戏环境，无需处理退出');
                break;
                
            default:
                if (typeof window !== 'undefined') {
                    window.close();
                }
        }
    }

    /**
     * 获取平台配置
     */
    public getPlatformConfig(): PlatformConfig {
        return { ...this.platformConfig };
    }

    /**
     * 更新平台配置
     */
    public updatePlatformConfig(updates: Partial<PlatformConfig>): void {
        this.platformConfig = { ...this.platformConfig, ...updates };
        console.log('⚙️ 平台配置已更新:', updates);
    }

    /**
     * 检查平台兼容性
     */
    public checkCompatibility(): { compatible: boolean; issues: string[] } {
        const issues: string[] = [];
        
        // 检查必要特性
        if (this.currentPlatform === Platform.UNKNOWN) {
            issues.push('无法识别的平台');
        }
        
        if (!this.features.touchSupport && sys.isMobile) {
            issues.push('移动设备缺少触摸支持');
        }
        
        return {
            compatible: issues.length === 0,
            issues
        };
    }
}