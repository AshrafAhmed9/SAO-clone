import { sfx } from '../engine/audio';
import * as I from '../engine/input';
import { angDiff, dist, lerp } from '../engine/util';
import { damageMob, healPlayer, playerDamageValue, useWeapon } from './combat';
import { moveSpeed, SKILLS, skillProf, skillUnlocked, maxHp, type SkillDef } from './progression';
import { count, G, takeItem } from './state';
import { burst, moveBody, addFloat, solidAtPx, W, type Mob } from './world';

interface AttackStep { wind: number; act: number; rec: number; mul: number; arc: number; range: number; lunge: number; poise: number; kb: number }
const ATT: AttackStep[] = [
  { wind: 0.07, act: 0.08, rec: 0.16, mul: 1.0, arc: 2.1, range: 25, lunge: 70, poise: 8, kb: 55 },
  { wind: 0.07, act: 0.08, rec: 0.17, mul: 1.05, arc: 2.1, range: 25, lunge: 70, poise: 8, kb: 55 },
  { wind: 0.11, act: 0.1, rec: 0.3, mul: 1.5, arc: 2.5, range: 29, lunge: 120, poise: 18, kb: 130 },
];

const inArc = (ox: number, oy: number, face: number, range: number, arc: number, m: Mob) => {
  const d = dist(ox, oy, m.x, m.y);
  if (d > range + m.def.radius * (m.def.size ?? 1)) return false;
  if (arc >= 6) return true;
  return Math.abs(angDiff(Math.atan2(m.y - oy, m.x - ox), face)) <= arc / 2 + Math.atan2(m.def.radius, Math.max(d, 1));
};

function nearestHostile(maxD: number, within?: number): Mob | null {
  const p = W.player; let best: Mob | null = null; let bd = maxD;
  for (const m of W.mobs) {
    if (m.dead || m.scripted) continue;
    const d = dist(p.x, p.y, m.x, m.y);
    if (d >= bd) continue;
    if (within !== undefined && Math.abs(angDiff(Math.atan2(m.y - p.y, m.x - p.x), p.face)) > within) continue;
    best = m; bd = d;
  }
  return best;
}

function aimAssist(range: number, cone: number) {
  const p = W.player;
  const t = nearestHostile(range, cone);
  if (t) p.face = Math.atan2(t.y - p.y, t.x - p.x);
}

function strike(arc: number, range: number, mul: number, poise: number, kb: number, done?: Set<Mob>, sk = false): number {
  const p = W.player; let hits = 0;
  for (const m of W.mobs) {
    if (m.dead || m.scripted || done?.has(m)) continue;
    if (!inArc(p.x, p.y, p.face, range, arc, m)) continue;
    done?.add(m);
    const { dmg, crit } = playerDamageValue(mul, m.def.def);
    const ang = Math.atan2(m.y - p.y, m.x - p.x);
    if (damageMob(m, dmg, { by: 'player', poise, kb, kbAngle: ang, crit })) {
      hits++; sfx(sk ? 'skillHit' : crit ? 'crit' : 'hit'); useWeapon(sk ? 0.4 : 0.2);
    }
  }
  if (hits) { W.hitstop = Math.max(W.hitstop, sk ? 0.07 : 0.04); W.cam.shake = Math.max(W.cam.shake, sk ? 3 : 1.5); }
  return hits;
}

function slashFx(arc: number, range: number, color = '#ffffff', width = 3, life = 0.14) {
  const p = W.player;
  W.slashes.push({ x: p.x, y: p.y, face: p.face, arc: Math.min(arc, 6.3), range, t: 0, life, color, width });
}

function startAttack() {
  const p = W.player;
  const idx = p.comboT > 0 ? (p.combo + 1) % 3 : 0;
  p.combo = idx; p.state = 'attack'; p.t = 0; p.atkHit = false; p.attackBuf = 0;
  aimAssist(62, 1.9);
  sfx('swing');
}

