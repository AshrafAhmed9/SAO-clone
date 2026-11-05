export type ItemKind = 'consumable' | 'weapon' | 'armor' | 'accessory' | 'material' | 'key';

export interface ItemDef {
  id: string; name: string; kind: ItemKind; desc: string; price: number; color: string;
  atk?: number; def?: number; dur?: number;
  heal?: number; instant?: boolean;
  str?: number; agi?: number; hp?: number; crit?: number;
}

export type AttackKind = 'melee' | 'lunge' | 'shoot' | 'slam' | 'spin' | 'fan' | 'leap' | 'combo';
export interface AttackDef {
  kind: AttackKind; windup: number; recover: number; range: number; mul: number;
  arc?: number;      // melee arc width in radians
  speed?: number;    // lunge / projectile speed
  radius?: number;   // slam / spin radius
  count?: number;    // projectile count / combo hits
  minPhase?: number; // bosses: first phase this attack is available
  maxPhase?: number;
}
export type Shape = 'boar' | 'wasp' | 'wolf' | 'plant' | 'gnarl' | 'archer' | 'shaman' | 'chief' | 'boss' | 'human';
export interface MobDef {
  id: string; name: string; level: number; hp: number; atk: number; def: number; speed: number;
  radius: number; xp: number; col: [number, number]; color: string; accent: string; shape: Shape;
  aggro: number; leash: number; poise: number; attacks: AttackDef[];
  keepAway?: number; rooted?: boolean; pack?: boolean; unique?: boolean; boss?: boolean; flying?: boolean;
  drops: { item: string; chance: number; n?: number }[];
  size?: number;
}

export interface DLine { who: string; text: string }
export interface Dialogue {
  lines: DLine[];
  choices?: { text: string; next?: string; act?: string; when?: string }[];
  act?: string;
}

export type Objective =
  | { t: 'kill'; target: string; n: number; text: string }
  | { t: 'have'; item: string; n: number; text: string; take?: boolean }
  | { t: 'flag'; flag: string; text: string };
export interface QuestDef {
  id: string; name: string; main?: boolean; summary: string; giver: string; turnIn?: string;
  obj: Objective[];
  reward: { xp: number; col: number; items?: Record<string, number> };
  onDone?: string;
}

export interface NpcDef {
  id: string; name: string; zone: string; tx: number; ty: number;
  look: { hair: string; coat: string; skin?: string; accent?: string };
  topics: { when?: string; id: string }[];
  wander?: number;      // wander radius in tiles (ambient)
  when?: string;        // only present while this condition holds
  player?: boolean;     // draws with the player-style green marker
  facing?: number;
}

export interface SpawnDef { mob: string; tx: number; ty: number; n?: number; spread?: number; respawn?: number; when?: string }
export interface PortalDef { x: number; y: number; w: number; h: number; to: string; sx: number; sy: number; label: string; needs?: string; blocked?: string }
export interface ObjectDef {
  id: string; kind: 'chest' | 'board' | 'herb' | 'door' | 'lever' | 'tablet' | 'gate' | 'march' | 'stairsUp' | 'bed';
  tx: number; ty: number; zone: string; text?: string; loot?: Record<string, number>; col?: number; hidden?: boolean; flag?: string; when?: string;
}

export interface ZoneDef {
  id: string; name: string; music: string; w: number; h: number; weather?: boolean; dark?: number;
  safe?: boolean; theme: 'grass' | 'forest' | 'town' | 'stone';
  build: () => number[][];
  spawn: { tx: number; ty: number };
}
