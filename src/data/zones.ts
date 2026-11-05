import { S } from './strings';
import { Grid, T, isSolid } from './tiles';
import { mulberry32 } from '../engine/util';
import type { NpcDef, ObjectDef, PortalDef, SpawnDef, ZoneDef } from './types';

const N = S.names;

function torches(g: Grid) {
  for (let y = 0; y < g.h - 1; y++) for (let x = 0; x < g.w; x++) {
    if (g.g[y][x] === T.LWALL && (g.g[y + 1][x] === T.LFLOOR || g.g[y + 1][x] === T.BOSSF) && x % 6 === 3) g.g[y][x] = T.TORCH;
  }
}

function buildFirstlight() {
  const g = new Grid(56, 40, T.GRASS); const r = mulberry32(7);
  g.scatter(T.TALL, 0.05, r, [T.GRASS]); g.scatter(T.FLOWER, 0.03, r, [T.GRASS]); g.scatter(T.TREE, 0.16, r, [T.GRASS], 3);
  g.rect(16, 11, 24, 18, T.STONE);
  g.rect(39, 18, 17, 4, T.PATH); g.rect(7, 11, 9, 2, T.PATH); g.rect(39, 11, 11, 2, T.PATH);
  g.house(6, 4, 9, 7); g.house(17, 4, 11, 7); g.house(41, 4, 9, 7); g.house(8, 29, 9, 7); g.house(42, 28, 9, 7);
  g.rect(27, 18, 2, 2, T.FOUNTAIN); g.rect(32, 12, 4, 2, T.GATE);
  g.border(3, T.SKY, [[53, 18, 3, 4]]);
  return g.g;
}
function buildPlains() {
  const g = new Grid(80, 56, T.GRASS); const r = mulberry32(21);
  g.scatter(T.TALL, 0.14, r, [T.GRASS]); g.scatter(T.FLOWER, 0.05, r, [T.GRASS]);
  for (let i = 0; i < 30; i++) g.ellipse(6 + r() * 68, 4 + r() * 46, 1 + r() * 2.5, 1 + r() * 2, T.TREE);
  g.scatter(T.ROCK, 0.006, r, [T.GRASS]);
  g.ellipse(20, 12, 7, 5, T.SAND); g.ellipse(20, 12, 5, 3.5, T.WATER);
  g.ellipse(62, 42, 8, 5, T.SAND); g.ellipse(62, 42, 6, 3.5, T.WATER);
  g.rect(66, 3, 9, 7, T.ROCK); g.rect(68, 5, 5, 3, T.GRASS); g.rect(70, 8, 2, 3, T.GRASS);
  g.path([[0, 26], [14, 26], [24, 30], [40, 28], [54, 22], [66, 26], [79, 26]], 3, T.PATH);
  g.border(2, T.TREE, [[0, 24, 2, 5], [78, 24, 2, 5]]);
  g.rect(0, 53, 80, 3, T.SKY);
  return g.g;
}
function buildThornwood() {
  const g = new Grid(70, 56, T.DARK); const r = mulberry32(33);
  g.scatter(T.TREE, 0.4, r, [T.DARK]); g.scatter(T.TALL, 0.12, r, [T.DARK]);
  for (const [x, y, rx, ry] of [[14, 40, 6, 5], [56, 12, 9, 7], [20, 14, 5, 4], [45, 34, 6, 5], [52, 26, 4, 3], [30, 42, 5, 4], [10, 16, 4, 3], [48, 46, 5, 4]]) g.ellipse(x, y, rx, ry, T.DARK);
  g.path([[12, 26], [12, 34], [14, 40]], 2, T.DARK);
  g.path([[34, 20], [44, 18], [50, 14], [56, 12]], 2, T.DARK);
  g.path([[22, 22], [20, 14]], 2, T.DARK); g.path([[22, 22], [26, 34], [32, 40]], 2, T.DARK); g.path([[34, 22], [45, 34]], 2, T.DARK); g.path([[45, 34], [48, 46]], 2, T.DARK);
  g.path([[0, 26], [12, 26], [22, 22], [34, 20], [34, 6], [34, 0]], 3, T.PATH);
  g.scatter(T.FLOWER, 0.05, r, [T.DARK]);
  g.border(2, T.TREE, [[0, 24, 2, 5], [32, 0, 5, 2]]);
  g.rect(0, 53, 70, 3, T.SKY);
  return g.g;
}
function buildMossbrook() {
  const g = new Grid(44, 34, T.GRASS); const r = mulberry32(44);
  g.scatter(T.TALL, 0.05, r, [T.GRASS]); g.scatter(T.FLOWER, 0.05, r, [T.GRASS]); g.scatter(T.TREE, 0.1, r, [T.GRASS], 2);
  g.rect(14, 10, 16, 12, T.STONE);
  g.rect(20, 22, 4, 12, T.PATH); g.rect(30, 14, 14, 4, T.PATH); g.rect(5, 11, 9, 2, T.PATH); g.rect(30, 11, 10, 2, T.PATH);
  g.rect(13, 22, 2, 10, T.PATH); g.rect(4, 30, 10, 2, T.PATH); g.rect(29, 22, 2, 10, T.PATH); g.rect(30, 30, 11, 2, T.PATH);
  g.house(4, 3, 10, 8); g.house(31, 3, 10, 8); g.house(4, 22, 9, 8); g.house(32, 22, 9, 8);
  g.border(2, T.TREE, [[19, 32, 6, 2], [42, 14, 2, 4]]);
  return g.g;
}
function buildLab1() {
  const g = new Grid(48, 34, T.LWALL);
  for (const [x, y, w, h] of [[2, 12, 8, 8], [10, 15, 10, 2], [20, 10, 10, 12], [30, 15, 8, 2], [38, 10, 8, 12], [24, 22, 2, 2], [20, 24, 10, 7], [24, 8, 2, 2], [20, 2, 10, 6], [30, 4, 1, 1], [31, 3, 3, 3]]) g.rect(x, y, w, h, T.LFLOOR);
  g.rect(44, 14, 2, 4, T.STAIRS); torches(g); return g.g;
}
function buildLab2() {
  const g = new Grid(48, 34, T.LWALL);
  for (const [x, y, w, h] of [[2, 12, 7, 8], [9, 15, 6, 2], [15, 15, 16, 2], [31, 15, 3, 2], [34, 8, 12, 14], [16, 4, 12, 8], [21, 12, 2, 3], [21, 17, 2, 5], [16, 22, 12, 8], [20, 30, 3, 3]]) g.rect(x, y, w, h, T.LFLOOR);
  g.rect(19, 15, 2, 2, T.SPIKE); g.rect(24, 15, 2, 2, T.SPIKE); g.rect(28, 15, 2, 2, T.SPIKE);
  g.rect(20, 30, 3, 1, T.DOOR); g.rect(44, 19, 2, 2, T.STAIRS); torches(g); return g.g;
}
function buildLab3() {
  const g = new Grid(48, 34, T.LWALL);
  for (const [x, y, w, h] of [[2, 13, 7, 6], [9, 15, 5, 2], [14, 8, 20, 16], [34, 15, 6, 2], [40, 11, 6, 10]]) g.rect(x, y, w, h, T.LFLOOR);
  for (const x of [17, 22, 27, 31]) for (const y of [11, 20]) g.set(x, y, T.PILLAR);
  g.rect(45, 14, 1, 4, T.DOOR); torches(g); return g.g;
}
function buildBoss() {
  const g = new Grid(34, 28, T.LWALL);
  g.ellipse(17, 13, 14, 11, T.BOSSF); g.rect(16, 24, 3, 4, T.LFLOOR);
  for (const [x, y] of [[9, 13], [25, 13], [17, 6], [11, 8], [23, 8], [11, 18], [23, 18]]) g.set(x, y, T.PILLAR);
  torches(g); return g.g;
}

