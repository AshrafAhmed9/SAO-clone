import { bakeZone, BAKE, type Baked } from '../art/tiles';
import { drawOverride } from '../art/manifest';
import { drawHuman, drawMob, drawObject } from '../art/sprites';
import { ITEMS } from '../data/items';
import { TILE } from '../data/tiles';
import { baseGrid, ZONES } from '../data/zones';
import { dist } from '../engine/util';
import { npcMarker } from './interact';
import { skillProf, weaponBroken } from './progression';
import { G } from './state';
import { spikeState } from './update';
import { VIEW_H, VIEW_W, W, type Mob } from './world';

export const ZOOM = 2;
export interface Label { x: number; y: number; text: string; color: string; size: number }
export const labels: Label[] = [];

let baked: Baked | null = null; let bakedKey = '';
function ensureBaked(): Baked {
  const key = W.zone + (G.flags.puzzleOpen ? ':o' : ':c');
  if (!baked || key !== bakedKey) {
    baked = bakeZone(W.grid, W.zone); bakedKey = key;
  }
  return baked;
}
export function resetBake() { baked = null; bakedKey = ''; }

let lightCanvas: HTMLCanvasElement | null = null;

function markerColor(m: Mob): string {
  const diff = m.def.level - G.level;
  if (m.def.boss) return '#ff3b3b';
  if (diff <= -4) return '#aab0b8';
  if (diff <= 1) return '#ffd24a';
  if (diff <= 4) return '#ff9b3a';
  return '#ff3b3b';
}
function drawMarker(c: CanvasRenderingContext2D, x: number, y: number, color: string, t: number) {
  const b = Math.sin(t * 4) * 0.8;
  c.fillStyle = color; c.strokeStyle = 'rgba(0,0,0,0.65)'; c.lineWidth = 0.9;
  c.beginPath(); c.moveTo(x - 3.2, y + b - 3); c.lineTo(x + 3.2, y + b - 3); c.lineTo(x, y + b + 1.6); c.closePath(); c.fill(); c.stroke();
}

function sector(c: CanvasRenderingContext2D, x: number, y: number, ang: number, range: number, arc: number) {
  c.beginPath(); c.moveTo(x, y); c.arc(x, y, range, ang - arc / 2, ang + arc / 2); c.closePath();
}
function drawTelegraph(c: CanvasRenderingContext2D, m: Mob) {
  const t = m.tele; if (!t) return;
  const a = 0.1 + t.p * 0.28;
  c.fillStyle = `rgba(255,60,50,${a})`; c.strokeStyle = `rgba(255,120,100,${0.35 + t.p * 0.4})`; c.lineWidth = 0.8;
  switch (t.kind) {
    case 'melee': case 'combo': sector(c, m.x, m.y, t.ang, t.range + m.def.radius, t.arc); c.fill(); c.stroke(); break;
    case 'lunge': {
      c.save(); c.translate(m.x, m.y); c.rotate(t.ang);
      c.fillRect(0, -m.def.radius, t.range, m.def.radius * 2); c.strokeRect(0, -m.def.radius, t.range, m.def.radius * 2);
      c.fillStyle = `rgba(255,60,50,${0.25 + t.p * 0.3})`; c.fillRect(0, -m.def.radius, t.range * t.p, m.def.radius * 2); c.restore(); break;
    }
    case 'slam': case 'leap': {
      c.beginPath(); c.arc(t.cx, t.cy, t.r, 0, 6.283); c.fill(); c.stroke();
      c.fillStyle = `rgba(255,60,50,${0.2 + t.p * 0.25})`; c.beginPath(); c.arc(t.cx, t.cy, t.r * t.p, 0, 6.283); c.fill(); break;
    }
    case 'fan': sector(c, m.x, m.y, t.ang, 90, 1.5); c.fill(); break;
    case 'shoot': c.strokeStyle = `rgba(255,120,100,${0.2 + t.p * 0.4})`; c.beginPath(); c.moveTo(m.x, m.y); c.lineTo(m.x + Math.cos(t.ang) * 70, m.y + Math.sin(t.ang) * 70); c.stroke(); break;
    default: break;
  }
}

