export class Gravity {
  // Placeholder: apply gravity from bottom to top, filling gaps
  apply<T>(grid: {
    rows: number;
    cols: number;
    get(r: number, c: number): T | undefined;
    set(r: number, c: number, v: T): void;
  }, spawn: (c: number) => T) {
    for (let c = 0; c < grid.cols; c++) {
      let write = grid.rows - 1;
      for (let r = grid.rows - 1; r >= 0; r--) {
        const v = grid.get(r, c);
        if (v !== undefined && v !== null) {
          grid.set(write, c, v as T);
          write--;
        }
      }
      while (write >= 0) {
        grid.set(write, c, spawn(c));
        write--;
      }
    }
  }
}

