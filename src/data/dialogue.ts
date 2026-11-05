import { S } from './strings';
import type { Dialogue } from './types';

const N = S.names;
const l = (who: string, text: string) => ({ who, text });

export const DIALOGUE: Record<string, Dialogue> = {
  announce: {
    lines: [
      l(N.warden, 'Welcome to the Spire, players. I am the Warden.'),
      l(N.warden, 'You may have noticed the logout button is gone. This is not a malfunction.'),
      l(N.warden, 'You will not be able to leave on your own. If you try to remove the headgear from outside, it will end your life.'),
      l(N.warden, 'There is exactly one way out. Clear all one hundred floors of the Spire.'),
      l(N.warden, 'And there are no second chances. When your HP reaches zero, your avatar is deleted, and so are you.'),
      l(N.warden, 'That is all. I wish you luck.'),
    ],
  },

  // ---- Firstlight ----
  'ordan.intro': {
    lines: [
      l(N.ordan, 'Hey. You. Stop staring at the sky and look at me.'),
      l(N.ordan, 'I played the closed beta. I know how this place works, and I know people are going to panic. Don\'t.'),
      l(N.ordan, 'Rule one: the town is safe. Rule two: everything outside it is trying to kill you, so learn to dodge.'),
      l(N.ordan, 'Move with WASD. Attack with J: three presses chains a combo. Hold K to block, and tap it just before a hit lands to parry. L rolls, and you cannot be hurt for the first part of the roll.'),
      l(N.ordan, 'Number keys fire Sword Skills. You wind up, the System takes over and drives your body through the move. Then you stand there, stiff, for half a second. Do not use one when a second enemy is nearby.'),
      l(N.ordan, 'Go to the plains east of here and take down three Frenzy Boars. Come back alive and I\'ll tell you what\'s next.'),
    ],
    act: 'flag:met_ordan;startQuest:m1',
  },
  'ordan.reminder': {
    lines: [l(N.ordan, 'Three Frenzy Boars on the plains. East gate. Block, roll, then hit them.')],
  },
  'ordan.turnin': {
    lines: [
      l(N.ordan, 'You\'re still here. Good. That puts you ahead of about half the plaza.'),
      l(N.ordan, 'Listen. This town will be empty in a week. The ones who survive will move north to a village called Mossbrook. Go through the plains and Thornwood.'),
      l(N.ordan, 'Wolves in the woods. Don\'t fight them in the open. Keep your back to a tree.'),
    ],
    act: 'completeQuest:m1;startQuest:m2',
  },
  'ordan.after': {
    lines: [l(N.ordan, 'Still training? Good. Keep moving north when you\'re ready.')],
  },
  'brund.talk': {
    lines: [l(N.brund, 'Smith\'s open. Swords, vests, and I fix what you break.')],
    choices: [
      { text: 'Browse wares', act: 'shop:brund' },
      { text: 'Repair my weapon', act: 'repair' },
      { text: 'Leave' },
    ],
  },
  'tilda.offer': {
    lines: [
      l(N.tilda, 'Oh good, a customer who isn\'t screaming. Listen, I\'m out of Meadow Herbs. Five, if you can spare the time.'),
      l(N.tilda, 'They grow on the plains. Bulbmaws drop them too, though I wouldn\'t go looking for those.'),
    ],
    choices: [{ text: 'I\'ll bring them', act: 'startQuest:s1' }, { text: 'Not now' }],
  },
  'tilda.turnin': {
    lines: [l(N.tilda, 'That\'s five! You\'re a lifesaver. Literally. Here, take a few of the first batch.')],
    act: 'completeQuest:s1',
  },
  'tilda.shop': {
    lines: [l(N.tilda, 'Draughts, crystals, whatever else I\'ve got. What can I get you?')],
    choices: [{ text: 'Browse wares', act: 'shop:tilda' }, { text: 'Leave' }],
  },
  'mara.inn': {
    lines: [l(N.mara, 'Beds are 20 Col a night. It saves your progress and patches you up. No one has died in my inn yet. I\'d like to keep it that way.')],
    choices: [{ text: 'Rest (20 Col)', act: 'inn' }, { text: 'Leave' }],
  },
  'mirel.offer': {
    lines: [
      l(N.mirel, 'You look like someone who pokes around corners. Good. I have a tip.'),
      l(N.mirel, 'Three chests on this floor that are on no one\'s map. One on the plains, tucked behind rocks. One in the deep woods, where the grove is. One in the labyrinth. Find all three and I\'ll give you something.'),
    ],
    choices: [{ text: 'Sounds fun', act: 'startQuest:s6' }, { text: 'Maybe later' }],
  },
  'mirel.wait': { lines: [l(N.mirel, 'Plains, grove, labyrinth. Keep looking. They\'re worth it.')] },
  'mirel.done': { lines: [l(N.mirel, 'You found all three! My knees thank you for not making me walk there.')], act: 'completeQuest:s6' },
  'jarro.offer': {
    lines: [
      l(N.jarro, 'Everyone\'s hiding. I want to know where I stand. Fight me. We stop at one fifth health, no killing.'),
    ],
    choices: [{ text: 'Fine. Let\'s do it', act: 'startQuest:s7;duel' }, { text: 'No thanks' }],
  },
  'jarro.won': { lines: [l(N.jarro, 'Okay. You\'re better than me. Not by much. Here\'s the stake.')], act: 'completeQuest:s7' },
  'jarro.after': { lines: [l(N.jarro, 'Still thinking about that last exchange. I\'ll beat you someday.')] },
  'jarro.retry': {
    lines: [l(N.jarro, 'Want another go?')],
    choices: [{ text: 'Yes', act: 'duel' }, { text: 'Not yet' }],
  },
  'crowd.panic': {
    lines: [l('Player', 'I want to log out! There has to be a way!')],
  },
  'crowd.panic2': { lines: [l('Player', 'My parents will call the police. They\'ll shut it down. They have to.')] },
  'crowd.panic3': { lines: [l('Player', 'Don\'t go outside. You saw what the Warden said. Don\'t.')] },
  'crowd.calm': { lines: [l('Player', 'Ordan\'s group left for the north. I\'m going to follow them once I buy a few potions.')] },
  'crowd.calm2': { lines: [l('Player', 'First day I couldn\'t move. Now I\'ve killed seven boars. Funny how fast you adjust.')] },
  'crowd.gate': { lines: [l('Player', 'The teleport gate is locked. Maybe it unlocks when the first boss falls.')] },

  // ---- Mossbrook ----
  'veyra.first': {
    lines: [
      l(N.veyra, 'You came up from Firstlight. Alone, by the look of it. That takes nerve, or stupidity.'),
      l(N.veyra, 'I\'m Veyra. I\'m trying to organise the first real push. Scouts found a labyrinth east of here. The boss door will be at the bottom.'),
      l(N.veyra, 'I need someone to clear a path. Find the door and kill whatever guards the second level. A Gnarl Warchief, they say. Can you do it?'),
    ],
    choices: [{ text: 'I\'ll go', act: 'startQuest:m3' }, { text: 'Let me prepare first' }],
  },
  'veyra.reminder': {
    lines: [l(N.veyra, 'Labyrinth is east of the village. Warchief on the second level. Boss door at the bottom of the third. Don\'t take risks you can\'t undo.')],
  },
  'veyra.turnin': {
    lines: [
      l(N.veyra, 'You found it, and the Warchief is dead. The scouts will want that map. Thank you.'),
      l(N.veyra, 'Come to the plaza at dusk. We\'re holding a meeting on how to take the boss. I want you at it.'),
    ],
    act: 'completeQuest:m3;startQuest:m4',
  },
  'veyra.meeting': {
    lines: [
      l(N.veyra, 'Good. Everyone who\'s coming is here. Listen up.'),
      l(N.veyra, 'The labyrinth has three levels. We cleared the first two. The boss door sits at the bottom of the third. Scouts have heard the boss has four health bars and an axe.'),
      l(N.veyra, 'We go in as a raid. Parties of three, one tank at the front, one flank, one finishing. When the boss staggers, someone Switches in and the rest fall back.'),
      l(N.hobb, 'I\'ll take the front. I\'ve got the shield and I\'m too stubborn to die.'),
      l(N.iselle, 'Spear. I can hit it from behind your shield without getting hit myself.'),
      l(N.dov, 'Scout and rogue. I\'ll flank, and I\'ll tell you when it winds up.'),
      l(N.veyra, 'You, the one who cleared the labyrinth. Fight with them. Are you in?'),
    ],
    choices: [{ text: 'I\'m in', act: 'joinRaid' }, { text: 'Not yet' }],
  },
  'veyra.joined': {
    lines: [l(N.veyra, 'Take your time. When you\'re ready, use the Raid Gate at the edge of the village and we march.')],
  },
  'veyra.after': { lines: [l(N.veyra, 'We can only go up. Thank you for coming back.')] },
  'fenn.offer': {
    lines: [
      l(N.fenn, 'Looking for secrets? I sell them. Boss intel costs 250 Col. Or you can bring me four Gnarling Fangs and I\'ll consider it a trade.'),
    ],
    choices: [
      { text: 'Buy intel (250 Col)', act: 'buyIntel', when: '!intel' },
      { text: 'Offer fangs', act: 'startQuest:s5', when: 'q:s5:none' },
      { text: 'Leave' },
    ],
  },
  'fenn.turnin': { lines: [l(N.fenn, 'Four fangs. Good ones. Fine. Deal\'s a deal. Here\'s my ring and my notes.')], act: 'completeQuest:s5' },
  'fenn.intel': {
    lines: [
      l(N.fenn, 'Okay. What I know: it has four health bars. First three, it swings an axe, charges, slams the ground and throws a fan of axes.'),
      l(N.fenn, 'Fourth bar, I\'m not sure. I wasn\'t beta when they added it. Be ready for anything.'),
    ],
  },
  'fenn.after': { lines: [l(N.fenn, 'Already told you everything I know. If something changes, I\'ll find out first.')] },
  'edda.offer': {
    lines: [
      l(N.edda, 'My boy Pip has a fever the potions don\'t touch. The healer said a Moonbloom petal. They grow on a plant in Thornwood.'),
      l(N.edda, 'The Flowering Bulbmaw. It\'s deep in the woods, past a hidden path. Please.'),
    ],
    choices: [{ text: 'I\'ll find it', act: 'startQuest:s3' }, { text: 'I need to prepare' }],
  },
  'edda.wait': { lines: [l(N.edda, 'Please hurry. He\'s getting weaker.')] },
  'edda.turnin': { lines: [l(N.edda, 'You found it. Oh, thank you. Here, it was his father\'s sword. He would want you to have it.')], act: 'completeQuest:s3' },
  'edda.yielded': {
    lines: [
      l(N.edda, 'Rask came by earlier. He had a petal. He said you let him take the Bulbmaw alone.'),
      l(N.edda, 'He brought the petal here himself and wouldn\'t take a coin. Pip is already sleeping easy. I don\'t have a sword to give. Take this cloak. It\'s warm.'),
    ],
    act: 'completeQuest:s3',
  },
  'edda.after': { lines: [l(N.edda, 'Pip is up and eating. Thank you.')] },
  'pip.talk': { lines: [l(N.pip, 'Mum says I\'m not allowed out until I\'m better. Are you a swordsman?')] },
  'hale.offer': {
    lines: [l(N.hale, 'Bounty board\'s empty because I haven\'t had time to write it up. Gale Wolves, five pelts. Pay is good.')],
    choices: [{ text: 'Accept the bounty', act: 'startQuest:s2' }, { text: 'Leave' }],
  },
  'hale.wait': { lines: [l(N.hale, 'Wolves are on the road to Thornwood. Five pelts.')] },
  'hale.turnin': { lines: [l(N.hale, 'Five pelts! That\'s good work. The road will be a bit safer.')], act: 'completeQuest:s2' },
  'hale.after': { lines: [l(N.hale, 'Nothing else on the board for now.')] },
  'nessa.offer': {
    lines: [l(N.nessa, 'My brother Cael went into Thornwood two days ago. He\'s not strong. Please, I can\'t go myself.')],
    choices: [{ text: 'I\'ll look for him', act: 'startQuest:s4' }, { text: 'Sorry' }],
  },
  'nessa.wait': { lines: [l(N.nessa, 'Southwest, maybe? He liked quiet spots.')] },
  'nessa.turnin': { lines: [l(N.nessa, 'You found him. He\'s safe? Thank you. Take this. It was our mother\'s.')], act: 'completeQuest:s4' },
  'nessa.after': { lines: [l(N.nessa, 'Cael has been hiding in his room since. He\'s alive. That\'s what matters.')] },
  'gerrin.inn': {
    lines: [l(N.gerrin, 'Room for the night? 20 Col. Saves your game and heals you.')],
    choices: [{ text: 'Rest (20 Col)', act: 'inn' }, { text: 'Leave' }],
  },
  'orla.talk': {
    lines: [l(N.orla, 'I sell and mend. Steel, scale, whatever Firstlight couldn\'t spare.')],
    choices: [{ text: 'Browse wares', act: 'shop:orla' }, { text: 'Repair my weapon', act: 'repair' }, { text: 'Leave' }],
  },
  'party.hobb': { lines: [l(N.hobb, 'Shield\'s polished. Let\'s get this over with.')] },
  'party.iselle': { lines: [l(N.iselle, 'If it comes to a fight, I\'ll be behind Hobb. Don\'t stand in front of me.')] },
  'party.dov': { lines: [l(N.dov, 'I counted the boss\'s patterns from the scout\'s notes. It repeats every fourth move.')] },
  'villager.1': { lines: [l('Villager', 'Mossbrook has fewer rules than Firstlight. Fewer crowds, too.')] },
  'villager.2': { lines: [l('Villager', 'The raid is the talk of the village. Half of us want to go. The other half want to hide.')] },

  // ---- Thornwood ----
  'rask.first': {
    lines: [
      l(N.rask, 'Stop. That Bulbmaw is mine. I\'ve been watching it for a day. Back off.'),
      l(N.rask, 'I need the Moonbloom petal for someone who\'s sick. Same as you, probably.'),
    ],
    choices: [
      { text: 'I need it for a boy named Pip', next: 'rask.pip' },
      { text: 'Then fight me for it', act: 'fightRival' },
      { text: 'Take it. I\'ll find another way.', next: 'rask.yield' },
    ],
  },
  'rask.pip': {
    lines: [
      l(N.rask, 'Pip? Edda\'s boy. Hells. I... I\'m after it for my sister. She\'s in the village with the same fever.'),
      l(N.rask, 'Two sick, one petal. One of us walks away without it. I won\'t flinch if you want to settle it with swords.'),
    ],
    choices: [{ text: 'Then let\'s settle it', act: 'fightRival' }, { text: 'You take it. Pip will find another way.', next: 'rask.yield' }],
  },
  'rask.yield': {
    lines: [
      l(N.rask, '...You\'d walk away from it? Just like that?'),
      l(N.rask, 'Fine. One flower has two petals. I\'ll cut it down myself, bring one to Pip, and keep the other for my sister. You have my word.'),
      l(N.rask, 'Go home. I owe you.'),
    ],
    act: 'flag:yielded',
  },
  'rask.wait': { lines: [l(N.rask, 'The plant first. Then talk.')] },
  'rask.won': {
    lines: [l(N.rask, 'You\'re faster than I thought. The Bulbmaw is yours. I hope your boy lives. I\'ll find another way.')],
    act: 'flag:raskBeaten',
  },
  'rask.after': { lines: [l(N.rask, 'Go on. Tell Edda hello for me.')] },
  'rask.stole': { lines: [l(N.rask, 'You took it anyway. Well. I hope the boy lives.')] },
  'cael.found': {
    lines: [
      l(N.cael, 'You\'re a player! Wolves chased me in here three days ago and I couldn\'t get past them.'),
      l(N.cael, 'My sister sent you? Tell her I\'m sorry. I\'ll walk back as soon as the wolves are gone.'),
    ],
    act: 'flag:foundCael',
  },
  'cael.after': { lines: [l(N.cael, 'Tell Nessa I\'m okay. I\'ll be home soon.')] },

  // ---- Labyrinth ----
  'tablet.read': {
    lines: [l('Tablet', 'The sun rises in the east, crosses the south, and sets in the west. Honour its path.')],
  },
  'bossdoor.sealed': {
    lines: [l('Narrator', 'A huge double door, carved with a horned silhouette. It hums faintly.')],
    act: 'flag:bossDoorFound',
  },
  'bossdoor.open': {
    lines: [l(N.veyra, 'This is it. Everyone ready? Remember: tank in front, Switch on stagger, and don\'t chase the boss when it retreats.')],
    act: 'enterBoss',
  },

  // ---- Boss ----
  'boss.intro': {
    lines: [
      l(N.veyra, 'There! Spread out! Hobb, front! Iselle, behind him!'),
      l(S.mobs.korrath, 'You dare walk into my hall, little ones?'),
    ],
  },
  'boss.phase4': {
    lines: [
      l(N.dov, 'Wait. The scouts said four bars and an axe. That isn\'t an axe.'),
      l(N.veyra, 'It\'s changing weapons! Fall back! Wait for my command!'),
    ],
  },
  'boss.leader': {
    lines: [
      l(N.veyra, 'Get back, all of you! It\'s mine!'),
    ],
  },
  'boss.after': {
    lines: [
      l(N.hobb, 'It\'s over. It\'s... dead. We did it.'),
      l(N.iselle, 'Veyra. She went first. We should have stopped her.'),
      l(N.dov, 'The gate is open. Stairs to the second floor. We keep climbing.'),
    ],
    act: 'victory',
  },
};

export const BARK = {
  switch: ['Switch!', 'Switch now!', 'Go!'],
  hit: ['Take that!', 'Got it!'],
  low: ['I need a heal!', 'Pulling back!'],
  die: ['No...'],
};