export function renderWorld(c: CanvasRenderingContext2D, W_: number, H_: number) {
  const z = ZONES[W.zone]; const p = W.player;
  labels.length = 0;
  c.fillStyle = z.dark ? '#07070d' : '#9fd0ff'; c.fillRect(0, 0, W_, H_);
  const shx = (Math.random() - 0.5) * W.cam.shake, shy = (Math.random() - 0.5) * W.cam.shake;
  const camX = Math.round((W.cam.x + shx) * 2) / 2, camY = Math.round((W.cam.y + shy) * 2) / 2;
  const bk = ensureBaked();
  c.save();
  c.scale(ZOOM, ZOOM); c.translate(-camX, -camY);
  const mapW = W.w * TILE, mapH = W.h * TILE;
  const sx = Math.max(0, camX), sy = Math.max(0, camY);
  const sw = Math.min(VIEW_W + 2, mapW - sx), sh = Math.min(VIEW_H + 2, mapH - sy);
  if (sw > 0 && sh > 0) c.drawImage(bk.canvas, sx * BAKE, sy * BAKE, sw * BAKE, sh * BAKE, sx, sy, sw, sh);

  const vis = (x: number, y: number, m = 24) => x > camX - m && x < camX + VIEW_W + m && y > camY - m && y < camY + VIEW_H + m;
  const tm = W.time;

  // dynamic tile effects
  for (const [x, y] of bk.water) {
    const px = x * TILE, py = y * TILE; if (!vis(px, py, 16)) continue;
    c.fillStyle = 'rgba(255,255,255,0.22)';
    const o = Math.sin(tm * 1.5 + x * 1.7 + y) * 3;
    c.fillRect(px + 3 + o, py + 4, 5, 1); c.fillRect(px + 7 - o, py + 11, 5, 1);
  }
  const ss = W.zone === 'lab2' ? spikeState() : 'off';
  for (const [x, y] of bk.spikes) {
    const px = x * TILE, py = y * TILE;
    c.fillStyle = 'rgba(0,0,0,0.35)';
    for (let i = 0; i < 4; i++) c.fillRect(px + 2 + (i % 2) * 7, py + 2 + ((i / 2) | 0) * 7, 4, 4);
    if (ss !== 'off') {
      c.fillStyle = ss === 'up' ? '#d6dae6' : `rgba(255,${100 + Math.sin(tm * 30) * 60},80,0.8)`;
      for (let i = 0; i < 4; i++) { const sxp = px + 4 + (i % 2) * 7, syp = py + 4 + ((i / 2) | 0) * 7; c.beginPath(); c.moveTo(sxp - 2, syp + 2); c.lineTo(sxp, syp - (ss === 'up' ? 5 : 2)); c.lineTo(sxp + 2, syp + 2); c.fill(); }
    }
  }
  for (const [x, y] of bk.torches) {
    const px = x * TILE + 8, py = y * TILE + 4; if (!vis(px, py, 16)) continue;
    const f = 1 + Math.sin(tm * 12 + x) * 0.2;
    c.fillStyle = '#ff9b2a'; c.beginPath(); c.ellipse(px, py, 2 * f, 3.2 * f, 0, 0, 7); c.fill();
    c.fillStyle = '#ffe36a'; c.beginPath(); c.ellipse(px, py + 0.6, 1, 1.8 * f, 0, 0, 7); c.fill();
  }

  // ground decals: telegraphs
  for (const m of W.mobs) if (!m.dead && m.tele) drawTelegraph(c, m);
  for (const a of W.aoes) if (!a.done) {
    const pr = Math.min(1, a.t / Math.max(a.delay, 0.01));
    c.fillStyle = `rgba(255,60,50,${0.1 + pr * 0.25})`; c.strokeStyle = 'rgba(255,120,100,0.6)'; c.lineWidth = 0.8;
    c.beginPath(); c.arc(a.x, a.y, a.r, 0, 6.283); c.fill(); c.stroke();
  }

  // entities, y-sorted
  type Ent = { y: number; draw: () => void };
  const ents: Ent[] = [];
  for (const o of W.objs) {
    if (!vis(o.x, o.y)) continue;
    if (o.def.kind === 'herb' && o.used) continue;
    ents.push({ y: o.y, draw: () => {
      drawObject(c, o.def.kind, o.x, o.y, { used: o.used, t: tm, text: o.def.text });
      if (o.def.kind === 'chest' && o.def.hidden && !o.used && dist(o.x, o.y, p.x, p.y) < 70) {
        c.fillStyle = `rgba(255,240,150,${0.5 + Math.sin(tm * 6) * 0.4})`; c.fillRect(o.x - 1 + Math.sin(tm * 3) * 4, o.y - 8 - (tm * 8 % 6), 1.6, 1.6);
      }
    } });
  }
  for (const n of W.npcs) {
    if (!vis(n.x, n.y)) continue;
    ents.push({ y: n.y, draw: () => {
      const moving = dist(n.x, n.y, n.wx, n.wy) > 3 && !!n.def.wander;
      if (!drawOverride(c, `npc.${n.def.id}`, n.x, n.y, Math.cos(n.face) < 0)) drawHuman(c, n.x, n.y, n.face, n.def.look, { anim: n.anim, moving, sword: null });
      const mk = npcMarker(n);
      drawMarker(c, n.x, n.y - 21, n.def.player ? '#6be37a' : '#ffd24a', tm);
      if (mk) { labels.push({ x: n.x, y: n.y - 30, text: mk, color: mk === '!' ? '#ffe36a' : '#7ad7ff', size: 20 }); }
      if (dist(n.x, n.y, p.x, p.y) < 70) labels.push({ x: n.x, y: n.y - (mk ? 38 : 26), text: n.def.name, color: '#e8ecf5', size: 12 });
    } });
  }
  for (const m of W.mobs) {
    if (!vis(m.x, m.y, 40)) continue;
    ents.push({ y: m.y + (m.dead ? -50 : 0), draw: () => {
      const dead = m.dead; const alpha = dead ? Math.max(0, 1 - m.deadT / 1.0) : 1;
      let lift = 0;
      if (m.state === 'leap') lift = Math.sin(Math.min(1, m.leapT / 0.55) * Math.PI) * 26;
      if (m.def.flying) lift += 8 + Math.sin(m.anim * 5) * 1.5;
      const wind = m.state === 'windup' && m.atk ? m.t / m.atk.windup : 0;
      const moving = m.state === 'chase' || m.state === 'return' || m.state === 'lunge';
      if (!drawOverride(c, `mob.${m.def.id}`, m.x, m.y, Math.cos(m.face) < 0)) drawMob(c, m.def, m.x, m.y, m.face, m.anim, { flash: m.flash, moving, alpha, lift, windup: wind, phase: m.phase });
      if (m.state === 'stagger' && !dead) { c.fillStyle = '#ffe36a'; for (let i = 0; i < 3; i++) { const a = m.anim * 5 + i * 2.1; c.fillRect(m.x + Math.cos(a) * 7 - 1, m.y - m.def.radius * (m.def.size ?? 1) - 6 + Math.sin(a) * 2, 2, 2); } }
      if (dead) return;
      const top = m.y - (m.def.radius + 12) * (m.def.size ?? 1) - lift;
      if (m.def.boss && m.def.id === 'korrath') return;
      drawMarker(c, m.x, top - 2, markerColor(m), tm);
      if (m.hp < m.maxhp) {
        const w = 20 * Math.min(1.6, m.def.size ?? 1);
        c.fillStyle = 'rgba(0,0,0,0.6)'; c.fillRect(m.x - w / 2, top + 4, w, 2.6);
        c.fillStyle = markerColor(m); c.fillRect(m.x - w / 2 + 0.4, top + 4.4, (w - 0.8) * (m.hp / m.maxhp), 1.8);
      }
      if (m.hp < m.maxhp || dist(m.x, m.y, p.x, p.y) < 60) labels.push({ x: m.x, y: top - 6, text: m.def.name, color: '#f1e9e0', size: 11 });
    } });
  }
  for (const a of W.allies) {
    if (!vis(a.x, a.y)) continue;
    ents.push({ y: a.y, draw: () => {
      const alpha = a.dead ? Math.max(0, 1 - a.deadT / 0.6) : 1;
      if (a.dead && alpha <= 0) return;
      const moving = a.state === 'follow' && (Math.abs(a.kbx) < 5);
      const sw = a.state === 'windup' ? -1 + (a.t / 0.28) * 2 : 0;
      if (!drawOverride(c, `ally.${a.id}`, a.x, a.y, Math.cos(a.face) < 0)) drawHuman(c, a.x, a.y, a.face, a.look, { anim: a.anim, moving: moving && !!a.target === false, flash: a.flash, alpha, sword: '#dfe6f5', swing: sw, shield: a.role === 'tank' });
      if (a.dead) return;
      drawMarker(c, a.x, a.y - 21, '#6be37a', tm);
      const w = 18; c.fillStyle = 'rgba(0,0,0,0.6)'; c.fillRect(a.x - w / 2, a.y - 17, w, 2.4);
      c.fillStyle = a.hp / a.maxhp > 0.5 ? '#6be37a' : a.hp / a.maxhp > 0.25 ? '#ffd24a' : '#ff5a5a'; c.fillRect(a.x - w / 2 + 0.4, a.y - 16.6, (w - 0.8) * (a.hp / a.maxhp), 1.6);
      if (a.barkT > 0) labels.push({ x: a.x, y: a.y - 26, text: a.bark, color: '#ffffff', size: 12 });
    } });
  }
  if (!p.dead) ents.push({ y: p.y, draw: () => {
    for (const tr of p.trail) { c.globalAlpha = Math.max(0, 0.35 - tr.t * 1.4); drawHuman(c, tr.x, tr.y, p.face, { hair: '#8fd4ff', coat: '#8fd4ff' }, { anim: 0, moving: false, sword: null }); }
    c.globalAlpha = 1;
    let swing = 0;
    if (p.state === 'attack') {
      const dir = p.combo % 2 ? 1 : -1; const k = Math.min(1, p.t / 0.2);
      swing = dir * (-1.2 + 2.4 * k);
    } else if (p.state === 'skillMove') swing = 0.2; else if (p.state === 'skillWind') swing = -1.6;
    const blink = p.invuln > 0 && p.state !== 'dodge' && Math.floor(tm * 30) % 2 === 0 && p.flash <= 0;
    const alpha = p.state === 'dodge' ? 0.55 : blink ? 0.5 : 1;
    const glow = p.state === 'skillWind' || p.state === 'skillMove' ? '#8fd4ff' : null;
    const wcol = weaponBroken() ? '#6a6a70' : '#e6ebf5';
    if (!drawOverride(c, 'player', p.x, p.y, Math.cos(p.face) < 0)) drawHuman(c, p.x, p.y, p.face, { hair: '#1d1b26', coat: '#262a40', accent: '#c9a14a' }, { anim: p.anim, moving: p.moving, flash: p.flash, alpha, sword: wcol, swing, blocking: p.blocking, glow, lift: p.hop * 7 });
    if (p.state === 'skillPost') { c.fillStyle = 'rgba(255,255,255,0.8)'; c.font = '5px sans-serif'; }
    drawMarker(c, p.x, p.y - 21, '#6be37a', tm);
  } });
  ents.sort((a, b) => a.y - b.y);
  for (const e of ents) e.draw();

  // switch hint over staggered enemies
  for (const m of W.mobs) if (!m.dead && m.state === 'stagger' && m.stun > 0.12 && dist(m.x, m.y, p.x, p.y) < 210) {
    labels.push({ x: m.x, y: m.y - m.def.radius * (m.def.size ?? 1) - 24, text: 'Q  SWITCH', color: '#ffe36a', size: 13 });
  }

  for (const pr of W.projs) { c.fillStyle = pr.color; c.shadowColor = pr.color; c.shadowBlur = 5; c.beginPath(); c.arc(pr.x, pr.y, pr.r, 0, 7); c.fill(); c.shadowBlur = 0; }
  for (const s of W.slashes) {
    const k = s.t / s.life; c.save(); c.globalAlpha = (1 - k) * 0.9; c.strokeStyle = s.color; c.lineWidth = s.width * (1 - k * 0.6);
    c.shadowColor = s.color; c.shadowBlur = 8; c.lineCap = 'round';
    c.beginPath(); const a0 = s.arc >= 6 ? 0 : s.face - s.arc / 2, a1 = s.arc >= 6 ? 6.283 : s.face + s.arc / 2;
    c.arc(s.x, s.y - 3, s.range * (0.7 + k * 0.3), a0 + k * (s.arc < 6 ? 0.3 : 0), a1); c.stroke(); c.restore();
  }
  for (const o of W.orbs) {
    c.fillStyle = o.kind === 'col' ? '#ffd76a' : '#9be3a0'; c.shadowColor = c.fillStyle as string; c.shadowBlur = 6;
    c.beginPath(); c.arc(o.x, o.y - Math.sin(Math.min(1, o.t * 3) * 3.14) * 6, 2.2, 0, 7); c.fill(); c.shadowBlur = 0;
  }
  for (const pt of W.parts) {
    const k = 1 - pt.t / pt.life; c.globalAlpha = Math.max(0, k);
    if (pt.glow) { c.shadowColor = pt.color; c.shadowBlur = 5; }
    c.fillStyle = pt.color; c.fillRect(pt.x - pt.size / 2, pt.y - pt.size / 2, pt.size, pt.size); c.shadowBlur = 0;
  }
  c.globalAlpha = 1;
  c.restore();

  // floaters (screen space for crisp text)
  c.textAlign = 'center'; c.textBaseline = 'middle';
  for (const f of W.floats) {
    const k = f.t / f.life; c.globalAlpha = Math.min(1, (1 - k) * 2);
    c.font = `bold ${f.size * ZOOM}px "Segoe UI", system-ui, sans-serif`;
    const X = (f.x - camX) * ZOOM, Y = (f.y - camY) * ZOOM;
    c.lineWidth = 3; c.strokeStyle = 'rgba(0,0,0,0.75)'; c.strokeText(f.text, X, Y); c.fillStyle = f.color; c.fillText(f.text, X, Y);
  }
  c.globalAlpha = 1;
  for (const l of labels) {
    c.font = `${l.size === 20 ? 'bold ' : ''}${l.size}px "Segoe UI", system-ui, sans-serif`;
    const X = (l.x - camX) * ZOOM, Y = (l.y - camY) * ZOOM;
    c.lineWidth = 3; c.strokeStyle = 'rgba(0,0,0,0.75)'; c.strokeText(l.text, X, Y); c.fillStyle = l.color; c.fillText(l.text, X, Y);
  }

  // lighting & atmosphere
  const day = 0.5 - 0.5 * Math.cos((G.clock / 1200) * Math.PI * 2);
  const night = Math.pow(1 - day, 1.6);
  const dark = z.dark ?? 0;
  if (dark > 0 || (!z.safe || z.theme !== 'stone') && night > 0.05 && z.theme !== 'stone') {
    if (!lightCanvas) { lightCanvas = document.createElement('canvas'); lightCanvas.width = 960; lightCanvas.height = 540; }
    const lc = lightCanvas.getContext('2d')!;
    lc.globalCompositeOperation = 'source-over'; lc.clearRect(0, 0, 960, 540);
    const amt = Math.min(0.92, dark > 0 ? dark : night * 0.55);
    lc.fillStyle = dark > 0 ? `rgba(4,4,14,${amt})` : `rgba(10,16,48,${amt})`; lc.fillRect(0, 0, 960, 540);
    lc.globalCompositeOperation = 'destination-out';
    const light = (x: number, y: number, r: number, a = 1) => {
      const X = (x - camX) * ZOOM, Y = (y - camY) * ZOOM;
      const g = lc.createRadialGradient(X, Y, r * 0.15, X, Y, r); g.addColorStop(0, `rgba(0,0,0,${a})`); g.addColorStop(1, 'rgba(0,0,0,0)');
      lc.fillStyle = g; lc.fillRect(X - r, Y - r, r * 2, r * 2);
    };
    light(p.x, p.y, dark > 0 ? 190 : 260, 1);
    for (const [tx, ty] of bk.torches) light(tx * TILE + 8, ty * TILE + 8, 150, 0.95);
    for (const o of W.objs) if (o.def.kind === 'bed' || o.def.kind === 'march') light(o.x, o.y, 100, 0.9);
    for (const m of W.mobs) if (m.def.boss && !m.dead) light(m.x, m.y, 120, 0.6);
    for (const a of W.allies) if (!a.dead) light(a.x, a.y, 70, 0.6);
    c.drawImage(lightCanvas, 0, 0, 960, 540);
  }
  if (W.rain > 0) {
    c.strokeStyle = 'rgba(190,210,255,0.35)'; c.lineWidth = 1; c.beginPath();
    for (let i = 0; i < 90; i++) {
      const rx = ((i * 97 + W.time * 330) % 1000) - 20, ry = ((i * 53 + W.time * 700) % 560) - 10;
      c.moveTo(rx, ry); c.lineTo(rx - 4, ry + 12);
    }
    c.stroke();
    c.fillStyle = 'rgba(40,55,90,0.18)'; c.fillRect(0, 0, 960, 540);
  }
  // vignette
  const vg = c.createRadialGradient(480, 270, 250, 480, 270, 620); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.45)');
  c.fillStyle = vg; c.fillRect(0, 0, 960, 540);
  if (W.flash > 0) { c.fillStyle = `rgba(255,255,255,${W.flash})`; c.fillRect(0, 0, 960, 540); }
  if (W.fade > 0) { c.fillStyle = `rgba(0,0,0,${Math.min(1, W.fade)})`; c.fillRect(0, 0, 960, 540); }
  void skillProf; void ITEMS; void baseGrid;
}
