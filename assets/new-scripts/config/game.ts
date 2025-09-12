export type AdConfig = {
  bannerId?: string;
  rewardedId?: string;
  interstitialId?: string;
};

// IMPORTANT: leave these empty or inject via your own build process.
// Do NOT hardcode 3rd-party IDs in code to avoid fingerprinting.
export const WECHAT_AD_CONFIG: AdConfig = {
  bannerId: "",
  rewardedId: "adunit-7fc34b1dba8ed852",
  interstitialId: "",
};

export const GAME_BUILD_INFO = {
  sourceFingerprint: "rewrite-clean-v1",
  lastUpdated: "2025-09-12",
};
