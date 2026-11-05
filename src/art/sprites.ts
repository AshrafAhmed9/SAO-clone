import type { MobDef } from '../data/types';

type Ctx = CanvasRenderingContext2D;
export interface Look { hair: string; coat: string; skin?: string; accent?: string }
const SKIN = '#f1c9a0';

function shadow(c: Ctx, x: number, y: number, rx: number, ry: number) {
  c.fillStyle = 'rgba(0,0,0,0.28)';
  c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); c.fill();
}

export interface HumanOpts {
  anim: number; moving: boolean; flash?: number; alpha?: number; swing?: number; sword?: string | null; shield?: boolean; lift?: number; blocking?: boolean; scale?: number; glow?: string | null;
}

/** Top-down 3/4 humanoid. face is a world angle in radians. */
export function drawHuman(c: Ctx, x: number, y: number, face: number, look: Look, o: HumanOpts) {
  const s = o.scale ?? 1;
  const dx = Math.cos(face), dy = Math.sin(face);
  const up = dy < -0.45, side = Math.abs(dx) > 0.5;
  const bob = o.moving ? Math.abs(Math.sin(o.anim * 14)) * -1.2 : Math.sin(o.anim * 2.2) * 0.3;
  const lift = o.lift ?? 0;
  c.save();
  c.globalAlpha = o.alpha ?? 1;
  shadow(c, x, y + 5, 5.5 * s, 2.3 * s);
  c.translate(x, y - lift); c.scale(s, s);
  if (o.glow) { c.shadowColor = o.glow; c.shadowBlur = 8; }

  const drawSword = () => {
    if (!o.sword) return;
    const sw = o.swing ?? 0;
    const a = face + sw;
    const hx = Math.cos(a) * 5, hy = -3 + Math.sin(a) * 3.5 + bob;
    c.strokeStyle = o.sword; c.lineWidth = 1.6; c.lineCap = 'round';
    c.beginPath(); c.moveTo(hx, hy); c.lineTo(hx + Math.cos(a) * 11, hy + Math.sin(a) * 9); c.stroke();
    c.strokeStyle = '#6b5334'; c.lineWidth = 1.8;
    c.beginPath(); c.moveTo(hx - Math.cos(a) * 1.2, hy - Math.sin(a) * 1.2); c.lineTo(hx + Math.cos(a) * 1.8, hy + Math.sin(a) * 1.5); c.stroke();
  };
  if (up) drawSword();

  // legs
  const step = o.moving ? Math.sin(o.anim * 14) * 1.6 : 0;
  c.fillStyle = '#3b3446';
  c.fillRect(-3.2, 2 + bob * 0.3, 2.6, 4 + step * 0.4); c.fillRect(0.6, 2 + bob * 0.3, 2.6, 4 - step * 0.4);
  // body
  c.fillStyle = look.coat;
  c.beginPath(); c.roundRect(-4.2, -6 + bob, 8.4, 9.4, 2.2); c.fill();
  if (look.accent) { c.fillStyle = look.accent; c.fillRect(-4.2, -0.5 + bob, 8.4, 1.4); }
  if (o.shield) {
    c.fillStyle = '#9aa3b2'; c.strokeStyle = '#4b5361'; c.lineWidth = 0.8;
    const sx = -dy * 6, sy = dx * 3 - 2;
    c.beginPath(); c.roundRect(sx - 3, sy - 4 + bob, 6, 8, 2); c.fill(); c.stroke();
  }
  if (o.blocking) {
    c.strokeStyle = '#bfe9ff'; c.lineWidth = 1.2;
    c.beginPath(); c.arc(0, -2 + bob, 9, face - 0.8, face + 0.8); c.stroke();
  }
  // head
  c.fillStyle = look.skin ?? SKIN;
  c.beginPath(); c.arc(0, -9.5 + bob, 4.3, 0, Math.PI * 2); c.fill();
  c.fillStyle = look.hair;
  if (up) { c.beginPath(); c.arc(0, -9.5 + bob, 4.6, 0, Math.PI * 2); c.fill(); }
  else {
    c.beginPath(); c.arc(0, -10.4 + bob, 4.6, Math.PI, Math.PI * 2); c.fill();
    c.fillRect(-4.6, -10.4 + bob, 2, 3.2); c.fillRect(2.6, -10.4 + bob, 2, 3.2);
    c.fillStyle = '#2a2230';
    const ex = side ? dx * 1.8 : 0;
    c.fillRect(-2 + ex, -8.8 + bob, 1.2, 1.5); c.fillRect(1 + ex, -8.8 + bob, 1.2, 1.5);
  }
  if (!up) drawSword();
  if ((o.flash ?? 0) > 0) { c.globalAlpha = Math.min(1, (o.flash ?? 0) * 6) * 0.7; c.fillStyle = '#fff'; c.beginPath(); c.roundRect(-4.4, -14, 8.8, 20, 3); c.fill(); }
  c.restore();
}

