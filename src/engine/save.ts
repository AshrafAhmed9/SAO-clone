import { G, setState, type GameState } from '../game/state';
import { W } from '../game/world';

const KEY = 'hf.save.v1';
export function saveGame() {
  if (W.player && W.zone !== 'bossroom') {
    G.zone = W.zone; G.tx = Math.floor(W.player.x / 16); G.ty = Math.floor(W.player.y / 16); G.hp = Math.max(1, Math.round(W.player.hp));
  }
  try { localStorage.setItem(KEY, JSON.stringify(G)); } catch { /* storage unavailable */ }
}
export function hasSave(): boolean {
  try { return !!localStorage.getItem(KEY); } catch { return false; }
}
export function loadGame(): boolean {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return false;
    const s = JSON.parse(raw) as GameState;
    if (!s || typeof s.level !== 'number' || !s.equip) return false;
    setState(s);
    return true;
  } catch { return false; }
}
export function wipeSave() {
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
}
