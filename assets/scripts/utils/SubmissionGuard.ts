let cached: boolean | null = null;

async function loadFlag(): Promise<boolean> {
  try {
    if (cached !== null) return cached;
    const mod = await import('../../new-scripts/config/featureFlags');
    // @ts-ignore
    cached = !!mod.FeatureFlags?.ENABLE_ADS;
    return cached;
  } catch {
    return true; // default allow ads if flags not present
  }
}

export async function adsEnabled(): Promise<boolean> {
  return await loadFlag();
}

export async function ensureAdsEnabledOrToast(): Promise<boolean> {
  const enabled = await loadFlag();
  if (!enabled) {
    // Avoid coupling to old App during build; leave a console note.
    console.warn('当前版本未开启广告功能');
  }
  return enabled;
}