/** Procedural mob painter. t is animation time; face is world angle. */
export function drawMob(c: Ctx, def: MobDef, x: number, y: number, face: number, t: number, o: { flash: number; moving: boolean; alpha?: number; lift?: number; windup?: number; phase?: number }) {
  const sz = def.size ?? 1;
  const dx = Math.cos(face);
  const flip = dx < 0 ? -1 : 1;
  c.save();
  c.globalAlpha = o.alpha ?? 1;
  shadow(c, x, y + def.radius * 0.7, def.radius * 1.1 * sz, def.radius * 0.45 * sz);
  c.translate(x, y - (o.lift ?? 0)); c.scale(flip * sz, sz);
  const bob = Math.sin(t * (o.moving ? 12 : 3)) * (o.moving ? 1 : 0.4);
  const col = def.color, acc = def.accent;
  const crouch = o.windup ? o.windup * 2 : 0;
  switch (def.shape) {
    case 'boar': {
      c.fillStyle = col; c.beginPath(); c.ellipse(0, bob * 0.3, 8, 5.5, 0, 0, 7); c.fill();
      c.fillStyle = '#3a271a'; c.fillRect(-7, -4 + bob * 0.3, 10, 2);
      c.fillStyle = col; c.beginPath(); c.ellipse(7, -1 + bob * 0.4 + crouch * 0.3, 4.4, 3.8, 0, 0, 7); c.fill();
      c.fillStyle = '#e8a0a0'; c.beginPath(); c.ellipse(10.5, 0 + bob * 0.4, 1.8, 1.5, 0, 0, 7); c.fill();
      c.fillStyle = acc; c.fillRect(8.5, 1.2, 1.2, 3); c.fillRect(11, 1.2, 1.2, 3);
      c.fillStyle = '#111'; c.fillRect(7, -3.2 + bob * 0.4, 1.3, 1.3);
      c.fillStyle = '#2d1e14'; const st = o.moving ? Math.sin(t * 14) * 1.5 : 0;
      c.fillRect(-5, 4, 2, 3 + st); c.fillRect(-1, 4, 2, 3 - st); c.fillRect(3, 4, 2, 3 + st); c.fillRect(6, 4, 2, 3 - st);
      break;
    }
    case 'wasp': {
      const wing = Math.sin(t * 50) * 0.5;
      c.fillStyle = 'rgba(220,240,255,0.55)';
      c.beginPath(); c.ellipse(-1, -5, 6, 2.6 + wing, -0.5, 0, 7); c.fill(); c.beginPath(); c.ellipse(3, -5, 6, 2.6 - wing, 0.5, 0, 7); c.fill();
      c.fillStyle = col; c.beginPath(); c.ellipse(0, bob, 5, 3.6, 0, 0, 7); c.fill();
      c.fillStyle = acc; c.fillRect(-2, -3 + bob, 1.6, 6.5); c.fillRect(1.5, -3 + bob, 1.6, 6.5);
      c.fillStyle = col; c.beginPath(); c.arc(5.5, bob, 2.5, 0, 7); c.fill();
      c.fillStyle = '#c33'; c.fillRect(6, -1 + bob, 1.2, 1.2);
      c.fillStyle = acc; c.beginPath(); c.moveTo(-5, bob); c.lineTo(-9, bob + 1); c.lineTo(-5, bob + 2); c.fill();
      break;
    }
    case 'wolf': {
      c.fillStyle = col; c.beginPath(); c.ellipse(-1, bob * 0.3, 8.5, 4.5, 0, 0, 7); c.fill();
      c.fillStyle = acc; c.beginPath(); c.ellipse(0, 1.5 + bob * 0.3, 6, 2.3, 0, 0, 7); c.fill();
      c.fillStyle = col; c.beginPath(); c.ellipse(8, -1.5 + bob * 0.4 + crouch * 0.4, 4, 3.4, 0, 0, 7); c.fill();
      c.beginPath(); c.moveTo(6.5, -4 + bob * 0.4); c.lineTo(7.2, -7); c.lineTo(8.8, -4); c.fill(); c.beginPath(); c.moveTo(9, -4); c.lineTo(10.4, -6.5); c.lineTo(11, -3.5); c.fill();
      c.fillStyle = '#222'; c.fillRect(11, -1.2, 2.6, 1.6); c.fillStyle = '#ffd24a'; c.fillRect(9, -3 + bob * 0.4, 1.3, 1.1);
      c.strokeStyle = col; c.lineWidth = 2.2; c.beginPath(); c.moveTo(-9, bob * 0.3); c.quadraticCurveTo(-13, -4 + Math.sin(t * 5) * 2, -12, -6); c.stroke();
      c.fillStyle = '#4a4f57'; const s2 = o.moving ? Math.sin(t * 16) * 2 : 0;
      c.fillRect(-6, 4, 2, 3 + s2); c.fillRect(-2, 4, 2, 3 - s2); c.fillRect(3, 4, 2, 3 + s2); c.fillRect(7, 4, 2, 3 - s2);
      break;
    }
    case 'plant': {
      const sw = Math.sin(t * 2) * 1.2;
      c.fillStyle = '#2f5d27'; for (let i = -1; i <= 1; i++) { c.beginPath(); c.ellipse(i * 7, 4, 3.5, 7, i * 0.9, 0, 7); c.fill(); }
      c.fillStyle = col; c.beginPath(); c.ellipse(0, -2 + sw * 0.3 + crouch * -1, 8, 8.5 + crouch, 0, 0, 7); c.fill();
      c.fillStyle = acc;
      for (let i = 0; i < 6; i++) { const a = (i / 6) * 6.283 + t * 0.4; c.beginPath(); c.ellipse(Math.cos(a) * 8, -4 + Math.sin(a) * 6, 3.2, 2, a, 0, 7); c.fill(); }
      c.fillStyle = '#220a10'; c.beginPath(); c.ellipse(0, -2, 4.2, 3.6 + crouch * 2, 0, 0, 7); c.fill();
      c.fillStyle = '#fff'; for (let i = -2; i <= 2; i++) c.fillRect(i * 1.6 - 0.4, -4.6, 0.9, 1.8);
      break;
    }
    case 'gnarl': case 'archer': case 'shaman': case 'chief': {
      const big = def.shape === 'chief';
      c.fillStyle = '#3a2c20'; const st = o.moving ? Math.sin(t * 11) * 1.4 : 0;
      c.fillRect(-3.5, 2, 3, 4.5 + st * 0.3); c.fillRect(0.5, 2, 3, 4.5 - st * 0.3);
      c.fillStyle = def.shape === 'shaman' ? '#4a3a6a' : acc;
      c.beginPath(); c.roundRect(-5.2, -5 + bob, 10.4, 9, 2.5); c.fill();
      if (def.shape === 'shaman') { c.fillStyle = '#2d2442'; c.beginPath(); c.moveTo(-6, 4); c.lineTo(0, -6 + bob); c.lineTo(6, 4); c.fill(); }
      if (big) { c.fillStyle = '#8a8f99'; c.fillRect(-6, -5 + bob, 12, 3); c.fillRect(-6.5, -5 + bob, 2.5, 5); c.fillRect(4, -5 + bob, 2.5, 5); }
      c.fillStyle = col; c.beginPath(); c.arc(0, -8.8 + bob, 4.6, 0, 7); c.fill();
      c.beginPath(); c.moveTo(-4, -11 + bob); c.lineTo(-6.5, -15 + bob); c.lineTo(-2, -12 + bob); c.fill(); c.beginPath(); c.moveTo(4, -11 + bob); c.lineTo(6.5, -15 + bob); c.lineTo(2, -12 + bob); c.fill();
      c.fillStyle = '#ffcf40'; c.fillRect(-2.6, -9.5 + bob, 1.6, 1.4); c.fillRect(1, -9.5 + bob, 1.6, 1.4);
      c.fillStyle = '#f3e8d0'; c.fillRect(-1.4, -6.8 + bob, 0.9, 1.6); c.fillRect(0.6, -6.8 + bob, 0.9, 1.6);
      const raise = o.windup ? -o.windup * 5 : 0;
      if (def.shape === 'archer') {
        c.strokeStyle = '#8a5a30'; c.lineWidth = 1.2; c.beginPath(); c.arc(7, -1 + bob, 6, -1.2, 1.2); c.stroke();
        c.strokeStyle = '#ddd'; c.lineWidth = 0.5; c.beginPath(); c.moveTo(8.3, -6 + bob); c.lineTo(8.3, 4 + bob); c.stroke();
      } else if (def.shape === 'shaman') {
        c.strokeStyle = '#5a3a1a'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(7, 5); c.lineTo(7, -10 + raise); c.stroke();
        c.fillStyle = acc; c.shadowColor = acc; c.shadowBlur = 6; c.beginPath(); c.arc(7, -11 + raise, 2.4, 0, 7); c.fill(); c.shadowBlur = 0;
      } else {
        c.strokeStyle = big ? '#d9a441' : '#9aa0a8'; c.lineWidth = big ? 3 : 2;
        c.beginPath(); c.moveTo(7, 2); c.lineTo(9, -10 + raise); c.stroke();
        if (big) { c.fillStyle = '#b0b5bd'; c.beginPath(); c.moveTo(9, -10 + raise); c.lineTo(14, -8 + raise); c.lineTo(9, -3 + raise); c.fill(); }
      }
      break;
    }
    case 'boss': {
      const ph = o.phase ?? 1;
      const glow = ph >= 4 ? '#ff3b3b' : acc;
      c.fillStyle = ph >= 3 ? '#4a1818' : '#2b2f3a'; c.beginPath(); c.moveTo(-9, -4); c.lineTo(9, -4); c.lineTo(12, 9); c.lineTo(-12, 9); c.fill();
      c.fillStyle = col; c.beginPath(); c.roundRect(-8, -7 + bob, 16, 12, 3); c.fill();
      c.fillStyle = '#6b7080'; c.fillRect(-9, -8 + bob, 6, 5); c.fillRect(3, -8 + bob, 6, 5);
      c.fillStyle = '#23262e'; c.beginPath(); c.arc(0, -11 + bob, 5.4, 0, 7); c.fill();
      c.fillStyle = '#c9c2b0'; c.beginPath(); c.moveTo(-4, -14 + bob); c.lineTo(-9, -22 + bob); c.lineTo(-1.5, -15 + bob); c.fill(); c.beginPath(); c.moveTo(4, -14 + bob); c.lineTo(9, -22 + bob); c.lineTo(1.5, -15 + bob); c.fill();
      c.fillStyle = glow; c.shadowColor = glow; c.shadowBlur = 6; c.fillRect(-3, -12 + bob, 2, 1.6); c.fillRect(1, -12 + bob, 2, 1.6); c.shadowBlur = 0;
      const raise = o.windup ? -o.windup * 8 : 0;
      if (ph < 4) {
        c.strokeStyle = '#5a3a1a'; c.lineWidth = 2; c.beginPath(); c.moveTo(11, 4); c.lineTo(12, -10 + raise); c.stroke();
        c.fillStyle = '#9aa0a8'; c.beginPath(); c.moveTo(12, -10 + raise); c.lineTo(19, -12 + raise); c.lineTo(19, -4 + raise); c.lineTo(12, -6 + raise); c.fill();
        c.fillStyle = '#7e8794'; c.beginPath(); c.roundRect(-16, -5 + bob, 8, 12, 2); c.fill(); c.fillStyle = glow; c.fillRect(-13.5, -1 + bob, 3, 3);
      } else {
        c.strokeStyle = '#d9d9e8'; c.lineWidth = 3; c.beginPath(); c.moveTo(11, 4); c.lineTo(15, -22 + raise); c.stroke();
        c.strokeStyle = glow; c.lineWidth = 1; c.shadowColor = glow; c.shadowBlur = 8; c.beginPath(); c.moveTo(11, 4); c.lineTo(15, -22 + raise); c.stroke(); c.shadowBlur = 0;
        c.fillStyle = '#6b7080'; c.fillRect(-18, 2, 5, 5);
      }
      break;
    }
    case 'human': drawHumanLite(c, def, t, o.moving); break;
  }
  if (o.flash > 0) {
    c.globalCompositeOperation = 'source-atop'; c.globalAlpha = Math.min(0.8, o.flash * 7); c.fillStyle = '#fff';
    c.fillRect(-24, -26, 48, 40); c.globalCompositeOperation = 'source-over';
  }
  c.restore();
}

