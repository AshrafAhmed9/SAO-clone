// All sound is synthesized with WebAudio, so the game ships with no audio files.
let ctx: AudioContext | null = null;
let master: GainNode, sfxBus: GainNode, musicBus: GainNode;
export const volume = { music: 0.5, sfx: 0.7, muted: false };
try {
  const v = localStorage.getItem('hf.volume');
  if (v) Object.assign(volume, JSON.parse(v));
} catch { /* ignore */ }

function ensure(): AudioContext | null {
  if (ctx) return ctx;
  try {
    ctx = new AudioContext();
    master = ctx.createGain();
    sfxBus = ctx.createGain();
    musicBus = ctx.createGain();
    sfxBus.connect(master); musicBus.connect(master); master.connect(ctx.destination);
    applyVolume();
  } catch { ctx = null; }
  return ctx;
}
export function applyVolume() {
  if (!ctx) return;
  master.gain.value = volume.muted ? 0 : 1;
  sfxBus.gain.value = volume.sfx;
  musicBus.gain.value = volume.music * 0.45;
  try { localStorage.setItem('hf.volume', JSON.stringify(volume)); } catch { /* ignore */ }
}
export function unlockAudio() {
  const c = ensure();
  if (c && c.state === 'suspended') void c.resume();
}

function tone(freq: number, dur: number, type: OscillatorType, vol: number, opts: { slide?: number; delay?: number; bus?: GainNode } = {}) {
  const c = ensure(); if (!c) return;
  const t0 = c.currentTime + (opts.delay ?? 0);
  const o = c.createOscillator(); const g = c.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t0);
  if (opts.slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq * opts.slide), t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g); g.connect(opts.bus ?? sfxBus);
  o.start(t0); o.stop(t0 + dur + 0.05);
}
let noiseBuf: AudioBuffer | null = null;
function noise(dur: number, vol: number, freq: number, q = 1, delay = 0, type: BiquadFilterType = 'bandpass') {
  const c = ensure(); if (!c) return;
  if (!noiseBuf) {
    noiseBuf = c.createBuffer(1, c.sampleRate, c.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  const t0 = c.currentTime + delay;
  const s = c.createBufferSource(); s.buffer = noiseBuf; s.loop = true;
  const f = c.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
  const g = c.createGain();
  g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  s.connect(f); f.connect(g); g.connect(sfxBus);
  s.start(t0); s.stop(t0 + dur + 0.05);
}

export type Sfx =
  | 'swing' | 'hit' | 'crit' | 'hurt' | 'block' | 'parry' | 'dodge' | 'skill' | 'skillHit' | 'pickup' | 'coin'
  | 'levelup' | 'ui' | 'confirm' | 'die' | 'bell' | 'roar' | 'heal' | 'chest' | 'break' | 'switch' | 'quest' | 'shatter' | 'warn' | 'lever' | 'wrong';

export function sfx(name: Sfx) {
  if (!ensure()) return;
  switch (name) {
    case 'swing': noise(0.12, 0.25, 1800, 0.8); break;
    case 'hit': noise(0.09, 0.5, 900, 1); tone(140, 0.09, 'square', 0.18, { slide: 0.5 }); break;
    case 'crit': noise(0.14, 0.6, 1400, 1); tone(220, 0.16, 'sawtooth', 0.22, { slide: 0.4 }); tone(880, 0.1, 'triangle', 0.15); break;
    case 'hurt': tone(160, 0.2, 'sawtooth', 0.3, { slide: 0.5 }); noise(0.15, 0.3, 500, 1); break;
    case 'block': tone(320, 0.08, 'square', 0.2); noise(0.08, 0.3, 3000, 2); break;
    case 'parry': tone(1200, 0.18, 'triangle', 0.3); tone(1800, 0.25, 'sine', 0.2, { delay: 0.02 }); noise(0.1, 0.3, 4000, 3); break;
    case 'dodge': noise(0.18, 0.18, 700, 0.6); break;
    case 'skill': tone(300, 0.25, 'sawtooth', 0.18, { slide: 3 }); tone(600, 0.25, 'sine', 0.15, { slide: 2.5 }); break;
    case 'skillHit': noise(0.15, 0.6, 1200, 1); tone(100, 0.2, 'square', 0.25, { slide: 0.4 }); break;
    case 'pickup': tone(660, 0.07, 'triangle', 0.18); tone(880, 0.09, 'triangle', 0.18, { delay: 0.06 }); break;
    case 'coin': tone(1320, 0.06, 'square', 0.1); tone(1760, 0.1, 'square', 0.1, { delay: 0.05 }); break;
    case 'levelup': [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.3, 'triangle', 0.25, { delay: i * 0.1 })); break;
    case 'ui': tone(520, 0.04, 'square', 0.08); break;
    case 'confirm': tone(520, 0.05, 'square', 0.1); tone(780, 0.08, 'square', 0.1, { delay: 0.05 }); break;
    case 'die': tone(300, 0.9, 'sawtooth', 0.3, { slide: 0.15 }); noise(0.8, 0.3, 600, 0.5); break;
    case 'bell': [392, 523, 392].forEach((f, i) => { tone(f, 1.6, 'sine', 0.35, { delay: i * 0.9 }); tone(f * 2.01, 1.2, 'sine', 0.12, { delay: i * 0.9 }); }); break;
    case 'roar': tone(90, 1.0, 'sawtooth', 0.35, { slide: 0.6 }); noise(1.0, 0.4, 300, 0.7); break;
    case 'heal': [440, 554, 659].forEach((f, i) => tone(f, 0.25, 'sine', 0.18, { delay: i * 0.07 })); break;
    case 'chest': [392, 494, 587, 784].forEach((f, i) => tone(f, 0.25, 'triangle', 0.2, { delay: i * 0.09 })); break;
    case 'break': noise(0.4, 0.6, 2500, 1); tone(200, 0.4, 'square', 0.2, { slide: 0.3 }); break;
    case 'switch': tone(500, 0.15, 'square', 0.2, { slide: 2 }); tone(1000, 0.2, 'triangle', 0.2, { delay: 0.1 }); break;
    case 'quest': [523, 659, 784].forEach((f, i) => tone(f, 0.2, 'triangle', 0.2, { delay: i * 0.08 })); break;
    case 'shatter': noise(0.9, 0.5, 3500, 0.7, 0, 'highpass'); tone(1500, 0.6, 'triangle', 0.15, { slide: 0.2 }); break;
    case 'warn': tone(200, 0.35, 'square', 0.25); tone(200, 0.35, 'square', 0.25, { delay: 0.45 }); break;
    case 'lever': tone(150, 0.12, 'square', 0.2); noise(0.1, 0.3, 400, 1); break;
    case 'wrong': tone(180, 0.3, 'sawtooth', 0.25, { slide: 0.6 }); break;
  }
}

// ---- music: seeded generative loops per theme ----
export interface Theme {
  bpm: number; root: number; scale: number[]; prog: number[]; wave: OscillatorType; bassWave: OscillatorType;
  density: number; pad: boolean; seed: number;
}
export const THEMES: Record<string, Theme> = {
  town: { bpm: 84, root: 57, scale: [0, 2, 4, 7, 9], prog: [0, 5, 3, 4], wave: 'triangle', bassWave: 'sine', density: 0.55, pad: true, seed: 11 },
  plains: { bpm: 100, root: 55, scale: [0, 2, 4, 5, 7, 9, 11], prog: [0, 3, 4, 0], wave: 'triangle', bassWave: 'sine', density: 0.5, pad: false, seed: 23 },
  forest: { bpm: 72, root: 50, scale: [0, 2, 3, 5, 7, 8, 10], prog: [0, 5, 3, 6], wave: 'sine', bassWave: 'sine', density: 0.4, pad: true, seed: 37 },
  village: { bpm: 90, root: 53, scale: [0, 2, 4, 7, 9], prog: [0, 4, 5, 3], wave: 'triangle', bassWave: 'triangle', density: 0.6, pad: true, seed: 41 },
  dungeon: { bpm: 64, root: 43, scale: [0, 1, 3, 5, 7, 8, 10], prog: [0, 0, 5, 4], wave: 'sine', bassWave: 'sawtooth', density: 0.25, pad: true, seed: 59 },
  boss: { bpm: 150, root: 45, scale: [0, 2, 3, 5, 7, 8, 11], prog: [0, 5, 6, 4], wave: 'sawtooth', bassWave: 'square', density: 0.8, pad: true, seed: 73 },
  silent: { bpm: 60, root: 48, scale: [0], prog: [0], wave: 'sine', bassWave: 'sine', density: 0, pad: false, seed: 1 },
};

let theme: Theme = THEMES.silent; let themeName = 'silent';
let step = 0; let nextT = 0; let timer: number | null = null;
let rng = Math.random;
const mf = (m: number) => 440 * Math.pow(2, (m - 69) / 12);

export function setMusic(name: string) {
  if (name === themeName) return;
  themeName = name; theme = THEMES[name] ?? THEMES.silent; step = 0;
  let a = theme.seed; rng = () => { a = (a * 1664525 + 1013904223) >>> 0; return a / 4294967296; };
  const c = ensure(); if (c) nextT = c.currentTime + 0.1;
  if (timer == null) timer = window.setInterval(scheduler, 100);
}
function scheduler() {
  const c = ctx; if (!c || c.state !== 'running' || theme.density === 0) return;
  const beat = 60 / theme.bpm / 2; // eighth notes
  while (nextT < c.currentTime + 0.4) {
    const bar = Math.floor(step / 8) % theme.prog.length;
    const degree = theme.prog[bar];
    const sc = theme.scale;
    const noteOf = (d: number, oct = 0) => theme.root + oct * 12 + sc[((d % sc.length) + sc.length) % sc.length] + 12 * Math.floor(d / sc.length);
    const delay = nextT - c.currentTime;
    if (step % 8 === 0) {
      tone(mf(noteOf(degree, -1)), beat * 7, theme.bassWave, 0.22, { delay, bus: musicBus });
      if (theme.pad) [0, 2, 4].forEach((i) => tone(mf(noteOf(degree + i, 0)), beat * 7.5, 'sine', 0.07, { delay, bus: musicBus }));
    }
    if (theme.density > 0.7 && step % 2 === 0) tone(mf(noteOf(degree, -1)), beat * 0.9, theme.bassWave, 0.12, { delay, bus: musicBus });
    if (rng() < theme.density * (step % 2 === 0 ? 1 : 0.5)) {
      const d = degree + Math.floor(rng() * 7) - 1;
      tone(mf(noteOf(d, 1)), beat * (rng() < 0.3 ? 3 : 1.4), theme.wave, 0.11, { delay, bus: musicBus });
    }
    step++; nextT += beat;
  }
}
