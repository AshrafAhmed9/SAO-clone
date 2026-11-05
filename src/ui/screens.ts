import { DIALOGUE } from '../data/dialogue';
import { S } from '../data/strings';
import { ZONES } from '../data/zones';
import { bindingLabel } from '../engine/input';
import * as I from '../engine/input';
import { sfx } from '../engine/audio';
import { fmtTime } from '../engine/util';
import { G } from '../game/state';
import type { Dialogue } from '../data/types';
import { C, FONT, keycap, panel, text, wrap } from './draw';

type Ctx = CanvasRenderingContext2D;

// ---------- dialogue ----------
export const dlg = { id: '', d: null as Dialogue | null, i: 0, chars: 0, choice: -1, sel: 0, style: 'normal' as 'normal' | 'system', queue: [] as string[], done: false };

export function startDialogue(id: string) {
  const d = DIALOGUE[id];
  if (!d) throw new Error(`Unknown dialogue "${id}"`);
  Object.assign(dlg, { id, d, i: 0, chars: 0, choice: -1, sel: 0, style: id === 'announce' ? 'system' : 'normal', done: false });
}
const visibleChoices = (d: Dialogue) => (d.choices ?? []).filter((ch) => ch.when === undefined || condLocal(ch.when));
import { cond } from '../game/state';
const condLocal = cond;
export const dialogueChoices = () => (dlg.d ? visibleChoices(dlg.d) : []);

/** Advances the dialogue. Returns the action to run / next id when it finishes, or null to keep going. */
export function dialogueInput(dt: number): { finished: boolean; act?: string; next?: string } | null {
  const d = dlg.d!;
  const line = d.lines[dlg.i];
  const speed = 70;
  const full = line.text.length;
  if (dlg.chars < full) {
    dlg.chars = Math.min(full, dlg.chars + dt * speed);
    if (I.pressed('confirm') || I.pressed('attack')) dlg.chars = full;
    return null;
  }
  const last = dlg.i === d.lines.length - 1;
  const choices = visibleChoices(d);
  if (last && choices.length) {
    if (I.pressed('up')) { dlg.sel = (dlg.sel + choices.length - 1) % choices.length; sfx('ui'); }
    if (I.pressed('down')) { dlg.sel = (dlg.sel + 1) % choices.length; sfx('ui'); }
    if (I.pressed('confirm')) { const ch = choices[dlg.sel]; sfx('confirm'); return { finished: true, act: ch.act, next: ch.next }; }
    return null;
  }
  if (I.pressed('confirm') || I.pressed('attack')) {
    sfx('ui');
    if (last) return { finished: true, act: d.act };
    dlg.i++; dlg.chars = 0;
  }
  return null;
}

export function drawDialogue(c: Ctx) {
  const d = dlg.d!; const line = d.lines[dlg.i];
  const sys = dlg.style === 'system';
  if (sys) { c.fillStyle = 'rgba(40,0,0,0.55)'; c.fillRect(0, 0, 960, 540); }
  const x = 60, y = 360, w = 840, h = 150;
  panel(c, x, y, w, h, { fill: sys ? 'rgba(40,6,10,0.94)' : C.panel, border: sys ? '#ff4b4b' : 'rgba(92,200,255,0.7)', glow: true });
  panel(c, x + 20, y - 18, Math.max(110, line.who.length * 11 + 36), 32, { fill: sys ? '#5a1015' : C.panel2, border: sys ? '#ff4b4b' : C.border, r: 6 });
  text(c, line.who, x + 36, y - 11, { size: 16, bold: true, color: sys ? '#ffb0b0' : C.accent });
  const shown = line.text.slice(0, Math.floor(dlg.chars));
  wrap(c, shown, w - 60, 18).forEach((l, i) => text(c, l, x + 30, y + 22 + i * 26, { size: 18 }));
  const last = dlg.i === d.lines.length - 1; const choices = visibleChoices(d);
  if (dlg.chars >= line.text.length) {
    if (last && choices.length) {
      const cw = 360, chh = choices.length * 32 + 16; const cx = x + w - cw - 10, cy = y - chh - 12;
      panel(c, cx, cy, cw, chh, { fill: C.panel2 });
      choices.forEach((ch, i) => {
        const yy = cy + 10 + i * 32;
        if (i === dlg.sel) { c.fillStyle = 'rgba(92,200,255,0.22)'; c.fillRect(cx + 6, yy - 2, cw - 12, 30); c.fillStyle = C.accent; c.fillRect(cx + 6, yy - 2, 3, 30); }
        text(c, ch.text, cx + 20, yy + 3, { size: 16 });
      });
    } else text(c, '▼', x + w - 30, y + h - 28 + Math.sin(performance.now() / 200) * 3, { size: 16, color: C.accent });
  }
}

