import { _decorator, Color, Label, Layers, Node, UITransform, Vec3, director, Canvas } from 'cc';
import { FeatureFlags } from '../config/featureFlags';
import { GAME_BUILD_INFO, WECHAT_AD_CONFIG } from '../config/game';
import { BalanceCfg } from '../core/BalanceConfig';

const OVERLAY_NAME = 'DebugOverlay';

export class DebugOverlay {
  static mount() {
    if (!FeatureFlags.DEBUG_OVERLAY) return;
    const scene = director.getScene();
    if (!scene) return;
    // attach to existing Canvas if present, else to scene
    const canvas = scene.getComponentInChildren(Canvas);
    const parent = canvas ? canvas.node : scene;
    let root = parent.getChildByName(OVERLAY_NAME);
    if (!root) {
      root = new Node(OVERLAY_NAME);
      root.layer = Layers.Enum.UI_2D;
      const tf = root.addComponent(UITransform);
      tf.setContentSize(10, 10);
      parent.addChild(root);
      root.setSiblingIndex(9999);
      tf.setAnchorPoint(0, 0);
      root.setPosition(new Vec3(6, 6, 0));
      // base label
      const labelNode = new Node('Label');
      labelNode.layer = Layers.Enum.UI_2D;
      const ltf = labelNode.addComponent(UITransform);
      ltf.setContentSize(10, 10);
      ltf.setAnchorPoint(0, 0);
      const lb = labelNode.addComponent(Label);
      lb.color = new Color(255, 255, 255, 220);
      lb.fontSize = 18;
      lb.lineHeight = 22;
      lb.string = DebugOverlay.compactText();
      root.addChild(labelNode);
      labelNode.setPosition(new Vec3(0, 0, 0));
      console.log('[DevOverlay] mounted');

      let details = false;
      root.on(Node.EventType.TOUCH_END, () => {
        details = !details;
        lb.string = details ? DebugOverlay.detailText() : DebugOverlay.compactText();
        if (details) {
          console.log('[DevOverlay] Tap overlay再次触发激励广告测试');
        }
      });

      // second tap within detail state triggers ad test
      labelNode.on(Node.EventType.TOUCH_END, async () => {
        if (!details) return;
        try {
          const bridge = await import('../../scripts/bridge/NewAppBridge');
          console.log('[DevOverlay] Running rewarded ad test...');
          bridge.showRewardedFromBridge(() => console.log('[DevOverlay] Rewarded complete'), () => console.log('[DevOverlay] Rewarded not completed'));
        } catch (e) {
          console.warn('[DevOverlay] Ad test failed:', e);
        }
      });
    }
  }

  private static compactText() {
    const flags = FeatureFlags;
    const bucket = BalanceCfg.getBucket?.() || 'A';
    return `⭐ 重写版 ${GAME_BUILD_INFO.sourceFingerprint} | Ads:${flags.ENABLE_ADS?'on':'off'} | Ana:${flags.ENABLE_ANALYTICS?'on':'off'} | Bkt:${bucket}`;
  }

  private static detailText() {
    const flags = FeatureFlags;
    const bucket = BalanceCfg.getBucket?.() || 'A';
    const ad = WECHAT_AD_CONFIG.rewardedId || '-';
    return [
      `⭐ 重写版 ${GAME_BUILD_INFO.sourceFingerprint}`,
      `Ads:${flags.ENABLE_ADS?'on':'off'} Ana:${flags.ENABLE_ANALYTICS?'on':'off'} Remote:${flags.ENABLE_REMOTE_CONFIG?'on':'off'}`,
      `Bucket:${bucket}`,
      `Rewarded:${ad}`,
      `Tap again to test rewarded`
    ].join('\n');
  }
}
