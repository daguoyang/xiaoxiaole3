import { sys } from 'cc';

type DifficultyParams = {
  scorePerMatch: number;
  extraTurnReward: number;
  shuffleEnabled: boolean;
};

type HeartParams = {
  maxHearts: number;
  regenMinutes: number;
};

export type BalanceSchema = {
  version: string;
  ab?: Record<string, Partial<BalanceSchema>>; // per-bucket overrides
  difficulty: DifficultyParams;
  hearts: HeartParams;
  drops: { weights: number[] };
  goals: { baseScoreGoal: number };
};

export class BalanceConfig {
  private static _inst: BalanceConfig;
  static get instance() {
    if (!this._inst) this._inst = new BalanceConfig();
    return this._inst;
  }

  private cfg: BalanceSchema | null = null;
  private bucket = 'A';
  private endpoint: string | null = null; // remote json url (optional)

  setEndpoint(url: string | null) {
    this.endpoint = url;
  }

  getBucket() {
    return this.bucket;
  }

  getConfig(): BalanceSchema {
    if (!this.cfg) throw new Error('BalanceConfig not initialized');
    return this.cfg;
  }

  async init(localDefault: BalanceSchema, identitySeed?: string): Promise<void> {
    // assign bucket using stable hash of identity
    this.bucket = this.pickBucket(identitySeed || this.deviceSeed());
    let base = localDefault;
    // apply AB override if present
    if (base.ab && base.ab[this.bucket]) {
      base = this.merge(base, base.ab[this.bucket]!);
    }
    // try remote override if configured
    const remote = await this.fetchRemote().catch(() => null);
    if (remote) {
      // merge remote base
      base = this.merge(base, remote as Partial<BalanceSchema>);
      if (remote.ab && remote.ab[this.bucket]) {
        base = this.merge(base, remote.ab[this.bucket]!);
      }
    }
    this.cfg = base;
  }

  private pickBucket(seed: string): string {
    const h = this.hash(seed);
    const n = h % 100;
    if (n < 50) return 'A';
    if (n < 80) return 'B';
    return 'C';
  }

  private deviceSeed(): string {
    // best-effort seed without PII: platform + language + window size
    return `${sys.platform}-${sys.language}-${sys.windowPixelResolution?.width}x${sys.windowPixelResolution?.height}`;
  }

  private merge<T>(base: T, patch: Partial<T>): T {
    return deepMerge(base, patch);
  }

  private async fetchRemote(): Promise<Partial<BalanceSchema> | null> {
    if (!this.endpoint) return null;
    if (sys.platform === sys.Platform.WECHAT_GAME) {
      try {
        // @ts-ignore
        const wxReq = () => new Promise<any>((res, rej) => wx.request({ url: this.endpoint, method: 'GET', success: r => res(r.data), fail: rej }));
        const data = await wxReq();
        return data;
      } catch {
        return null;
      }
    }
    try {
      const resp = await fetch(this.endpoint);
      if (!resp.ok) return null;
      return (await resp.json()) as Partial<BalanceSchema>;
    } catch {
      return null;
    }
  }

  private hash(s: string): number {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h += (h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24);
    }
    return (h >>> 0);
  }
}

function deepMerge<T>(base: T, patch: Partial<T>): T {
  const out: any = Array.isArray(base) ? [...(base as any)] : { ...(base as any) };
  for (const k in patch) {
    const v: any = (patch as any)[k];
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      out[k] = deepMerge((out as any)[k] ?? {}, v);
    } else {
      out[k] = v;
    }
  }
  return out as T;
}

export const BalanceCfg = BalanceConfig.instance;

