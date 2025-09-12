import { sys } from 'cc';

export type EventPayload = Record<string, any>;

export interface Transport {
  send(event: string, payload: EventPayload): Promise<void>;
  flush?(): Promise<void>;
}

class ConsoleTransport implements Transport {
  async send(event: string, payload: EventPayload) {
    console.log('[ANALYTICS]', event, payload);
  }
  async flush() {}
}

class WeChatHttpTransport implements Transport {
  constructor(private url: string) {}
  async send(event: string, payload: EventPayload) {
    if (sys.platform !== sys.Platform.WECHAT_GAME) return;
    // @ts-ignore
    await new Promise<void>((resolve) => wx.request({ url: this.url, method: 'POST', data: { event, payload }, complete: () => resolve() }));
  }
  async flush() {}
}

export class AnalyticsSystemEx {
  private static _inst: AnalyticsSystemEx;
  static get instance() { return (this._inst ||= new AnalyticsSystemEx()); }

  private queue: { event: string; payload: EventPayload }[] = [];
  private transport: Transport = new ConsoleTransport();
  private enabled = true;

  setTransportUrl(url?: string) {
    if (url && sys.platform === sys.Platform.WECHAT_GAME) this.transport = new WeChatHttpTransport(url);
    else this.transport = new ConsoleTransport();
  }

  setEnabled(v: boolean) { this.enabled = v; }

  track(event: string, payload: EventPayload = {}) {
    if (!this.enabled) return;
    const now = Date.now();
    const base = { t: now, plat: sys.platform, ver: 'rewrite-clean' };
    this.queue.push({ event, payload: { ...base, ...payload } });
    if (this.queue.length >= 10) this.flush();
  }

  async flush() {
    const items = this.queue.splice(0, this.queue.length);
    for (const it of items) {
      try { await this.transport.send(it.event, it.payload); } catch {}
    }
  }

  hookLifecycle() {
    if (sys.platform === sys.Platform.WECHAT_GAME) {
      // @ts-ignore
      wx.onHide?.(() => this.flush());
      // @ts-ignore
      wx.onShow?.(() => {});
    }
  }
}

export const AnalyticsEx = AnalyticsSystemEx.instance;

