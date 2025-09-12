import { sys } from "cc";
import { EventName } from "../definitions/eventName";
import { App } from "../core/app";
import { WxMgr } from "./wxManager";

export class Ads {
    public bannerAdv = null;//banner广告
    public videoAdv = null;//激励式视频广告
    public interstitialAd = null;//插屏广告

    private bannerId: string = "";// banner广告id
    private videoId: string = "";// 激励式视频广告id（重写后由新模块注入）
    private interstitialId: string = "";// 插屏r广告id
    constructor() {
        this.init();
    }

    init() {
        if (sys.platform != sys.Platform.WECHAT_GAME) return;
        console.log('--------------init ads-----------------');
        // @ts-ignore
        let winSize = wx.getSystemInfoSync();//获取像素size
        // 创建 Banner 广告实例，提前初始化
        let bannerWidth = 300
        let bannerHeight = 80
        // @ts-ignore
        let bannerAdv = wx.createBannerAd({
            adUnitId: this.bannerId,//传入自己的id，此处为banner广告位ID
            adIntervals: 30,//定时刷新，最低30S
            style: {
                left: (winSize.windowWidth - bannerWidth) / 2,
                top: winSize.windowHeight - bannerHeight,
                width: bannerWidth,
            },
        })
        this.bannerAdv = bannerAdv;
        //重新定banner位置
        bannerAdv.onResize((res) => {
            bannerAdv.style.top = winSize.windowHeight - bannerAdv.style.realHeight - 1;
        })
        // // 在适合的场景显示 Banner 广告
        // bannerAdv.show();//不建议直接显示
        //拉取失败处理
        bannerAdv.onError((err) => {
            console.log(err);
        })

        // @ts-ignore 创建激励视频广告实例，提前初始化
        if (this.videoId) {
            let videoAdv = wx.createRewardedVideoAd({
                adUnitId: this.videoId//传入自己的id，此处为视频广告位ID
            })
            videoAdv.onError((err) => {
                console.error("创建视频广告时发生错误:", err);
                console.error("广告ID:", this.videoId);
            })
            this.videoAdv = videoAdv;
            console.log("激励视频广告初始化成功，ID:", this.videoId);
        } else {
            console.warn("视频广告ID为空，跳过视频广告初始化");
        }
        // 创建插屏广告实例，提前初始化
        // @ts-ignore
        if (wx.createInterstitialAd) {
            // @ts-ignore
            let interstitialAd = wx.createInterstitialAd({
                adUnitId: this.interstitialId//传入自己的id，此处为插屏广告位ID
            })
            this.interstitialAd = interstitialAd;
        }
    }
    //显示banner广告
    showBannerAds() {
        if (sys.platform != sys.Platform.WECHAT_GAME) return;
        // 在适合的场景显示 Banner 广告
        // @ts-ignore
        this.bannerAdv?.show?.();
    }

    // 隐藏banner广告
    hideBannerAds() {
        if (sys.platform != sys.Platform.WECHAT_GAME) return;
        // @ts-ignore
        this.bannerAdv.hide();
    }

    //显示视频广告（桥接到新平台 AdService）
    async showVideoAds() {
        try {
            const bridge = await import('../../scripts/bridge/NewAppBridge');
            bridge.showRewardedFromBridge(() => {
                WxMgr.addReward();
            }, () => {
                console.log('激励视频未完成');
            });
        } catch (e) {
            console.error('桥接新广告服务失败:', e);
        }
    }

    /** 显示视频广告获取体力 */
    showVideoAdsForHeart(onSuccess?: () => void, onFail?: () => void) {
        if (sys.platform != sys.Platform.WECHAT_GAME) {
            console.log("非微信小游戏环境，模拟广告播放完成 - 体力奖励");
            setTimeout(() => {
                console.log("模拟广告播放完成，给予体力奖励");
                WxMgr.addHeartReward();
                onSuccess && onSuccess();
            }, 1000);
            return;
        }
        // 桥接新服务统一处理
        (async () => {
            try {
                const bridge = await import('../../scripts/bridge/NewAppBridge');
                bridge.showRewardedFromBridge(() => {
                    WxMgr.addHeartReward();
                    onSuccess && onSuccess();
                }, () => onFail && onFail());
            } catch (e) { console.error('桥接新广告服务失败:', e); onFail && onFail(); }
        })();
    }

    /** 显示视频广告获取道具 */
    showVideoAdsForTool(toolType: any, onSuccess?: () => void, onFail?: () => void) {
        if (sys.platform != sys.Platform.WECHAT_GAME) {
            console.log("非微信小游戏环境，模拟广告播放完成 - 道具奖励");
            setTimeout(() => {
                console.log("模拟广告播放完成，给予道具奖励");
                WxMgr.addToolReward(toolType);
                onSuccess && onSuccess();
            }, 1000);
            return;
        }
        (async () => {
            try {
                const bridge = await import('../../scripts/bridge/NewAppBridge');
                bridge.showRewardedFromBridge(() => { WxMgr.addToolReward(toolType); onSuccess && onSuccess(); }, () => onFail && onFail());
            } catch (e) { console.error('桥接新广告服务失败:', e); onFail && onFail(); }
        })();
    }

    /** 通用的带回调的广告显示方法 */
    private async showVideoAdsWithCallback(onSuccess?: () => void, onFail?: () => void) {
        try {
            const bridge = await import('../../scripts/bridge/NewAppBridge');
            bridge.showRewardedFromBridge(() => {
                onSuccess && onSuccess();
            }, () => {
                onFail && onFail();
            });
        } catch (e) {
            console.error('桥接新广告服务失败:', e);
            onFail && onFail();
        }
    }

    // 显示插件广告
    showInterstitialAds() {
        if (sys.platform != sys.Platform.WECHAT_GAME) return;
        let interstitialAd = this.interstitialAd;
        // 在适合的场景显示插屏广告
        if (interstitialAd) {
            // @ts-ignore
            interstitialAd.show().catch((err) => {
                console.error(err)
            })
        }

    }
}

export let Advertise = new Ads();
