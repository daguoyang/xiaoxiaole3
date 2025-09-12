import { sys } from 'cc';

declare const wx: any;

export class WeChatPlatform {
  initShare(defaultTitle: string) {
    if (sys.platform !== sys.Platform.WECHAT_GAME) return;
    try {
      wx.showShareMenu({ withShareTicket: true, menus: ['shareAppMessage', 'shareTimeline'] });
      wx.onShareAppMessage(() => ({ title: defaultTitle }));
      wx.onShareTimeline?.(() => ({ title: defaultTitle }));
    } catch {}
  }

  login(onSuccess?: (code: string) => void) {
    if (sys.platform !== sys.Platform.WECHAT_GAME) {
      onSuccess?.('SIMULATED');
      return;
    }
    try {
      wx.login({ success: (res: any) => onSuccess?.(res?.code || '') });
    } catch {
      onSuccess?.('');
    }
  }

  requirePrivacy(onSuccess?: () => void) {
    if (sys.platform !== sys.Platform.WECHAT_GAME) {
      onSuccess?.();
      return;
    }
    try {
      if (wx.requirePrivacyAuthorize) {
        wx.requirePrivacyAuthorize({
          success: () => onSuccess?.(),
          fail: () => onSuccess?.(),
          complete: () => {},
        });
      } else {
        onSuccess?.();
      }
    } catch {
      onSuccess?.();
    }
  }

  hookGlobalError() {
    if (sys.platform !== sys.Platform.WECHAT_GAME) return;
    try {
      wx.onError?.((err: any) => {
        const msg = typeof err === 'string' ? err : (err?.message || err?.errMsg || '');
        if (msg.includes('updateImageView:fail')) {
          console.warn('[WeChatPlatform] benign imageView warning:', msg);
        } else {
          console.error('[WeChatPlatform] onError:', err);
        }
      });
    } catch {}
  }
}
