import { ITEMS, SHOPS, sellValue } from '../data/items';
import { QUESTS } from '../data/quests';
import { S } from '../data/strings';
import { applyVolume, sfx, volume } from '../engine/audio';
import * as I from '../engine/input';
import { critChance, maxHp, moveSpeed, playerAtk, playerDef, SKILLS, skillProf, skillUnlocked, spendPoint, totalAgi, totalStr, xpNeed } from '../game/progression';
import { addItem, count, G, objectiveProgress, questState, takeItem, toast } from '../game/state';
import { healPlayer } from '../game/combat';
import { W } from '../game/world';
import { bar, C, panel, text, wrap, keycap } from './draw';
import type { ItemDef } from '../data/types';

type Ctx = CanvasRenderingContext2D;
export const TABS = ['Items', 'Gear', 'Skills', 'Stats', 'Quests', 'Options'];
export const menu = { tab: 0, sel: 0, sub: '' as '' | 'remap', waiting: false };

const kindOrder = { consumable: 0, material: 1, key: 2, weapon: 3, armor: 4, accessory: 5 } as const;
const itemRows = () => Object.keys(G.inv).filter((id) => G.inv[id] > 0 && ['consumable', 'material', 'key'].includes(ITEMS[id].kind)).sort((a, b) => kindOrder[ITEMS[a].kind] - kindOrder[ITEMS[b].kind]);
const gearRows = () => Object.keys(G.inv).filter((id) => G.inv[id] > 0 && ['weapon', 'armor', 'accessory'].includes(ITEMS[id].kind));
const questRows = () => Object.keys(G.quests).sort((a, b) => (Number(questState(b) === 'done') - Number(questState(a) === 'done')) * -1 || Number(!!QUESTS[b].main) - Number(!!QUESTS[a].main));

export function equip(id: string) {
  const it = ITEMS[id]; if (count(id) < 1) return;
  const slot = it.kind === 'weapon' ? 'weapon' : it.kind === 'armor' ? 'armor' : 'acc';
  const cur = G.equip[slot];
  takeItem(id); G.equip[slot] = id;
  if (it.kind === 'weapon') G.dur[id] ??= it.dur ?? 50;
  if (cur) addItem(cur, 1, true);
  sfx('confirm');
  W.player.hp = Math.min(W.player.hp, maxHp());
}
function unequip(slot: 'armor' | 'acc') {
  const cur = G.equip[slot]; if (!cur) return;
  G.equip[slot] = null; addItem(cur, 1, true); W.player.hp = Math.min(W.player.hp, maxHp()); sfx('confirm');
}
export function useConsumable(id: string) {
  const it = ITEMS[id]; const p = W.player;
  if (!it.heal || p.hp >= maxHp() || count(id) < 1) { sfx('wrong'); return; }
  takeItem(id);
  if (it.instant) healPlayer(it.heal); else p.hot.push({ left: 4, rate: it.heal / 4 });
  sfx('heal');
}

const clampSel = (n: number) => { menu.sel = Math.max(0, Math.min(Math.max(0, n - 1), menu.sel)); };
function statLine(it: ItemDef) {
  const bits: string[] = [];
  if (it.atk) bits.push(`ATK +${it.atk}`); if (it.def) bits.push(`DEF +${it.def}`); if (it.hp) bits.push(`HP +${it.hp}`);
  if (it.str) bits.push(`STR ${it.str > 0 ? '+' : ''}${it.str}`); if (it.agi) bits.push(`AGI ${it.agi > 0 ? '+' : ''}${it.agi}`); if (it.crit) bits.push(`Crit +${it.crit}%`);
  if (it.heal) bits.push(`Heals ${it.heal}`); return bits.join('  ·  ');
}

