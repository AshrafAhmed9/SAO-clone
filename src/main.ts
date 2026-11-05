import { DIALOGUE } from './data/dialogue';
import { ITEMS } from './data/items';
import { MOBS } from './data/mobs';
import { S } from './data/strings';
import { NPCS, OBJECTS } from './data/zones';
import { setMusic, sfx, unlockAudio } from './engine/audio';
import * as I from './engine/input';
import { hasSave, loadGame, saveGame, wipeSave } from './engine/save';
import { addAlly, spawnParty } from './game/allies';
import { ev } from './game/combat';
import { burst, loadZone, spawnMobAt, W } from './game/world';
import { onLevelUp, maxHp } from './game/progression';
import { interact } from './game/interact';
import { resetBake, renderWorld } from './game/render';
import { addItem, freshState, G, hooks, runActions, setFlag, setState, toast, toasts } from './game/state';
import { enterZone, updateParticles, updateWorld } from './game/update';
import { drawHud, drawMinimap } from './ui/hud';
import { drawMenu, drawShop, menu, menuInput, openShop, shopInput } from './ui/menu';
import { dialogueInput, dlg, drawBigMap, drawControls, drawDialogue, drawGameOver, drawModeSelect, drawNameEntry, drawPause, drawTitle, drawVictory, startDialogue, title } from './ui/screens';
import { text } from './ui/draw';
import { validateContent } from './data/validate';

type Scene = 'title' | 'name' | 'mode' | 'intro' | 'play' | 'dialogue' | 'menu' | 'shop' | 'pause' | 'gameover' | 'victory' | 'map' | 'controls';

const canvas = document.getElementById('game') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;
let scene: Scene = 'title';
let prevScene: Scene = 'title';
let sceneT = 0;
let debug = false;
let nameBuf: string = S.playerDefault;
let modeSel = 1;
let pauseSel = 0;
let introT = 0;
let deathT = 0;
let bossDeadT = -1;
let lastBy: 'player' | 'ally' | null = null;
let autosaveT = 0;
let ctrlFrom: Scene = 'title';

// ---------- canvas sizing ----------
function resize() {
  const s = Math.min(innerWidth / 960, innerHeight / 540);
  const dpr = window.devicePixelRatio || 1;
  const k = Math.max(1, Math.min(2, Math.round(s * dpr)));
  canvas.width = 960 * k; canvas.height = 540 * k;
  canvas.style.width = `${Math.floor(960 * s)}px`; canvas.style.height = `${Math.floor(540 * s)}px`;
  ctx.setTransform(k, 0, 0, k, 0, 0);
}
window.addEventListener('resize', resize);
resize();
I.initInput(canvas);
window.addEventListener('pointerdown', () => { unlockAudio(); canvas.focus(); });
window.addEventListener('keydown', (e) => {
  unlockAudio();
  if (e.code === 'F3') { debug = !debug; e.preventDefault(); }
  if (scene === 'name') {
    if (e.key === 'Backspace') nameBuf = nameBuf.slice(0, -1);
    else if (e.key === 'Enter') { if (nameBuf.trim()) { scene = 'mode'; sfx('confirm'); } }
    else if (e.key.length === 1 && nameBuf.length < 14) nameBuf += e.key;
  }
});

function go(s: Scene) { prevScene = scene; scene = s; sceneT = 0; }

// ---------- dialogue plumbing ----------
function beginDialogue(id: string) {
  if (scene === 'dialogue') { dlg.queue.push(id); return; }
  startDialogue(id); go('dialogue');
}

// ---------- hooks ----------
const INN_SPOT: Record<string, { tx: number; ty: number }> = { firstlight: { tx: 22, ty: 12 }, mossbrook: { tx: 8, ty: 12 } };
function restoreNpc(id: string) {
  const d = NPCS.find((n) => n.id === id); if (!d || W.npcs.some((n) => n.def.id === id)) return;
  W.npcs.push({ def: d, x: d.tx * 16 + 8, y: d.ty * 16 + 8, hx: d.tx * 16 + 8, hy: d.ty * 16 + 8, face: Math.PI / 2, wanderT: 2, wx: d.tx * 16 + 8, wy: d.ty * 16 + 8, anim: 0 });
}
function removeNpc(id: string) { W.npcs = W.npcs.filter((n) => n.def.id !== id); }
function silentRemove(m: { dead: boolean; deadT: number }) { m.dead = true; m.deadT = 99; }

