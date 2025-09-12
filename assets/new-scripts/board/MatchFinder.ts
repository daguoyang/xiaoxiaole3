export type Match = { cells: [number, number][] };

export class MatchFinder {
  // Placeholder: implement fresh match-3 detection (rows/cols >= 3)
  findAll<T>(grid: { rows: number; cols: number; get(r: number, c: number): T | undefined }): Match[] {
    // Intentionally left minimal for rewrite bootstrap
    return [];
  }
}

