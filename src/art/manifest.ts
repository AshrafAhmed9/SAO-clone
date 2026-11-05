// Optional image overrides. Drop a PNG at public/assets/sprites/<key>.png and it replaces
// the procedural drawing for that key. Keys: player, npc.<id>, mob.<id>, ally.<id>.
// Images are drawn centered on the entity's feet; set size (world px) per key below if needed.
const cache = new Map<string, HTMLImageElement | null>();
export const SPRITE_SIZE: Record<string, number> = {};

export function spriteImage(key: string): HTMLImageElement | null {
  if (cache.has(key)) {
    const img = cache.get(key);
    return img && img.complete && img.naturalWidth > 0 ? img : null;
  }
  cache.set(key, null);
  const img = new Image();
  img.onload = () => cache.set(key, img);
  img.onerror = () => cache.set(key, null);
  img.src = `${import.meta.env?.BASE_URL ?? '/'}assets/sprites/${key}.png`;
  return null;
}

export function drawOverride(ctx: CanvasRenderingContext2D, key: string, x: number, y: number, flip = false): boolean {
  const img = spriteImage(key);
  if (!img) return false;
  const size = SPRITE_SIZE[key] ?? 24;
  const h = size, w = (img.naturalWidth / img.naturalHeight) * size;
  ctx.save(); ctx.translate(x, y); if (flip) ctx.scale(-1, 1);
  ctx.drawImage(img, -w / 2, -h + 4, w, h);
  ctx.restore();
  return true;
}
