import { S } from './strings';
import type { QuestDef } from './types';

const N = S.names;
const M = S.mobs;

export const QUESTS: Record<string, QuestDef> = {
  m1: {
    id: 'm1', main: true, name: 'First Blood', giver: 'ordan', turnIn: 'ordan',
    summary: 'No one is coming to save us. Learn to fight outside the walls before the food runs out.',
    obj: [{ t: 'kill', target: 'boar', n: 3, text: `Defeat ${M.boar}s on ${S.zones.plains}` }],
    reward: { xp: 70, col: 120, items: { potion: 3 } },
  },
  m2: {
    id: 'm2', main: true, name: 'The Road to Mossbrook', giver: 'ordan',
    summary: 'Firstlight is overcrowded. The frontline players have moved north. Follow the road through the plains and Thornwood.',
    obj: [{ t: 'flag', flag: 'visited:mossbrook', text: `Reach ${S.zones.mossbrook}` }],
    reward: { xp: 200, col: 200 },
  },
  m3: {
    id: 'm3', main: true, name: 'Into the Labyrinth', giver: N.veyra.toLowerCase(), turnIn: 'veyra',
    summary: 'Scouts found the labyrinth east of Mossbrook. Clear a path to the boss door.',
    obj: [
      { t: 'kill', target: 'warchief', n: 1, text: `Defeat ${M.warchief}` },
      { t: 'flag', flag: 'bossDoorFound', text: 'Find the boss door' },
    ],
    reward: { xp: 600, col: 400, items: { crystal: 1 } },
  },
  m4: {
    id: 'm4', main: true, name: 'Raid Meeting', giver: 'veyra',
    summary: 'Veyra is organising a raid on the floor boss. Attend the meeting in Mossbrook and decide where you stand.',
    obj: [{ t: 'flag', flag: 'raid', text: 'Join the raid party' }],
    reward: { xp: 150, col: 100, items: { potion: 4 } },
  },
  m5: {
    id: 'm5', main: true, name: 'The Floor Boss', giver: 'veyra',
    summary: 'March to the boss door and bring the floor guardian down.',
    obj: [{ t: 'kill', target: 'korrath', n: 1, text: `Defeat ${M.korrath}` }],
    reward: { xp: 0, col: 0 },
  },
  s1: {
    id: 's1', name: 'Herb Gathering', giver: 'tilda', turnIn: 'tilda',
    summary: 'Tilda needs Meadow Herbs for her potions. They grow wild on the plains and Bulbmaws drop them.',
    obj: [{ t: 'have', item: 'herb', n: 5, text: `Collect ${S.items.herb[0]}s`, take: true }],
    reward: { xp: 60, col: 80, items: { potion: 4 } },
  },
  s2: {
    id: 's2', name: 'Wolf Bounty', giver: 'hale', turnIn: 'hale',
    summary: 'Gale Wolves are picking off travellers on the Thornwood road. Hale pays per pelt.',
    obj: [{ t: 'have', item: 'pelt', n: 5, text: `Bring ${S.items.pelt[0]}s`, take: true }],
    reward: { xp: 180, col: 260, items: { padded: 1 } },
  },
  s3: {
    id: 's3', name: 'Moonbloom', giver: 'edda', turnIn: 'edda',
    summary: 'Edda\'s son Pip has a wasting fever. The only cure is a Moonbloom petal from the Flowering Bulbmaw deep in Thornwood.',
    obj: [{ t: 'have', item: 'petal', n: 1, text: `Obtain a ${S.items.petal[0]}`, take: true }],
    reward: { xp: 320, col: 150, items: { temperedge: 1 } },
  },
  s4: {
    id: 's4', name: 'Lost in Thornwood', giver: 'nessa', turnIn: 'nessa',
    summary: 'Nessa\'s brother Cael went into Thornwood and never came back.',
    obj: [{ t: 'flag', flag: 'foundCael', text: `Find ${N.cael} in Thornwood` }],
    reward: { xp: 240, col: 120, items: { moonpendant: 1 } },
  },
  s5: {
    id: 's5', name: 'Fang Collection', giver: 'fenn', turnIn: 'fenn',
    summary: 'Fenn trades in information. He\'ll share what he knows about the boss if you bring him fangs.',
    obj: [{ t: 'have', item: 'fang', n: 4, text: `Collect ${S.items.fang[0]}s`, take: true }],
    reward: { xp: 260, col: 100, items: { roguering: 1 } },
    onDone: 'flag:intel',
  },
  s6: {
    id: 's6', name: 'Three Hidden Chests', giver: 'mirel',
    summary: 'Old Mirel swears there are three chests on this floor that no map shows: one on the plains, one in Thornwood, one in the labyrinth.',
    obj: [
      { t: 'flag', flag: 'chest:plains', text: `Find the chest on ${S.zones.plains}` },
      { t: 'flag', flag: 'chest:grove', text: 'Find the chest in Thornwood' },
      { t: 'flag', flag: 'chest:lab', text: 'Find the chest in the labyrinth' },
    ],
    reward: { xp: 300, col: 300, items: { huntercharm: 1 } },
  },
  s7: {
    id: 's7', name: 'A Fair Fight', giver: 'jarro',
    summary: 'Jarro wants a duel in the plaza. First to drop under a fifth of their health loses. Nobody dies.',
    obj: [{ t: 'flag', flag: 'duelWon', text: `Win the duel against ${N.jarro}` }],
    reward: { xp: 120, col: 300 },
  },
};
