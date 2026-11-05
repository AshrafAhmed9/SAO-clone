export const C = {
  panel: 'rgba(12,18,34,0.9)', panel2: 'rgba(24,34,60,0.92)', border: '#5cc8ff', text: '#eef4ff', dim: '#8da0c0', accent: '#6fd3ff',
  gold: '#ffd76a', red: '#ff6b6b', green: '#6be37a', warn: '#ffb04a',
};
export const FONT = '"Segoe UI", system-ui, -apple-system, sans-serif';
type Ctx = CanvasRenderingContext2D;

export function panel(c: Ctx, x: number, y: number, w: number, h: number, o: { fill?: string; border?: string; r?: number; glow?: boolean } = {}) {
  c.save();
  c.fillStyle = o.fill ?? C.panel; c.strokeStyle = o.border ?? 'rgba(92,200,255,0.65)'; c.lineWidth = 1.5;
  if (o.glow) { c.shadowColor = C.border; c.shadowBlur = 14; }
  c.beginPath(); c.roundRect(x, y, w, h, o.r ?? 8); c.fill(); c.shadowBlur = 0; c.stroke();
  c.restore();
}

export interface TextOpts { size?: number; color?: string; align?: CanvasTextAlign; bold?: boolean; baseline?: CanvasTextBaseline; shadow?: boolean; alpha?: number }
export function text(c: Ctx, s: string, x: number, y: number, o: TextOpts = {}) {
  c.save();
  c.font = `${o.bold ? '600 ' : ''}${o.size ?? 14}px ${FONT}`;
  c.textAlign = o.align ?? 'left'; c.textBaseline = o.baseline ?? 'top';
  if (o.alpha !== undefined) c.globalAlpha = o.alpha;
  if (o.shadow !== false) { c.lineWidth = 3; c.strokeStyle = 'rgba(0,0,0,0.55)'; c.lineJoin = 'round'; c.strokeText(s, x, y); }
  c.fillStyle = o.color ?? C.text; c.fillText(s, x, y);
  c.restore();
}

export function wrap(c: Ctx, s: string, maxW: number, size: number): string[] {
  c.save(); c.font = `${size}px ${FONT}`;
  const words = s.split(' '); const lines: string[] = []; let cur = '';
  for (const w of words) {
    const t = cur ? `${cur} ${w}` : w;
    if (c.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t;
  }
  if (cur) lines.push(cur);
  c.restore();
  return lines;
}

export function bar(c: Ctx, x: number, y: number, w: number, h: number, frac: number, color: string, bg = 'rgba(0,0,0,0.55)') {
  frac = Math.max(0, Math.min(1, frac));
  c.fillStyle = bg; c.beginPath(); c.roundRect(x, y, w, h, h / 2); c.fill();
  if (frac > 0) { c.fillStyle = color; c.beginPath(); c.roundRect(x, y, Math.max(h, w * frac), h, h / 2); c.fill(); }
  c.strokeStyle = 'rgba(255,255,255,0.25)'; c.lineWidth = 1; c.beginPath(); c.roundRect(x, y, w, h, h / 2); c.stroke();
}

export const hpColor = (f: number) => (f > 0.5 ? '#6be37a' : f > 0.2 ? '#ffd24a' : '#ff5a5a');

export function keycap(c: Ctx, label: string, x: number, y: number, size = 16) {
  c.save();
  c.font = `600 ${size - 5}px ${FONT}`;
  const w = Math.max(size, c.measureText(label).width + 8);
  c.fillStyle = 'rgba(255,255,255,0.14)'; c.strokeStyle = 'rgba(255,255,255,0.5)'; c.lineWidth = 1;
  c.beginPath(); c.roundRect(x, y, w, size, 4); c.fill(); c.stroke();
  c.fillStyle = C.text; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(label, x + w / 2, y + size / 2 + 0.5);
  c.restore();
  return w;
}
