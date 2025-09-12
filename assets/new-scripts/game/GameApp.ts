import { AdService } from '../platform/wechat/AdService';
import { WeChatPlatform } from '../platform/wechat/WeChatPlatform';
import { WECHAT_AD_CONFIG } from '../config/game';
import { FeatureFlags, loadFeatureFlags } from '../config/featureFlags';
import { BalanceCfg, type BalanceSchema } from '../core/BalanceConfig';
import { AnalyticsEx } from '../systems/AnalyticsSystem';
import { JsonAsset, resources } from 'cc';
import { DebugOverlay } from '../ui/DebugOverlay';

export class GameApp {
  private ad: AdService;
  private wxp: WeChatPlatform;

  constructor() {
    this.wxp = new WeChatPlatform();
    this.ad = new AdService(WECHAT_AD_CONFIG);
  }

  init() {
    this.wxp.requirePrivacy(async () => {
      // Runtime override of feature flags
      await loadFeatureFlags();
      this.wxp.login(() => {
        this.wxp.initShare('一起挑战三消关卡！');
      });
      this.wxp.hookGlobalError();
      // analytics
      AnalyticsEx.setEnabled(FeatureFlags.ENABLE_ANALYTICS);
      AnalyticsEx.setTransportUrl(undefined); // keep console for now
      AnalyticsEx.hookLifecycle();
      AnalyticsEx.track('app_start', { flags: FeatureFlags });

      // balance config: load local json (prebundled), optional remote override later
      const local: BalanceSchema = await this.loadLocalBalance();
      if (FeatureFlags.ENABLE_REMOTE_CONFIG) {
        // TODO: replace with your remote URL after going live
        BalanceCfg.setEndpoint('');
      } else {
        BalanceCfg.setEndpoint(null);
      }
      await BalanceCfg.init(local);
      AnalyticsEx.track('balance_ready', { bucket: BalanceCfg.getBucket(), ver: local.version });

      // Mount dev overlay if enabled
      DebugOverlay.mount();
    });
  }

  showAdForReward(onOk?: () => void, onFail?: () => void) {
    if (!FeatureFlags.ENABLE_ADS) {
      // 提审关闭广告时，直接回调成功（或提示）
      onOk?.();
      return;
    }
    this.ad.showRewarded(onOk, onFail);
  }

  private async loadLocalBalance(): Promise<BalanceSchema> {
    // Prefer runtime load from resources; fallback to embedded defaults.
    const fallback: BalanceSchema = {
      version: '1.0.0',
      difficulty: { scorePerMatch: 60, extraTurnReward: 0, shuffleEnabled: true },
      hearts: { maxHearts: 5, regenMinutes: 15 },
      drops: { weights: [1,1,1,1,1,1] },
      goals: { baseScoreGoal: 10000 },
      ab: { B: { difficulty: { scorePerMatch: 55 } }, C: { difficulty: { scorePerMatch: 50, shuffleEnabled: false } } }
    };
    try {
      const asset = await new Promise<JsonAsset>((resolve, reject) => {
        resources.load('config/balance.default', JsonAsset, (err, a) => (err || !a) ? reject(err) : resolve(a));
      });
      return asset.json as BalanceSchema;
    } catch {
      return fallback;
    }
  }
}