export const ZONES: Record<string, ZoneDef> = {
  firstlight: { id: 'firstlight', name: S.zones.firstlight, music: 'town', w: 56, h: 40, safe: true, theme: 'town', build: buildFirstlight, spawn: { tx: 28, ty: 24 } },
  plains: { id: 'plains', name: S.zones.plains, music: 'plains', w: 80, h: 56, weather: true, theme: 'grass', build: buildPlains, spawn: { tx: 4, ty: 26 } },
  thornwood: { id: 'thornwood', name: S.zones.thornwood, music: 'forest', w: 70, h: 56, theme: 'forest', dark: 0.25, build: buildThornwood, spawn: { tx: 4, ty: 26 } },
  mossbrook: { id: 'mossbrook', name: S.zones.mossbrook, music: 'village', w: 44, h: 34, safe: true, theme: 'town', build: buildMossbrook, spawn: { tx: 21, ty: 29 } },
  lab1: { id: 'lab1', name: S.zones.lab1, music: 'dungeon', w: 48, h: 34, dark: 0.7, theme: 'stone', build: buildLab1, spawn: { tx: 4, ty: 16 } },
  lab2: { id: 'lab2', name: S.zones.lab2, music: 'dungeon', w: 48, h: 34, dark: 0.75, theme: 'stone', build: buildLab2, spawn: { tx: 4, ty: 16 } },
  lab3: { id: 'lab3', name: S.zones.lab3, music: 'dungeon', w: 48, h: 34, dark: 0.75, theme: 'stone', build: buildLab3, spawn: { tx: 4, ty: 16 } },
  bossroom: { id: 'bossroom', name: S.zones.bossroom, music: 'boss', w: 34, h: 28, dark: 0.55, theme: 'stone', build: buildBoss, spawn: { tx: 17, ty: 25 } },
};