function drawHumanLite(c: Ctx, def: MobDef, t: number, moving: boolean) {
  drawHuman(c, 0, 0, 0, { hair: def.color, coat: def.accent === '#f2f2f2' ? def.color : def.color, accent: def.accent }, { anim: t, moving, sword: '#e6ebf5' });
}

export function drawObject(c: Ctx, kind: string, x: number, y: number, o: { used: boolean; t: number; text?: string; flag?: boolean }) {
  c.save(); c.translate(x, y);
  switch (kind) {
    case 'chest':
      shadow(c, 0, 4, 7, 2.5);
      c.fillStyle = '#7a4a22'; c.fillRect(-6, -3, 12, 8);
      c.fillStyle = o.used ? '#2a1a0c' : '#9a5e2c'; c.fillRect(-6, -6 - (o.used ? 3 : 0), 12, o.used ? 3 : 4);
      c.fillStyle = '#e0b64a'; c.fillRect(-1, -2, 2, 3); c.fillRect(-6, -3, 12, 1);
      if (o.used) { c.fillStyle = 'rgba(255,230,140,0.6)'; c.fillRect(-4, -5, 8, 2); }
      break;
    case 'herb':
      c.fillStyle = '#2f7a2f'; for (let i = -1; i <= 1; i++) { c.beginPath(); c.ellipse(i * 2.4, 0, 1.4, 4.2, i * 0.5, 0, 7); c.fill(); }
      c.fillStyle = '#d9ff9a'; c.globalAlpha = 0.6 + Math.sin(o.t * 4) * 0.3; c.beginPath(); c.arc(0, -4, 1.4, 0, 7); c.fill();
      break;
    case 'board':
      c.fillStyle = '#5a3a1a'; c.fillRect(-1, -2, 2, 8); c.fillStyle = '#8a5a2a'; c.fillRect(-8, -12, 16, 11);
      c.fillStyle = '#f3ead2'; c.fillRect(-6, -10, 5, 6); c.fillRect(0, -10, 5, 4);
      break;
    case 'lever':
      c.fillStyle = '#555a66'; c.fillRect(-4, -1, 8, 5);
      c.strokeStyle = '#b88a4a'; c.lineWidth = 2; c.beginPath(); c.moveTo(0, 1); c.lineTo(0, -8); c.stroke();
      c.fillStyle = '#d9534a'; c.beginPath(); c.arc(0, -8, 2.2, 0, 7); c.fill();
      c.fillStyle = '#e8dcb5'; c.font = '6px sans-serif'; c.textAlign = 'center'; c.fillText(o.text ?? '', 0, 11);
      break;
    case 'tablet':
      c.fillStyle = '#6a6e78'; c.fillRect(-5, -10, 10, 14); c.fillStyle = '#8e93a0'; c.fillRect(-4, -9, 8, 3);
      c.fillStyle = '#4a4e58'; for (let i = 0; i < 4; i++) c.fillRect(-3, -5 + i * 2.4, 6, 0.8);
      break;
    case 'bed':
      c.shadowColor = '#7ad7ff'; c.shadowBlur = 10; c.fillStyle = '#7ad7ff';
      c.beginPath(); c.moveTo(0, -12 + Math.sin(o.t * 2) * 1.5); c.lineTo(5, -4); c.lineTo(0, 4); c.lineTo(-5, -4); c.fill();
      break;
    case 'march':
      c.fillStyle = '#6a6e78'; c.fillRect(-12, -10, 4, 14); c.fillRect(8, -10, 4, 14); c.fillRect(-12, -14, 24, 4);
      c.fillStyle = `rgba(255,214,110,${0.35 + Math.sin(o.t * 3) * 0.15})`; c.fillRect(-8, -10, 16, 14);
      break;
    case 'door': break;
  }
  c.restore();
}
