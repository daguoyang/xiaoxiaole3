export class Grid<T = number> {
  private data: T[][];
  readonly rows: number;
  readonly cols: number;

  constructor(rows: number, cols: number, fill: (r: number, c: number) => T) {
    this.rows = rows;
    this.cols = cols;
    this.data = Array.from({ length: rows }, (_, r) =>
      Array.from({ length: cols }, (_, c) => fill(r, c))
    );
  }

  get(r: number, c: number): T | undefined {
    if (r < 0 || c < 0 || r >= this.rows || c >= this.cols) return undefined;
    return this.data[r][c];
  }

  set(r: number, c: number, v: T) {
    if (r < 0 || c < 0 || r >= this.rows || c >= this.cols) return;
    this.data[r][c] = v;
  }

  swap(a: [number, number], b: [number, number]) {
    const va = this.get(a[0], a[1]);
    const vb = this.get(b[0], b[1]);
    if (va === undefined || vb === undefined) return;
    this.set(a[0], a[1], vb as T);
    this.set(b[0], b[1], va as T);
  }
}

