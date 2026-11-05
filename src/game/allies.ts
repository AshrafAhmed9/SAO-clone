import { sfx } from '../engine/audio';
import { dist, pick, rand } from '../engine/util';
import { BARK } from '../data/dialogue';
import { S } from '../data/strings';
import { ZONES } from '../data/zones';
import { damageMob, healPlayer } from './combat';
import { defReduction } from './progression';
import { G } from './state';
import { addFloat, burst, moveBody, W, type Ally, type Mob } from './world';

interface AllyDef { name: string; role: Ally['role']; hp: number; atk: number; reach: number; speed: number; look: Ally['look'] }
const N = S.names;
export const ALLY_DEFS: Record<string, AllyDef> = {
  hobb: { name: N.hobb, role: 'tank', hp: 430, atk: 30, reach: 26, speed: 70, look: { hair: '#7a3b2a', coat: '#7e8794', accent: '#c9a14a' } },
  iselle: { name: N.iselle, role: 'spear', hp: 300, atk: 36, reach: 40, speed: 74, look: { hair: '#c9a14a', coat: '#4a7ac1' } },
  dov: { name: N.dov, role: 'rogue', hp: 260, atk: 27, reach: 22, speed: 92, look: { hair: '#2a2a2a', coat: '#3a3a4a' } },
  veyra: { name: N.veyra, role: 'leader', hp: 560, atk: 40, reach: 28, speed: 78, look: { hair: '#c14a4a', coat: '#2a3a6a', accent: '#e0b64a' } },
  r1: { name: 'Raider', role: 'raider', hp: 260, atk: 22, reach: 26, speed: 72, look: { hair: '#5a8a4a', coat: '#c1a24a' } },
  r2: { name: 'Raider', role: 'raider', hp: 260, atk: 22, reach: 26, speed: 72, look: { hair: '#b3b3b8', coat: '#8a5a3a' } },
  r3: { name: 'Raider', role: 'raider', hp: 260, atk: 22, reach: 26, speed: 72, look: { hair: '#a04a6a', coat: '#4ac17a' } },
  r4: { name: 'Raider', role: 'raider', hp: 260, atk: 22, reach: 26, speed: 72, look: { hair: '#d4d0c4', coat: '#7a4ac1' } },
};
const CD: Record<Ally['role'], number> = { tank: 1.2, spear: 1.0, rogue: 0.7, leader: 0.9, raider: 1.3 };

export function addAlly(id: string, x: number, y: number, slot: number): Ally | null {
  if (G.deadAllies.includes(id) || W.allies.some((a) => a.id === id)) return null;
  const d = ALLY_DEFS[id];
  const a: Ally = {
    id, name: d.name, role: d.role, look: d.look, x, y, vx: 0, vy: 0, face: 0, r: 5, hp: d.hp, maxhp: d.hp, atk: d.atk, reach: d.reach,
    state: 'follow', t: 0, target: null, cd: 0, healCd: 5, switchCd: 0, flash: 0, kbx: 0, kby: 0, dead: false, deadT: 0, bark: '', barkT: 0,
    invuln: 0, slot, anim: rand(0, 6), atkCd: rand(0, 0.5), doneHit: false,
  };
  W.allies.push(a); return a;
}

/** Party members who joined the raid follow the player everywhere. */
export function spawnParty(ids: string[]) {
  const p = W.player;
  ids.forEach((id, i) => addAlly(id, p.x - 14 + i * 12, p.y + 14, i));
}

function say(a: Ally, text: string, t = 1.4) { a.bark = text; a.barkT = t; }

function findTarget(a: Ally): Mob | null {
  const p = W.player; let best: Mob | null = null; let bd = 1e9;
  for (const m of W.mobs) {
    if (m.dead || m.scripted) continue;
    const dp = dist(m.x, m.y, p.x, p.y), da = dist(m.x, m.y, a.x, a.y);
    const active = m.state !== 'idle' || dp < 80 || da < 50 || m.def.boss;
    if (!active || (dp > 190 && da > 130)) continue;
    const d = da + (m.state === 'stagger' ? -60 : 0);
    if (d < bd) { best = m; bd = d; }
  }
  return best;
}