/** Returns what the menu wants to do next, if anything. */
export function menuInput(): 'close' | 'quit' | 'save' | null {
  if (menu.waiting) {
    const k = I.takeLastKey();
    if (k) { if (k !== 'Escape') I.setBinding(I.ACTIONS[menu.sel], k); menu.waiting = false; sfx('confirm'); }
    return null;
  }
  if (I.pressed('menu') || (I.pressed('cancel') && !menu.sub)) { return 'close'; }
  if (menu.sub === 'remap') {
    if (I.pressed('cancel')) { menu.sub = ''; menu.sel = 3; return null; }
    if (I.pressed('up')) { menu.sel = (menu.sel + I.ACTIONS.length - 1) % I.ACTIONS.length; sfx('ui'); }
    if (I.pressed('down')) { menu.sel = (menu.sel + 1) % I.ACTIONS.length; sfx('ui'); }
    if (I.pressed('confirm')) { menu.waiting = true; I.takeLastKey(); }
    return null;
  }
  if (I.pressed('left') && menu.tab !== 5) { menu.tab = (menu.tab + TABS.length - 1) % TABS.length; menu.sel = 0; sfx('ui'); }
  if (I.pressed('right') && menu.tab !== 5) { menu.tab = (menu.tab + 1) % TABS.length; menu.sel = 0; sfx('ui'); }
  if (menu.tab === 5 && (I.pressed('left') || I.pressed('right'))) {
    const d = I.pressed('right') ? 0.1 : -0.1;
    if (menu.sel === 0) volume.music = Math.max(0, Math.min(1, +(volume.music + d).toFixed(2)));
    else if (menu.sel === 1) volume.sfx = Math.max(0, Math.min(1, +(volume.sfx + d).toFixed(2)));
    else { menu.tab = (menu.tab + (d > 0 ? 1 : TABS.length - 1)) % TABS.length; menu.sel = 0; }
    applyVolume(); sfx('ui');
  }
  const rows = menu.tab === 0 ? itemRows().length : menu.tab === 1 ? 3 + gearRows().length : menu.tab === 2 ? 4 : menu.tab === 3 ? 2 : menu.tab === 4 ? questRows().length : 6;
  if (I.pressed('up')) { menu.sel--; sfx('ui'); }
  if (I.pressed('down')) { menu.sel++; sfx('ui'); }
  clampSel(rows);
  if (I.pressed('confirm')) {
    if (menu.tab === 0) { const id = itemRows()[menu.sel]; if (id && ITEMS[id].kind === 'consumable') { useConsumable(id); } }
    else if (menu.tab === 1) {
      if (menu.sel === 1) unequip('armor'); else if (menu.sel === 2) unequip('acc');
      else if (menu.sel >= 3) { const id = gearRows()[menu.sel - 3]; if (id) equip(id); }
    } else if (menu.tab === 3) { if (spendPoint(menu.sel === 0 ? 'str' : 'agi')) { sfx('confirm'); W.player.hp = Math.min(W.player.hp + 2, maxHp()); } else sfx('wrong'); }
    else if (menu.tab === 5) {
      if (menu.sel === 2) { volume.muted = !volume.muted; applyVolume(); }
      else if (menu.sel === 3) { menu.sub = 'remap'; menu.sel = 0; }
      else if (menu.sel === 4) { return 'save'; }
      else if (menu.sel === 5) return 'quit';
    }
  }
  return null;
}