hooks.say = beginDialogue;
hooks.shop = (id) => { openShop(id); go('shop'); sfx('confirm'); };
hooks.inn = () => {
  if (G.col < 20) { toast('Not enough Col', '#ff8a8a'); sfx('wrong'); return; }
  G.col -= 20; W.player.hp = maxHp(); W.player.hot = [];
  const spot = INN_SPOT[W.zone]; if (spot) G.lastInn = { zone: W.zone, ...spot };
  saveGame(); sfx('heal'); W.fade = 1; toast('You rest. HP restored. ' + S.ui.saved, '#9be3a0');
};
hooks.repair = () => {
  const id = G.equip.weapon; const max = ITEMS[id].dur ?? 0; const missing = Math.ceil(max - (G.dur[id] ?? 0));
  if (missing <= 0) { toast('Your weapon is in good shape.', '#cfd8e8'); return; }
  const cost = missing * 2;
  if (G.col < cost) { toast(`Repair costs ${cost} Col`, '#ff8a8a'); sfx('wrong'); return; }
  G.col -= cost; G.dur[id] = max; sfx('confirm'); toast(`${S.ui.repaired} (-${cost} Col)`, '#9be3a0');
};
hooks.duel = () => {
  const n = W.npcs.find((x) => x.def.id === 'jarro'); if (!n) return;
  removeNpc('jarro');
  const m = spawnMobAt('duelist', Math.floor(n.x / 16), Math.floor(n.y / 16));
  m.duel = true; m.state = 'chase'; m.target = { kind: 'player' };
  toast('Duel! First to a fifth of their HP loses.', '#ffd76a');
};
hooks.fightRival = () => {
  const n = W.npcs.find((x) => x.def.id === 'rask'); if (!n) return;
  setFlag('raskTold'); removeNpc('rask');
  const m = spawnMobAt('rival', Math.floor(n.x / 16), Math.floor(n.y / 16));
  m.duel = true; m.state = 'chase'; m.target = { kind: 'player' };
};
hooks.joinRaid = () => {
  setFlag('raid'); for (const id of ['hobb', 'iselle', 'dov']) removeNpc(id);
  spawnParty(['hobb', 'iselle', 'dov']);
  const march = OBJECTS.find((o) => o.id === 'march');
  if (march && !W.objs.some((o) => o.def.id === 'march')) W.objs.push({ def: march, x: march.tx * 16 + 8, y: march.ty * 16 + 8, used: false, respawn: 0 });
  toast('You joined the raid party.', '#ffd76a'); sfx('quest');
};
hooks.enterBoss = () => {
  runActions('startQuest:m5');
  enterZone('bossroom', 17, 25, false);
  const roster = ['hobb', 'iselle', 'dov', 'veyra', 'r1', 'r2', 'r3', 'r4'];
  roster.forEach((id, i) => addAlly(id, W.player.x + (i - 3.5) * 14, W.player.y + 18 + (i % 2) * 8, i));
  const b = spawnMobAt('korrath', 17, 7); b.face = Math.PI / 2;
  setMusic('boss'); beginDialogue('boss.intro'); sfx('roar');
};
hooks.victory = () => {
  setFlag('firstFloorCleared'); G.zone = 'mossbrook'; G.tx = 21; G.ty = 28;
  saveGame(); go('victory'); setMusic('town');
};
ev.onPlayerDeath = () => { deathT = 0; if (G.mode === 'death') wipeSave(); };
ev.onBossDead = (by) => {
  bossDeadT = 0.01; lastBy = by; W.flash = 0.7; W.cam.shake = 10;
  if (by === 'player') { addItem('midnight', 1); toast(`${S.ui.lastAttack}! ${ITEMS.midnight.name} obtained.`, '#ffe36a'); setFlag('lastAttack'); }
  else toast('An ally landed the final blow.', '#cfd8e8');
};
ev.onDuelEnd = (won, m) => {
  silentRemove(m); m.scripted = true;
  if (m.def.id === 'duelist') {
    restoreNpc('jarro');
    if (won) { setFlag('duelWon'); toast('You won the duel.', '#ffd76a'); beginDialogue('jarro.won'); } else toast('You lost the duel. Talk to Jarro to try again.', '#ff8a8a');
  } else if (m.def.id === 'rival') {
    if (won) { setFlag('raskBeaten'); beginDialogue('rask.won'); } else { restoreNpc('rask'); toast('Rask beat you. Talk to him to try again.', '#ff8a8a'); }
  }
};
onLevelUp(() => { if (W.player) { W.player.hp = maxHp(); W.flash = 0.35; burst(W.player.x, W.player.y, '#ffe36a', 30, 120, 0.8, 2, 0, true); } });