const cache: Record<string, number[][]> = {};
export function baseGrid(zone: string): number[][] {
  return (cache[zone] ??= ZONES[zone].build());
}
const reachCache: Record<string, Uint8Array> = {};
/** Tiles the player can walk to from the zone's spawn (doors count as open). */
export function isReachable(zone: string, tx: number, ty: number): boolean {
  const g = baseGrid(zone); const h = g.length, w = g[0].length;
  if (!reachCache[zone]) {
    const seen = new Uint8Array(w * h);
    const sp = ZONES[zone].spawn; const q = [sp.ty * w + sp.tx]; seen[q[0]] = 1;
    for (let i = 0; i < q.length; i++) {
      const x = q[i] % w, y = (q[i] / w) | 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= w || ny >= h || seen[ny * w + nx]) continue;
        if (isSolid(g[ny][nx]) && g[ny][nx] !== T.DOOR) continue;
        seen[ny * w + nx] = 1; q.push(ny * w + nx);
      }
    }
    reachCache[zone] = seen;
  }
  return tx >= 0 && ty >= 0 && tx < w && ty < h && reachCache[zone][ty * w + tx] === 1;
}
export const solidAt = (grid: number[][], tx: number, ty: number) => {
  const row = grid[ty];
  return !row || row[tx] === undefined || isSolid(row[tx]);
};

export const PORTALS: Record<string, PortalDef[]> = {
  firstlight: [{ x: 54, y: 18, w: 2, h: 4, to: 'plains', sx: 4, sy: 26, label: S.zones.plains }],
  plains: [
    { x: 0, y: 24, w: 2, h: 5, to: 'firstlight', sx: 51, sy: 20, label: S.zones.firstlight },
    { x: 78, y: 24, w: 2, h: 5, to: 'thornwood', sx: 4, sy: 26, label: S.zones.thornwood },
  ],
  thornwood: [
    { x: 0, y: 24, w: 2, h: 5, to: 'plains', sx: 76, sy: 26, label: S.zones.plains },
    { x: 32, y: 0, w: 5, h: 2, to: 'mossbrook', sx: 21, sy: 29, label: S.zones.mossbrook },
  ],
  mossbrook: [
    { x: 19, y: 32, w: 6, h: 2, to: 'thornwood', sx: 34, sy: 4, label: S.zones.thornwood },
    { x: 42, y: 14, w: 2, h: 4, to: 'lab1', sx: 4, sy: 16, label: S.zones.lab1 },
  ],
  lab1: [
    { x: 2, y: 14, w: 1, h: 4, to: 'mossbrook', sx: 40, sy: 16, label: S.zones.mossbrook },
    { x: 44, y: 14, w: 2, h: 4, to: 'lab2', sx: 4, sy: 16, label: S.zones.lab2 },
  ],
  lab2: [
    { x: 2, y: 14, w: 1, h: 4, to: 'lab1', sx: 43, sy: 16, label: S.zones.lab1 },
    { x: 44, y: 19, w: 2, h: 2, to: 'lab3', sx: 4, sy: 16, label: S.zones.lab3 },
  ],
  lab3: [{ x: 2, y: 14, w: 1, h: 4, to: 'lab2', sx: 43, sy: 19, label: S.zones.lab2 }],
  bossroom: [],
};

