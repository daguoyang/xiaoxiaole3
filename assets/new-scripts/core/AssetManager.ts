import { assetManager, Asset, resources } from 'cc';

type Loadable = string;

class Ref<T extends Asset> {
  constructor(public asset: T, public refCount = 0, public lastUse = Date.now()) {}
}

export class AssetManagerEx {
  private static _inst: AssetManagerEx;
  static get instance() {
    if (!this._inst) this._inst = new AssetManagerEx();
    return this._inst;
  }

  private cache = new Map<string, Ref<Asset>>();
  private maxItems = 200; // basic LRU cap; tune later

  async load<T extends Asset>(path: Loadable, type?: new (...args: any[]) => T): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const hit = this.cache.get(path) as Ref<T> | undefined;
      if (hit) {
        hit.lastUse = Date.now();
        resolve(hit.asset);
        return;
      }
      const loader = type ? resources.load.bind(resources, path, type) : resources.load.bind(resources, path);
      loader((err: any, asset: T) => {
        if (err || !asset) return reject(err || new Error('Load failed'));
        this.cache.set(path, new Ref(asset, 0));
        resolve(asset);
        this.trimLRU();
      });
    });
  }

  preload(list: Loadable[], onProgress?: (finished: number, total: number) => void): Promise<void> {
    return new Promise((resolve, reject) => {
      let finished = 0;
      const total = list.length;
      if (total === 0) return resolve();
      list.forEach((p) => {
        resources.preload(p, (err) => {
          finished++;
          onProgress?.(finished, total);
          if (err) console.warn('Preload warn:', p, err);
          if (finished === total) resolve();
        });
      });
    });
  }

  retain(path: string) {
    const r = this.cache.get(path);
    if (r) r.refCount++;
  }

  release(path: string) {
    const r = this.cache.get(path);
    if (!r) return;
    r.refCount = Math.max(0, r.refCount - 1);
    if (r.refCount === 0) this.tryRelease(path, r);
  }

  releaseUnused() {
    for (const [k, r] of this.cache) {
      if (r.refCount === 0) this.tryRelease(k, r);
    }
  }

  stats() {
    let total = 0;
    for (const _ of this.cache) total++;
    return { items: total, cap: this.maxItems };
  }

  private tryRelease(path: string, r: Ref<Asset>) {
    try {
      r.asset.decRef?.();
      assetManager.releaseAsset(r.asset);
    } catch {}
    this.cache.delete(path);
  }

  private trimLRU() {
    if (this.cache.size <= this.maxItems) return;
    const zero = Array.from(this.cache.entries()).filter(([, r]) => r.refCount === 0);
    zero.sort((a, b) => a[1].lastUse - b[1].lastUse);
    const need = this.cache.size - this.maxItems;
    for (let i = 0; i < need && i < zero.length; i++) this.tryRelease(zero[i][0], zero[i][1]);
  }
}

export const AssetMgr = AssetManagerEx.instance;

