import { ITEMS } from '../data/items';
import { S } from '../data/strings';
import { sfx } from '../engine/audio';
import { angDiff, dist, irand, rand, pick } from '../engine/util';
import { burst, addFloat, W, type Ally, type Mob, type Proj } from './world';
import { critChance, defReduction, gainXp, maxHp, playerAtk, playerDef } from './progression';
import { addCol, addItem, G, onKill, setFlag, toast } from './state';

/** Gameplay callbacks that need scene-level handling (set in main.ts). */
export const ev = {
  onPlayerDeath: () => {}, onBossDead: (_by: 'player' | 'ally' | null) => {}, onDuelEnd: (_won: boolean, _mob: Mob) => {},
};

export type HurtResult = 'miss' | 'hit' | 'block' | 'parry';

export function useWeapon(n: number) {
  const id = G.equip.weapon;
  const before = G.dur[id] ?? 0;
  if (before <= 0) return;
  G.dur[id] = Math.max(0, before - n);
  if (G.dur[id] <= 0) { toast(S.ui.broken, '#ff8a8a'); sfx('break'); }
}

export function healPlayer(n: number) {
  const p = W.player;
  const before = p.hp;
  p.hp = Math.min(maxHp(), p.hp + n);
  if (p.hp > before) addFloat(p.x, p.y - 14, `+${Math.round(p.hp - before)}`, '#7dff9b', 8);
}

export function hurtPlayer(raw: number, sx: number, sy: number, o: { unblockable?: boolean; attacker?: Mob | null; kb?: number } = {}): HurtResult {
  const p = W.player;
  if (p.dead || p.invuln > 0 || W.cine?.name === 'lock') return 'miss';
  const toSrc = Math.atan2(sy - p.y, sx - p.x);
  let dmg = raw * (1 - defReduction(playerDef()));
  if (p.state === 'skillPost') dmg *= 1.25;
  if (p.blocking && !o.unblockable && Math.abs(angDiff(toSrc, p.face)) < 1.35 && p.state === 'free') {
    if (p.blockT < 0.22) {
      p.invuln = 0.35; sfx('parry'); W.hitstop = 0.09; W.cam.shake = Math.max(W.cam.shake, 3);
      burst(p.x + Math.cos(toSrc) * 8, p.y + Math.sin(toSrc) * 8, '#bfe9ff', 14, 90, 0.35, 1.6, 0, true);
      addFloat(p.x, p.y - 18, S.ui.perfect, '#bfe9ff', 9, 1.0);
      const a = o.attacker;
      if (a && !a.dead && !a.def.boss) { a.poise = 0; staggerMob(a, 1.6); } else if (a?.def.boss) { a.poise = 0; a.cd = Math.max(0, a.cd - 0.5); a.flash = 0.15; }
      return 'parry';
    }
    dmg *= 0.25; p.invuln = 0.18; sfx('block'); useWeapon(1);
    p.kbx += Math.cos(toSrc + Math.PI) * 60; p.kby += Math.sin(toSrc + Math.PI) * 60;
    burst(p.x + Math.cos(toSrc) * 8, p.y + Math.sin(toSrc) * 8, '#ffe9a8', 5, 60, 0.25);
    dmg = Math.max(1, Math.round(dmg)); p.hp -= dmg; addFloat(p.x, p.y - 14, String(dmg), '#cfd8e8', 8);
    if (p.hp <= 0) killPlayer();
    return 'block';
  }
  dmg = Math.max(1, Math.round(dmg));
  if (o.attacker?.duel && p.hp - dmg < maxHp() * 0.2) {
    p.hp = Math.max(p.hp, maxHp() * 0.2); ev.onDuelEnd(false, o.attacker); return 'miss';
  }
  p.hp -= dmg; p.flash = 0.18; p.invuln = 0.55; sfx('hurt');
  W.cam.shake = Math.max(W.cam.shake, 4); W.hitstop = Math.max(W.hitstop, 0.05);
  addFloat(p.x, p.y - 14, String(dmg), '#ff6b6b', 10);
  burst(p.x, p.y, '#ff4b5c', 8, 70, 0.4, 1.8);
  const kp = o.kb ?? 90;
  p.kbx += Math.cos(toSrc + Math.PI) * kp; p.kby += Math.sin(toSrc + Math.PI) * kp;
  if (p.state === 'skillWind' || p.state === 'attack') { p.state = 'hurt'; p.t = 0.25; p.skill = null; p.queued = false; }
  else if (p.state === 'free') { p.state = 'hurt'; p.t = 0.2; }
  if (p.hp <= 0) killPlayer();
  return 'hit';
}

