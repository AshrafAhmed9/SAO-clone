import { TILE, isSolid } from '../data/tiles';
import { sfx } from '../engine/audio';
import { angDiff, dist, pick, rand } from '../engine/util';
import { MOBS } from '../data/mobs';
import { fireProj, hurtAlly, hurtPlayer } from './combat';
import { hooks } from './state';
import { addFloat, burst, moveBody, solidAtPx, spawnMobAt, tileAt, W, type Ally, type Mob, type Target } from './world';

// ---------- helpers ----------
export function los(x0: number, y0: number, x1: number, y1: number): boolean {
  const d = dist(x0, y0, x1, y1); const n = Math.ceil(d / 6);
  for (let i = 1; i < n; i++) {
    const t = i / n;
    if (solidAtPx(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t)) return false;
  }
  return true;
}
const posOf = (t: Target) => (t.kind === 'player' ? { x: W.player.x, y: W.player.y, r: W.player.r } : { x: t.ally.x, y: t.ally.y, r: t.ally.r });
const alive = (t: Target | null) => !!t && (t.kind === 'player' ? !W.player.dead : !t.ally.dead);

// BFS flow field toward the player, so chasers can round corners in the labyrinth.
let field: Int16Array | null = null; let fieldT = 0; let fieldKey = '';
function updateField(dt: number) {
  fieldT -= dt;
  const ptx = Math.floor(W.player.x / TILE), pty = Math.floor(W.player.y / TILE);
  const key = `${W.zone}:${ptx},${pty}`;
  if (fieldT > 0 && key === fieldKey) return;
  fieldT = 0.3; fieldKey = key;
  const n = W.w * W.h; field = new Int16Array(n).fill(-1);
  const q: number[] = [pty * W.w + ptx]; field[q[0]] = 0;
  for (let i = 0; i < q.length; i++) {
    const c = q[i]; const cx = c % W.w, cy = (c / W.w) | 0; const d = field[c];
    if (d > 60) continue;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = cx + dx, ny = cy + dy;
      if (nx < 0 || ny < 0 || nx >= W.w || ny >= W.h) continue;
      const ni = ny * W.w + nx;
      if (field[ni] !== -1 || isSolid(W.grid[ny][nx])) continue;
      field[ni] = d + 1; q.push(ni);
    }
  }
}
function steerTo(m: Mob, tx: number, ty: number, speed: number, dt: number, usePath: boolean) {
  let gx = tx, gy = ty;
  if (usePath && field && !los(m.x, m.y, tx, ty)) {
    const cx = Math.floor(m.x / TILE), cy = Math.floor(m.y / TILE);
    let best = field[cy * W.w + cx] ?? -1; let bx = -1, by = -1;
    if (best < 0) best = 9999;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
      const nx = cx + dx, ny = cy + dy;
      if (nx < 0 || ny < 0 || nx >= W.w || ny >= W.h) continue;
      const v = field[ny * W.w + nx];
      if (v < 0 || (dx && dy && (isSolid(tileAt(cx + dx, cy)) || isSolid(tileAt(cx, cy + dy))))) continue;
      if (v < best) { best = v; bx = nx; by = ny; }
    }
    if (bx >= 0) { gx = bx * TILE + TILE / 2; gy = by * TILE + TILE / 2; }
  }
  const a = Math.atan2(gy - m.y, gx - m.x);
  m.face = a;
  const r = m.def.radius * 0.7;
  if (m.def.flying) { m.x += Math.cos(a) * speed * dt; m.y += Math.sin(a) * speed * dt; }
  else { moveBody(m, Math.cos(a) * speed * dt, 0, r); moveBody(m, 0, Math.sin(a) * speed * dt, r); }
}

function pickTarget(m: Mob): Target | null {
  let best: Target | null = null; let bd = Infinity;
  const consider = (t: Target, bias: number) => {
    const p = posOf(t); const d = dist(m.x, m.y, p.x, p.y) * bias;
    if (d < bd) { bd = d; best = t; }
  };
  if (!W.player.dead) consider({ kind: 'player' }, 0.85);
  for (const a of W.allies) if (!a.dead) consider({ kind: 'ally', ally: a }, 1);
  if (!best) return null;
  const p = posOf(best);
  const d = dist(m.x, m.y, p.x, p.y);
  const engaged = m.state !== 'idle' && m.state !== 'return';
  if (d > (engaged ? m.def.aggro * 2.2 : m.def.aggro)) return null;
  if (!engaged && !los(m.x, m.y, p.x, p.y)) return null;
  return best;
}

