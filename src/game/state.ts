import { ITEMS } from '../data/items';
import { QUESTS } from '../data/quests';
import { S } from '../data/strings';
import { sfx } from '../engine/audio';

export type QState = 'none' | 'active' | 'ready' | 'done';
export interface QuestRec { st: QState; kills: Record<string, number> }

export interface GameState {
  mode: 'death' | 'normal';
  name: string; level: number; xp: number; hp: number; str: number; agi: number; points: number; col: number;
  inv: Record<string, number>;
  equip: { weapon: string; armor: string | null; acc: string | null };
  dur: Record<string, number>;
  quests: Record<string, QuestRec>;
  flags: Record<string, boolean | number>;
  skillUses: Record<string, number>;
  clock: number; playtime: number;
  deadAllies: string[]; opened: string[];
  zone: string; tx: number; ty: number;
  lastInn: { zone: string; tx: number; ty: number };
  kills: number; deaths: number;
}

export function freshState(mode: 'death' | 'normal', name: string): GameState {
  return {
    mode, name: name || S.playerDefault, level: 1, xp: 0, hp: 9999, str: 5, agi: 5, points: 0, col: 60,
    inv: { potion: 2 }, equip: { weapon: 'ironblade', armor: null, acc: null }, dur: { ironblade: ITEMS.ironblade.dur! },
    quests: {}, flags: {}, skillUses: {}, clock: 300, playtime: 0, deadAllies: [], opened: [],
    zone: 'firstlight', tx: 28, ty: 24, lastInn: { zone: 'firstlight', tx: 22, ty: 12 }, kills: 0, deaths: 0,
  };
}

export let G: GameState = freshState('normal', '');
export function setState(s: GameState) { G = s; }

// UI hooks, wired up in main.ts
export const hooks = {
  shop: (_id: string) => {}, inn: () => {}, repair: () => {}, duel: () => {}, fightRival: () => {},
  enterBoss: () => {}, victory: () => {}, joinRaid: () => {}, say: (_id: string) => {},
};

export interface Toast { text: string; color: string; t: number }
export const toasts: Toast[] = [];
export function toast(text: string, color = '#ffffff') {
  toasts.push({ text, color, t: 3.2 });
  if (toasts.length > 5) toasts.shift();
}

export const questState = (id: string): QState => G.quests[id]?.st ?? 'none';
export function cond(expr?: string): boolean {
  if (!expr) return true;
  return expr.split('&').every((raw) => {
    let tok = raw.trim(); let neg = false;
    if (tok.startsWith('!')) { neg = true; tok = tok.slice(1); }
    let r: boolean;
    if (tok.startsWith('q:')) { const [, id, st] = tok.split(':'); r = questState(id) === st; }
    else if (tok.startsWith('item:')) r = (G.inv[tok.slice(5)] ?? 0) > 0;
    else if (tok.startsWith('lvl>=')) r = G.level >= Number(tok.slice(5));
    else r = !!G.flags[tok];
    return neg ? !r : r;
  });
}

export const count = (id: string) => G.inv[id] ?? 0;
export function addItem(id: string, n = 1, quiet = false) {
  if (!ITEMS[id]) throw new Error(`Unknown item ${id}`);
  G.inv[id] = count(id) + n;
  if (!quiet) { toast(`+${n} ${ITEMS[id].name}`, '#9be3a0'); sfx('pickup'); }
  checkQuests();
}
export function takeItem(id: string, n = 1): boolean {
  if (count(id) < n) return false;
  G.inv[id] -= n; if (G.inv[id] <= 0) delete G.inv[id];
  return true;
}
export function addCol(n: number, quiet = false) {
  G.col = Math.max(0, G.col + n);
  if (!quiet && n > 0) sfx('coin');
}

export function setFlag(f: string, v: boolean | number = true) {
  G.flags[f] = v; checkQuests();
}

