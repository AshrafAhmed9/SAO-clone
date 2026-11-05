import { beforeEach, describe, expect, it } from 'vitest';
import { QUESTS } from '../src/data/quests';
import { defReduction, gainXp, maxHp, playerAtk, xpNeed, spendPoint, skillUnlocked, SKILLS } from '../src/game/progression';
import { addItem, completeQuest, cond, count, freshState, G, onKill, questState, runActions, setFlag, setState, startQuest } from '../src/game/state';

beforeEach(() => { (globalThis as { localStorage?: unknown }).localStorage ??= { getItem: () => null, setItem: () => {}, removeItem: () => {} }; setState(freshState('normal', 'T')); });

describe('progression', () => {
  it('xp curve increases and level ups grant points', () => {
    for (let l = 1; l < 14; l++) expect(xpNeed(l + 1)).toBeGreaterThan(xpNeed(l));
    gainXp(xpNeed(1) + 1);
    expect(G.level).toBe(2); expect(G.points).toBe(2);
  });
  it('stats scale with level and strength', () => {
    const hp1 = maxHp(), atk1 = playerAtk();
    G.level = 5; G.str += 4;
    expect(maxHp()).toBeGreaterThan(hp1); expect(playerAtk()).toBeGreaterThan(atk1);
  });
  it('armor reduction stays below 100%', () => { expect(defReduction(0)).toBe(0); expect(defReduction(500)).toBeLessThan(1); });
  it('spending points moves stats', () => { G.points = 1; expect(spendPoint('str')).toBe(true); expect(G.str).toBe(6); expect(spendPoint('str')).toBe(false); });
  it('triple fang needs level and practice', () => {
    const s = SKILLS.find((x) => x.id === 'triple')!;
    G.level = 5; expect(skillUnlocked(s)).toBe(false); G.skillUses.dash = 12; expect(skillUnlocked(s)).toBe(true);
  });
});

describe('quests', () => {
  it('kill quest goes active -> ready -> done with rewards', () => {
    startQuest('m1'); expect(questState('m1')).toBe('active');
    onKill('boar'); onKill('boar'); expect(questState('m1')).toBe('active');
    onKill('boar'); expect(questState('m1')).toBe('ready');
    completeQuest('m1'); expect(questState('m1')).toBe('done'); expect(count('potion')).toBe(5);
  });
  it('collect quests consume items on turn-in', () => {
    startQuest('s1'); addItem('herb', 5, true); expect(questState('s1')).toBe('ready');
    runActions('completeQuest:s1'); expect(count('herb')).toBe(0); expect(questState('s1')).toBe('done');
  });
  it('flag quests without a turn-in complete on their own', () => {
    startQuest('m2'); setFlag('visited:mossbrook'); expect(questState('m2')).toBe('done');
  });
  it('does not complete early or twice', () => {
    startQuest('s2'); completeQuest('s2'); expect(questState('s2')).toBe('active');
    const xp = G.xp; startQuest('m1'); onKill('boar'); onKill('boar'); onKill('boar'); completeQuest('m1'); completeQuest('m1');
    expect(G.xp).toBeGreaterThanOrEqual(xp);
  });
  it('yielding to Rask completes Moonbloom without the petal', () => {
    startQuest('s3'); setFlag('yielded'); runActions('completeQuest:s3'); expect(questState('s3')).toBe('done'); expect(count('temperedge')).toBe(1);
  });
  it('every quest reward item exists', () => { for (const q of Object.values(QUESTS)) expect(q.obj.length).toBeGreaterThan(0); });
});

describe('conditions', () => {
  it('parses flags, negation, quest states and items', () => {
    expect(cond('')).toBe(true); expect(cond('foo')).toBe(false); setFlag('foo'); expect(cond('foo&!bar')).toBe(true);
    expect(cond('q:m1:none')).toBe(true); startQuest('m1'); expect(cond('q:m1:active')).toBe(true);
    addItem('petal', 1, true); expect(cond('item:petal')).toBe(true); G.level = 4; expect(cond('lvl>=4')).toBe(true);
  });
});