function validAttacks(m: Mob, d: number) {
  return m.def.attacks.filter((a) => (!a.minPhase || m.phase >= a.minPhase) && (!a.maxPhase || m.phase <= a.maxPhase) && d <= a.range);
}

// ---------- attack execution ----------
function dmgOf(m: Mob, mul: number) { return m.def.atk * mul * rand(0.92, 1.08); }

function hitArc(m: Mob, range: number, arc: number, mul: number, kb = 90) {
  const check = (x: number, y: number, r: number) => {
    const d = dist(m.x, m.y, x, y);
    if (d > range + r) return false;
    return Math.abs(angDiff(Math.atan2(y - m.y, x - m.x), m.face)) <= arc / 2 + Math.atan2(r, Math.max(d, 1));
  };
  const p = W.player;
  if (!p.dead && check(p.x, p.y, p.r)) hurtPlayer(dmgOf(m, mul), m.x, m.y, { attacker: m, kb });
  for (const a of W.allies) if (!a.dead && check(a.x, a.y, a.r)) hurtAlly(a, dmgOf(m, mul), m.x, m.y);
}

function beginAttack(m: Mob, atk: Mob['atk'], t: Target) {
  if (!atk) return;
  const tp = posOf(t);
  m.atk = atk; m.state = 'windup'; m.t = 0; m.hitDone = false;
  m.face = Math.atan2(tp.y - m.y, tp.x - m.x);
  const targetCentered = atk.kind === 'slam' && !!m.def.keepAway;
  m.tele = {
    kind: atk.kind, ang: m.face, range: atk.kind === 'lunge' ? atk.range * 1.15 : atk.range, arc: atk.arc ?? 0.5, r: atk.radius ?? 0,
    cx: targetCentered || atk.kind === 'leap' ? tp.x : m.x, cy: targetCentered || atk.kind === 'leap' ? tp.y : m.y, p: 0,
  };
  if (m.def.boss) sfx('warn');
}

function executeAttack(m: Mob, t: Target) {
  const atk = m.atk!; m.tele = null;
  switch (atk.kind) {
    case 'melee':
      hitArc(m, atk.range, atk.arc ?? 1.6, atk.mul); sfx('swing'); burst(m.x + Math.cos(m.face) * 14, m.y + Math.sin(m.face) * 14, '#ffffff', 4, 50, 0.2);
      m.state = 'strike'; m.t = 0; break;
    case 'combo':
      hitArc(m, atk.range, atk.arc ?? 2.4, atk.mul); sfx('swing');
      m.comboLeft = (atk.count ?? 3) - 1; m.state = 'strike'; m.t = 0; break;
    case 'lunge':
      m.state = 'lunge'; m.lungeLeft = atk.range * 1.15; m.lungeAng = m.face; m.hitDone = false; sfx('dodge'); break;
    case 'shoot':
      fireProj(m, m.face, atk.speed ?? 120, dmgOf(m, atk.mul), m.def.accent); sfx('swing'); m.state = 'recover'; m.t = 0; break;
    case 'fan': {
      const n = atk.count ?? 5;
      for (let i = 0; i < n; i++) fireProj(m, m.face + (i - (n - 1) / 2) * 0.22, atk.speed ?? 100, dmgOf(m, atk.mul), m.def.accent, 3.5);
      sfx('swing'); m.state = 'recover'; m.t = 0; break;
    }
    case 'slam': {
      const c = atk.range > 100 && m.def.keepAway ? posOf(t) : { x: m.x, y: m.y };
      W.aoes.push({ x: c.x, y: c.y, r: atk.radius ?? 40, delay: 0.001, t: 0, dmg: dmgOf(m, atk.mul), color: m.def.accent, owner: m, done: false });
      m.state = 'recover'; m.t = 0; break;
    }
    case 'leap': {
      const tp = posOf(t);
      m.state = 'leap'; m.leapT = 0; m.leapFrom = [m.x, m.y]; m.leapTo = [tp.x, tp.y]; sfx('dodge'); break;
    }
    default: m.state = 'recover'; m.t = 0;
  }
}

