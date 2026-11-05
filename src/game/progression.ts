import { ITEMS } from '../data/items';
import { S } from '../data/strings';
import { sfx } from '../engine/audio';
import { G, toast, bindXp } from './state';

export const MAX_LEVEL = 15;
export const xpNeed = (lvl: number) => Math.round(18 * Math.pow(lvl, 1.6)) + 12;

function gear() {
  const items = [G.equip.weapon, G.equip.armor, G.equip.acc].filter(Boolean).map((i) => ITEMS[i as string]);
  const sum = (k: 'hp' | 'def' | 'str' | 'agi' | 'crit') => items.reduce((s, i) => s + (i[k] ?? 0), 0);
  return { hp: sum('hp'), def: sum('def'), str: sum('str'), agi: sum('agi'), crit: sum('crit') };
}
export const totalStr = () => G.str + gear().str;
export const totalAgi = () => G.agi + gear().agi;
export const maxHp = () => 120 + 20 * (G.level - 1) + totalStr() * 2 + gear().hp;
export const weaponBroken = () => (G.dur[G.equip.weapon] ?? 1) <= 0;
export const playerAtk = () => (ITEMS[G.equip.weapon].atk ?? 0) * (weaponBroken() ? 0.4 : 1) + totalStr() * 1.2 + G.level;
export const playerDef = () => gear().def;
export const moveSpeed = () => 72 + totalAgi() * 0.9;
export const critChance = () => 3 + totalAgi() * 0.5 + gear().crit;
/** Fraction of damage removed by armor. */
export const defReduction = (def: number) => def / (def + 60);

let levelUpHook = () => {};
export function onLevelUp(fn: () => void) { levelUpHook = fn; }

export function gainXp(n: number) {
  if (n <= 0 || G.level >= MAX_LEVEL) return;
  G.xp += n;
  while (G.level < MAX_LEVEL && G.xp >= xpNeed(G.level)) {
    G.xp -= xpNeed(G.level);
    G.level++; G.points += 2;
    toast(`${S.ui.levelUp}! Level ${G.level}`, '#ffe36a'); sfx('levelup');
    levelUpHook();
  }
}
bindXp(gainXp);

export function spendPoint(stat: 'str' | 'agi') {
  if (G.points <= 0) return false;
  G.points--; G[stat]++; return true;
}

export interface SkillDef {
  id: 'dash' | 'rising' | 'arc' | 'triple'; slot: 1 | 2 | 3 | 4; unlock: number; windup: number; dur: number; post: number; cd: number;
  mul: number; range: number; arc: number; hits: number; poise: number; move: number; reqUses?: number;
}
export const SKILLS: SkillDef[] = [
  { id: 'dash', slot: 1, unlock: 1, windup: 0.2, dur: 0.16, post: 0.35, cd: 2.5, mul: 1.7, range: 26, arc: 0.9, hits: 1, poise: 40, move: 120 },
  { id: 'rising', slot: 2, unlock: 2, windup: 0.24, dur: 0.14, post: 0.45, cd: 4.5, mul: 2.0, range: 36, arc: 2.0, hits: 1, poise: 70, move: 20 },
  { id: 'arc', slot: 3, unlock: 4, windup: 0.28, dur: 0.18, post: 0.5, cd: 6, mul: 1.6, range: 44, arc: 6.4, hits: 1, poise: 60, move: 0 },
  { id: 'triple', slot: 4, unlock: 5, windup: 0.25, dur: 0.54, post: 0.65, cd: 9, mul: 1.25, range: 32, arc: 1.5, hits: 3, poise: 55, move: 70, reqUses: 12 },
];
export const skillUnlocked = (s: SkillDef) => G.level >= s.unlock && (G.skillUses.dash ?? 0) >= (s.reqUses ?? 0);
export const skillProf = (id: string) => Math.min(5, Math.floor((G.skillUses[id] ?? 0) / 12));
