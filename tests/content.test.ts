import { describe, expect, it } from 'vitest';
import { validateContent } from '../src/data/validate';
import { isSolid, T } from '../src/data/tiles';
import { baseGrid, NPCS, objectsFor, PORTALS, SPAWNS, ZONES } from '../src/data/zones';

function reach(zone: string, sx: number, sy: number, opened = false) {
  const g = baseGrid(zone).map((r) => r.slice());
  if (opened) for (let x = 20; x < 23; x++) if (g[30]) g[30][x] = T.LFLOOR; // lab2 puzzle door
  const h = g.length, w = g[0].length;
  const seen = new Set<number>(); const q = [sy * w + sx]; seen.add(q[0]);
  for (let i = 0; i < q.length; i++) {
    const x = q[i] % w, y = (q[i] / w) | 0;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= w || ny >= h || seen.has(ny * w + nx) || isSolid(g[ny][nx])) continue;
      seen.add(ny * w + nx); q.push(ny * w + nx);
    }
  }
  return (x: number, y: number) => seen.has(y * w + x);
}

describe('content', () => {
  it('passes cross-reference validation', () => { expect(() => validateContent()).not.toThrow(); });

  for (const id of Object.keys(ZONES)) {
    it(`${id}: spawn, portals, npcs, objects and mob spawns are reachable`, () => {
      const z = ZONES[id];
      const r = reach(id, z.spawn.tx, z.spawn.ty, true);
      expect(r(z.spawn.tx, z.spawn.ty), 'spawn').toBe(true);
      for (const p of PORTALS[id] ?? []) {
        let any = false;
        for (let y = p.y; y < p.y + p.h; y++) for (let x = p.x; x < p.x + p.w; x++) if (r(x, y) || r(x - 1, y) || r(x + 1, y) || r(x, y - 1) || r(x, y + 1)) any = true;
        expect(any, `portal to ${p.to}`).toBe(true);
        const tz = ZONES[p.to];
        expect(reach(p.to, tz.spawn.tx, tz.spawn.ty, true)(p.sx, p.sy), `arrival tile for portal ${id}->${p.to}`).toBe(true);
      }
      for (const n of NPCS.filter((n) => n.zone === id)) expect(r(n.tx, n.ty), `npc ${n.id}`).toBe(true);
      for (const o of objectsFor(id)) expect(r(o.tx, o.ty), `object ${o.id}`).toBe(true);
      for (const s of SPAWNS[id] ?? []) {
        let ok = false; const sp = s.spread ?? 3;
        for (let y = s.ty - sp; y <= s.ty + sp; y++) for (let x = s.tx - sp; x <= s.tx + sp; x++) if (r(x, y)) ok = true;
        expect(ok, `spawn ${s.mob}@${s.tx},${s.ty}`).toBe(true);
      }
    });
  }

  it('every portal arrival is outside the return portal so travel does not loop', () => {
    for (const [zone, list] of Object.entries(PORTALS)) for (const p of list) {
      const back = (PORTALS[p.to] ?? []).find((b) => b.to === zone);
      if (!back) continue;
      const inside = p.sx >= back.x && p.sx < back.x + back.w && p.sy >= back.y && p.sy < back.y + back.h;
      expect(inside, `${zone}->${p.to}`).toBe(false);
    }
  });
});
