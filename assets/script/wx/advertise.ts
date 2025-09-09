import { sys } from "cc";
import { EventName } from "../definitions/eventName";
import { App } from "../core/app";
import { WxMgr } from "./wxManager";

export class Ads {
    public bannerAdv = null;//banner广告
    public videoAdv = null;//激励式视频广告
    public interstitialAd = null;//插屏广告

    private bannerId: string = "";// banner广告id
    private videoId: string = "adunit-7fc34b1dba8ed852";// 激励式视频广告id
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
        this.bannerAdv.show();
    }

    // 隐藏banner广告
    hideBannerAds() {
        if (sys.platform != sys.Platform.WECHAT_GAME) return;
        // @ts-ignore
        this.bannerAdv.hide();
    }

    //显示视频广告
    showVideoAds() {
        if (sys.platform != sys.Platform.WECHAT_GAME) {
            console.log("非微信小游戏环境，模拟广告播放完成");
            // 非微信环境下模拟广告播放成功
            setTimeout(() => {
                console.log("模拟广告播放完成，给予奖励");
            }, 1000);
            return;
        }

        console.log("开始显示激励视频广告，ID:", this.videoId);
        
        if (!this.videoAdv) {
            console.error("视频广告实例未初始化");
            return;
        }

        // @ts-ignore
        let videoAdv = this.videoAdv;
        
        // 先设置错误处理
        // @ts-ignore
        videoAdv.onError((err) => {
            console.error("激励视频广告错误:", err);
            console.error("错误详情:", JSON.stringify(err));
        });

        // 设置关闭回调
        // @ts-ignore
        videoAdv.onClose((res) => {
            if (!videoAdv) return;
            // @ts-ignore
            videoAdv.offClose();//需要清除回调，否则第N次广告会一次性给N个奖励
            console.log("广告关闭，结果:", res);
            
            //关闭
            if (res && res.isEnded || res === undefined) {
                //正常播放结束，需要下发奖励
                console.log("广告播放完成，给予奖励");
                WxMgr.addReward();
            } else {
                //播放退出，不下发奖励
                console.log("广告未播放完成，不给奖励");
            }
        });

        // 用户触发广告后，显示激励视频广告
        // @ts-ignore
        videoAdv.show().catch((err) => {
            console.error("广告显示失败，尝试重新加载:", err);
            // 失败重试
            // @ts-ignore
            videoAdv.load()
                // @ts-ignore
                .then(() => {
                    console.log("广告重新加载成功，再次显示");
                    return videoAdv.show();
                })
                .catch(retryErr => {
                    console.error('激励视频广告显示失败，重试也失败:', retryErr);
                })
        });
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

        this.showVideoAdsWithCallback(
            () => {
                WxMgr.addHeartReward();
                onSuccess && onSuccess();
            },
            onFail
        );
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

        this.showVideoAdsWithCallback(
            () => {
                WxMgr.addToolReward(toolType);
                onSuccess && onSuccess();
            },
            onFail
        );
    }

    /** 通用的带回调的广告显示方法 */
    private showVideoAdsWithCallback(onSuccess?: () => void, onFail?: () => void) {
        console.log("开始显示激励视频广告，ID:", this.videoId);
        
        if (!this.videoAdv) {
            console.error("视频广告实例未初始化");
            onFail && onFail();
            return;
        }

        // @ts-ignore
        let videoAdv = this.videoAdv;
        
        // 设置错误处理
        // @ts-ignore
        videoAdv.onError((err) => {
            console.error("激励视频广告错误:", err);
            console.error("错误详情:", JSON.stringify(err));
            onFail && onFail();
        });

        // 设置关闭回调
        // @ts-ignore
        videoAdv.onClose((res) => {
            if (!videoAdv) return;
            // @ts-ignore
            videoAdv.offClose();//需要清除回调，否则第N次广告会一次性给N个奖励
            console.log("广告关闭，结果:", res);
            
            //关闭
            if (res && res.isEnded || res === undefined) {
                //正常播放结束，需要下发奖励
                console.log("广告播放完成，给予奖励");
                onSuccess && onSuccess();
            } else {
                //播放退出，不下发奖励
                console.log("广告未播放完成，不给奖励");
                onFail && onFail();
            }
        });

        // 用户触发广告后，显示激励视频广告
        // @ts-ignore
        videoAdv.show().catch((err) => {
            console.error("广告显示失败，尝试重新加载:", err);
            // 失败重试
            // @ts-ignore
            videoAdv.load()
                // @ts-ignore
                .then(() => {
                    console.log("广告重新加载成功，再次显示");
                    return videoAdv.show();
                })
                .catch(retryErr => {
                    console.error('激励视频广告显示失败，重试也失败:', retryErr);
                    onFail && onFail();
                })
        });
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