// ---------- title ----------
export const title = { sel: 0, t: 0 };
export function drawTitle(c: Ctx, hasSave: boolean, t: number) {
  const g = c.createLinearGradient(0, 0, 0, 540); g.addColorStop(0, '#07101f'); g.addColorStop(0.6, '#1b2f58'); g.addColorStop(1, '#4e7fb8');
  c.fillStyle = g; c.fillRect(0, 0, 960, 540);
  c.fillStyle = 'rgba(255,255,255,0.8)';
  for (let i = 0; i < 70; i++) c.fillRect((i * 137.5) % 960, (i * 71.3) % 300, 1.4, 1.4);
  // layered floors of the Spire
  for (let i = 14; i >= 0; i--) {
    const y = 120 + i * 24 + Math.sin(t * 0.4 + i) * 1.2; const rw = 70 + i * 22;
    c.fillStyle = `rgba(${70 + i * 6},${90 + i * 5},${130 + i * 4},${0.55 + (14 - i) * 0.02})`;
    c.beginPath(); c.ellipse(480, y, rw, rw * 0.16, 0, 0, 7); c.fill();
    c.fillStyle = 'rgba(0,0,0,0.35)'; c.fillRect(480 - rw, y, rw * 2, 6); c.fillStyle = 'rgba(160,200,255,0.18)'; c.fillRect(480 - rw, y - 1, rw * 2, 1);
  }
  c.fillStyle = 'rgba(180,215,255,0.4)'; c.beginPath(); c.moveTo(480, 0); c.lineTo(488, 140); c.lineTo(472, 140); c.fill();
  for (let i = 0; i < 6; i++) { const cx = ((t * 14 + i * 190) % 1200) - 120, cy = 180 + i * 50; c.fillStyle = 'rgba(255,255,255,0.1)'; c.beginPath(); c.ellipse(cx, cy, 120, 14, 0, 0, 7); c.fill(); }
  text(c, S.title.toUpperCase(), 480, 40, { size: 64, bold: true, align: 'center' });
  text(c, S.subtitle, 480, 112, { size: 17, color: '#bcd4f5', align: 'center' });
  const items = hasSave ? [S.ui.continue, S.ui.newGame, S.ui.controls] : [S.ui.newGame, S.ui.controls];
  items.forEach((it, i) => {
    const y = 360 + i * 42; const on = i === title.sel;
    if (on) { panel(c, 360, y - 6, 240, 38, { r: 19, glow: true }); }
    text(c, it, 480, y, { size: 20, bold: true, align: 'center', color: on ? C.text : '#9bb0d0' });
  });
  text(c, 'Enter to select  ·  ↑↓ to move', 480, 500, { size: 12, color: '#7e93b6', align: 'center' });
  return items;
}

export function drawNameEntry(c: Ctx, name: string, t: number) {
  c.fillStyle = '#0a1220'; c.fillRect(0, 0, 960, 540);
  text(c, S.ui.namePrompt, 480, 180, { size: 26, bold: true, align: 'center' });
  panel(c, 300, 240, 360, 60, { glow: true });
  text(c, name + (Math.floor(t * 2) % 2 ? '_' : ' '), 480, 258, { size: 28, align: 'center' });
  text(c, 'Type a name (up to 14 characters), then press Enter', 480, 330, { size: 14, color: C.dim, align: 'center' });
}
export function drawModeSelect(c: Ctx, sel: number) {
  c.fillStyle = '#0a1220'; c.fillRect(0, 0, 960, 540);
  text(c, 'Choose how you play', 480, 90, { size: 28, bold: true, align: 'center' });
  const opts = [[S.ui.deathMode, S.ui.deathModeDesc, '#ff6b6b'], [S.ui.normalMode, S.ui.normalModeDesc, C.accent]];
  opts.forEach(([n, d, col], i) => {
    const x = 120 + i * 370; const on = i === sel;
    panel(c, x, 170, 340, 240, { glow: on, border: on ? col : 'rgba(120,140,170,0.4)', fill: on ? C.panel2 : C.panel });
    text(c, n, x + 170, 200, { size: 26, bold: true, align: 'center', color: col });
    wrap(c, d, 280, 16).forEach((l, k) => text(c, l, x + 170, 260 + k * 24, { size: 16, align: 'center' }));
  });
  text(c, '←→ to choose · Enter to start', 480, 450, { size: 13, color: C.dim, align: 'center' });
}

