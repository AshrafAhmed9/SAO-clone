import { ITEMS } from '../data/items';
import { QUESTS } from '../data/quests';
import { S } from '../data/strings';
import { T } from '../data/tiles';
import { bindingLabel } from '../engine/input';
import { nearestInteractable } from '../game/interact';
import { maxHp, SKILLS, skillProf, skillUnlocked, xpNeed } from '../game/progression';
import { count, G, objectiveProgress, questState, toasts } from '../game/state';
import { W } from '../game/world';
import { ZONES } from '../data/zones';
import { bar, C, hpColor, keycap, panel, text } from './draw';

type Ctx = CanvasRenderingContext2D;
const reveal: Record<string, Uint8Array> = {};

const MM: Record<number, string> = {
  [T.GRASS]: '#4d8f3f', [T.TALL]: '#3f7f34', [T.FLOWER]: '#5da34a', [T.PATH]: '#a58a5c', [T.TREE]: '#255f2c', [T.WATER]: '#3b86c9', [T.ROCK]: '#6d717a',
  [T.STONE]: '#9a968e', [T.WALL]: '#44444c', [T.WOOD]: '#8a6840', [T.ROOF]: '#8b3f31', [T.DARK]: '#2e5230', [T.SAND]: '#c9b985', [T.LFLOOR]: '#6b6a80',
  [T.LWALL]: '#25232f', [T.DOOR]: '#7a4a3a', [T.TORCH]: '#25232f', [T.BOSSF]: '#6a3a40', [T.SKY]: '#0d1424', [T.SPIKE]: '#8a5a5a', [T.FOUNTAIN]: '#4b9ad8',
  [T.GATE]: '#6a6e80', [T.PILLAR]: '#74738a', [T.STAIRS]: '#c8c0e0', [T.BRIDGE]: '#8a6840', [T.FENCE]: '#8a6840', [T.CARPET]: '#8a3a4a',
};

function updateReveal() {
  const z = W.zone; const n = W.w * W.h;
  if (!reveal[z] || reveal[z].length !== n) reveal[z] = new Uint8Array(n);
  const r = reveal[z]; const p = W.player;
  const ptx = Math.floor(p.x / 16), pty = Math.floor(p.y / 16);
  const rad = z.startsWith('lab') || z === 'bossroom' ? 8 : 13;
  for (let y = Math.max(0, pty - rad); y <= Math.min(W.h - 1, pty + rad); y++) for (let x = Math.max(0, ptx - rad); x <= Math.min(W.w - 1, ptx + rad); x++) {
    if ((x - ptx) ** 2 + (y - pty) ** 2 <= rad * rad) r[y * W.w + x] = 1;
  }
}

export function drawMinimap(c: Ctx, x: number, y: number, mw: number, mh: number) {
  updateReveal();
  const sc = Math.min(mw / W.w, mh / W.h);
  const ox = x + (mw - W.w * sc) / 2, oy = y + (mh - W.h * sc) / 2;
  const r = reveal[W.zone];
  const full = (W.zone.startsWith('lab') && !!G.inv.map) || W.zone === 'bossroom';
  c.fillStyle = 'rgba(6,10,20,0.85)'; c.fillRect(x, y, mw, mh);
  for (let ty = 0; ty < W.h; ty++) for (let tx = 0; tx < W.w; tx++) {
    if (!full && !r[ty * W.w + tx]) continue;
    c.fillStyle = MM[W.grid[ty][tx]] ?? '#555'; c.fillRect(ox + tx * sc, oy + ty * sc, Math.ceil(sc), Math.ceil(sc));
  }
  const dot = (px: number, py: number, col: string, s = 2.2) => { c.fillStyle = col; c.fillRect(ox + (px / 16) * sc - s / 2, oy + (py / 16) * sc - s / 2, s, s); };
  for (const o of W.objs) if ((o.def.kind === 'bed' || o.def.kind === 'march' || (o.def.kind === 'door')) ) dot(o.x, o.y, '#7ad7ff', 3);
  for (const n of W.npcs) { const tx = Math.floor(n.x / 16), ty = Math.floor(n.y / 16); if (full || r[ty * W.w + tx]) dot(n.x, n.y, '#ffd24a'); }
  for (const m of W.mobs) if (!m.dead) { const tx = Math.floor(m.x / 16), ty = Math.floor(m.y / 16); if (r[ty * W.w + tx] || full) dot(m.x, m.y, '#ff5a5a'); }
  for (const a of W.allies) if (!a.dead) dot(a.x, a.y, '#6be37a');
  dot(W.player.x, W.player.y, '#ffffff', 3.4);
  c.strokeStyle = 'rgba(92,200,255,0.65)'; c.lineWidth = 1.5; c.strokeRect(x, y, mw, mh);
}