const L = {
  hair: ['#3a2a1e', '#c9a14a', '#7a3b2a', '#2a2f4a', '#b3b3b8', '#5a8a4a', '#d4d0c4', '#a04a6a'],
  coat: ['#c14a4a', '#4a7ac1', '#4ac17a', '#c1a24a', '#7a4ac1', '#4ac1c1', '#d0d0d0', '#8a5a3a'],
};
const crowd = (i: number, tx: number, ty: number): NpcDef => ({
  id: `crowd${i}`, name: 'Player', zone: 'firstlight', tx, ty, wander: 3, player: true,
  look: { hair: L.hair[i % 8], coat: L.coat[(i * 3) % 8] },
  topics: [{ when: 'q:m1:done', id: i % 2 ? 'crowd.calm' : 'crowd.calm2' }, { id: ['crowd.panic', 'crowd.panic2', 'crowd.panic3'][i % 3] }],
});

export const NPCS: NpcDef[] = [
  { id: 'ordan', name: N.ordan, zone: 'firstlight', tx: 33, ty: 24, look: { hair: '#8a8a90', coat: '#3a4a3a', accent: '#c9a14a' }, player: true,
    topics: [{ when: '!met_ordan', id: 'ordan.intro' }, { when: 'q:m1:ready', id: 'ordan.turnin' }, { when: 'q:m1:active', id: 'ordan.reminder' }, { id: 'ordan.after' }] },
  { id: 'brund', name: N.brund, zone: 'firstlight', tx: 10, ty: 8, look: { hair: '#3a2a1e', coat: '#6a4a2a', accent: '#e0e0e0' }, topics: [{ id: 'brund.talk' }] },
  { id: 'tilda', name: N.tilda, zone: 'firstlight', tx: 45, ty: 8, look: { hair: '#a04a6a', coat: '#4a7a6a' },
    topics: [{ when: 'q:s1:none', id: 'tilda.offer' }, { when: 'q:s1:ready', id: 'tilda.turnin' }, { id: 'tilda.shop' }] },
  { id: 'mara', name: N.mara, zone: 'firstlight', tx: 22, ty: 8, look: { hair: '#7a3b2a', coat: '#c9a14a' }, topics: [{ id: 'mara.inn' }] },
  { id: 'mirel', name: N.mirel, zone: 'firstlight', tx: 20, ty: 25, look: { hair: '#d4d0c4', coat: '#6a5a8a' }, player: true,
    topics: [{ when: 'q:s6:none', id: 'mirel.offer' }, { when: 'q:s6:ready', id: 'mirel.done' }, { when: 'q:s6:active', id: 'mirel.wait' }, { id: 'mirel.wait' }] },
  { id: 'jarro', name: N.jarro, zone: 'firstlight', tx: 35, ty: 15, look: { hair: '#2a2f4a', coat: '#3a5a8a', accent: '#f2f2f2' }, player: true,
    topics: [{ when: 'q:s7:none', id: 'jarro.offer' }, { when: 'q:s7:ready', id: 'jarro.won' }, { when: 'q:s7:active', id: 'jarro.retry' }, { id: 'jarro.after' }] },
  { id: 'gatewatch', name: 'Player', zone: 'firstlight', tx: 33, ty: 15, look: { hair: '#5a8a4a', coat: '#c1a24a' }, player: true, topics: [{ id: 'crowd.gate' }] },
  { id: 'villagerFL', name: 'Resident', zone: 'firstlight', tx: 12, ty: 33, look: { hair: '#b3b3b8', coat: '#8a5a3a' }, wander: 1, topics: [{ id: 'villager.1' }] },
  ...([[19, 14], [24, 16], [21, 21], [25, 24], [30, 17], [33, 20], [37, 25], [23, 27], [30, 26], [18, 24]] as [number, number][]).map(([x, y], i) => crowd(i, x, y)),

  { id: 'veyra', name: N.veyra, zone: 'mossbrook', tx: 21, ty: 15, look: { hair: '#c14a4a', coat: '#2a3a6a', accent: '#e0b64a' }, player: true,
    topics: [
      { when: 'q:m3:none&q:m2:done', id: 'veyra.first' }, { when: 'q:m3:active', id: 'veyra.reminder' }, { when: 'q:m3:ready', id: 'veyra.turnin' },
      { when: 'q:m4:active', id: 'veyra.meeting' }, { when: 'raid', id: 'veyra.joined' }, { id: 'veyra.after' },
    ] },
  { id: 'fenn', name: N.fenn, zone: 'mossbrook', tx: 33, ty: 12, look: { hair: '#2a2a2a', coat: '#4a4a3a' }, player: true,
    topics: [{ when: 'q:s5:ready', id: 'fenn.turnin' }, { when: 'intel&!intelTold', id: 'fenn.intel' }, { when: 'intel', id: 'fenn.after' }, { id: 'fenn.offer' }] },
  { id: 'edda', name: N.edda, zone: 'mossbrook', tx: 7, ty: 26, look: { hair: '#7a3b2a', coat: '#5a7a4a' },
    topics: [{ when: 'yielded&q:s3:active', id: 'edda.yielded' }, { when: 'q:s3:none', id: 'edda.offer' }, { when: 'q:s3:ready', id: 'edda.turnin' }, { when: 'q:s3:active', id: 'edda.wait' }, { id: 'edda.after' }] },
  { id: 'pip', name: N.pip, zone: 'mossbrook', tx: 9, ty: 27, look: { hair: '#c9a14a', coat: '#c1a24a' }, topics: [{ id: 'pip.talk' }] },
  { id: 'hale', name: N.hale, zone: 'mossbrook', tx: 24, ty: 12, look: { hair: '#3a2a1e', coat: '#8a5a3a' }, player: true,
    topics: [{ when: 'q:s2:none', id: 'hale.offer' }, { when: 'q:s2:ready', id: 'hale.turnin' }, { when: 'q:s2:active', id: 'hale.wait' }, { id: 'hale.after' }] },
  { id: 'nessa', name: N.nessa, zone: 'mossbrook', tx: 22, ty: 28, look: { hair: '#a04a6a', coat: '#6a5a8a' },
    topics: [{ when: 'q:s4:none', id: 'nessa.offer' }, { when: 'q:s4:ready', id: 'nessa.turnin' }, { when: 'q:s4:active', id: 'nessa.wait' }, { id: 'nessa.after' }] },
  { id: 'gerrin', name: N.gerrin, zone: 'mossbrook', tx: 8, ty: 7, look: { hair: '#b3b3b8', coat: '#c14a4a' }, topics: [{ id: 'gerrin.inn' }] },
  { id: 'orla', name: N.orla, zone: 'mossbrook', tx: 35, ty: 7, look: { hair: '#5a8a4a', coat: '#4a7a6a' }, topics: [{ id: 'orla.talk' }] },
  { id: 'hobb', name: N.hobb, zone: 'mossbrook', tx: 18, ty: 17, look: { hair: '#7a3b2a', coat: '#7e8794' }, player: true, when: '!raid', topics: [{ id: 'party.hobb' }] },
  { id: 'iselle', name: N.iselle, zone: 'mossbrook', tx: 24, ty: 17, look: { hair: '#c9a14a', coat: '#4a7ac1' }, player: true, when: '!raid', topics: [{ id: 'party.iselle' }] },
  { id: 'dov', name: N.dov, zone: 'mossbrook', tx: 21, ty: 19, look: { hair: '#2a2a2a', coat: '#3a3a4a' }, player: true, when: '!raid', topics: [{ id: 'party.dov' }] },
  { id: 'villagerM1', name: 'Villager', zone: 'mossbrook', tx: 26, ty: 18, look: { hair: '#d4d0c4', coat: '#8a5a3a' }, wander: 2, topics: [{ id: 'villager.2' }] },
  { id: 'villagerM2', name: 'Villager', zone: 'mossbrook', tx: 17, ty: 12, look: { hair: '#5a8a4a', coat: '#c1a24a' }, wander: 2, topics: [{ id: 'villager.1' }] },

  { id: 'rask', name: N.rask, zone: 'thornwood', tx: 52, ty: 14, look: { hair: '#2a2a2a', coat: '#6a3a3a', accent: '#d8d8e8' }, player: true, when: '!raskBeaten',
    topics: [{ when: 'item:petal', id: 'rask.stole' }, { when: 'yielded', id: 'rask.after' }, { when: '!raskTold', id: 'rask.first' }, { id: 'rask.wait' }] },
  { id: 'cael', name: N.cael, zone: 'thornwood', tx: 14, ty: 40, look: { hair: '#c9a14a', coat: '#4a7a6a' }, player: true,
    topics: [{ when: 'foundCael', id: 'cael.after' }, { id: 'cael.found' }] },
];