export function drawControls(c: Ctx) {
  c.fillStyle = 'rgba(4,8,18,0.92)'; c.fillRect(0, 0, 960, 540);
  panel(c, 120, 50, 720, 440, { glow: true });
  text(c, 'Controls', 480, 68, { size: 26, bold: true, align: 'center' });
  const rows: [string, string][] = [
    ['Move', 'W A S D / arrows'], ['Attack (tap 3× to combo)', bindingLabel('attack')], ['Block — tap just before a hit to parry', bindingLabel('block')],
    ['Dodge roll (brief invulnerability)', bindingLabel('dodge')], ['Sword Skills', '1  2  3  4'], ['Switch (when an enemy is staggered)', bindingLabel('switch')],
    ['Talk / open / pull', bindingLabel('interact')], ['Healing Draught / Mending Crystal', `${bindingLabel('potion')} / ${bindingLabel('crystal')}`],
    ['Menu: items, gear, stats, quests', bindingLabel('menu')], ['Full map', bindingLabel('map')], ['Pause', bindingLabel('pause')],
  ];
  rows.forEach(([a, b], i) => { text(c, a, 170, 120 + i * 30, { size: 16, color: C.text }); keycap(c, b, 700, 120 + i * 30, 22); });
  text(c, 'Skills leave you frozen briefly afterwards. Do not use one with a second enemy close.', 480, 462, { size: 13, color: C.warn, align: 'center' });
  text(c, 'Press Esc or Enter to go back', 480, 482, { size: 12, color: C.dim, align: 'center' });
  void FONT;
}

export function drawGameOver(c: Ctx, t: number) {
  const a = Math.min(1, t / 1.2);
  c.fillStyle = `rgba(0,0,0,${0.85 * a})`; c.fillRect(0, 0, 960, 540);
  text(c, S.ui.gameOver, 480, 200, { size: 48, bold: true, align: 'center', color: C.red, alpha: a });
  text(c, G.mode === 'death' ? S.ui.gameOverDeath : S.ui.gameOverNormal, 480, 270, { size: 18, align: 'center', color: C.dim, alpha: a });
  if (t > 1.5) text(c, 'Press Enter', 480, 340, { size: 16, align: 'center', alpha: 0.6 + Math.sin(t * 4) * 0.3 });
}

export function drawVictory(c: Ctx, t: number) {
  const g = c.createLinearGradient(0, 0, 0, 540); g.addColorStop(0, '#0b1730'); g.addColorStop(1, '#3a6aa8'); c.fillStyle = g; c.fillRect(0, 0, 960, 540);
  for (let i = 0; i < 60; i++) { c.fillStyle = `rgba(255,255,255,${0.3 + 0.5 * Math.abs(Math.sin(t + i))})`; c.fillRect((i * 151) % 960, (i * 83 + t * 8) % 540, 2, 2); }
  const a = Math.min(1, t / 1.5);
  text(c, S.ui.victory, 480, 90, { size: 50, bold: true, align: 'center', alpha: a });
  text(c, S.ui.victoryNote, 480, 160, { size: 18, align: 'center', color: '#bcd4f5', alpha: a });
  const stats: [string, string][] = [['Level', String(G.level)], ['Play time', fmtTime(G.playtime)], ['Enemies defeated', String(G.kills)], ['Deaths', String(G.deaths)], ['Mode', G.mode === 'death' ? S.ui.deathMode : S.ui.normalMode], ['Allies lost', String(G.deadAllies.length)]];
  panel(c, 300, 220, 360, 220, { glow: true });
  stats.forEach(([k, v], i) => { text(c, k, 330, 240 + i * 32, { size: 16, color: C.dim }); text(c, v, 630, 240 + i * 32, { size: 16, align: 'right', bold: true }); });
  if (t > 2) text(c, 'Enter: back to title', 480, 480, { size: 14, align: 'center', color: C.dim });
  void ZONES;
}

export function drawPause(c: Ctx, sel: number) {
  c.fillStyle = 'rgba(4,8,18,0.7)'; c.fillRect(0, 0, 960, 540);
  panel(c, 360, 150, 240, 230, { glow: true });
  text(c, 'Paused', 480, 168, { size: 24, bold: true, align: 'center' });
  ['Resume', 'Save game', 'Controls', 'Quit to title'].forEach((l, i) => {
    const y = 214 + i * 36; if (i === sel) { c.fillStyle = 'rgba(92,200,255,0.2)'; c.fillRect(376, y - 6, 208, 32); }
    text(c, l, 480, y, { size: 18, align: 'center', color: i === sel ? C.text : C.dim });
  });
}

export function drawBigMap(c: Ctx, draw: (c: Ctx, x: number, y: number, w: number, h: number) => void) {
  c.fillStyle = 'rgba(4,8,18,0.82)'; c.fillRect(0, 0, 960, 540);
  panel(c, 100, 40, 760, 460, { glow: true });
  draw(c, 120, 60, 720, 420);
  text(c, 'Press M or Esc to close', 480, 484, { size: 12, color: C.dim, align: 'center' });
}
