import { S } from './strings';
import type { AttackDef, MobDef } from './types';

const M = S.mobs;
const lunge = (windup: number, range: number, mul = 1, speed = 230): AttackDef => ({ kind: 'lunge', windup, recover: 0.7, range, mul, speed });
const melee = (windup: number, range: number, mul = 1, arc = 1.6): AttackDef => ({ kind: 'melee', windup, recover: 0.6, range, mul, arc });

export const MOBS: Record<string, MobDef> = {
  boar: {
    id: 'boar', name: M.boar, level: 1, hp: 48, atk: 13, def: 0, speed: 58, radius: 7, xp: 9, col: [7, 13], color: '#8a5f3c', accent: '#e8dcb5',
    shape: 'boar', aggro: 70, leash: 190, poise: 22, attacks: [lunge(0.55, 62, 1)], drops: [{ item: 'hide', chance: 0.6 }],
  },
  wasp: {
    id: 'wasp', name: M.wasp, level: 2, hp: 34, atk: 11, def: 0, speed: 76, radius: 6, xp: 12, col: [8, 14], color: '#f2c94c', accent: '#2a2a2a',
    shape: 'wasp', aggro: 90, leash: 200, poise: 14, flying: true, attacks: [lunge(0.35, 56, 1, 260), { kind: 'shoot', windup: 0.5, recover: 0.8, range: 110, mul: 0.7, speed: 120 }],
    drops: [{ item: 'sting', chance: 0.45 }],
  },
  scarhide: {
    id: 'scarhide', name: M.scarhide, level: 3, hp: 210, atk: 20, def: 3, speed: 66, radius: 10, xp: 90, col: [90, 120], color: '#5a3b26', accent: '#d9d0b8',
    shape: 'boar', aggro: 110, leash: 260, poise: 70, unique: true, size: 1.5,
    attacks: [lunge(0.6, 90, 1.1, 260), { kind: 'slam', windup: 0.8, recover: 0.9, range: 50, mul: 0.9, radius: 42 }],
    drops: [{ item: 'hide', chance: 1, n: 2 }, { item: 'potion', chance: 1, n: 2 }],
  },
  wolf: {
    id: 'wolf', name: M.wolf, level: 4, hp: 88, atk: 18, def: 2, speed: 86, radius: 7, xp: 22, col: [12, 20], color: '#7d8590', accent: '#e8edf5',
    shape: 'wolf', aggro: 100, leash: 240, poise: 28, pack: true, attacks: [lunge(0.4, 70, 1, 270)], drops: [{ item: 'pelt', chance: 0.5 }],
  },
  bulbmaw: {
    id: 'bulbmaw', name: M.bulbmaw, level: 4, hp: 115, atk: 20, def: 2, speed: 0, radius: 8, xp: 24, col: [10, 18], color: '#4f8f3c', accent: '#d94a6b',
    shape: 'plant', aggro: 95, leash: 100, poise: 40, rooted: true,
    attacks: [{ kind: 'slam', windup: 0.75, recover: 0.8, range: 36, mul: 1, radius: 34 }, { kind: 'shoot', windup: 0.7, recover: 1.0, range: 130, mul: 0.7, speed: 95 }],
    drops: [{ item: 'herb', chance: 0.55 }],
  },
  flowerbulb: {
    id: 'flowerbulb', name: M.flowerbulb, level: 6, hp: 380, atk: 26, def: 4, speed: 0, radius: 11, xp: 140, col: [60, 80], color: '#58a447', accent: '#fff2a8',
    shape: 'plant', aggro: 120, leash: 140, poise: 90, rooted: true, unique: true, size: 1.6,
    attacks: [{ kind: 'slam', windup: 0.8, recover: 0.9, range: 46, mul: 1, radius: 44 }, { kind: 'fan', windup: 0.8, recover: 1.1, range: 150, mul: 0.6, speed: 95, count: 5 }],
    drops: [{ item: 'petal', chance: 1 }],
  },
  grunt: {
    id: 'grunt', name: M.grunt, level: 7, hp: 150, atk: 26, def: 6, speed: 64, radius: 8, xp: 36, col: [16, 26], color: '#6b8a4e', accent: '#c9b27a',
    shape: 'gnarl', aggro: 95, leash: 220, poise: 40, pack: true, attacks: [melee(0.5, 30, 1, 1.7), lunge(0.6, 70, 0.9, 200)], drops: [{ item: 'fang', chance: 0.3 }, { item: 'potion', chance: 0.06 }],
  },
  archer: {
    id: 'archer', name: M.archer, level: 7, hp: 95, atk: 23, def: 3, speed: 60, radius: 7, xp: 38, col: [16, 26], color: '#7a8f55', accent: '#b5885a',
    shape: 'archer', aggro: 150, leash: 240, poise: 22, keepAway: 90, attacks: [{ kind: 'shoot', windup: 0.65, recover: 0.9, range: 150, mul: 1, speed: 170 }], drops: [{ item: 'fang', chance: 0.3 }],
  },
  shaman: {
    id: 'shaman', name: M.shaman, level: 8, hp: 105, atk: 26, def: 3, speed: 58, radius: 7, xp: 46, col: [20, 32], color: '#5c7d6e', accent: '#b07cff',
    shape: 'shaman', aggro: 150, leash: 240, poise: 22, keepAway: 100,
    attacks: [{ kind: 'slam', windup: 1.0, recover: 1.0, range: 140, mul: 1.1, radius: 34 }], drops: [{ item: 'fang', chance: 0.35 }, { item: 'crystal', chance: 0.04 }],
  },
  warchief: {
    id: 'warchief', name: M.warchief, level: 10, hp: 980, atk: 34, def: 10, speed: 60, radius: 12, xp: 320, col: [260, 320], color: '#4a6b3a', accent: '#d9a441',
    shape: 'chief', aggro: 160, leash: 360, poise: 160, unique: true, boss: true, size: 1.7,
    attacks: [melee(0.6, 44, 1.1, 1.9), lunge(0.85, 120, 1.2, 280), { kind: 'slam', windup: 0.9, recover: 1.0, range: 70, mul: 1, radius: 62 }],
    drops: [{ item: 'map', chance: 1 }, { item: 'crystal', chance: 1 }],
  },
  guard: {
    id: 'guard', name: M.guard, level: 10, hp: 270, atk: 32, def: 12, speed: 68, radius: 9, xp: 70, col: [30, 44], color: '#55604e', accent: '#c4553a',
    shape: 'gnarl', aggro: 120, leash: 280, poise: 60, size: 1.15, attacks: [melee(0.5, 32, 1, 1.8), lunge(0.55, 80, 1, 250)], drops: [{ item: 'fang', chance: 0.25 }, { item: 'potion', chance: 0.12 }],
  },
  korrath: {
    id: 'korrath', name: M.korrath, level: 12, hp: 12000, atk: 44, def: 14, speed: 56, radius: 15, xp: 1500, col: [900, 900], color: '#3b3f4a', accent: '#e0653a',
    shape: 'boss', aggro: 400, leash: 800, poise: 100000, unique: true, boss: true, size: 2.2,
    attacks: [
      { kind: 'melee', windup: 0.7, recover: 0.7, range: 58, mul: 1.0, arc: 2.0, maxPhase: 3 },
      { kind: 'lunge', windup: 0.9, recover: 0.9, range: 170, mul: 1.1, speed: 300, maxPhase: 3 },
      { kind: 'slam', windup: 1.1, recover: 1.0, range: 90, mul: 1.1, radius: 70, minPhase: 2 },
      { kind: 'fan', windup: 1.0, recover: 1.0, range: 220, mul: 0.7, speed: 110, count: 7, minPhase: 3, maxPhase: 3 },
      { kind: 'combo', windup: 0.55, recover: 0.8, range: 70, mul: 0.9, count: 3, arc: 2.4, minPhase: 4 },
      { kind: 'leap', windup: 0.9, recover: 0.9, range: 220, mul: 1.3, radius: 64, minPhase: 4 },
      { kind: 'lunge', windup: 0.5, recover: 0.7, range: 150, mul: 1.1, speed: 360, minPhase: 4 },
    ],
    drops: [{ item: 'crystal', chance: 1, n: 3 }],
  },
  rival: {
    id: 'rival', name: M.rival, level: 6, hp: 260, atk: 22, def: 6, speed: 78, radius: 7, xp: 120, col: [150, 150], color: '#6a3a3a', accent: '#d8d8e8',
    shape: 'human', aggro: 160, leash: 400, poise: 60, unique: true, attacks: [melee(0.4, 30, 1, 1.6), lunge(0.5, 90, 1.3, 300)], drops: [{ item: 'petal', chance: 0 }],
  },
  duelist: {
    id: 'duelist', name: M.duelist, level: 4, hp: 170, atk: 16, def: 4, speed: 72, radius: 7, xp: 60, col: [0, 0], color: '#3a5a8a', accent: '#f2f2f2',
    shape: 'human', aggro: 200, leash: 600, poise: 50, unique: true, attacks: [melee(0.45, 30, 1, 1.6), lunge(0.55, 80, 1.1, 280)], drops: [],
  },
};

export const mobXpMul = 1;