export function killPlayer() {
  const p = W.player;
  if (p.dead) return;
  p.dead = true; p.hp = 0; p.state = 'dead'; p.deadT = 0; G.deaths++;
  sfx('shatter'); sfx('die');
  for (let i = 0; i < 46; i++) {
    const a = rand(0, 6.283), s = rand(30, 150);
    W.parts.push({ x: p.x + rand(-5, 5), y: p.y + rand(-8, 4), vx: Math.cos(a) * s, vy: Math.sin(a) * s - 30, t: 0, life: rand(0.8, 1.6), color: pick(['#bfe9ff', '#ffffff', '#7fc8ff']), size: rand(1.5, 3.5), grav: 20, glow: true });
  }
  ev.onPlayerDeath();
}

export function staggerMob(m: Mob, secs: number) {
  if (m.dead) return;
  m.state = 'stagger'; m.stun = secs; m.t = 0; m.tele = null; m.atk = null; m.poise = m.def.poise;
  addFloat(m.x, m.y - m.def.radius - 14, S.ui.switchPrompt, '#ffe36a', 9, 1.1);
}

export interface DmgOpts { poise?: number; kb?: number; kbAngle?: number; by: 'player' | 'ally'; mulCrit?: boolean; noCrit?: boolean }

export function playerDamageValue(mul: number, mobDef: number, noCrit = false): { dmg: number; crit: boolean } {
  let d = playerAtk() * mul * rand(0.92, 1.08);
  const crit = !noCrit && Math.random() * 100 < critChance();
  if (crit) d *= 1.6;
  return { dmg: Math.max(1, Math.round(d * (1 - defReduction(mobDef)))), crit };
}

export function damageMob(m: Mob, dmg: number, o: DmgOpts & { crit?: boolean }): boolean {
  if (m.dead || m.invuln > 0 || m.scripted) return false;
  if (m.duel && m.hp - dmg < m.maxhp * 0.2) {
    m.hp = Math.max(m.hp, m.maxhp * 0.2); m.scripted = true; m.state = 'idle'; m.tele = null; m.target = null;
    ev.onDuelEnd(true, m); return true;
  }
  m.hp -= dmg; m.flash = 0.12; m.lastHitBy = o.by; if (o.by === 'player') m.playerHit = true;
  addFloat(m.x + rand(-4, 4), m.y - m.def.radius - 8, String(dmg), o.crit ? '#ffe36a' : '#ffffff', o.crit ? 11 : 8);
  burst(m.x, m.y, o.crit ? '#ffe36a' : '#ffd9d9', o.crit ? 9 : 5, 80, 0.3, 1.5);
  if (o.kb && !m.def.boss && !m.def.rooted) {
    const a = o.kbAngle ?? 0; m.kbx += Math.cos(a) * o.kb; m.kby += Math.sin(a) * o.kb;
  }
  if (m.state === 'idle' || m.state === 'return') { m.state = 'chase'; m.target = { kind: 'player' }; }
  if (!m.def.boss || m.state === 'stagger') m.poise -= o.poise ?? 8;
  if (m.poise <= 0 && !m.def.boss && m.state !== 'stagger' && m.state !== 'cine') {
    staggerMob(m, m.def.unique ? 1.0 : 1.5);
  }
  if (m.hp <= 0) killMob(m);
  return true;
}

export function killMob(m: Mob) {
  if (m.dead) return;
  m.dead = true; m.deadT = 0; m.hp = 0; m.tele = null;
  sfx(m.def.boss ? 'roar' : 'hit');
  burst(m.x, m.y, m.def.color, m.def.boss ? 40 : 14, 100, 0.8, 2.5, 30);
  burst(m.x, m.y, '#ffffff', m.def.boss ? 30 : 8, 120, 0.9, 2, 0, true);
  const counts = m.playerHit || m.def.boss;
  if (counts) {
    const lvlDiff = G.level - m.def.level;
    const mult = lvlDiff <= 2 ? 1 : Math.max(0.2, 1 - 0.18 * (lvlDiff - 2));
    const xp = Math.round(m.def.xp * mult);
    if (xp > 0) { gainXp(xp); addFloat(W.player.x, W.player.y - 22, `+${xp} XP`, '#9be3ff', 8, 1.2); }
    const col = irand(m.def.col[0], m.def.col[1]);
    if (col > 0) W.orbs.push({ x: m.x, y: m.y, t: 0, kind: 'col', amount: col });
    for (const d of m.def.drops) if (Math.random() < d.chance) W.orbs.push({ x: m.x + rand(-6, 6), y: m.y + rand(-6, 6), t: 0, kind: 'item', amount: d.n ?? 1, item: d.item });
  }
  onKill(m.def.id);
  if (m.def.unique) setFlag(`dead:${m.def.id}`);
  if (m.def.id === 'warchief') setFlag('warchiefDead');
  if (m.def.id === 'flowerbulb') setFlag('petalTaken');
  if (m.spawnIdx >= 0 && !m.def.unique) {
    const mobHome = { x: m.hx, y: m.hy };
    W.respawns.push({ zone: W.zone, idx: m.spawnIdx, t: 75 + rand(0, 30), mob: m.def.id, tx: Math.floor(mobHome.x / 16), ty: Math.floor(mobHome.y / 16) });
  }
  if (m.def.boss && m.def.id === 'korrath') {
    for (const o of W.mobs) if (o !== m && !o.dead) killMob(o);
    ev.onBossDead(m.lastHitBy);
  }
}

