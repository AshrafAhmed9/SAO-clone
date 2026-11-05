import { DIALOGUE } from './dialogue';
import { ITEMS, SHOPS } from './items';
import { MOBS } from './mobs';
import { QUESTS } from './quests';
import { isSolid } from './tiles';
import { baseGrid, NPCS, OBJECTS, PORTALS, SPAWNS, ZONES } from './zones';

const ACTIONS = new Set(['startQuest', 'completeQuest', 'flag', 'giveItem', 'shop', 'inn', 'repair', 'duel', 'fightRival', 'joinRaid', 'enterBoss', 'victory', 'buyIntel']);

/** Cross-checks every data file so a bad content swap fails loudly at boot instead of mid-game. */
export function validateContent(): void {
  const errs: string[] = [];
  const bad = (m: string) => errs.push(m);
  const checkActs = (where: string, acts?: string) => {
    if (!acts) return;
    for (const part of acts.split(';')) {
      const [a, x] = part.split(':');
      if (!ACTIONS.has(a)) bad(`${where}: unknown action "${part}"`);
      if ((a === 'startQuest' || a === 'completeQuest') && !QUESTS[x]) bad(`${where}: unknown quest "${x}"`);
      if (a === 'shop' && !SHOPS[x]) bad(`${where}: unknown shop "${x}"`);
      if (a === 'giveItem' && !ITEMS[x]) bad(`${where}: unknown item "${x}"`);
    }
  };
  for (const [id, d] of Object.entries(DIALOGUE)) {
    if (!d.lines.length) bad(`dialogue ${id}: no lines`);
    checkActs(`dialogue ${id}`, d.act);
    for (const ch of d.choices ?? []) {
      if (ch.next && !DIALOGUE[ch.next]) bad(`dialogue ${id}: choice points to missing dialogue "${ch.next}"`);
      checkActs(`dialogue ${id} choice`, ch.act);
    }
  }
  for (const q of Object.values(QUESTS)) {
    for (const o of q.obj) {
      if (o.t === 'kill' && !MOBS[o.target]) bad(`quest ${q.id}: unknown mob "${o.target}"`);
      if (o.t === 'have' && !ITEMS[o.item]) bad(`quest ${q.id}: unknown item "${o.item}"`);
    }
    for (const it of Object.keys(q.reward.items ?? {})) if (!ITEMS[it]) bad(`quest ${q.id}: reward item "${it}" missing`);
    checkActs(`quest ${q.id} onDone`, q.onDone);
  }
  for (const m of Object.values(MOBS)) for (const d of m.drops) if (!ITEMS[d.item]) bad(`mob ${m.id}: drop "${d.item}" missing`);
  for (const [shop, ids] of Object.entries(SHOPS)) for (const i of ids) if (!ITEMS[i]) bad(`shop ${shop}: item "${i}" missing`);
  for (const n of NPCS) {
    const g = baseGrid(n.zone);
    if (!ZONES[n.zone]) { bad(`npc ${n.id}: unknown zone ${n.zone}`); continue; }
    if (isSolid(g[n.ty]?.[n.tx] ?? 19)) bad(`npc ${n.id}: stands inside a solid tile (${n.tx},${n.ty})`);
    for (const t of n.topics) if (!DIALOGUE[t.id]) bad(`npc ${n.id}: missing dialogue "${t.id}"`);
  }
  for (const o of OBJECTS) if (isSolid(baseGrid(o.zone)[o.ty]?.[o.tx] ?? 19)) bad(`object ${o.id}: inside a solid tile`);
  for (const [z, list] of Object.entries(SPAWNS)) for (const s of list) if (!MOBS[s.mob]) bad(`spawns ${z}: unknown mob "${s.mob}"`);
  for (const [z, list] of Object.entries(PORTALS)) for (const p of list) if (!ZONES[p.to]) bad(`portal in ${z}: unknown target ${p.to}`);
  if (errs.length) throw new Error(errs.join('\n'));
}
