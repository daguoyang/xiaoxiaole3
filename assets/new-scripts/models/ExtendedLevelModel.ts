import { JsonAsset, resources } from 'cc';

export type LevelGoal = {
  type: 'score' | 'collect' | 'survive';
  target: number;
  itemId?: number;
};

export type LevelConfig = {
  id: number;
  rows: number;
  cols: number;
  seed?: number;
  moves: number;
  tiles?: number[][]; // optional fixed layout
  spawnPool?: number[]; // random pool when tiles missing
  obstacles?: { r: number; c: number; type: string; hp?: number }[];
  goals: LevelGoal[];
};

type PackIndex = { pack: string; levels: number[] };

export class ExtendedLevelModel {
  private static _inst: ExtendedLevelModel;
  static get instance() {
    if (!this._inst) this._inst = new ExtendedLevelModel();
    return this._inst;
  }

  private packs = new Map<string, LevelConfig[]>();

  async preloadPack(packName: string): Promise<void> {
    if (this.packs.has(packName)) return;
    const path = `levels/${packName}`; // resources/levels/{pack}.json
    const asset = await this.loadJson(path);
    const data = asset.json as LevelConfig[];
    // runtime validation (lightweight)
    if (!Array.isArray(data)) throw new Error(`${packName} must be an array`);
    data.forEach((lv, i) => {
      if (typeof lv.id !== 'number') throw new Error(`${packName}[${i}] id required`);
      if (typeof lv.rows !== 'number' || typeof lv.cols !== 'number') throw new Error(`${packName}[${i}] rows/cols required`);
      if (typeof lv.moves !== 'number') throw new Error(`${packName}[${i}] moves required`);
      if (!Array.isArray(lv.goals) || lv.goals.length === 0) throw new Error(`${packName}[${i}] goals required`);
    });
    this.packs.set(packName, data);
  }

  async preloadRange(firstPack: string, ...morePacks: string[]) {
    const all = [firstPack, ...morePacks];
    for (const p of all) await this.preloadPack(p);
  }

  getLevel(packName: string, levelId: number): LevelConfig | undefined {
    const arr = this.packs.get(packName);
    if (!arr) return undefined;
    return arr.find((l) => l.id === levelId);
  }

  listLevels(packName: string): number[] {
    const arr = this.packs.get(packName) || [];
    return arr.map((l) => l.id);
  }

  private loadJson(path: string): Promise<JsonAsset> {
    return new Promise((resolve, reject) => {
      resources.load(path, JsonAsset, (err, asset) => {
        if (err || !asset) return reject(err || new Error('json load failed'));
        resolve(asset);
      });
    });
  }
}

export const LevelModel = ExtendedLevelModel.instance;
