import { baseGrid, isReachable, NPCS, objectsFor, PORTALS, SPAWNS, ZONES } from '../data/zones';
import { MOBS } from '../data/mobs';
import { isSolid, T, TILE } from '../data/tiles';
import type { AttackDef, MobDef, NpcDef, ObjectDef } from '../data/types';
import { clamp, irand, rand } from '../engine/util';
import { cond, G } from './state';
import { maxHp } from './progression';

export interface Floater { x: number; y: number; text: string; color: string; t: number; life: number; size: number }
export interface Particle { x: number; y: number; vx: number; vy: number; t: number; life: number; color: string; size: number; grav: number; glow?: boolean }
export interface Proj { x: number; y: number; vx: number; vy: number; dmg: number; r: number; life: number; color: string; owner: Mob | null }
export interface Aoe { x: number; y: number; r: number; delay: number; t: number; dmg: number; color: string; owner: Mob | null; done: boolean }
export interface Slash { x: number; y: number; face: number; arc: number; range: number; t: number; life: number; color: string; width: number }
export interface Orb { x: number; y: number; t: number; kind: 'col' | 'item' | 'xp'; amount: number; item?: string }
export interface WObject { def: ObjectDef; x: number; y: number; used: boolean; respawn: number }

export interface Tele { kind: AttackDef['kind']; ang: number; range: number; arc: number; r: number; cx: number; cy: number; p: number }
export type MobState = 'idle' | 'chase' | 'windup' | 'lunge' | 'strike' | 'recover' | 'stagger' | 'return' | 'cine' | 'leap';

export interface Mob {
  uid: number; def: MobDef; x: number; y: number; hx: number; hy: number; vx: number; vy: number; face: number;
  hp: number; maxhp: number; state: MobState; t: number; atk: AttackDef | null; cd: number; target: Target | null; retarget: number;
  poise: number; stun: number; flash: number; kbx: number; kby: number; dead: boolean; deadT: number;
  wanderT: number; wx: number; wy: number; tele: Tele | null; lungeLeft: number; lungeAng: number; hitDone: boolean; comboLeft: number;
  phase: number; lastBar: number; invuln: number; lastHitBy: 'player' | 'ally' | null; playerHit: boolean; spawnIdx: number;
  summonT: number; scripted: boolean; hostileToNpc: boolean; duel: boolean; leapT: number; leapFrom: [number, number]; leapTo: [number, number]; seen: boolean; anim: number;
}
export interface Ally {
  id: string; name: string; role: 'tank' | 'spear' | 'rogue' | 'leader' | 'raider'; look: { hair: string; coat: string; accent?: string };
  x: number; y: number; vx: number; vy: number; face: number; r: number; hp: number; maxhp: number; atk: number; reach: number;
  state: 'follow' | 'windup' | 'recover' | 'dodge'; t: number; target: Mob | null; cd: number; healCd: number; switchCd: number; flash: number;
  kbx: number; kby: number; dead: boolean; deadT: number; bark: string; barkT: number; invuln: number; slot: number; anim: number; atkCd: number; doneHit: boolean;
}
export interface NpcA { def: NpcDef; x: number; y: number; hx: number; hy: number; face: number; wanderT: number; wx: number; wy: number; anim: number }
export type Target = { kind: 'player' } | { kind: 'ally'; ally: Ally };

export interface Player {
  x: number; y: number; vx: number; vy: number; face: number; r: number; hp: number;
  state: 'free' | 'attack' | 'dodge' | 'skillWind' | 'skillMove' | 'skillPost' | 'hurt' | 'switch' | 'dead';
  t: number; combo: number; comboT: number; queued: boolean; atkHit: boolean; invuln: number; blocking: boolean; blockT: number;
  dodgeCd: number; skill: { id: string; hits: number; hitIdx: number; nextHit: number; done: Set<Mob> } | null; skillCd: Record<string, number>;
  kbx: number; kby: number; flash: number; hot: { left: number; rate: number }[]; anim: number; swEnd: number; swFrom: [number, number]; swTo: [number, number]; swTarget: Mob | null;
  useCd: number; dead: boolean; deadT: number; moving: boolean; stepT: number; locked: boolean; mark: number;
  lvx: number; lvy: number; hop: number; attackBuf: number; trail: { x: number; y: number; t: number }[];
}