// ---------- boss ----------
function bossLogic(m: Mob, dt: number): boolean {
  const bar = m.maxhp / 4;
  const barsLeft = Math.max(1, Math.ceil(m.hp / bar));
  const newPhase = 5 - barsLeft;
  W.bossBars = { name: m.def.name, hp: m.hp, maxhp: m.maxhp, bars: barsLeft };
  if (m.dead) return true;

  if (newPhase > m.phase && m.state !== 'cine') {
    m.phase = newPhase; m.state = 'cine'; m.t = 0; m.tele = null; m.atk = null; m.invuln = 99; m.hitDone = false;
    sfx('roar'); W.cam.shake = 8; burst(m.x, m.y, m.def.accent, 30, 130, 0.8, 2.5, 0, true);
    if (newPhase === 4) { W.cine = { name: 'phase4', t: 0, step: 0 }; hooks.say('boss.phase4'); }
  }
  if (m.state === 'cine') {
    m.t += dt;
    if (m.phase < 4) {
      if (!m.hitDone && m.t > 1.0) { m.hitDone = true; summonGuards(m, 2); }
      if (m.t > 1.6) { m.state = 'chase'; m.invuln = 0; m.cd = 0.5; }
    } else if (W.cine) runPhase4(m, dt);
    return true;
  }
  m.summonT -= dt;
  if (m.phase >= 2 && m.summonT <= 0) {
    m.summonT = 45;
    if (W.mobs.filter((x) => x.def.id === 'guard' && !x.dead).length < 3) summonGuards(m, 2);
  }
  return false;
}

function summonGuards(m: Mob, n: number) {
  for (let i = 0; i < n; i++) {
    const a = rand(0, 6.28); const tx = Math.floor((m.x + Math.cos(a) * 60) / TILE), ty = Math.floor((m.y + Math.sin(a) * 50) / TILE);
    if (!isSolid(tileAt(tx, ty))) {
      const g = spawnMobAt('guard', tx, ty); g.state = 'chase'; g.target = { kind: 'player' };
      burst(g.x, g.y, '#c4553a', 12, 70, 0.5, 2, 0, true);
    }
  }
  addFloat(m.x, m.y - 30, 'Guards!', '#ff9b6b', 10, 1.2);
}

function runPhase4(m: Mob, dt: number) {
  const c = W.cine!; c.t += dt;
  const leader = W.allies.find((a) => a.id === 'veyra' && !a.dead) ?? null;
  if (c.step === 0 && c.t > 0.3) { c.step = 1; if (leader) { leader.bark = 'Get back, all of you!'; leader.barkT = 2.5; } }
  if (c.step === 1 && leader && !leader.dead) {
    const d = dist(leader.x, leader.y, m.x, m.y);
    if (d > 26 && c.t < 4) { const a = Math.atan2(m.y - leader.y, m.x - leader.x); moveBody(leader, Math.cos(a) * 150 * dt, Math.sin(a) * 150 * dt, leader.r); leader.face = a; }
    else { c.step = 2; c.t = 0; m.face = Math.atan2(leader.y - m.y, leader.x - m.x); sfx('warn'); }
  } else if (c.step === 1) { c.step = 3; c.t = 0; }
  if (c.step === 2 && c.t > 0.5) {
    if (leader) { hurtAlly(leader, 99999, m.x, m.y); }
    sfx('hit'); W.cam.shake = 10; W.hitstop = 0.25; c.step = 3; c.t = 0;
  }
  if (c.step === 3 && c.t > 1.4) {
    m.state = 'chase'; m.invuln = 0; m.cd = 0.4; W.cine = null;
    addFloat(m.x, m.y - 34, 'Phase 4', '#ff6b6b', 11, 1.5);
  }
}

// ---------- main mob update ----------
export function updateMobs(dt: number) {
  const anyChasing = W.mobs.some((m) => !m.dead && (m.state === 'chase' || m.state === 'return'));
  if (anyChasing) updateField(dt);
  for (const m of W.mobs) updateMob(m, dt);
  // separation
  for (let i = 0; i < W.mobs.length; i++) {
    const a = W.mobs[i]; if (a.dead || a.def.rooted) continue;
    for (let j = i + 1; j < W.mobs.length; j++) {
      const b = W.mobs[j]; if (b.dead) continue;
      const d = dist(a.x, a.y, b.x, b.y); const min = (a.def.radius + b.def.radius) * 0.9;
      if (d < min && d > 0.01) {
        const push = (min - d) / 2; const ang = Math.atan2(b.y - a.y, b.x - a.x);
        if (!b.def.rooted) moveBody(b, Math.cos(ang) * push, Math.sin(ang) * push, b.def.radius * 0.6);
        moveBody(a, -Math.cos(ang) * push, -Math.sin(ang) * push, a.def.radius * 0.6);
      }
    }
  }
  W.mobs = W.mobs.filter((m) => !(m.dead && m.deadT > 1.2));
  const boss = W.mobs.find((m) => m.def.boss && !m.dead && m.def.id === 'korrath');
  if (!boss && W.bossBars) W.bossBars = null;
}