function skillIcon(c: Ctx, id: string, x: number, y: number, a: number) {
  c.save(); c.translate(x, y); c.globalAlpha = a; c.strokeStyle = '#bfe9ff'; c.fillStyle = '#bfe9ff'; c.lineWidth = 2.5; c.lineCap = 'round';
  if (id === 'dash') { c.beginPath(); c.moveTo(-10, 6); c.lineTo(10, -6); c.stroke(); c.beginPath(); c.moveTo(10, -6); c.lineTo(3, -7); c.lineTo(8, -1); c.fill(); }
  else if (id === 'rising') { c.beginPath(); c.arc(-4, 8, 14, -1.3, 0.1); c.stroke(); c.beginPath(); c.moveTo(7, -4); c.lineTo(11, -8); c.lineTo(13, -2); c.fill(); }
  else if (id === 'arc') { c.beginPath(); c.arc(0, 0, 10, 0.5, 5.8); c.stroke(); c.beginPath(); c.moveTo(10, -2); c.lineTo(14, 3); c.lineTo(6, 3); c.fill(); }
  else { for (let i = -1; i <= 1; i++) { c.beginPath(); c.moveTo(-9, i * 6 + 4); c.lineTo(9, i * 6 - 4); c.stroke(); } }
  c.restore();
}