// ---------- game start / load ----------
function startNew(mode: 'death' | 'normal', name: string) {
  setState(freshState(mode, name)); toasts.length = 0; resetBake();
  enterZone('firstlight', 28, 24, false); W.player.hp = maxHp(); G.hp = W.player.hp;
  introT = 0; go('intro'); setMusic('silent');
}
function continueGame() {
  if (!loadGame()) return;
  toasts.length = 0; resetBake();
  enterZone(G.zone, G.tx, G.ty, true);
  go('play');
}
function respawn() {
  G.col = Math.floor(G.col * 0.9); G.xp = Math.floor(G.xp * 0.7);
  G.hp = 9999; resetBake();
  enterZone(G.lastInn.zone, G.lastInn.tx, G.lastInn.ty, true);
  W.player.hp = maxHp(); toast('You wake at the inn. Some Col and XP were lost.', '#ffb04a'); go('play');
}

// ---------- steps ----------
function playStep(dt: number) {
  const p = W.player;
  if (!p.dead) {
    if (I.pressed('menu')) { menu.sel = 0; menu.tab = 0; menu.sub = ''; sfx('ui'); go('menu'); return; }
    if (I.pressed('pause')) { pauseSel = 0; go('pause'); return; }
    if (I.pressed('map')) { go('map'); return; }
    if (I.pressed('interact') && p.state === 'free') interact();
  }
  updateWorld(dt, !p.dead && scene === 'play');
  if (scene !== 'play') return;
  for (const t of toasts) t.t -= dt;
  while (toasts.length && toasts[0].t <= 0) toasts.shift();
  if (p.dead) { deathT += dt; if (deathT > 2.6) { go('gameover'); } }
  if (bossDeadT > 0) { bossDeadT += dt; if (bossDeadT > 3.2) { bossDeadT = -1; beginDialogue('boss.after'); } }
  autosaveT += dt;
  if (autosaveT > 90 && W.zone !== 'bossroom' && !p.dead) { autosaveT = 0; saveGame(); }
  void lastBy;
}

function step(dt: number) {
  I.pollInput();
  sceneT += dt;
  switch (scene) {
    case 'title': {
      if (sceneT === dt) setMusic('town');
      const n = hasSave() ? 3 : 2;
      if (I.pressed('up')) { title.sel = (title.sel + n - 1) % n; sfx('ui'); }
      if (I.pressed('down')) { title.sel = (title.sel + 1) % n; sfx('ui'); }
      if (I.pressed('confirm')) {
        const labels = hasSave() ? ['c', 'n', 'k'] : ['n', 'k'];
        const a = labels[title.sel]; sfx('confirm');
        if (a === 'c') continueGame(); else if (a === 'n') { nameBuf = S.playerDefault; go('name'); } else { ctrlFrom = 'title'; go('controls'); }
      }
      break;
    }
    case 'name': if (I.pressed('cancel') && false) go('title'); break;
    case 'mode':
      if (I.pressed('left') || I.pressed('right')) { modeSel = 1 - modeSel; sfx('ui'); }
      if (I.pressed('confirm')) { sfx('confirm'); if (hasSave()) wipeSave(); startNew(modeSel === 0 ? 'death' : 'normal', nameBuf.trim()); }
      break;
    case 'controls':
      if (I.pressed('cancel') || I.pressed('confirm')) go(ctrlFrom);
      break;
    case 'intro': {
      introT += dt;
      if (I.pressed('confirm') && introT < 7) introT = 7;
      if (introT > 4.6 && introT - dt <= 4.6) sfx('bell');
      if (introT > 7.4 && introT - dt <= 7.4) { sfx('warn'); W.flash = 0.5; beginDialogue('announce'); }
      updateWorld(dt, false); W.fade = introT < 2.4 ? 1 : Math.max(0, 1 - (introT - 2.4));
      if (introT > 4.6 && introT < 6) W.cam.shake = 1.2;
      break;
    }
    case 'dialogue': {
      const r = dialogueInput(dt);
      if (r?.finished) {
        const wasAnnounce = dlg.id === 'announce';
        const sceneBefore: Scene = prevScene === 'intro' ? 'intro' : 'play';
        scene = wasAnnounce ? 'play' : sceneBefore === 'intro' ? 'play' : 'play';
        if (wasAnnounce) { setFlag('announced'); setMusic('town'); toast('Find Ordan, the grey-haired player in the plaza.', '#ffd76a'); }
        if (r.act) runActions(r.act);
        if (scene === 'play' && r.next) beginDialogue(r.next);
        else if (scene === 'play' && dlg.queue.length) beginDialogue(dlg.queue.shift()!);
      }
      break;
    }
    case 'play': playStep(dt); break;
    case 'menu': {
      const r = menuInput();
      updateParticles(0);
      if (r === 'close') go('play'); else if (r === 'save') { saveGame(); toast(S.ui.saved, '#9be3a0'); } else if (r === 'quit') { saveGame(); go('title'); }
      break;
    }
    case 'shop': if (shopInput()) go('play'); break;
    case 'pause': {
      if (I.pressed('pause') || I.pressed('cancel')) { go('play'); break; }
      if (I.pressed('up')) { pauseSel = (pauseSel + 3) % 4; sfx('ui'); } if (I.pressed('down')) { pauseSel = (pauseSel + 1) % 4; sfx('ui'); }
      if (I.pressed('confirm')) {
        sfx('confirm');
        if (pauseSel === 0) go('play'); else if (pauseSel === 1) { saveGame(); toast(S.ui.saved, '#9be3a0'); go('play'); } else if (pauseSel === 2) { ctrlFrom = 'pause'; go('controls'); } else { saveGame(); go('title'); }
      }
      break;
    }
    case 'map': if (I.pressed('map') || I.pressed('cancel') || I.pressed('pause')) go('play'); break;
    case 'gameover':
      updateWorld(dt, false);
      if (sceneT > 1.5 && I.pressed('confirm')) { if (G.mode === 'death') { go('title'); } else respawn(); }
      break;
    case 'victory': if (sceneT > 2 && I.pressed('confirm')) go('title'); break;
  }
}