function updateMob(m: Mob, dt: number) {
  m.anim += dt; m.flash = Math.max(0, m.flash - dt); m.invuln = Math.max(0, m.invuln - dt);
  if (m.dead) { m.deadT += dt; return; }
  if (Math.abs(m.kbx) + Math.abs(m.kby) > 1) {
    if (!m.def.flying) moveBody(m, m.kbx * dt, m.kby * dt, m.def.radius * 0.7); else { m.x += m.kbx * dt; m.y += m.kby * dt; }
    const f = Math.pow(0.003, dt); m.kbx *= f; m.kby *= f;
  }
  if (m.scripted) return;
  m.cd -= dt;
  if (m.def.boss && m.def.id === 'korrath' && bossLogic(m, dt)) return;
  if (m.stun > 0) { m.stun -= dt; if (m.stun <= 0 && m.state === 'stagger') { m.state = 'chase'; m.cd = 0.3; } return; }

  const spd = m.def.speed * (m.def.boss ? 1 + 0.07 * (m.phase - 1) : 1);
  const r = m.def.radius * 0.7;

  switch (m.state) {
    case 'idle': {
      m.retarget -= dt;
      if (m.retarget <= 0) {
        m.retarget = 0.35;
        const t = pickTarget(m);
        if (t) {
          m.target = t; m.state = 'chase';
          for (const o of W.mobs) if (o !== m && !o.dead && o.state === 'idle' && o.def.id === m.def.id && (m.def.pack || m.def.id === 'grunt') && dist(o.x, o.y, m.x, m.y) < 110) { o.target = t; o.state = 'chase'; }
          break;
        }
      }
      if (m.def.rooted || m.def.speed === 0) break;
      m.wanderT -= dt;
      if (m.wanderT <= 0) {
        m.wanderT = rand(1.5, 4);
        const a = rand(0, 6.28), d = rand(0, 36);
        m.wx = m.hx + Math.cos(a) * d; m.wy = m.hy + Math.sin(a) * d;
        if (Math.random() < 0.3) { m.wx = m.x; m.wy = m.y; }
      }
      if (dist(m.x, m.y, m.wx, m.wy) > 3) steerTo(m, m.wx, m.wy, spd * 0.35, dt, false);
      break;
    }
    case 'chase': {
      m.retarget -= dt;
      if (!alive(m.target) || m.retarget <= 0) {
        m.retarget = 0.5;
        const t = pickTarget(m);
        if (t) m.target = t; else if (!alive(m.target)) m.target = null;
      }
      if (!m.target) { m.state = 'return'; break; }
      if (!m.def.boss && dist(m.x, m.y, m.hx, m.hy) > m.def.leash) { m.state = 'return'; m.target = null; break; }
      const tp = posOf(m.target); const d = dist(m.x, m.y, tp.x, tp.y);
      const keep = m.def.keepAway ?? 0;
      m.face = Math.atan2(tp.y - m.y, tp.x - m.x);
      let moved = false;
      if (!m.def.rooted) {
        if (keep && d < keep * 0.75) {
          const a = Math.atan2(m.y - tp.y, m.x - tp.x) + Math.sin(m.anim * 2) * 0.6;
          moveBody(m, Math.cos(a) * spd * dt, 0, r); moveBody(m, 0, Math.sin(a) * spd * dt, r); moved = true;
        } else if (!keep || d > keep * 1.05) {
          const opt = m.def.attacks.length ? Math.min(...m.def.attacks.map((a) => a.range)) * 0.7 : 20;
          if (d > Math.max(opt, tp.r + m.def.radius + 4)) { steerTo(m, tp.x, tp.y, spd, dt, m.target.kind === 'player'); moved = true; }
        }
        if (m.def.flying) { m.y += Math.sin(m.anim * 6) * 18 * dt; }
      }
      void moved;
      if (m.cd <= 0) {
        const opts = validAttacks(m, d - tp.r);
        if (opts.length && (!keep || los(m.x, m.y, tp.x, tp.y))) beginAttack(m, pick(opts), m.target);
      }
      break;
    }
    case 'windup': {
      const atk = m.atk!; m.t += dt;
      const tp = alive(m.target) ? posOf(m.target!) : null;
      if (tp && m.t < atk.windup * 0.65 && atk.kind !== 'slam') { m.face = Math.atan2(tp.y - m.y, tp.x - m.x); if (m.tele) m.tele.ang = m.face; }
      if (m.tele) m.tele.p = Math.min(1, m.t / atk.windup);
      if (m.t >= atk.windup) { if (m.target && alive(m.target)) executeAttack(m, m.target); else { m.state = 'chase'; m.tele = null; } }
      break;
    }
    case 'strike': {
      m.t += dt;
      if (m.comboLeft > 0) {
        if (m.t >= 0.32) {
          m.comboLeft--; m.t = 0;
          if (m.target && alive(m.target)) { const tp = posOf(m.target); m.face = Math.atan2(tp.y - m.y, tp.x - m.x); moveBody(m, Math.cos(m.face) * 10, Math.sin(m.face) * 10, r); }
          hitArc(m, m.atk!.range + 6, m.atk!.arc ?? 2.4, m.atk!.mul); sfx('swing'); burst(m.x + Math.cos(m.face) * 20, m.y + Math.sin(m.face) * 20, '#ffffff', 6, 60, 0.25);
        }
      } else if (m.t >= 0.12) { m.state = 'recover'; m.t = 0; }
      break;
    }
    case 'lunge': {
      const sp = m.atk!.speed ?? 230; const step = Math.min(m.lungeLeft, sp * dt);
      const blocked = moveBody(m, Math.cos(m.lungeAng) * step, Math.sin(m.lungeAng) * step, r) && !m.def.flying;
      if (m.def.flying) { m.x += Math.cos(m.lungeAng) * step; m.y += Math.sin(m.lungeAng) * step; }
      m.lungeLeft -= step;
      if (!m.hitDone) {
        const pl = W.player;
        if (!pl.dead && dist(m.x, m.y, pl.x, pl.y) < m.def.radius + pl.r + 2) { m.hitDone = true; hurtPlayer(dmgOf(m, m.atk!.mul), m.x - Math.cos(m.lungeAng) * 4, m.y - Math.sin(m.lungeAng) * 4, { attacker: m, kb: 120 }); }
        for (const a of W.allies) if (!a.dead && dist(m.x, m.y, a.x, a.y) < m.def.radius + a.r + 2) { m.hitDone = true; hurtAlly(a, dmgOf(m, m.atk!.mul), m.x, m.y); }
      }
      if (m.lungeLeft <= 0 || blocked || m.hitDone) { m.state = 'recover'; m.t = 0; }
      break;
    }
    case 'leap': {
      m.leapT += dt; const k = Math.min(1, m.leapT / 0.55);
      const nx = m.leapFrom[0] + (m.leapTo[0] - m.leapFrom[0]) * k, ny = m.leapFrom[1] + (m.leapTo[1] - m.leapFrom[1]) * k;
      if (!solidAtPx(nx, ny)) { m.x = nx; m.y = ny; }
      if (k >= 1) {
        W.aoes.push({ x: m.x, y: m.y, r: m.atk!.radius ?? 60, delay: 0.001, t: 0, dmg: dmgOf(m, m.atk!.mul), color: m.def.accent, owner: m, done: false });
        W.cam.shake = 7; m.state = 'recover'; m.t = 0;
      }
      break;
    }
    case 'recover': {
      m.t += dt;
      if (m.t >= (m.atk?.recover ?? 0.5)) { m.state = 'chase'; m.cd = m.def.boss ? rand(0.15, 0.5) : rand(0.3, 0.9); }
      break;
    }
    case 'return': {
      const d = dist(m.x, m.y, m.hx, m.hy);
      m.hp = Math.min(m.maxhp, m.hp + m.maxhp * 0.25 * dt);
      if (m.def.rooted) { m.state = 'idle'; break; }
      if (d < 5) { m.state = 'idle'; m.hp = m.maxhp; break; }
      steerTo(m, m.hx, m.hy, spd * 1.3, dt, false);
      m.retarget -= dt;
      if (m.retarget <= 0) { m.retarget = 0.5; const t = pickTarget(m); if (t && dist(m.x, m.y, posOf(t).x, posOf(t).y) < m.def.aggro * 0.6) { m.target = t; m.state = 'chase'; } }
      break;
    }
    default: break;
  }
}

export function summonDef(id: string) { return MOBS[id]; }
export type { Ally };