function startSkill(def: SkillDef) {
  const p = W.player;
  p.skill = { id: def.id, hits: def.hits, hitIdx: 0, nextHit: 0, done: new Set() };
  p.state = 'skillWind'; p.t = 0; p.attackBuf = 0; p.skillCd[def.id] = def.cd;
  aimAssist(def.id === 'dash' ? 120 : 70, 1.5);
  sfx('skill');
  burst(p.x, p.y, '#8fd4ff', 12, 50, 0.3, 1.6, 0, true);
}

function doSwitch(): boolean {
  const p = W.player;
  if ((p.skillCd.switch ?? 0) > 0) return false;
  let best: Mob | null = null; let bd = 210;
  for (const m of W.mobs) {
    if (m.dead || m.state !== 'stagger' || m.stun < 0.12) continue;
    const d = dist(p.x, p.y, m.x, m.y);
    if (d < bd) { best = m; bd = d; }
  }
  if (!best) return false;
  const ang = Math.atan2(best.y - p.y, best.x - p.x);
  const off = best.def.radius + 12;
  let tx = best.x + Math.cos(ang) * off, ty = best.y + Math.sin(ang) * off; // land on the far side
  if (solidAtPx(tx, ty)) { tx = best.x - Math.cos(ang) * off; ty = best.y - Math.sin(ang) * off; }
  if (solidAtPx(tx, ty)) { tx = p.x; ty = p.y; }
  p.state = 'switch'; p.t = 0; p.swFrom = [p.x, p.y]; p.swTo = [tx, ty]; p.swTarget = best; p.invuln = 0.8;
  p.face = Math.atan2(best.y - ty, best.x - tx);
  p.skillCd.switch = 0.9;
  sfx('switch'); addFloat(p.x, p.y - 16, 'Switch!', '#ffe36a', 10, 0.8);
  return true;
}

