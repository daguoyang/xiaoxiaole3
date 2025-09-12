import { sys } from 'cc';
import type { AdConfig } from '../../config/game';
import { AnalyticsEx } from '../../systems/AnalyticsSystem';

declare const wx: any;

export class AdService {
  private readonly cfg: AdConfig;
  private banner: any;
  private rewarded: any;
  private interstitial: any;

  constructor(cfg: AdConfig) {
    this.cfg = cfg || {};
    if (sys.platform !== sys.Platform.WECHAT_GAME) return;
    try {
      if (this.cfg.bannerId) {
        this.banner = wx.createBannerAd({
          adUnitId: this.cfg.bannerId,
          adIntervals: 30,
          style: { left: 0, top: 0, width: 300 },
        });
        this.banner.onError?.((err: any) => {
          console.warn('BannerAd onError:', err);
        });
      }
      if (this.cfg.rewardedId) {
        this.rewarded = wx.createRewardedVideoAd({ adUnitId: this.cfg.rewardedId });
        this.rewarded.onError?.((err: any) => {
          console.warn('RewardedVideoAd onError:', err);
        });
      }
      if (this.cfg.interstitialId && wx.createInterstitialAd) {
        this.interstitial = wx.createInterstitialAd({ adUnitId: this.cfg.interstitialId });
        this.interstitial.onError?.((err: any) => {
          console.warn('InterstitialAd onError:', err);
        });
      }
    } catch (e) {
      console.warn('Ad init skipped:', e);
    }
  }

  showBanner() {
    if (sys.platform !== sys.Platform.WECHAT_GAME || !this.banner) return;
    this.banner.show?.().catch(() => {});
  }

  hideBanner() {
    if (sys.platform !== sys.Platform.WECHAT_GAME || !this.banner) return;
    this.banner.hide?.();
  }

  showRewarded(onSuccess?: () => void, onFail?: () => void) {
    if (sys.platform !== sys.Platform.WECHAT_GAME) {
      // Simulate success outside WeChat
      AnalyticsEx.track('ad_rewarded_sim', { env: 'non_wechat' });
      setTimeout(() => onSuccess?.(), 300);
      return;
    }
    if (!this.rewarded) {
      AnalyticsEx.track('ad_rewarded_missing', {});
      onFail?.();
      return;
    }
    const adv = this.rewarded;
    adv.offClose?.();
    AnalyticsEx.track('ad_rewarded_show', {});
    adv.onClose((res: any) => {
      adv.offClose?.();
      if (res && (res.isEnded || res.isEnded === undefined)) {
        AnalyticsEx.track('ad_rewarded_complete', {});
        onSuccess?.();
      } else {
        AnalyticsEx.track('ad_rewarded_incomplete', {});
        onFail?.();
      }
    });
    adv
      .show()
      .catch(() => adv.load().then(() => adv.show()).catch(() => { AnalyticsEx.track('ad_rewarded_error', {}); onFail?.(); }));
  }

  showInterstitial() {
    if (sys.platform !== sys.Platform.WECHAT_GAME || !this.interstitial) return;
    this.interstitial.show?.().catch(() => {});
  }
}
