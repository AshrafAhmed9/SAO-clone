import { S } from './strings';
import type { ItemDef } from './types';

const n = (id: keyof typeof S.items) => S.items[id][0];
const d = (id: keyof typeof S.items) => S.items[id][1];

export const ITEMS: Record<string, ItemDef> = {
  potion: { id: 'potion', name: n('potion'), desc: d('potion'), kind: 'consumable', price: 40, heal: 70, color: '#e86a7a' },
  crystal: { id: 'crystal', name: n('crystal'), desc: d('crystal'), kind: 'consumable', price: 420, heal: 160, instant: true, color: '#7ad7ff' },
  herb: { id: 'herb', name: n('herb'), desc: d('herb'), kind: 'material', price: 6, color: '#74c365' },
  hide: { id: 'hide', name: n('hide'), desc: d('hide'), kind: 'material', price: 10, color: '#a0724a' },
  pelt: { id: 'pelt', name: n('pelt'), desc: d('pelt'), kind: 'material', price: 18, color: '#b9bfc9' },
  sting: { id: 'sting', name: n('sting'), desc: d('sting'), kind: 'material', price: 12, color: '#f2c94c' },
  fang: { id: 'fang', name: n('fang'), desc: d('fang'), kind: 'material', price: 22, color: '#e8dcb5' },
  petal: { id: 'petal', name: n('petal'), desc: d('petal'), kind: 'key', price: 0, color: '#bde0ff' },
  map: { id: 'map', name: n('map'), desc: d('map'), kind: 'key', price: 0, color: '#e6d3a3' },
  ironblade: { id: 'ironblade', name: n('ironblade'), desc: d('ironblade'), kind: 'weapon', price: 0, atk: 10, dur: 70, color: '#b8bcc8' },
  steelbrand: { id: 'steelbrand', name: n('steelbrand'), desc: d('steelbrand'), kind: 'weapon', price: 650, atk: 17, dur: 90, color: '#d3dcef' },
  gnarlbane: { id: 'gnarlbane', name: n('gnarlbane'), desc: d('gnarlbane'), kind: 'weapon', price: 0, atk: 20, dur: 80, agi: 3, color: '#9fe0b0' },
  temperedge: { id: 'temperedge', name: n('temperedge'), desc: d('temperedge'), kind: 'weapon', price: 0, atk: 23, dur: 120, color: '#ffd9a0' },
  leather: { id: 'leather', name: n('leather'), desc: d('leather'), kind: 'armor', price: 70, def: 4, color: '#8a5a33' },
  padded: { id: 'padded', name: n('padded'), desc: d('padded'), kind: 'armor', price: 240, def: 9, color: '#8c7aa8' },
  scale: { id: 'scale', name: n('scale'), desc: d('scale'), kind: 'armor', price: 950, def: 15, agi: -1, color: '#7e8794' },
  cloak: { id: 'cloak', name: n('cloak'), desc: d('cloak'), kind: 'armor', price: 0, def: 7, hp: 30, color: '#b86a4a' },
  midnight: { id: 'midnight', name: n('midnight'), desc: d('midnight'), kind: 'armor', price: 0, def: 20, agi: 3, hp: 40, color: '#2b2f66' },
  roguering: { id: 'roguering', name: n('roguering'), desc: d('roguering'), kind: 'accessory', price: 0, agi: 3, crit: 4, color: '#e0b64a' },
  huntercharm: { id: 'huntercharm', name: n('huntercharm'), desc: d('huntercharm'), kind: 'accessory', price: 0, str: 3, color: '#e9e2cf' },
  moonpendant: { id: 'moonpendant', name: n('moonpendant'), desc: d('moonpendant'), kind: 'accessory', price: 0, hp: 50, color: '#cfe3ff' },
};

export const SHOPS: Record<string, string[]> = {
  tilda: ['potion', 'crystal', 'leather'],
  brund: ['ironblade', 'leather', 'padded'],
  orla: ['potion', 'crystal', 'steelbrand', 'padded', 'scale'],
};

export const sellValue = (it: ItemDef) => Math.max(1, Math.floor((it.price || 20) * 0.4));