export function updatePlayer(dt: number, canAct: boolean) {
  const p = W.player;
  p.anim += dt;
  p.invuln = Math.max(0, p.invuln - dt); p.flash = Math.max(0, p.flash - dt); p.dodgeCd -= dt; p.useCd -= dt; p.comboT -= dt; p.attackBuf -= dt;
  for (const k of Object.keys(p.skillCd)) p.skillCd[k] = Math.max(0, p.skillCd[k] - dt);
  p.hop = Math.max(0, p.hop - dt * 4);
  for (const h of p.hot) { const a = Math.min(h.left, dt); p.hp = Math.min(maxHp(), p.hp + h.rate * a); h.left -= dt; }
  p.hot = p.hot.filter((h) => h.left > 0);
  if (p.hp > maxHp()) p.hp = maxHp();
  p.trail = p.trail.filter((t) => (t.t += dt) < 0.25);

  // knockback
  if (Math.abs(p.kbx) + Math.abs(p.kby) > 1) {
    moveBody(p, p.kbx * dt, p.kby * dt, p.r);
    const f = Math.pow(0.002, dt); p.kbx *= f; p.kby *= f;
  }
  if (p.dead) { p.deadT += dt; return; }

  const can = canAct && !p.locked;
  if (can && I.pressed('attack')) p.attackBuf = 0.22;
  const mv = can ? I.moveVec() : { x: 0, y: 0 };
  p.moving = false;

  switch (p.state) {
    case 'free': {
      const wantBlock = can && I.down('block');
      if (wantBlock && !p.blocking) p.blockT = 0;
      p.blocking = wantBlock;
      if (p.blocking) p.blockT += dt;
      const spd = moveSpeed() * (p.blocking ? 0.5 : 1);
      const mag = Math.hypot(mv.x, mv.y);
      if (mag > 0.05) {
        p.moving = true;
        p.vx = lerp(p.vx, mv.x * spd, 0.35); p.vy = lerp(p.vy, mv.y * spd, 0.35);
        if (!p.blocking) p.face = Math.atan2(mv.y, mv.x);
      } else { p.vx *= 0.6; p.vy *= 0.6; }
      if (p.blocking) {
        const t = nearestHostile(140);
        if (t) p.face = Math.atan2(t.y - p.y, t.x - p.x);
        else if (mag > 0.05) p.face = Math.atan2(mv.y, mv.x);
      }
      moveBody(p, p.vx * dt, 0, p.r); moveBody(p, 0, p.vy * dt, p.r);
      if (!can) break;
      if (I.pressed('dodge') && p.dodgeCd <= 0) {
        const a = mag > 0.05 ? Math.atan2(mv.y, mv.x) : p.face;
        p.face = a; p.state = 'dodge'; p.t = 0; p.dodgeCd = 0.55; p.invuln = Math.max(p.invuln, 0.26); p.blocking = false;
        sfx('dodge'); burst(p.x, p.y + 4, '#d8d0b8', 6, 40, 0.3, 1.5);
        break;
      }
      for (const s of SKILLS) {
        if (I.pressed(`skill${s.slot}` as I.Action) && skillUnlocked(s)) {
          if ((p.skillCd[s.id] ?? 0) > 0) { sfx('ui'); continue; }
          startSkill(s); p.blocking = false; break;
        }
      }
      if (p.state !== 'free') break;
      if (p.attackBuf > 0 && !p.blocking) { startAttack(); break; }
      if (I.pressed('switch')) { if (doSwitch()) break; }
      if (I.pressed('potion') && p.useCd <= 0 && count('potion') > 0 && p.hp < maxHp()) {
        takeItem('potion'); p.hot.push({ left: 4, rate: 17.5 }); p.useCd = 0.8; sfx('heal'); addFloat(p.x, p.y - 16, 'Healing…', '#7dff9b', 8);
      } else if (I.pressed('crystal') && p.useCd <= 0 && count('crystal') > 0 && p.hp < maxHp()) {
        takeItem('crystal'); healPlayer(160); p.useCd = 1; sfx('heal'); burst(p.x, p.y, '#7ad7ff', 18, 70, 0.6, 2, 0, true);
      }
      break;
    }
    case 'attack': {
      p.blocking = false;
      const st = ATT[p.combo];
      p.t += dt;
      if (!p.atkHit && p.t >= st.wind) {
        p.atkHit = true;
        p.lvx = Math.cos(p.face) * st.lunge; p.lvy = Math.sin(p.face) * st.lunge;
        slashFx(st.arc, st.range, p.combo === 2 ? '#ffe9b0' : '#ffffff', p.combo === 2 ? 4 : 3);
        if (strike(st.arc, st.range, st.mul, st.poise, st.kb) && p.combo === 2) W.hitstop = Math.max(W.hitstop, 0.07);
      }
      moveBody(p, p.lvx * dt, 0, p.r); moveBody(p, 0, p.lvy * dt, p.r);
      p.lvx *= 0.82; p.lvy *= 0.82;
      const total = st.wind + st.act + st.rec;
      if (p.t >= st.wind + st.act + st.rec * 0.4) {
        if (can && I.pressed('dodge') && p.dodgeCd <= 0) { p.state = 'free'; p.comboT = 0; break; }
        if (p.attackBuf > 0 && p.t >= st.wind + st.act) { startAttack(); break; }
      }
      if (p.t >= total) { p.state = 'free'; p.comboT = 0.45; }
      break;
    }
    case 'dodge': {
      p.t += dt;
      const k = Math.max(0, 1 - p.t / 0.3);
      const s = 220 * k * k + 40;
      moveBody(p, Math.cos(p.face) * s * dt, 0, p.r); moveBody(p, 0, Math.sin(p.face) * s * dt, p.r);
      p.trail.push({ x: p.x, y: p.y, t: 0 });
      if (p.t >= 0.3) { p.state = 'free'; p.vx = p.vy = 0; }
      break;
    }
    case 'hurt': {
      p.t -= dt;
      if (p.t <= 0) p.state = 'free';
      break;
    }
    case 'skillWind': {
      p.t += dt;
      const def = SKILLS.find((s) => s.id === p.skill!.id)!;
      if (Math.random() < 0.6) burst(p.x + Math.cos(p.face) * 10, p.y + Math.sin(p.face) * 10, '#8fd4ff', 1, 30, 0.3, 1.4, 0, true);
      if (p.t >= def.windup) { p.state = 'skillMove'; p.t = 0; G.skillUses[def.id] = (G.skillUses[def.id] ?? 0) + 1; sfx('swing'); if (def.id === 'rising') p.hop = 1; }
      break;
    }
    case 'skillMove': {
      const def = SKILLS.find((s) => s.id === p.skill!.id)!;
      const sk = p.skill!;
      const mulP = (1 + 0.08 * skillProf(def.id)) * def.mul;
      const prev = p.t; p.t += dt;
      const spd = def.move / def.dur;
      moveBody(p, Math.cos(p.face) * spd * dt, 0, p.r); moveBody(p, 0, Math.sin(p.face) * spd * dt, p.r);
      p.trail.push({ x: p.x, y: p.y, t: 0 });
      if (def.id === 'dash') {
        if (prev === 0) slashFx(def.arc, def.range + 14, '#8fd4ff', 5, 0.2);
        strike(def.arc, def.range, mulP, def.poise, 90, sk.done, true);
      } else if (def.id === 'rising') {
        if (prev === 0) { slashFx(def.arc, def.range, '#9fe0ff', 6, 0.22); strike(def.arc, def.range, mulP, def.poise, 150, sk.done, true); }
      } else if (def.id === 'arc') {
        if (prev === 0) slashFx(7, def.range, '#ffd27a', 6, 0.25);
        if (p.t >= def.dur * 0.35 && sk.hitIdx === 0) { sk.hitIdx = 1; strike(7, def.range, mulP, def.poise, 130, undefined, true); }
      } else {
        const seg = def.dur / def.hits;
        while (sk.hitIdx < def.hits && p.t >= sk.hitIdx * seg) {
          const done = new Set<Mob>();
          slashFx(def.arc, def.range, ['#ffd1d1', '#d1f0ff', '#fff3b0'][sk.hitIdx], 5, 0.16);
          strike(def.arc, def.range, mulP, def.poise, 90, done, true);
          sfx('swing'); sk.hitIdx++;
        }
      }
      if (p.t >= def.dur) { p.state = 'skillPost'; p.t = 0; }
      break;
    }
    case 'skillPost': {
      const def = SKILLS.find((s) => s.id === p.skill!.id)!;
      p.t += dt;
      if (p.t >= def.post) { p.state = 'free'; p.skill = null; }
      break;
    }
    case 'switch': {
      p.t += dt;
      const k = Math.min(1, p.t / 0.18);
      p.x = lerp(p.swFrom[0], p.swTo[0], k); p.y = lerp(p.swFrom[1], p.swTo[1], k);
      p.trail.push({ x: p.x, y: p.y, t: 0 });
      if (p.t >= 0.18 && p.swTarget) {
        const m = p.swTarget; p.swTarget = null;
        if (!m.dead) {
          for (let i = 0; i < 3; i++) {
            const { dmg, crit } = playerDamageValue(1.35, m.def.def);
            damageMob(m, dmg, { by: 'player', poise: 0, kb: 40, kbAngle: p.face, crit });
          }
          m.stun = Math.max(m.stun, 0.9);
          slashFx(2.6, 30, '#ffe36a', 6, 0.3); sfx('skillHit'); sfx('crit'); W.hitstop = 0.1; W.cam.shake = 5;
          burst(m.x, m.y, '#ffe36a', 18, 120, 0.5, 2, 0, true);
        }
      }
      if (p.t >= 0.4) p.state = 'free';
      break;
    }
  }
}