export function collectOrb(kind: 'col' | 'item' | 'xp', amount: number, item?: string) {
  if (kind === 'col') { addCol(amount); addFloat(W.player.x, W.player.y - 18, `+${amount} Col`, '#ffd76a', 8); }
  else if (item) { addItem(item, amount); addFloat(W.player.x, W.player.y - 18, `${ITEMS[item].name}`, '#9be3a0', 8); }
}

export function hurtAlly(a: Ally, raw: number, sx: number, sy: number) {
  if (a.dead || a.invuln > 0) return;
  const dmg = Math.max(1, Math.round(raw * (a.role === 'tank' ? 0.6 : 1)));
  a.hp -= dmg; a.flash = 0.15; a.invuln = 0.35;
  addFloat(a.x, a.y - 14, String(dmg), '#ff9b9b', 7);
  const ang = Math.atan2(a.y - sy, a.x - sx);
  a.kbx += Math.cos(ang) * 50; a.kby += Math.sin(ang) * 50;
  burst(a.x, a.y, '#ff4b5c', 4, 50, 0.3);
  if (a.hp <= 0) {
    a.dead = true; a.deadT = 0; sfx('shatter');
    if (!G.deadAllies.includes(a.id)) G.deadAllies.push(a.id);
    toast(`${a.name} has died.`, '#ff8a8a');
    for (let i = 0; i < 26; i++) {
      const an = rand(0, 6.283), s = rand(30, 110);
      W.parts.push({ x: a.x, y: a.y, vx: Math.cos(an) * s, vy: Math.sin(an) * s - 20, t: 0, life: rand(0.7, 1.4), color: pick(['#bfe9ff', '#ffffff', '#7fc8ff']), size: rand(1.2, 3), grav: 20, glow: true });
    }
  }
}

export function fireProj(from: Mob, ang: number, speed: number, dmg: number, color = '#c9e86a', r = 3) {
  W.projs.push({ x: from.x + Math.cos(ang) * 8, y: from.y + Math.sin(ang) * 8, vx: Math.cos(ang) * speed, vy: Math.sin(ang) * speed, dmg, r, life: 2.5, color, owner: from });
}

export function updateProjs(dt: number, solid: (x: number, y: number) => boolean) {
  const p = W.player;
  for (const pr of W.projs as Proj[]) {
    pr.x += pr.vx * dt; pr.y += pr.vy * dt; pr.life -= dt;
    if (solid(pr.x, pr.y)) { pr.life = 0; burst(pr.x, pr.y, pr.color, 3, 40, 0.2); continue; }
    if (!p.dead && dist(pr.x, pr.y, p.x, p.y) < pr.r + p.r) {
      const res = hurtPlayer(pr.dmg, pr.x - pr.vx * 0.1, pr.y - pr.vy * 0.1, { attacker: null, kb: 40 });
      if (res !== 'miss') pr.life = 0;
    }
    for (const a of W.allies) if (!a.dead && pr.life > 0 && dist(pr.x, pr.y, a.x, a.y) < pr.r + a.r) { hurtAlly(a, pr.dmg, pr.x, pr.y); pr.life = 0; }
  }
  W.projs = W.projs.filter((x) => x.life > 0);
}

export function updateAoes(dt: number) {
  const p = W.player;
  for (const a of W.aoes) {
    a.t += dt;
    if (!a.done && a.t >= a.delay) {
      a.done = true;
      burst(a.x, a.y, a.color, 16, 110, 0.5, 2, 0, true); W.cam.shake = Math.max(W.cam.shake, a.r > 50 ? 5 : 2); sfx('skillHit');
      if (!p.dead && dist(a.x, a.y, p.x, p.y) < a.r + p.r) hurtPlayer(a.dmg, a.x, a.y, { unblockable: true, attacker: a.owner, kb: 110 });
      for (const al of W.allies) if (!al.dead && dist(a.x, a.y, al.x, al.y) < a.r + al.r) hurtAlly(al, a.dmg, a.x, a.y);
    }
  }
  W.aoes = W.aoes.filter((a) => a.t < a.delay + 0.25);
}
