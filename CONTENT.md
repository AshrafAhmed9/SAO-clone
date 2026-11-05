# Swapping content

All names and text live in data files; code never hard-codes them.

| What | File |
|---|---|
| Names of zones, mobs, items, NPCs, skills, UI strings | `src/data/strings.ts` |
| Dialogue and branching choices | `src/data/dialogue.ts` |
| Quests, objectives, rewards | `src/data/quests.ts` |
| Mob stats, attacks, drops | `src/data/mobs.ts` |
| Items and shops | `src/data/items.ts` |
| Maps, NPC placement, spawns, portals, chests | `src/data/zones.ts` |
| Sprite overrides | drop `public/assets/sprites/<key>.png` (keys: `player`, `npc.<id>`, `mob.<id>`, `ally.<id>`) |

Dialogue conditions: `flag`, `!flag`, `q:<quest>:none|active|ready|done`, `item:<id>`, `lvl>=N`, joined with `&`.
Dialogue actions: `startQuest:id; completeQuest:id; flag:name; giveItem:id:n; shop:id; inn; repair; ...` joined with `;`.

`validateContent()` runs at boot and in `npm test`; a bad reference fails with a readable error.
