import { GameApp } from '../../../assets/new-scripts/game/GameApp';
import { LevelModel } from '../../../assets/new-scripts/models/ExtendedLevelModel';
import { AssetMgr } from '../../../assets/new-scripts/core/AssetManager';

let app: GameApp | null = null;

export async function initNewApp() {
  if (!app) app = new GameApp();
  app.init();
  // Preload example level pack
  await LevelModel.preloadPack('pack-001');
  // Preload a few UI textures via new AssetManager (demonstration)
  try {
    await AssetMgr.preload([
      'levels/pack-001'
    ], (f, t) => { if (f === t) console.log('✅ New AssetMgr preload done'); });
    console.log('AssetMgr stats:', AssetMgr.stats());
  } catch (e) {
    console.warn('AssetMgr preload skipped:', e);
  }
  console.log('🧩 新平台与关卡模块初始化完成');
}

export function showRewardedFromBridge(onSuccess?: () => void, onFail?: () => void) {
  if (!app) {
    console.warn('NewApp not inited, initializing on-demand');
    initNewApp().then(() => app!.showAdForReward(onSuccess, onFail));
    return;
  }
  app.showAdForReward(onSuccess, onFail);
}