export const SPAWNS: Record<string, SpawnDef[]> = {
  plains: [
    { mob: 'boar', tx: 12, ty: 20, n: 4, spread: 7 }, { mob: 'boar', tx: 10, ty: 36, n: 4, spread: 7 }, { mob: 'boar', tx: 32, ty: 20, n: 4, spread: 7 },
    { mob: 'boar', tx: 32, ty: 38, n: 3, spread: 6 }, { mob: 'boar', tx: 48, ty: 12, n: 3, spread: 6 }, { mob: 'wasp', tx: 50, ty: 42, n: 5, spread: 6 },
    { mob: 'wasp', tx: 58, ty: 48, n: 3, spread: 4 }, { mob: 'wasp', tx: 42, ty: 14, n: 3, spread: 5 }, { mob: 'scarhide', tx: 60, ty: 16, n: 1, spread: 2, respawn: 0 },
  ],
  thornwood: [
    { mob: 'wolf', tx: 20, ty: 14, n: 3, spread: 4 }, { mob: 'wolf', tx: 45, ty: 34, n: 3, spread: 4 }, { mob: 'wolf', tx: 52, ty: 26, n: 2, spread: 3 },
    { mob: 'wolf', tx: 30, ty: 42, n: 3, spread: 4 }, { mob: 'wolf', tx: 14, ty: 38, n: 2, spread: 3 }, { mob: 'wolf', tx: 10, ty: 16, n: 2, spread: 3 },
    { mob: 'bulbmaw', tx: 26, ty: 30, n: 2, spread: 4 }, { mob: 'bulbmaw', tx: 40, ty: 12, n: 2, spread: 4 }, { mob: 'bulbmaw', tx: 48, ty: 46, n: 2, spread: 4 },
    { mob: 'bulbmaw', tx: 20, ty: 22, n: 2, spread: 5 }, { mob: 'boar', tx: 8, ty: 30, n: 2, spread: 4 },
    { mob: 'flowerbulb', tx: 59, ty: 10, n: 1, spread: 0, respawn: 0, when: '!yielded&!petalTaken' },
  ],
  lab1: [
    { mob: 'grunt', tx: 25, ty: 16, n: 4, spread: 4 }, { mob: 'archer', tx: 28, ty: 12, n: 2, spread: 2 }, { mob: 'grunt', tx: 24, ty: 27, n: 2, spread: 3 },
    { mob: 'grunt', tx: 24, ty: 5, n: 2, spread: 3 }, { mob: 'archer', tx: 42, ty: 16, n: 2, spread: 3 }, { mob: 'grunt', tx: 13, ty: 16, n: 2, spread: 1 },
  ],
  lab2: [
    { mob: 'grunt', tx: 22, ty: 8, n: 3, spread: 3 }, { mob: 'shaman', tx: 24, ty: 6, n: 2, spread: 2 }, { mob: 'archer', tx: 26, ty: 9, n: 1, spread: 1 },
    { mob: 'grunt', tx: 24, ty: 26, n: 2, spread: 3 }, { mob: 'warchief', tx: 40, ty: 14, n: 1, spread: 0, respawn: 0, when: '!warchiefDead' },
    { mob: 'archer', tx: 12, ty: 16, n: 2, spread: 1 },
  ],
  lab3: [
    { mob: 'guard', tx: 20, ty: 15, n: 4, spread: 5 }, { mob: 'shaman', tx: 26, ty: 12, n: 2, spread: 3 }, { mob: 'archer', tx: 30, ty: 18, n: 2, spread: 3 },
    { mob: 'grunt', tx: 24, ty: 21, n: 3, spread: 4 }, { mob: 'guard', tx: 42, ty: 16, n: 2, spread: 2 },
  ],
  bossroom: [],
};