export function drawMenu(c: Ctx) {
  c.fillStyle = 'rgba(4,8,18,0.72)'; c.fillRect(0, 0, 960, 540);
  panel(c, 60, 40, 840, 460, { glow: true });
  TABS.forEach((t, i) => {
    const x = 90 + i * 130; const on = i === menu.tab && !menu.sub;
    text(c, t, x + 55, 56, { size: 16, bold: true, align: 'center', color: i === menu.tab ? C.accent : C.dim });
    if (i === menu.tab) { c.fillStyle = C.accent; c.fillRect(x, 80, 110, 2); }
  });
  void keycap;
  const hint = menu.tab === 3 ? 'Enter: spend a point' : menu.tab === 0 ? 'Enter: use' : menu.tab === 1 ? 'Enter: equip / unequip' : '';
  text(c, `Move: ↑↓ / Tab: ←→   ${hint}   Esc: close`, 480, 478, { size: 12, color: C.dim, align: 'center' });
  const L = 90, TOP = 100;
  const row = (i: number, label: string, right = '', dim = false) => {
    const y = TOP + i * 26; const on = i === menu.sel;
    if (on) { c.fillStyle = 'rgba(92,200,255,0.18)'; c.fillRect(L - 8, y - 3, 380, 25); c.fillStyle = C.accent; c.fillRect(L - 8, y - 3, 3, 25); }
    text(c, label, L + 4, y, { size: 15, color: dim ? C.dim : C.text }); if (right) text(c, right, L + 360, y, { size: 14, color: C.dim, align: 'right' });
  };
  const detail = (it: ItemDef | null, extra = '') => {
    if (!it) return;
    text(c, it.name, 520, TOP, { size: 20, bold: true, color: it.color });
    const ls = wrap(c, it.desc, 340, 14); ls.forEach((l, i) => text(c, l, 520, TOP + 32 + i * 19, { size: 14, color: C.text }));
    text(c, statLine(it), 520, TOP + 34 + ls.length * 19 + 6, { size: 13, color: C.gold });
    if (extra) text(c, extra, 520, TOP + 34 + ls.length * 19 + 28, { size: 13, color: C.dim });
  };

  if (menu.tab === 0) {
    const rows = itemRows();
    if (!rows.length) text(c, 'Nothing here yet.', L, TOP, { color: C.dim });
    rows.forEach((id, i) => row(i, ITEMS[id].name, `×${G.inv[id]}`));
    detail(rows[menu.sel] ? ITEMS[rows[menu.sel]] : null);
  } else if (menu.tab === 1) {
    const slots: [string, string | null][] = [['Weapon', G.equip.weapon], ['Armor', G.equip.armor], ['Accessory', G.equip.acc]];
    slots.forEach(([lab, id], i) => row(i, `${lab}: ${id ? ITEMS[id].name : '—'}`, id === G.equip.weapon ? `${Math.ceil(G.dur[id] ?? 0)}/${ITEMS[id].dur}` : ''));
    text(c, 'In your pack', L, TOP + 3 * 26 + 6, { size: 12, color: C.dim });
    const g = gearRows();
    g.forEach((id, i) => { const y0 = 3; const yy = TOP + (y0 + i) * 26 + 24; const on = menu.sel === y0 + i; if (on) { c.fillStyle = 'rgba(92,200,255,0.18)'; c.fillRect(L - 8, yy - 3, 380, 25); c.fillStyle = C.accent; c.fillRect(L - 8, yy - 3, 3, 25); } text(c, ITEMS[id].name, L + 4, yy, { size: 15 }); });
    const sel = menu.sel < 3 ? slots[menu.sel][1] : g[menu.sel - 3];
    detail(sel ? ITEMS[sel] : null);
  } else if (menu.tab === 2) {
    SKILLS.forEach((s, i) => row(i, `${i + 1}. ${S.skills[s.id === 'rising' ? 'rising' : s.id][0]}`, skillUnlocked(s) ? `Prof ${skillProf(s.id)}/5` : s.unlock > G.level ? `Lv ${s.unlock}` : 'Train Piercing Dash', !skillUnlocked(s)));
    const s = SKILLS[menu.sel];
    text(c, S.skills[s.id][0], 520, TOP, { size: 20, bold: true, color: C.accent });
    wrap(c, S.skills[s.id][1], 340, 14).forEach((l, i) => text(c, l, 520, TOP + 32 + i * 19, { size: 14 }));
    text(c, `Damage ×${(s.mul * s.hits * (1 + 0.08 * skillProf(s.id))).toFixed(1)}   Cooldown ${s.cd}s`, 520, TOP + 100, { size: 13, color: C.gold });
    text(c, `Recovery after use: ${s.post}s (you cannot move)`, 520, TOP + 122, { size: 13, color: C.dim });
    text(c, `Used ${G.skillUses[s.id] ?? 0} times. Proficiency adds 8% damage per level.`, 520, TOP + 144, { size: 13, color: C.dim });
  } else if (menu.tab === 3) {
    row(0, 'Strength', `${G.str}${totalStr() !== G.str ? ` (+${totalStr() - G.str})` : ''}`); row(1, 'Agility', `${G.agi}${totalAgi() !== G.agi ? ` (+${totalAgi() - G.agi})` : ''}`);
    text(c, `Points to spend: ${G.points}`, L, TOP + 70, { size: 15, color: G.points ? C.gold : C.dim, bold: true });
    text(c, `Level ${G.level}`, 520, TOP, { size: 20, bold: true, color: C.gold });
    bar(c, 520, TOP + 32, 320, 8, G.xp / xpNeed(G.level), C.accent);
    text(c, `${G.xp} / ${xpNeed(G.level)} XP`, 520, TOP + 46, { size: 12, color: C.dim });
    const stats: [string, string][] = [['Max HP', String(maxHp())], ['Attack', playerAtk().toFixed(0)], ['Defense', String(playerDef())], ['Move speed', moveSpeed().toFixed(0)], ['Crit chance', `${critChance().toFixed(1)}%`], ['Kills', String(G.kills)]];
    stats.forEach(([k, v], i) => { text(c, k, 520, TOP + 80 + i * 24, { size: 14, color: C.dim }); text(c, v, 840, TOP + 80 + i * 24, { size: 14, align: 'right' }); });
    text(c, 'Strength: attack and HP.  Agility: speed and crit.', L, TOP + 100, { size: 12, color: C.dim });
  } else if (menu.tab === 4) {
    const rows = questRows();
    if (!rows.length) text(c, 'No quests yet. Talk to people.', L, TOP, { color: C.dim });
    rows.slice(0, 13).forEach((id, i) => row(i, `${QUESTS[id].main ? '★ ' : ''}${QUESTS[id].name}`, questState(id) === 'done' ? 'Done' : questState(id) === 'ready' ? 'Turn in' : '', questState(id) === 'done'));
    const id = rows[menu.sel];
    if (id) {
      const q = QUESTS[id];
      text(c, q.name, 520, TOP, { size: 20, bold: true, color: C.gold });
      const ls = wrap(c, q.summary, 340, 14); ls.forEach((l, i) => text(c, l, 520, TOP + 32 + i * 19, { size: 14 }));
      let y = TOP + 40 + ls.length * 19;
      q.obj.forEach((o, i) => { const pr = objectiveProgress(id, i); const ok = pr.cur >= pr.need; text(c, `${ok ? '✓' : '○'} ${o.text}${pr.need > 1 ? ` (${pr.cur}/${pr.need})` : ''}`, 520, y, { size: 14, color: ok ? C.green : C.text }); y += 22; });
      const r = q.reward; text(c, `Reward: ${[r.xp ? r.xp + ' XP' : '', r.col ? r.col + ' Col' : '', ...Object.entries(r.items ?? {}).map(([k, n]) => `${n}× ${ITEMS[k].name}`)].filter(Boolean).join(', ') || '—'}`, 520, y + 8, { size: 13, color: C.dim });
    }
    if (G.flags.intel) text(c, 'Intel: the boss has four health bars. Axe, charge, slam, thrown fan. The last bar is unknown.', L, 440, { size: 12, color: C.warn });
  } else if (menu.tab === 5) {
    if (menu.sub === 'remap') {
      text(c, 'Key bindings — Enter to rebind, Esc to go back', L, TOP - 4, { size: 14, color: C.accent, bold: true });
      const first = Math.max(0, Math.min(I.ACTIONS.length - 11, menu.sel - 5));
      I.ACTIONS.slice(first, first + 11).forEach((a, i) => {
        const idx = first + i; const y = TOP + 24 + i * 26; const on = idx === menu.sel;
        if (on) { c.fillStyle = 'rgba(92,200,255,0.18)'; c.fillRect(L - 8, y - 3, 380, 25); }
        text(c, a, L + 4, y, { size: 15 }); text(c, on && menu.waiting ? 'press a key…' : I.getBindings()[a].map(I.keyLabel).join(' / '), L + 360, y, { size: 14, align: 'right', color: on && menu.waiting ? C.gold : C.dim });
      });
    } else {
      row(0, 'Music volume', `${Math.round(volume.music * 100)}%`); row(1, 'Effects volume', `${Math.round(volume.sfx * 100)}%`);
      row(2, 'Sound', volume.muted ? 'Muted' : 'On'); row(3, 'Key bindings', '›'); row(4, 'Save game'); row(5, 'Quit to title');
      text(c, 'Left/Right adjusts volume.', 520, TOP, { size: 13, color: C.dim });
    }
  }
}