export function objectiveProgress(qid: string, i: number): { cur: number; need: number } {
  const q = QUESTS[qid]; const o = q.obj[i]; const rec = G.quests[qid];
  if (o.t === 'kill') return { cur: Math.min(o.n, rec?.kills[o.target] ?? 0), need: o.n };
  if (o.t === 'have') return { cur: Math.min(o.n, count(o.item)), need: o.n };
  return { cur: G.flags[o.flag] ? 1 : 0, need: 1 };
}
export const objectivesMet = (qid: string) => QUESTS[qid].obj.every((_, i) => { const p = objectiveProgress(qid, i); return p.cur >= p.need; });

export function startQuest(id: string) {
  if (!QUESTS[id]) throw new Error(`Unknown quest ${id}`);
  if (questState(id) !== 'none') return;
  G.quests[id] = { st: 'active', kills: {} };
  toast(`${S.ui.questNew}: ${QUESTS[id].name}`, '#ffd76a'); sfx('quest');
  checkQuests();
}

let levelHook: (xp: number) => void = () => {};
export function bindXp(fn: (xp: number) => void) { levelHook = fn; }

export function completeQuest(id: string, force = false) {
  const q = QUESTS[id]; const rec = G.quests[id];
  if (!rec || rec.st === 'done') return;
  if (!force && !objectivesMet(id)) return;
  if (!force) for (const o of q.obj) if (o.t === 'have' && o.take) takeItem(o.item, o.n);
  rec.st = 'done';
  levelHook(q.reward.xp);
  addCol(q.reward.col, true);
  for (const [it, n] of Object.entries(q.reward.items ?? {})) addItem(it, n, true);
  const parts = [
    q.reward.xp ? `${q.reward.xp} XP` : '', q.reward.col ? `${q.reward.col} Col` : '',
    ...Object.entries(q.reward.items ?? {}).map(([i, n]) => `${n > 1 ? n + '× ' : ''}${ITEMS[i].name}`),
  ].filter(Boolean);
  toast(`${S.ui.questDone}: ${q.name}`, '#ffd76a');
  if (parts.length) toast(parts.join(', '), '#9be3a0');
  sfx('quest');
  if (q.onDone) runActions(q.onDone);
}

/** Re-evaluate active quests after any state change. */
export function checkQuests() {
  for (const [id, rec] of Object.entries(G.quests)) {
    if (rec.st !== 'active' || !objectivesMet(id)) continue;
    const q = QUESTS[id];
    if (q.turnIn) {
      rec.st = 'ready';
      const who = S.names[q.turnIn as keyof typeof S.names] ?? q.turnIn;
      toast(`${S.ui.questReady} ${who}`, '#ffd76a'); sfx('quest');
    } else completeQuest(id);
  }
}
export function onKill(mobId: string) {
  G.kills++;
  for (const [id, rec] of Object.entries(G.quests)) {
    if (rec.st !== 'active') continue;
    if (QUESTS[id].obj.some((o) => o.t === 'kill' && o.target === mobId)) rec.kills[mobId] = (rec.kills[mobId] ?? 0) + 1;
  }
  checkQuests();
}

/** Actions are "name:arg:arg" joined with ";". */
export function runActions(str?: string) {
  if (!str) return;
  for (const part of str.split(';')) {
    const [a, x, y] = part.split(':');
    switch (a) {
      case 'startQuest': startQuest(x); break;
      case 'completeQuest': completeQuest(x, x === 's3' && !!G.flags.yielded); break;
      case 'flag': setFlag(x, true); break;
      case 'giveItem': addItem(x, Number(y ?? 1)); break;
      case 'shop': hooks.shop(x); break;
      case 'inn': hooks.inn(); break;
      case 'repair': hooks.repair(); break;
      case 'duel': hooks.duel(); break;
      case 'fightRival': hooks.fightRival(); break;
      case 'joinRaid': hooks.joinRaid(); break;
      case 'enterBoss': hooks.enterBoss(); break;
      case 'victory': hooks.victory(); break;
      case 'buyIntel':
        if (G.col >= 250) { G.col -= 250; setFlag('intel'); sfx('coin'); hooks.say('fenn.intel'); setFlag('intelTold'); }
        else { toast('Not enough Col', '#ff8a8a'); sfx('wrong'); }
        break;
      default: throw new Error(`Unknown action "${part}"`);
    }
  }
}