export function drawHud(c: Ctx, debug: boolean) {
  const p = W.player; const mh = maxHp();
  // player cursor card
  panel(c, 12, 12, 270, 62, { r: 10 });
  text(c, G.name, 24, 18, { size: 15, bold: true });
  text(c, `Lv ${G.level}`, 270, 19, { size: 14, color: C.gold, align: 'right', bold: true });
  const hf = p.hp / mh;
  bar(c, 24, 40, 246, 12, hf, hpColor(hf));
  text(c, `${Math.ceil(p.hp)} / ${mh}`, 147, 40.5, { size: 10, align: 'center', bold: true });
  bar(c, 24, 58, 246, 4, G.xp / xpNeed(G.level), '#6fd3ff');
  if (G.points > 0) text(c, `${G.points} stat points — Tab`, 24, 78, { size: 12, color: C.gold });
  if (p.hot.length) text(c, 'Healing…', 276, 40, { size: 11, color: C.green, align: 'right' });
  let yy = G.points > 0 ? 96 : 82;
  for (const a of W.allies) {
    const f = a.hp / a.maxhp;
    text(c, a.name, 16, yy - 2, { size: 11, color: a.dead ? C.dim : C.text });
    bar(c, 84, yy, 120, 7, a.dead ? 0 : f, hpColor(f));
    yy += 15;
  }

  // top-right: minimap + info
  const mx = 960 - 12 - 160;
  drawMinimap(c, mx, 12, 160, 112);
  const z = ZONES[W.zone];
  text(c, `FLOOR 1 / 100`, mx + 160, 130, { size: 11, color: C.accent, align: 'right', bold: true });
  text(c, z.name, mx + 160, 144, { size: 13, align: 'right', bold: true });
  const hh = Math.floor((G.clock / 1200) * 24), mm = Math.floor(((G.clock / 1200) * 24 - hh) * 60);
  text(c, `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}  ${G.col} Col`, mx + 160, 161, { size: 11, color: C.dim, align: 'right' });
  const mq = Object.keys(G.quests).filter((id) => G.quests[id].st === 'active' || G.quests[id].st === 'ready').sort((a, b) => Number(!!QUESTS[b].main) - Number(!!QUESTS[a].main))[0];
  if (mq) {
    const q = QUESTS[mq]; let ty = 184;
    text(c, q.name, mx + 160, ty, { size: 13, color: C.gold, align: 'right', bold: true }); ty += 17;
    if (questState(mq) === 'ready') text(c, `Return to ${S.names[q.turnIn as keyof typeof S.names] ?? q.turnIn}`, mx + 160, ty, { size: 12, align: 'right', color: C.green });
    else q.obj.forEach((o, i) => {
      const pr = objectiveProgress(mq, i); if (pr.cur >= pr.need) return;
      text(c, `${o.text}${pr.need > 1 ? ` (${pr.cur}/${pr.need})` : ''}`, mx + 160, ty, { size: 12, align: 'right', color: C.text }); ty += 15;
    });
  }

  // hotbar
  const bx = 480 - (6 * 52) / 2, by = 540 - 66;
  SKILLS.forEach((s, i) => {
    const x = bx + i * 52; const un = skillUnlocked(s); const cd = p.skillCd[s.id] ?? 0;
    panel(c, x, by, 46, 46, { r: 7, fill: un ? C.panel : 'rgba(10,12,20,0.8)', border: un ? 'rgba(92,200,255,0.7)' : 'rgba(120,130,150,0.4)' });
    if (un) {
      skillIcon(c, s.id, x + 23, by + 23, cd > 0 ? 0.4 : 1);
      if (cd > 0) { c.fillStyle = 'rgba(0,0,0,0.5)'; c.fillRect(x + 3, by + 3 + 40 * (1 - cd / s.cd), 40, 40 * (cd / s.cd)); text(c, cd.toFixed(1), x + 23, by + 17, { size: 12, align: 'center', bold: true }); }
      const prof = skillProf(s.id); if (prof) text(c, `★${prof}`, x + 4, by + 31, { size: 9, color: C.gold });
    } else text(c, s.unlock > G.level ? `Lv${s.unlock}` : 'Train', x + 23, by + 17, { size: 11, align: 'center', color: C.dim });
    keycap(c, String(s.slot), x + 15, by + 50, 15);
  });
  const items: [string, string, string][] = [['potion', 'R', 'potion'], ['crystal', 'F', 'crystal']];
  items.forEach(([id, k], i) => {
    const x = bx + (4 + i) * 52;
    panel(c, x, by, 46, 46, { r: 7 });
    const n = count(id);
    c.fillStyle = n ? ITEMS[id].color : '#444'; c.beginPath(); c.arc(x + 23, by + 21, 9, 0, 7); c.fill();
    c.fillStyle = 'rgba(255,255,255,0.35)'; c.beginPath(); c.arc(x + 20, by + 18, 3, 0, 7); c.fill();
    text(c, `×${n}`, x + 42, by + 30, { size: 12, align: 'right', bold: true });
    keycap(c, k, x + 15, by + 50, 15);
  });
  // weapon durability
  const wd = G.dur[G.equip.weapon] ?? 0, wmax = ITEMS[G.equip.weapon].dur ?? 1;
  text(c, `${ITEMS[G.equip.weapon].name}  ${Math.ceil(wd)}/${wmax}`, 480, 540 - 14 - 0, { size: 11, align: 'center', color: wd <= 0 ? C.red : wd / wmax < 0.25 ? C.warn : C.dim, baseline: 'bottom' });

  // interaction hint
  const it = nearestInteractable();
  if (it) {
    const w = 260; panel(c, 480 - w / 2, 540 - 118, w, 30, { r: 15 });
    keycap(c, bindingLabel('interact'), 480 - w / 2 + 12, 540 - 111, 16);
    text(c, it.label, 480 - w / 2 + 38, 540 - 111, { size: 13 });
  }

  // toasts
  let ty = 540 - 90;
  for (let i = toasts.length - 1; i >= 0; i--) {
    const t = toasts[i]; const a = Math.min(1, t.t * 2);
    text(c, t.text, 20, ty, { size: 14, color: t.color, alpha: a, bold: true }); ty -= 21;
  }

  // zone banner
  if (W.banner.t > 0) {
    const a = Math.min(1, W.banner.t, 3.5 - W.banner.t + 0.2);
    text(c, W.banner.text, 480, 118, { size: 34, align: 'center', bold: true, alpha: Math.min(1, a * 1.5) });
    c.save(); c.globalAlpha = Math.min(1, a * 1.5) * 0.7; c.fillStyle = C.accent; c.fillRect(380, 162, 200, 2); c.restore();
  }

  // boss bars
  const bb = W.bossBars;
  if (bb) {
    const w = 380, x = 480 - w / 2 + 10, y = 22;
    text(c, bb.name, 480, y, { size: 16, align: 'center', bold: true });
    const per = bb.maxhp / 4;
    for (let i = 0; i < 4; i++) {
      const lo = (3 - i) * per; const f = Math.max(0, Math.min(1, (bb.hp - lo) / per));
      const colr = ['#e0653a', '#e0a53a', '#d6d64a', '#8fe08f'][3 - i];
      bar(c, x + i * (w / 4 + 0), y + 26, w / 4 - 4, 12, f, colr);
    }
    text(c, `×${bb.bars}`, x + w + 8, y + 24, { size: 14, color: C.red, bold: true });
  }
  if (debug) {
    text(c, `mobs ${W.mobs.length} allies ${W.allies.length} parts ${W.parts.length} pos ${Math.round(p.x / 16)},${Math.round(p.y / 16)} state ${p.state}`, 12, 520, { size: 11, color: C.accent });
  }
}
