import { T, TILE, isSolid } from '../data/tiles';
import { mulberry32 } from '../engine/util';

export const BAKE = 3; // pixels per world pixel in the cached ground canvas

const shade = (hex: string, f: number) => {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.max(0, Math.min(255, ((n >> 16) & 255) * f)), g = Math.max(0, Math.min(255, ((n >> 8) & 255) * f)), b = Math.max(0, Math.min(255, (n & 255) * f));
  return `rgb(${r | 0},${g | 0},${b | 0})`;
};

export interface Baked { canvas: HTMLCanvasElement; water: [number, number][]; torches: [number, number][]; spikes: [number, number][]; cliff: [number, number][] }

export function bakeZone(grid: number[][], zoneId: string): Baked {
  const h = grid.length, w = grid[0].length;
  const canvas = document.createElement('canvas');
  canvas.width = w * TILE * BAKE; canvas.height = h * TILE * BAKE;
  const c = canvas.getContext('2d')!;
  c.scale(BAKE, BAKE);
  const rnd = mulberry32(zoneId.length * 1013 + w);
  const water: [number, number][] = [], torches: [number, number][] = [], spikes: [number, number][] = [], cliff: [number, number][] = [];
  const at = (x: number, y: number) => (x < 0 || y < 0 || x >= w || y >= h ? T.SKY : grid[y][x]);
  const dungeon = zoneId.startsWith('lab') || zoneId === 'bossroom';

  // pass 1: ground
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const t = grid[y][x]; const px = x * TILE, py = y * TILE; const v = 0.94 + rnd() * 0.12;
    switch (t) {
      case T.GRASS: case T.TALL: case T.FLOWER: case T.TREE: case T.FENCE: {
        const dark = zoneId === 'thornwood';
        c.fillStyle = shade(dark ? '#3c6b3a' : '#5da34a', v); c.fillRect(px, py, TILE, TILE);
        c.fillStyle = shade(dark ? '#2f5a30' : '#4f9440', v);
        for (let i = 0; i < 3; i++) c.fillRect(px + rnd() * 14, py + rnd() * 14, 1, 2.2);
        if (t === T.TALL) { c.fillStyle = shade(dark ? '#264d28' : '#3e8236', v); for (let i = 0; i < 6; i++) { const bx = px + 1 + rnd() * 13, by = py + 4 + rnd() * 10; c.fillRect(bx, by - 4, 1.1, 5); } }
        if (t === T.FLOWER) { const cols = ['#fff3a0', '#ff9ec7', '#bfe0ff', '#ffffff']; for (let i = 0; i < 3; i++) { c.fillStyle = cols[(rnd() * 4) | 0]; c.fillRect(px + 2 + rnd() * 11, py + 2 + rnd() * 11, 1.8, 1.8); } }
        break;
      }
      case T.DARK: {
        c.fillStyle = shade('#3c6b3a', v); c.fillRect(px, py, TILE, TILE);
        c.fillStyle = shade('#2f5a30', v); for (let i = 0; i < 3; i++) c.fillRect(px + rnd() * 14, py + rnd() * 14, 1, 2.2);
        break;
      }
      case T.PATH: {
        c.fillStyle = shade('#b99a6a', v); c.fillRect(px, py, TILE, TILE);
        c.fillStyle = shade('#a08556', v); for (let i = 0; i < 4; i++) c.fillRect(px + rnd() * 14, py + rnd() * 14, 1.6, 1.2);
        break;
      }
      case T.SAND: c.fillStyle = shade('#e3d29c', v); c.fillRect(px, py, TILE, TILE); break;
      case T.WATER: {
        c.fillStyle = shade('#3b86c9', v); c.fillRect(px, py, TILE, TILE); water.push([x, y]); break;
      }
      case T.STONE: {
        c.fillStyle = shade('#a6a29a', v); c.fillRect(px, py, TILE, TILE);
        c.strokeStyle = 'rgba(70,66,60,0.45)'; c.lineWidth = 0.6;
        c.strokeRect(px + 0.3, py + 0.3, TILE / 2, TILE / 2); c.strokeRect(px + TILE / 2 + 0.3, py + TILE / 2 + 0.3, TILE / 2 - 0.6, TILE / 2 - 0.6);
        break;
      }
      case T.WOOD: {
        const back = at(x, y - 1) === T.ROOF;
        c.fillStyle = shade('#a87a4a', v); c.fillRect(px, py, TILE, TILE);
        c.fillStyle = 'rgba(60,35,15,0.35)'; for (let i = 0; i < 4; i++) c.fillRect(px, py + i * 4, TILE, 0.7);
        if (back) { c.fillStyle = '#5b3d24'; c.fillRect(px, py, TILE, 9); c.fillStyle = '#7a5532'; for (let i = 0; i < 4; i++) c.fillRect(px + i * 4, py, 0.8, 9); }
        break;
      }
      case T.LFLOOR: case T.SPIKE: case T.STAIRS: case T.DOOR: case T.PILLAR: case T.TORCH: case T.BOSSF: {
        const base = t === T.BOSSF ? '#4a2a30' : '#58566a';
        c.fillStyle = shade(base, v); c.fillRect(px, py, TILE, TILE);
        c.strokeStyle = 'rgba(0,0,0,0.3)'; c.lineWidth = 0.6;
        c.strokeRect(px + 0.3, py + 0.3, TILE - 0.6, TILE - 0.6);
        if (t === T.BOSSF && (x + y) % 2 === 0) { c.fillStyle = 'rgba(224,101,58,0.07)'; c.fillRect(px, py, TILE, TILE); }
        if (t === T.SPIKE) spikes.push([x, y]);
        if (t === T.STAIRS) {
          for (let i = 0; i < 4; i++) { c.fillStyle = shade('#8a879a', 0.7 + i * 0.1); c.fillRect(px + i * 4, py, 4, TILE); c.fillStyle = 'rgba(0,0,0,0.3)'; c.fillRect(px + i * 4 + 3, py, 1, TILE); }
        }
        if (t === T.PILLAR) { c.fillStyle = 'rgba(0,0,0,0.25)'; c.beginPath(); c.ellipse(px + 8, py + 13, 7, 3, 0, 0, 7); c.fill(); }
        break;
      }
      case T.SKY: {
        const g = c.createLinearGradient(0, py, 0, py + TILE); g.addColorStop(0, '#9fd0ff'); g.addColorStop(1, '#d9eeff');
        c.fillStyle = g; c.fillRect(px, py, TILE, TILE);
        if (rnd() < 0.18) { c.fillStyle = 'rgba(255,255,255,0.7)'; c.beginPath(); c.ellipse(px + 8, py + 8, 7, 3, 0, 0, 7); c.fill(); }
        if (!dungeon && at(x, y - 1) !== T.SKY) cliff.push([x, y]);
        break;
      }
      default: {
        c.fillStyle = shade('#5da34a', v); c.fillRect(px, py, TILE, TILE);
      }
    }
  }

  // pass 2: tall things drawn over ground
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const t = grid[y][x]; const px = x * TILE, py = y * TILE;
    switch (t) {
      case T.TREE: {
        const dark = zoneId === 'thornwood'; const r2 = mulberry32(x * 131 + y * 7);
        c.fillStyle = 'rgba(0,0,0,0.25)'; c.beginPath(); c.ellipse(px + 8, py + 13, 8, 3, 0, 0, 7); c.fill();
        c.fillStyle = '#5a3d24'; c.fillRect(px + 6.5, py + 7, 3, 7);
        const c1 = dark ? '#245a2c' : '#2f8a3a', c2 = dark ? '#2f7035' : '#3fa34a', c3 = dark ? '#3a8a40' : '#58bd5c';
        c.fillStyle = c1; c.beginPath(); c.arc(px + 8, py + 4, 8.5, 0, 7); c.fill();
        c.fillStyle = c2; c.beginPath(); c.arc(px + 6 + r2() * 3, py + 2.5, 6, 0, 7); c.fill();
        c.fillStyle = c3; c.beginPath(); c.arc(px + 5.5 + r2() * 2, py + 0.5, 3.4, 0, 7); c.fill();
        break;
      }
      case T.ROCK: {
        c.fillStyle = 'rgba(0,0,0,0.25)'; c.beginPath(); c.ellipse(px + 8, py + 13, 7.5, 2.8, 0, 0, 7); c.fill();
        c.fillStyle = '#7f838c'; c.beginPath(); c.moveTo(px + 1, py + 13); c.lineTo(px + 3, py + 3); c.lineTo(px + 10, py + 1); c.lineTo(px + 15, py + 8); c.lineTo(px + 14, py + 14); c.fill();
        c.fillStyle = '#a2a6af'; c.beginPath(); c.moveTo(px + 3, py + 3); c.lineTo(px + 10, py + 1); c.lineTo(px + 11, py + 6); c.lineTo(px + 4, py + 8); c.fill();
        break;
      }
      case T.ROOF: {
        const below = at(x, y + 1) !== T.ROOF;
        c.fillStyle = '#9b4a3a'; c.fillRect(px, py, TILE, TILE);
        c.fillStyle = '#b25a47'; for (let i = 0; i < 4; i++) c.fillRect(px, py + i * 4 + 2, TILE, 1.4);
        c.fillStyle = 'rgba(0,0,0,0.12)'; for (let i = 0; i < 4; i++) c.fillRect(px + ((i + y) % 2) * 4, py + i * 4, 0.8, 4);
        if (below) { c.fillStyle = '#6c2f25'; c.fillRect(px, py + 12, TILE, 4); c.fillStyle = 'rgba(0,0,0,0.25)'; c.fillRect(px, py + 16, TILE, 0); }
        if (at(x - 1, y) !== T.ROOF) { c.fillStyle = '#6c2f25'; c.fillRect(px, py, 1.5, TILE); }
        if (at(x + 1, y) !== T.ROOF) { c.fillStyle = '#6c2f25'; c.fillRect(px + TILE - 1.5, py, 1.5, TILE); }
        break;
      }
      case T.LWALL: case T.TORCH: {
        const front = !isSolid(at(x, y + 1)) || at(x, y + 1) === T.DOOR;
        c.fillStyle = '#2a2838'; c.fillRect(px, py, TILE, TILE);
        c.fillStyle = '#34324a'; c.fillRect(px + 0.5, py + 0.5, TILE - 1, 7); c.fillRect(px + 0.5, py + 8.5, TILE - 1, 7);
        if (front) {
          c.fillStyle = '#4a4863'; c.fillRect(px, py + 5, TILE, 11); c.fillStyle = '#3a3850';
          for (let i = 0; i < 2; i++) c.fillRect(px, py + 8 + i * 4, TILE, 0.8);
          c.fillRect(px + ((y % 2) ? 4 : 10), py + 5, 0.8, 4); c.fillRect(px + ((y % 2) ? 11 : 5), py + 9, 0.8, 4);
          c.fillStyle = 'rgba(0,0,0,0.35)'; c.fillRect(px, py + 15, TILE, 1);
        }
        if (t === T.TORCH) { torches.push([x, y]); c.fillStyle = '#6b4a2a'; c.fillRect(px + 7, py + 5, 2, 7); c.fillStyle = '#3a3a3a'; c.fillRect(px + 6, py + 11, 4, 2); }
        break;
      }
      case T.DOOR: {
        const boss = zoneId === 'lab3';
        c.fillStyle = boss ? '#3a2226' : '#5a3d24'; c.fillRect(px, py, TILE, TILE);
        c.fillStyle = boss ? '#5c3238' : '#7a5532'; c.fillRect(px + 1, py + 1, TILE - 2, TILE - 2);
        c.fillStyle = '#2a2a2e'; c.fillRect(px, py + 5, TILE, 1.5); c.fillRect(px, py + 11, TILE, 1.5);
        if (boss) { c.fillStyle = '#e0653a'; c.shadowColor = '#e0653a'; c.shadowBlur = 4; c.beginPath(); c.moveTo(px + 3, py + 4); c.lineTo(px + 8, py + 12); c.lineTo(px + 13, py + 4); c.lineTo(px + 8, py + 7); c.fill(); c.shadowBlur = 0; }
        else { c.fillStyle = '#d9b24a'; c.fillRect(px + 12, py + 7, 2, 2); }
        break;
      }
      case T.PILLAR: {
        c.fillStyle = '#74738a'; c.fillRect(px + 3, py - 2, 10, 15);
        c.fillStyle = '#9a99b0'; c.fillRect(px + 3, py - 2, 4, 15); c.fillStyle = '#5a5970'; c.fillRect(px + 2, py - 3, 12, 2); c.fillRect(px + 2, py + 11, 12, 2);
        break;
      }
      case T.FOUNTAIN: {
        c.fillStyle = '#8c8a86'; c.beginPath(); c.arc(px + 8, py + 8, 11, 0, 7); c.fill();
        c.fillStyle = '#4b9ad8'; c.beginPath(); c.arc(px + 8, py + 8, 8.6, 0, 7); c.fill();
        break;
      }
      case T.GATE: {
        c.fillStyle = '#6a6e80'; c.fillRect(px, py, TILE, TILE);
        c.fillStyle = '#4a4d60'; c.fillRect(px + 1, py + 1, TILE - 2, TILE - 2);
        c.fillStyle = 'rgba(120,150,220,0.45)'; c.fillRect(px + 3, py + 3, TILE - 6, TILE - 6);
        break;
      }
      default: break;
    }
  }
  // sky edge cliff face
  for (const [x, y] of cliff) {
    const px = x * TILE, py = y * TILE;
    c.fillStyle = '#6b5a48'; c.fillRect(px, py, TILE, 6); c.fillStyle = '#4a3c30'; c.fillRect(px, py + 5, TILE, 3);
    c.fillStyle = 'rgba(0,0,0,0.2)'; for (let i = 0; i < 3; i++) c.fillRect(px + i * 5 + 1, py, 1, 6);
  }
  return { canvas, water, torches, spikes, cliff };
}