export function updateAllies(dt: number) {
  const p = W.player;
  const safe = ZONES[W.zone].safe;
  for (const a of W.allies) {
    a.anim += dt; a.flash = Math.max(0, a.flash - dt); a.invuln = Math.max(0, a.invuln - dt); a.cd -= dt; a.healCd -= dt; a.switchCd -= dt; a.atkCd -= dt;
    a.barkT = Math.max(0, a.barkT - dt);
    if (Math.abs(a.kbx) + Math.abs(a.kby) > 1) { moveBody(a, a.kbx * dt, a.kby * dt, a.r); const f = Math.pow(0.003, dt); a.kbx *= f; a.kby *= f; }
    if (a.dead) { a.deadT += dt; continue; }
    if (W.cine && a.id === 'veyra' && W.cine.step >= 1) continue;
    const def = ALLY_DEFS[a.id];

    if (a.hp < a.maxhp * 0.35 && a.healCd <= 0 && a.state !== 'windup') {
      a.hp = Math.min(a.maxhp, a.hp + a.maxhp * 0.4); a.healCd = 18; sfx('heal');
      addFloat(a.x, a.y - 16, 'Healing', '#7dff9b', 7); say(a, pick(BARK.low));
    }
    if (safe) a.target = null;
    else if (!a.target || a.target.dead || a.target.scripted || Math.random() < dt * 2.5) a.target = findTarget(a);
    const m = a.target;

    // finishing blow stays with the player
    const holdBack = !!m && m.def.boss && m.hp < m.maxhp * 0.06 && !p.dead;
    if (holdBack && a.barkT <= 0 && Math.random() < dt) say(a, 'Finish it!', 1.5);

    // Switch when a stunned enemy is open
    if (!safe && a.switchCd <= 0 && !holdBack) {
      const st = W.mobs.find((x) => !x.dead && x.state === 'stagger' && x.stun > 0.3 && dist(x.x, x.y, a.x, a.y) < 200);
      if (st) {
        a.switchCd = 4; a.x = st.x - Math.cos(a.face) * 14; a.y = st.y - Math.sin(a.face) * 14;
        a.face = Math.atan2(st.y - a.y, st.x - a.x);
        const dmg = Math.round(a.atk * 2.8 * (1 - defReduction(st.def.def)));
        damageMob(st, dmg, { by: 'ally', poise: 0, kb: 40, kbAngle: a.face });
        sfx('skillHit'); burst(st.x, st.y, '#bfe9ff', 10, 90, 0.4, 2, 0, true); say(a, pick(BARK.switch)); st.stun = Math.max(st.stun, 0.6);
        continue;
      }
    }

    if (a.state === 'dodge') {
      a.t += dt;
      moveBody(a, a.vx * dt, 0, a.r); moveBody(a, 0, a.vy * dt, a.r);
      if (a.t > 0.22) { a.state = 'follow'; }
      continue;
    }
    if (a.state === 'windup') {
      a.t += dt;
      if (a.t >= 0.28) {
        if (m && !m.dead && !holdBack && dist(a.x, a.y, m.x, m.y) < a.reach + m.def.radius + 8) {
          const dmg = Math.max(1, Math.round(a.atk * rand(0.9, 1.1) * (1 - defReduction(m.def.def))));
          damageMob(m, dmg, { by: 'ally', poise: a.role === 'spear' ? 14 : 10, kb: 40, kbAngle: a.face });
          sfx('hit');
        }
        a.state = 'follow'; a.atkCd = CD[a.role] * rand(0.9, 1.3);
      }
      continue;
    }

    let gx: number, gy: number, want = 0;
    if (m && !holdBack) {
      const ang = Math.atan2(m.y - a.y, m.x - a.x);
      const flank = a.role === 'rogue' ? 1.1 * (a.slot % 2 ? 1 : -1) : 0;
      const standoff = Math.max(10, a.reach * 0.75) + m.def.radius;
      gx = m.x - Math.cos(ang + flank * 0.5) * standoff; gy = m.y - Math.sin(ang + flank * 0.5) * standoff;
      a.face = ang;
      const d = dist(a.x, a.y, m.x, m.y);
      if (d <= a.reach + m.def.radius + 4 && a.atkCd <= 0) { a.state = 'windup'; a.t = 0; continue; }
      if (m.state === 'windup' && m.atk && d < m.atk.range + 22 && Math.random() < dt * 0.9 && a.role !== 'tank') {
        const side = ang + (Math.random() < 0.5 ? 1.57 : -1.57);
        a.vx = Math.cos(side) * 130; a.vy = Math.sin(side) * 130; a.state = 'dodge'; a.t = 0; a.invuln = 0.25; continue;
      }
      want = 1;
    } else {
      const ang = (a.slot / 3) * Math.PI * 2 + 2.4;
      gx = p.x + Math.cos(ang) * 30; gy = p.y + Math.sin(ang) * 26;
      if (dist(a.x, a.y, p.x, p.y) > 340 && !holdBack) { a.x = p.x + rand(-20, 20); a.y = p.y + rand(-20, 20); }
      want = dist(a.x, a.y, gx, gy) > (holdBack ? 60 : 16) ? 1 : 0;
      if (holdBack && m) a.face = Math.atan2(m.y - a.y, m.x - a.x);
    }
    if (want) {
      const ang = Math.atan2(gy - a.y, gx - a.x);
      const spd = def.speed * (dist(a.x, a.y, gx, gy) > 80 ? 1.5 : 1);
      moveBody(a, Math.cos(ang) * spd * dt, 0, a.r); moveBody(a, 0, Math.sin(ang) * spd * dt, a.r);
      if (!m) a.face = ang;
    }
  }
  for (let i = 0; i < W.allies.length; i++) {
    for (let j = i + 1; j < W.allies.length; j++) {
      const a = W.allies[i], b = W.allies[j]; if (a.dead || b.dead) continue;
      const d = dist(a.x, a.y, b.x, b.y);
      if (d < 9 && d > 0.01) { const an = Math.atan2(b.y - a.y, b.x - a.x); moveBody(b, Math.cos(an) * 0.6, Math.sin(an) * 0.6, b.r); moveBody(a, -Math.cos(an) * 0.6, -Math.sin(an) * 0.6, a.r); }
    }
  }
  void healPlayer;
}
