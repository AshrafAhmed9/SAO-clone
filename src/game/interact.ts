import { DIALOGUE } from '../data/dialogue';
import { ITEMS } from '../data/items';
import { S } from '../data/strings';
import { openPuzzleDoor } from './world';
import { sfx } from '../engine/audio';
import { dist, rand } from '../engine/util';
import { QUESTS } from '../data/quests';
import { maxHp } from './progression';
import { addCol, addItem, cond, G, hooks, setFlag, toast } from './state';
import { addFloat, burst, loadZone, moveBody, W, type NpcA, type WObject } from './world';
import { spawnParty } from './allies';
import { saveGame } from '../engine/save';

export function resolveTopic(n: NpcA): string {
  const t = n.def.topics.find((x) => cond(x.when));
  return t ? t.id : n.def.topics[n.def.topics.length - 1].id;
}
export function npcMarker(n: NpcA): '' | '!' | '?' {
  const id = resolveTopic(n);
  if (/\.(offer|first|intro|meeting)$/.test(id)) return '!';
  if (/\.(turnin|won|done|yielded)$/.test(id)) return '?';
  return '';
}

export function updateNpcs(dt: number) {
  const p = W.player;
  for (const n of W.npcs) {
    n.anim += dt;
    const d = dist(n.x, n.y, p.x, p.y);
    if (d < 36) { n.face = Math.atan2(p.y - n.y, p.x - n.x); continue; }
    if (!n.def.wander) continue;
    n.wanderT -= dt;
    if (n.wanderT <= 0) {
      n.wanderT = rand(2, 6);
      const a = rand(0, 6.28), r = rand(0, n.def.wander * 16);
      n.wx = n.hx + Math.cos(a) * r; n.wy = n.hy + Math.sin(a) * r;
    }
    if (dist(n.x, n.y, n.wx, n.wy) > 2) {
      const a = Math.atan2(n.wy - n.y, n.wx - n.x); n.face = a;
      moveBody(n, Math.cos(a) * 18 * dt, 0, 4); moveBody(n, 0, Math.sin(a) * 18 * dt, 4);
    }
  }
  for (const o of W.objs) if (o.def.kind === 'herb' && o.used) { o.respawn -= dt; if (o.respawn <= 0) o.used = false; }
}

export type Target = { kind: 'npc'; npc: NpcA } | { kind: 'obj'; obj: WObject };
export function nearestInteractable(): { t: Target; label: string } | null {
  const p = W.player; let best: { t: Target; label: string } | null = null; let bd = 1e9;
  for (const n of W.npcs) {
    const d = dist(n.x, n.y, p.x, p.y);
    if (d < 28 && d < bd) { bd = d; best = { t: { kind: 'npc', npc: n }, label: `${S.ui.interact} — ${n.def.name}` }; }
  }
  for (const o of W.objs) {
    if (o.used && o.def.kind !== 'lever') continue;
    const d = dist(o.x, o.y, p.x, p.y);
    const lim = o.def.kind === 'door' ? 30 : 24;
    if (d < lim && d < bd) {
      bd = d;
      const k = o.def.kind;
      const label = k === 'chest' ? S.ui.open : k === 'herb' ? S.ui.gather : k === 'lever' ? S.ui.pull : k === 'bed' ? S.ui.sleep : k === 'march' ? 'March to the boss door' : k === 'door' ? 'Examine the door' : S.ui.read;
      best = { t: { kind: 'obj', obj: o }, label };
    }
  }
  return best;
}

export function say(id: string) { hooks.say(id); }

export function interact(): boolean {
  const it = nearestInteractable();
  if (!it) return false;
  if (it.t.kind === 'npc') { say(resolveTopic(it.t.npc)); return true; }
  const o = it.t.obj; const k = o.def.kind;
  switch (k) {
    case 'chest': {
      o.used = true; G.opened.push(o.def.id); sfx('chest');
      for (const [i, n] of Object.entries(o.def.loot ?? {})) addItem(i, n, true);
      if (o.def.col) addCol(o.def.col);
      const parts = [...Object.entries(o.def.loot ?? {}).map(([i, n]) => `${n > 1 ? n + '× ' : ''}${ITEMS[i].name}`), o.def.col ? `${o.def.col} Col` : ''].filter(Boolean);
      toast(`Chest: ${parts.join(', ')}`, '#ffd76a');
      burst(o.x, o.y, '#ffe36a', 18, 80, 0.6, 2, 0, true);
      if (o.def.flag) setFlag(o.def.flag);
      break;
    }
    case 'herb': o.used = true; o.respawn = 160; addItem('herb', 1); burst(o.x, o.y, '#74c365', 6, 40, 0.4); break;
    case 'board': case 'tablet': {
      if (k === 'tablet') say('tablet.read');
      else { DIALOGUE[`obj:${o.def.id}`] = { lines: [{ who: 'Notice', text: o.def.text ?? '' }] }; say(`obj:${o.def.id}`); }
      break;
    }
    case 'lever': pullLever(o); break;
    case 'bed':
      W.player.hp = maxHp(); G.lastInn = { zone: W.zone, tx: Math.floor(o.x / 16) + 1, ty: Math.floor(o.y / 16) };
      sfx('heal'); saveGame(); toast(S.ui.saved, '#9be3a0'); burst(o.x, o.y, '#7ad7ff', 14, 70, 0.6, 2, 0, true); break;
    case 'door': say(G.flags.raid ? 'bossdoor.open' : 'bossdoor.sealed'); break;
    case 'march':
      if (QUESTS.m5 && !G.quests.m5) { /* quest begins at the door */ }
      marchToDoor(); break;
    default: break;
  }
  return true;
}

function pullLever(o: WObject) {
  if (G.flags.puzzleOpen) return;
  sfx('lever');
  const order = ['E', 'S', 'W'];
  W.puzzle.push(o.def.text ?? '');
  const i = W.puzzle.length - 1;
  if (W.puzzle[i] !== order[i]) {
    W.puzzle = []; sfx('wrong'); toast('The mechanism grinds and resets.', '#ff8a8a'); return;
  }
  addFloat(o.x, o.y - 12, '✓', '#9be3a0', 10);
  if (W.puzzle.length === order.length) {
    setFlag('puzzleOpen'); openPuzzleDoor(); sfx('chest'); W.cam.shake = 5;
    toast('Somewhere, stone slides open.', '#ffd76a');
  }
}

export function marchToDoor() {
  const names = ['hobb', 'iselle', 'dov'];
  loadZone('lab3', 42, 16);
  spawnParty(names);
  toast('The raid marches to the boss door.', '#ffd76a');
}
