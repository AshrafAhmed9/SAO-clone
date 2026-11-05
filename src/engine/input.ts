export type Action =
  | 'up' | 'down' | 'left' | 'right'
  | 'attack' | 'block' | 'dodge'
  | 'skill1' | 'skill2' | 'skill3' | 'skill4'
  | 'switch' | 'interact' | 'potion' | 'crystal'
  | 'menu' | 'map' | 'pause' | 'confirm' | 'cancel';

export const ACTIONS: Action[] = [
  'up', 'down', 'left', 'right', 'attack', 'block', 'dodge',
  'skill1', 'skill2', 'skill3', 'skill4', 'switch', 'interact', 'potion', 'crystal',
  'menu', 'map', 'pause', 'confirm', 'cancel',
];

export const DEFAULT_BINDINGS: Record<Action, string[]> = {
  up: ['KeyW', 'ArrowUp'], down: ['KeyS', 'ArrowDown'], left: ['KeyA', 'ArrowLeft'], right: ['KeyD', 'ArrowRight'],
  attack: ['KeyJ', 'Space'], block: ['KeyK'], dodge: ['KeyL', 'ShiftLeft'],
  skill1: ['Digit1'], skill2: ['Digit2'], skill3: ['Digit3'], skill4: ['Digit4'],
  switch: ['KeyQ'], interact: ['KeyE'], potion: ['KeyR'], crystal: ['KeyF'],
  menu: ['Tab', 'KeyI'], map: ['KeyM'], pause: ['Escape'], confirm: ['Enter', 'KeyE', 'KeyJ', 'Space'], cancel: ['Escape', 'Backspace', 'KeyK'],
};

const BIND_KEY = 'hf.bindings.v1';
let bindings: Record<Action, string[]> = structuredClone(DEFAULT_BINDINGS);
try {
  const raw = localStorage.getItem(BIND_KEY);
  if (raw) bindings = { ...bindings, ...JSON.parse(raw) };
} catch { /* storage unavailable */ }

const heldKeys = new Set<string>();
const tappedKeys = new Set<string>();
let cur = new Set<Action>();
let prev = new Set<Action>();
let tappedActions = new Set<Action>();
let padMove = { x: 0, y: 0 };
let lastKey: string | null = null;
let usingPad = false;

export function initInput(target: HTMLElement) {
  window.addEventListener('keydown', (e) => {
    if (['Space', 'Tab', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
    if (!e.repeat) { tappedKeys.add(e.code); lastKey = e.code; }
    heldKeys.add(e.code);
    usingPad = false;
  });
  window.addEventListener('keyup', (e) => heldKeys.delete(e.code));
  window.addEventListener('blur', () => heldKeys.clear());
  target.focus();
}

const PAD_MAP: Partial<Record<Action, number[]>> = {
  attack: [0], dodge: [1], block: [2], interact: [3], switch: [14], potion: [12], crystal: [13],
  skill1: [6], skill2: [7], skill3: [4], skill4: [5], map: [8], menu: [9], pause: [9],
  confirm: [0], cancel: [1],
};

/** Call once per frame before game logic. */
export function pollInput() {
  prev = cur;
  cur = new Set();
  tappedActions = new Set();
  for (const a of ACTIONS) {
    for (const code of bindings[a]) {
      if (heldKeys.has(code)) cur.add(a);
      if (tappedKeys.has(code)) tappedActions.add(a);
    }
  }
  padMove = { x: 0, y: 0 };
  const pad = navigator.getGamepads?.()[0];
  if (pad) {
    const dz = 0.25;
    const ax = Math.abs(pad.axes[0]) > dz ? pad.axes[0] : 0;
    const ay = Math.abs(pad.axes[1]) > dz ? pad.axes[1] : 0;
    padMove = { x: ax, y: ay };
    if (ax || ay) usingPad = true;
    if (ay < -0.6) cur.add('up');
    if (ay > 0.6) cur.add('down');
    if (ax < -0.6) cur.add('left');
    if (ax > 0.6) cur.add('right');
    for (const [a, btns] of Object.entries(PAD_MAP) as [Action, number[]][]) {
      if (btns.some((b) => pad.buttons[b]?.pressed)) { cur.add(a); usingPad = true; }
    }
  }
  tappedKeys.clear();
}

export const down = (a: Action) => cur.has(a);
export const pressed = (a: Action) => tappedActions.has(a) || (cur.has(a) && !prev.has(a));
export const usingGamepad = () => usingPad;

export function moveVec(): { x: number; y: number } {
  let x = (down('right') ? 1 : 0) - (down('left') ? 1 : 0);
  let y = (down('down') ? 1 : 0) - (down('up') ? 1 : 0);
  if (padMove.x || padMove.y) { x = padMove.x; y = padMove.y; }
  const m = Math.hypot(x, y);
  if (m > 1) { x /= m; y /= m; }
  return { x, y };
}

/** Drain one raw key press for the remap screen. */
export function takeLastKey(): string | null { const k = lastKey; lastKey = null; return k; }

export function keyLabel(code: string): string {
  const arrows: Record<string, string> = { ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→' };
  if (arrows[code]) return arrows[code];
  return code.replace('Key', '').replace('Digit', '').replace('ShiftLeft', 'Shift').replace('Escape', 'Esc');
}
export const bindingLabel = (a: Action) => bindings[a].map(keyLabel).slice(0, 1).join('/');
export function getBindings() { return bindings; }
export function setBinding(a: Action, code: string) {
  bindings[a] = [code, ...bindings[a].filter((c) => c !== code).slice(0, 1)];
  try { localStorage.setItem(BIND_KEY, JSON.stringify(bindings)); } catch { /* ignore */ }
}
export function resetBindings() {
  bindings = structuredClone(DEFAULT_BINDINGS);
  try { localStorage.removeItem(BIND_KEY); } catch { /* ignore */ }
}