// ---------------- shop ----------------
export const shop = { id: '', tab: 0, sel: 0 };
export function openShop(id: string) { shop.id = id; shop.tab = 0; shop.sel = 0; }
const sellRows = () => Object.keys(G.inv).filter((id) => G.inv[id] > 0 && ITEMS[id].kind !== 'key');

export function shopInput(): boolean {
  if (I.pressed('cancel') || I.pressed('pause')) return true;
  if (I.pressed('left') || I.pressed('right')) { shop.tab = 1 - shop.tab; shop.sel = 0; sfx('ui'); }
  const rows = shop.tab === 0 ? SHOPS[shop.id] : sellRows();
  if (I.pressed('up')) { shop.sel--; sfx('ui'); } if (I.pressed('down')) { shop.sel++; sfx('ui'); }
  shop.sel = Math.max(0, Math.min(Math.max(0, rows.length - 1), shop.sel));
  if (I.pressed('confirm') && rows[shop.sel]) {
    const id = rows[shop.sel]; const it = ITEMS[id];
    if (shop.tab === 0) {
      const owned = count(id) > 0 || Object.values(G.equip).includes(id);
      if (it.kind !== 'consumable' && owned) { toast('Already owned', '#ff8a8a'); sfx('wrong'); }
      else if (G.col < it.price) { toast('Not enough Col', '#ff8a8a'); sfx('wrong'); }
      else { G.col -= it.price; addItem(id, 1, true); if (it.kind === 'weapon') G.dur[id] ??= it.dur ?? 50; sfx('coin'); toast(`Bought ${it.name}`, '#9be3a0'); }
    } else {
      G.col += sellValue(it); takeItem(id); sfx('coin'); toast(`Sold ${it.name} for ${sellValue(it)} Col`, '#9be3a0');
    }
  }
  return false;
}
export function drawShop(c: Ctx) {
  c.fillStyle = 'rgba(4,8,18,0.72)'; c.fillRect(0, 0, 960, 540);
  panel(c, 100, 60, 760, 420, { glow: true });
  ['Buy', 'Sell'].forEach((t, i) => { text(c, t, 240 + i * 160, 76, { size: 18, bold: true, align: 'center', color: i === shop.tab ? C.accent : C.dim }); if (i === shop.tab) { c.fillStyle = C.accent; c.fillRect(190 + i * 160, 102, 100, 2); } });
  text(c, `${G.col} Col`, 830, 76, { size: 18, bold: true, color: C.gold, align: 'right' });
  const rows = shop.tab === 0 ? SHOPS[shop.id] : sellRows();
  rows.forEach((id, i) => {
    const y = 118 + i * 28; const on = i === shop.sel; const it = ITEMS[id];
    if (on) { c.fillStyle = 'rgba(92,200,255,0.18)'; c.fillRect(122, y - 4, 360, 27); c.fillStyle = C.accent; c.fillRect(122, y - 4, 3, 27); }
    text(c, it.name, 136, y, { size: 15 });
    text(c, shop.tab === 0 ? `${it.price}` : `${sellValue(it)}${G.inv[id] > 1 ? `  ×${G.inv[id]}` : ''}`, 470, y, { size: 14, color: C.gold, align: 'right' });
  });
  if (!rows.length) text(c, 'Nothing to sell.', 136, 120, { color: C.dim });
  const sel = rows[shop.sel] ? ITEMS[rows[shop.sel]] : null;
  if (sel) {
    text(c, sel.name, 520, 118, { size: 20, bold: true, color: sel.color });
    wrap(c, sel.desc, 310, 14).forEach((l, i) => text(c, l, 520, 150 + i * 19, { size: 14 }));
    text(c, statLine(sel), 520, 210, { size: 13, color: C.gold });
    if (sel.kind === 'weapon') text(c, `Current weapon ATK ${ITEMS[G.equip.weapon].atk}`, 520, 234, { size: 12, color: C.dim });
    if (sel.kind === 'armor') text(c, `Current armor DEF ${G.equip.armor ? ITEMS[G.equip.armor].def : 0}`, 520, 234, { size: 12, color: C.dim });
  }
  text(c, '←→ Buy/Sell    Enter: confirm    Esc: leave', 480, 456, { size: 12, color: C.dim, align: 'center' });
}