// ---------- render ----------
function render(now: number) {
  const c = ctx;
  const worldScenes: Scene[] = ['intro', 'play', 'dialogue', 'menu', 'shop', 'pause', 'gameover', 'map'];
  c.clearRect(0, 0, 960, 540);
  if (worldScenes.includes(scene) && W.player) {
    renderWorld(c, 960, 540);
    if (scene !== 'intro' || introT > 2.4) drawHud(c, debug);
  }
  switch (scene) {
    case 'title': drawTitle(c, hasSave(), now / 1000); break;
    case 'name': drawNameEntry(c, nameBuf, now / 1000); break;
    case 'mode': drawModeSelect(c, modeSel); break;
    case 'intro':
      if (introT < 2.6) {
        c.fillStyle = '#000'; c.fillRect(0, 0, 960, 540);
        const a = Math.min(1, introT / 0.8) * Math.min(1, (2.6 - introT) / 0.6);
        text(c, 'Connection established.', 480, 240, { size: 24, align: 'center', alpha: a });
        text(c, `${S.castle}  ·  ${S.floorName}`, 480, 276, { size: 15, align: 'center', color: '#8da0c0', alpha: a });
      }
      if (introT > 8) text(c, '', 0, 0);
      if (introT < 7) text(c, 'Enter to skip', 940, 518, { size: 11, align: 'right', color: '#8da0c0', alpha: 0.6 });
      break;
    case 'dialogue': drawDialogue(c); break;
    case 'menu': drawMenu(c); break;
    case 'shop': drawShop(c); break;
    case 'pause': drawPause(c, pauseSel); break;
    case 'controls': drawControls(c); break;
    case 'map': drawBigMap(c, drawMinimap); break;
    case 'gameover': drawGameOver(c, sceneT); break;
    case 'victory': drawVictory(c, sceneT); break;
    default: break;
  }
}

// ---------- boot ----------
try { validateContent(); } catch (e) {
  document.body.innerHTML = `<pre style="color:#ff8a8a;padding:24px;font:14px monospace;white-space:pre-wrap">Content error:\n${(e as Error).message}</pre>`;
  throw e;
}
void MOBS; void DIALOGUE; void loadZone;
let last = performance.now(); let acc = 0;
function frame(now: number) {
  acc += Math.min(0.1, (now - last) / 1000); last = now;
  let n = 0;
  while (acc >= 1 / 60 && n < 5) { step(1 / 60); acc -= 1 / 60; n++; }
  if (n === 5) acc = 0;
  render(now);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
(window as unknown as { __hf: unknown }).__hf = { W, G: () => G, go, hooks, enterZone, runActions, addItem };