export function objectsFor(zone: string): ObjectDef[] {
  const out = OBJECTS.filter((o) => o.zone === zone);
  const herbCount: Record<string, number> = { plains: 10, thornwood: 6 };
  const gtile = herbCount[zone] ? baseGrid(zone) : null;
  if (gtile) {
    const r = mulberry32(zone.length * 97);
    let placed = 0, guard = 0;
    while (placed < herbCount[zone] && guard++ < 4000) {
      const x = 4 + Math.floor(r() * (gtile[0].length - 8)), y = 4 + Math.floor(r() * (gtile.length - 12));
      if ((gtile[y][x] === T.GRASS || gtile[y][x] === T.DARK || gtile[y][x] === T.TALL) && isReachable(zone, x, y)) {
        out.push({ id: `herb_${zone}_${placed}`, kind: 'herb', zone, tx: x, ty: y });
        placed++;
      }
    }
  }
  return out;
}

export const OBJECTS: ObjectDef[] = [
  { id: 'board_fl', kind: 'board', zone: 'firstlight', tx: 22, ty: 27, text: 'NOTICE: The south gate is locked. The only open road is east. If you find a safe route north, post it here. — Ordan' },
  { id: 'board_mb', kind: 'board', zone: 'mossbrook', tx: 28, ty: 20, text: 'RAID NOTICE: A meeting will be held for those willing to challenge the floor boss. Speak to Veyra. Bring potions.' },
  { id: 'chest_plains', kind: 'chest', zone: 'plains', tx: 70, ty: 6, loot: { potion: 3, crystal: 1 }, col: 150, flag: 'chest:plains', hidden: true },
  { id: 'chest_grove', kind: 'chest', zone: 'thornwood', tx: 62, ty: 9, loot: { potion: 2, crystal: 1 }, col: 200, flag: 'chest:grove', hidden: true },
  { id: 'chest_lab1', kind: 'chest', zone: 'lab1', tx: 32, ty: 4, loot: { crystal: 1, potion: 2 }, col: 220, flag: 'chest:lab', hidden: true },
  { id: 'chest_lab1b', kind: 'chest', zone: 'lab1', tx: 25, ty: 28, loot: { potion: 2 }, col: 120 },
  { id: 'chest_lab2', kind: 'chest', zone: 'lab2', tx: 21, ty: 32, loot: { gnarlbane: 1 }, col: 100, flag: 'puzzleChest' },
  { id: 'lever_e', kind: 'lever', zone: 'lab2', tx: 26, ty: 24, text: 'E' },
  { id: 'lever_s', kind: 'lever', zone: 'lab2', tx: 21, ty: 28, text: 'S' },
  { id: 'lever_w', kind: 'lever', zone: 'lab2', tx: 17, ty: 24, text: 'W' },
  { id: 'tablet', kind: 'tablet', zone: 'lab2', tx: 21, ty: 23 },
  { id: 'bed_lab3', kind: 'bed', zone: 'lab3', tx: 4, ty: 15, text: 'A faintly glowing crystal hums. Safe room.' },
  { id: 'door_boss', kind: 'door', zone: 'lab3', tx: 44, ty: 15 },
  { id: 'march', kind: 'march', zone: 'mossbrook', tx: 37, ty: 19, when: 'raid' },
];

export function startZone(): { zone: string; tx: number; ty: number } {
  return { zone: 'firstlight', tx: ZONES.firstlight.spawn.tx, ty: ZONES.firstlight.spawn.ty };
}