export const W = {
  zone: 'firstlight', grid: [] as number[][], w: 0, h: 0,
  mobs: [] as Mob[], allies: [] as Ally[], npcs: [] as NpcA[], objs: [] as WObject[],
  projs: [] as Proj[], aoes: [] as Aoe[], parts: [] as Particle[], floats: [] as Floater[], orbs: [] as Orb[], slashes: [] as Slash[],
  player: null as unknown as Player,
  cam: { x: 0, y: 0, shake: 0 },
  hitstop: 0, time: 0, uid: 1, rain: 0, rainT: 60, respawns: [] as { zone: string; idx: number; t: number; mob: string; tx: number; ty: number }[],
  puzzle: [] as string[], cine: null as null | { name: string; t: number; step: number }, flash: 0, visited: new Set<string>(),
  bossBars: null as null | { name: string; hp: number; maxhp: number; bars: number },
  fade: 0, banner: { text: '', t: 0 }, hint: '', seenZone: new Set<string>(),
};

export const px = (tile: number) => tile * TILE + TILE / 2;
export const tileAt = (tx: number, ty: number) => (tx < 0 || ty < 0 || tx >= W.w || ty >= W.h ? T.SKY : W.grid[ty][tx]);
export const solidAtPx = (x: number, y: number) => isSolid(tileAt(Math.floor(x / TILE), Math.floor(y / TILE)));

/** Move a circle-ish body with axis-separated tile collision. Returns true if blocked on any axis. */
export function moveBody(b: { x: number; y: number }, dx: number, dy: number, r: number): boolean {
  let blocked = false;
  const test = (x: number, y: number) =>
    solidAtPx(x - r, y - r) || solidAtPx(x + r, y - r) || solidAtPx(x - r, y + r) || solidAtPx(x + r, y + r);
  if (dx) { if (!test(b.x + dx, b.y)) b.x += dx; else blocked = true; }
  if (dy) { if (!test(b.x, b.y + dy)) b.y += dy; else blocked = true; }
  return blocked;
}

export const freeTile = (tx: number, ty: number) =>
  !isSolid(tileAt(tx, ty)) && tileAt(tx, ty) !== T.STAIRS && tileAt(tx, ty) !== T.SPIKE && isReachable(W.zone, tx, ty);

export function newPlayer(x: number, y: number): Player {
  return {
    x, y, vx: 0, vy: 0, face: Math.PI / 2, r: 5, hp: Math.min(G.hp, maxHp()), state: 'free', t: 0, combo: 0, comboT: 0, queued: false, atkHit: false,
    invuln: 0, blocking: false, blockT: 0, dodgeCd: 0, skill: null, skillCd: {}, kbx: 0, kby: 0, flash: 0, hot: [], anim: 0,
    swEnd: 0, swFrom: [0, 0], swTo: [0, 0], swTarget: null, useCd: 0, dead: false, deadT: 0, moving: false, stepT: 0, locked: false, mark: 0,
    lvx: 0, lvy: 0, hop: 0, attackBuf: 0, trail: [],
  };
}

export function mkMob(def: MobDef, x: number, y: number, spawnIdx = -1): Mob {
  return {
    uid: W.uid++, def, x, y, hx: x, hy: y, vx: 0, vy: 0, face: rand(0, 6.28), hp: def.hp, maxhp: def.hp, state: 'idle', t: 0, atk: null, cd: rand(0, 1),
    target: null, retarget: 0, poise: def.poise, stun: 0, flash: 0, kbx: 0, kby: 0, dead: false, deadT: 0, wanderT: rand(0.5, 3), wx: x, wy: y,
    tele: null, lungeLeft: 0, lungeAng: 0, hitDone: false, comboLeft: 0, phase: 1, lastBar: 4, invuln: 0, lastHitBy: null, playerHit: false,
    spawnIdx, summonT: 25, scripted: false, hostileToNpc: false, duel: false, leapT: 0, leapFrom: [0, 0], leapTo: [0, 0], seen: false, anim: rand(0, 6),
  };
}

function findFree(tx: number, ty: number, spread: number): [number, number] {
  for (let i = 0; i < 40; i++) {
    const x = tx + irand(-spread, spread), y = ty + irand(-spread, spread);
    if (freeTile(x, y)) return [x, y];
  }
  for (let r = 1; r < 12; r++) for (let y = ty - r; y <= ty + r; y++) for (let x = tx - r; x <= tx + r; x++) if (freeTile(x, y)) return [x, y];
  return [tx, ty];
}
export { findFree };

