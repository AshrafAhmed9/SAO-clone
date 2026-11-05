import { T, TILE } from '../data/tiles';
import { ZONES } from '../data/zones';
import { setMusic, sfx } from '../engine/audio';
import { dist, rand } from '../engine/util';
import { saveGame } from '../engine/save';
import { updateAllies, spawnParty } from './allies';
import { updateMobs } from './ai';
import { collectOrb, hurtPlayer, updateAoes, updateProjs } from './combat';
import { updateNpcs } from './interact';
import { updatePlayer } from './player';
import { G, setFlag, toast } from './state';
import { clampCam, loadZone, portalAt, solidAtPx, spawnMobAt, tileAt, W, freeTile } from './world';

let armed = false; // portals only fire after the player has stepped off the arrival rect

export function enterZone(zone: string, tx: number, ty: number, withParty = true) {
  loadZone(zone, tx, ty);
  armed = false;
  setFlag(`visited:${zone}`);
  setMusic(ZONES[zone].music);
  if (withParty && G.flags.raid && zone !== 'bossroom') spawnParty(['hobb', 'iselle', 'dov']);
  if (zone !== 'bossroom') saveGame();
}

export function updateParticles(dt: number) {
  for (const p of W.parts) { p.t += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += p.grav * dt; p.vx *= 0.98; }
  W.parts = W.parts.filter((p) => p.t < p.life);
  for (const f of W.floats) { f.t += dt; f.y -= 14 * dt; }
  W.floats = W.floats.filter((f) => f.t < f.life);
  for (const s of W.slashes) s.t += dt;
  W.slashes = W.slashes.filter((s) => s.t < s.life);
  if (W.parts.length > 900) W.parts.splice(0, W.parts.length - 900);
}

export function spikeState(): 'off' | 'warn' | 'up' {
  const c = W.time % 3;
  return c > 2.25 && c < 2.85 ? 'up' : c > 1.65 && c <= 2.25 ? 'warn' : 'off';
}

export function updateWorld(dt: number, canAct: boolean) {
  if (W.hitstop > 0) { W.hitstop -= dt; updateParticles(dt * 0.3); return; }
  W.time += dt; G.clock = (G.clock + dt) % 1200; G.playtime += dt;
  W.fade = Math.max(0, W.fade - dt * 1.6);
  W.cam.shake = Math.max(0, W.cam.shake - dt * 14);
  W.flash = Math.max(0, W.flash - dt * 1.5);
  if (W.banner.t > 0) W.banner.t -= dt;

  updatePlayer(dt, canAct);
  updateMobs(dt);
  updateAllies(dt);
  updateNpcs(dt);
  updateProjs(dt, solidAtPx);
  updateAoes(dt);
  updateParticles(dt);
  G.hp = W.player.hp;

  const p = W.player;
  // orbs
  for (const o of W.orbs) {
    o.t += dt;
    if (o.t > 0.35 && !p.dead) {
      const a = Math.atan2(p.y - o.y, p.x - o.x); const sp = 60 + (o.t - 0.35) * 400;
      o.x += Math.cos(a) * sp * dt; o.y += Math.sin(a) * sp * dt;
      if (dist(o.x, o.y, p.x, p.y) < 7) { collectOrb(o.kind, o.amount, o.item); o.t = -99; }
    }
  }
  W.orbs = W.orbs.filter((o) => o.t > -50);

  // respawns
  for (const r of W.respawns) {
    r.t -= dt;
    if (r.t <= 0 && dist(p.x, p.y, r.tx * TILE, r.ty * TILE) > 150 && freeTile(r.tx, r.ty)) { spawnMobAt(r.mob, r.tx, r.ty, r.idx); r.t = -1; }
  }
  W.respawns = W.respawns.filter((r) => r.t > -0.5);

  // spikes
  if (W.zone === 'lab2' && !p.dead && spikeState() === 'up') {
    if (tileAt(Math.floor(p.x / TILE), Math.floor(p.y / TILE)) === T.SPIKE && p.state !== 'dodge') hurtPlayer(22, p.x, p.y + 6, { unblockable: true, kb: 30 });
  }

  // weather
  if (ZONES[W.zone].weather) {
    W.rainT -= dt;
    if (W.rainT <= 0) { W.rain = W.rain > 0.5 ? 0 : 1; W.rainT = W.rain ? rand(40, 80) : rand(100, 220); }
  } else W.rain = 0;

  // portals
  const portal = portalAt(p.x, p.y);
  if (!portal) armed = true;
  else if (armed && !p.dead && p.state !== 'switch') {
    if (portal.needs && !G.flags[portal.needs]) { toast(portal.blocked ?? 'The way is blocked.', '#ff8a8a'); armed = false; }
    else { sfx('ui'); enterZone(portal.to, portal.sx, portal.sy); return; }
  }
  clampCam();
}
