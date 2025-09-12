export const FeatureFlags = {
  ENABLE_ADS: true,            // 提审可设为 false
  ENABLE_ANALYTICS: true,      // 提审可设为 false
  ENABLE_REMOTE_CONFIG: false, // 首包建议 false，过审后再启用
  DEBUG_OVERLAY: true,         // 开发期显示重写版水印与调试信息
};

// Load overrides from resources/config/featureFlags.json if exists
export async function loadFeatureFlags(): Promise<void> {
  try {
    const mod = await import('cc');
    const { resources, JsonAsset } = mod as any;
    const asset: any = await new Promise((resolve, reject) =>
      resources.load('config/featureFlags', JsonAsset, (err: any, a: any) => (err || !a) ? reject(err) : resolve(a))
    );
    const json = asset.json || {};
    if (typeof json.ENABLE_ADS === 'boolean') FeatureFlags.ENABLE_ADS = json.ENABLE_ADS;
    if (typeof json.ENABLE_ANALYTICS === 'boolean') FeatureFlags.ENABLE_ANALYTICS = json.ENABLE_ANALYTICS;
    if (typeof json.ENABLE_REMOTE_CONFIG === 'boolean') FeatureFlags.ENABLE_REMOTE_CONFIG = json.ENABLE_REMOTE_CONFIG;
    if (typeof json.DEBUG_OVERLAY === 'boolean') FeatureFlags.DEBUG_OVERLAY = json.DEBUG_OVERLAY;
  } catch {
    // no override file; keep defaults
  }
}