export function spawnMobAt(id: string, tx: number, ty: number, spawnIdx = -1): Mob {
  const def = MOBS[id];
  if (!def) throw new Error(`Unknown mob ${id}`);
  const m = mkMob(def, px(tx), px(ty), spawnIdx);
  W.mobs.push(m);
  return m;
}

export function openPuzzleDoor() {
  for (let x = 20; x < 23; x++) W.grid[30][x] = T.LFLOOR;
}

export function loadZone(zoneId: string, tx: number, ty: number) {
  const z = ZONES[zoneId];
  W.zone = zoneId;
  W.grid = baseGrid(zoneId).map((r) => r.slice());
  W.w = z.w; W.h = z.h;
  W.mobs = []; W.allies = []; W.npcs = []; W.objs = []; W.projs = []; W.aoes = []; W.parts = []; W.floats = []; W.orbs = []; W.slashes = []; W.respawns = [];
  W.puzzle = []; W.cine = null; W.bossBars = null; W.hint = '';
  if (zoneId === 'lab2' && G.flags.puzzleOpen) openPuzzleDoor();
  if (zoneId === 'bossroom' && G.flags.firstFloorCleared) { /* stairs shown by renderer */ }

  (SPAWNS[zoneId] ?? []).forEach((s, idx) => {
    if (!cond(s.when)) return;
    if (MOBS[s.mob].unique && G.flags[`dead:${s.mob}`]) return;
    for (let i = 0; i < (s.n ?? 1); i++) {
      const [x, y] = findFree(s.tx, s.ty, s.spread ?? 3);
      spawnMobAt(s.mob, x, y, idx);
    }
  });

  for (const n of NPCS) {
    if (n.zone !== zoneId || !cond(n.when)) continue;
    W.npcs.push({ def: n, x: px(n.tx), y: px(n.ty), hx: px(n.tx), hy: px(n.ty), face: n.facing ?? Math.PI / 2, wanderT: rand(1, 4), wx: px(n.tx), wy: px(n.ty), anim: rand(0, 6) });
  }
  for (const o of objectsFor(zoneId)) {
    if (!cond(o.when)) continue;
    const opened = (o.kind === 'chest' && G.opened.includes(o.id));
    W.objs.push({ def: o, x: px(o.tx), y: px(o.ty), used: opened, respawn: 0 });
  }
  const p = newPlayer(px(tx), px(ty));
  if (W.player) { p.hp = W.player.hp; p.skillCd = W.player.skillCd; p.hot = W.player.hot; p.face = W.player.face; }
  W.player = p;
  W.cam.x = p.x - 240; W.cam.y = p.y - 135; clampCam(true);
  W.fade = 1;
  W.visited.add(zoneId);
  W.banner = { text: z.name, t: 3.5 };
}

export const VIEW_W = 480, VIEW_H = 270;
export function clampCam(snap = false) {
  const p = W.player;
  const tx = p.x - VIEW_W / 2, ty = p.y - VIEW_H / 2;
  const mw = W.w * TILE, mh = W.h * TILE;
  const cx = mw <= VIEW_W ? (mw - VIEW_W) / 2 : clamp(tx, 0, mw - VIEW_W);
  const cy = mh <= VIEW_H ? (mh - VIEW_H) / 2 : clamp(ty, 0, mh - VIEW_H);
  if (snap) { W.cam.x = cx; W.cam.y = cy; } else { W.cam.x += (cx - W.cam.x) * 0.12; W.cam.y += (cy - W.cam.y) * 0.12; }
}

export function portalAt(x: number, y: number) {
  const tx = Math.floor(x / TILE), ty = Math.floor(y / TILE);
  return (PORTALS[W.zone] ?? []).find((p) => tx >= p.x && ty >= p.y && tx < p.x + p.w && ty < p.y + p.h) ?? null;
}

export function addFloat(x: number, y: number, text: string, color = '#fff', size = 9, life = 0.9) {
  W.floats.push({ x, y, text, color, t: 0, life, size });
}
export function burst(x: number, y: number, color: string, n: number, speed = 60, life = 0.5, size = 1.6, grav = 0, glow = false) {
  for (let i = 0; i < n; i++) {
    const a = rand(0, 6.283), s = rand(speed * 0.3, speed);
    W.parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, t: 0, life: rand(life * 0.6, life), color, size: rand(size * 0.6, size), grav, glow });
  }
}
export const hostileMobs = () => W.mobs.filter((m) => !m.dead);
