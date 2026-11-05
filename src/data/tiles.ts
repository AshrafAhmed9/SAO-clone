export const T = {
  GRASS: 0, TALL: 1, PATH: 2, TREE: 3, WATER: 4, ROCK: 5, STONE: 6, WALL: 7, WOOD: 8, ROOF: 9, DARK: 10, SAND: 11,
  FLOWER: 12, LFLOOR: 13, LWALL: 14, DOOR: 15, BRIDGE: 16, TORCH: 17, BOSSF: 18, SKY: 19, FENCE: 20, SPIKE: 21,
  FOUNTAIN: 22, GATE: 23, PILLAR: 24, STAIRS: 25, CARPET: 26,
} as const;

const SOLID = new Set<number>([T.TREE, T.WATER, T.ROCK, T.WALL, T.ROOF, T.LWALL, T.DOOR, T.TORCH, T.SKY, T.FENCE, T.FOUNTAIN, T.GATE, T.PILLAR]);
export const isSolid = (t: number) => SOLID.has(t);
export const TILE = 16;

export class Grid {
  g: number[][];
  constructor(public w: number, public h: number, fill: number = T.GRASS) {
    this.g = Array.from({ length: h }, () => new Array<number>(w).fill(fill));
  }
  inb(x: number, y: number) { return x >= 0 && y >= 0 && x < this.w && y < this.h; }
  set(x: number, y: number, t: number) { if (this.inb(x, y)) this.g[y][x] = t; }
  get(x: number, y: number) { return this.inb(x, y) ? this.g[y][x] : T.SKY; }
  rect(x: number, y: number, w: number, h: number, t: number) {
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) this.set(i, j, t);
  }
  ellipse(cx: number, cy: number, rx: number, ry: number, t: number) {
    for (let j = Math.floor(cy - ry); j <= Math.ceil(cy + ry); j++) for (let i = Math.floor(cx - rx); i <= Math.ceil(cx + rx); i++) {
      const dx = (i - cx) / rx, dy = (j - cy) / ry;
      if (dx * dx + dy * dy <= 1) this.set(i, j, t);
    }
  }
  /** Stroke a polyline with a square brush of given width. */
  path(pts: [number, number][], width: number, t: number) {
    for (let k = 0; k < pts.length - 1; k++) {
      const [x0, y0] = pts[k], [x1, y1] = pts[k + 1];
      const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
      for (let s = 0; s <= n; s++) {
        const x = Math.round(x0 + ((x1 - x0) * s) / (n || 1)), y = Math.round(y0 + ((y1 - y0) * s) / (n || 1));
        this.rect(x - Math.floor(width / 2), y - Math.floor(width / 2), width, width, t);
      }
    }
  }
  border(th: number, t: number, gaps: [number, number, number, number][] = []) {
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
      if (x < th || y < th || x >= this.w - th || y >= this.h - th) {
        if (!gaps.some(([gx, gy, gw, gh]) => x >= gx && y >= gy && x < gx + gw && y < gy + gh)) this.g[y][x] = t;
      }
    }
  }
  scatter(t: number, density: number, rnd: () => number, onlyOn: number[], margin = 0) {
    for (let y = margin; y < this.h - margin; y++) for (let x = margin; x < this.w - margin; x++) {
      if (onlyOn.includes(this.g[y][x]) && rnd() < density) this.g[y][x] = t;
    }
  }
  /** Open-front building: two roof rows on top, roof sides, wood interior, open bottom. */
  house(x: number, y: number, w: number, h: number, floor: number = T.WOOD) {
    this.rect(x, y, w, h, T.ROOF);
    this.rect(x + 1, y + 2, w - 2, h - 2, floor);
  }
}
