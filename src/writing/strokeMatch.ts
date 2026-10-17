/** Checks a finger-drawn stroke against the expected stroke (all in the 1024×1024 character box). */
export type Pt = [number, number];

const dist = (a: Pt, b: Pt) => Math.hypot(a[0] - b[0], a[1] - b[1]);

export function pathLength(pts: Pt[]) {
  let n = 0;
  for (let i = 1; i < pts.length; i++) n += dist(pts[i - 1], pts[i]);
  return n;
}

/** Evenly spaced points along a line. */
export function resample(pts: Pt[], n = 24): Pt[] {
  if (pts.length === 0) return [];
  if (pts.length === 1) return Array.from({ length: n }, () => pts[0]);
  const total = pathLength(pts);
  if (total === 0) return Array.from({ length: n }, () => pts[0]);
  const step = total / (n - 1);
  const out: Pt[] = [pts[0]];
  let acc = 0;
  let i = 1;
  let prev = pts[0];
  while (out.length < n - 1 && i < pts.length) {
    const d = dist(prev, pts[i]);
    if (acc + d >= step) {
      const t = (step - acc) / d;
      const p: Pt = [prev[0] + t * (pts[i][0] - prev[0]), prev[1] + t * (pts[i][1] - prev[1])];
      out.push(p);
      prev = p;
      acc = 0;
    } else {
      acc += d;
      prev = pts[i];
      i++;
    }
  }
  while (out.length < n) out.push(pts[pts.length - 1]);
  return out;
}

function avgPairDist(a: Pt[], b: Pt[]) {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += dist(a[i], b[i]);
  return s / a.length;
}

export type StrokeCheck = { ok: boolean; reason?: 'backwards' | 'shape' | 'place' | 'tooShort' | 'order' | 'hook' };

/**
 * Lenient check, so normal finger writing passes:
 * the start, end and overall shape must be close to the real stroke, drawn in the right direction.
 */
/**
 * Finds a hook (钩) or flick: a short final part of the stroke that turns sharply away
 * from the main direction. Returns where the hook starts and its direction.
 */
export function findHook(median: Pt[]): { start: number; corner: Pt; dir: Pt; len: number } | null {
  const n = median.length;
  if (n < 3) return null;
  const total = pathLength(median);
  const end = median[n - 1];
  for (let k = n - 2; k >= 1; k--) {
    const tail: Pt = [end[0] - median[k][0], end[1] - median[k][1]];
    const tailLen = Math.hypot(tail[0], tail[1]);
    if (tailLen > Math.min(280, total * 0.4)) break;
    const from = median[Math.max(0, k - 2)];
    const before: Pt = [median[k][0] - from[0], median[k][1] - from[1]];
    const bLen = Math.hypot(before[0], before[1]);
    if (tailLen < 35 || bLen < 60) continue;
    const cos = (tail[0] * before[0] + tail[1] * before[1]) / (tailLen * bLen);
    if (cos < 0.35) {
      // distance travelled along the stroke to the corner
      return { start: pathLength(median.slice(0, k + 1)) / total, corner: median[k], dir: [tail[0] / tailLen, tail[1] / tailLen], len: tailLen };
    }
  }
  return null;
}

/** Did the drawing end with a turn in the hook's direction, near the hook's corner? */
function hasHook(drawn: Pt[], hook: NonNullable<ReturnType<typeof findHook>>) {
  const end = drawn[drawn.length - 1];
  // the drawn point closest to the corner
  let ci = 0;
  let best = Infinity;
  drawn.forEach((p, i) => {
    const d = dist(p, hook.corner);
    if (d <= best) {
      best = d;
      ci = i;
    }
  });
  if (best > 230) return false;
  const tail: Pt = [end[0] - drawn[ci][0], end[1] - drawn[ci][1]];
  const tailLen = Math.hypot(tail[0], tail[1]);
  if (tailLen < Math.max(28, hook.len * 0.3)) return false;
  return (tail[0] * hook.dir[0] + tail[1] * hook.dir[1]) / tailLen > 0.4;
}

export function checkStroke(drawn: Pt[], median: Pt[]): StrokeCheck {
  const target = median.map((p) => [p[0], p[1]] as Pt);
  const tLen = pathLength(target);
  const dLen = pathLength(drawn);
  const isDot = tLen < 180;
  if (drawn.length < 2 || dLen < (isDot ? 25 : Math.min(120, tLen * 0.3))) return { ok: false, reason: 'tooShort' };

  const a = resample(drawn);
  const b = resample(target);
  const fwd = avgPairDist(a, b);
  const back = avgPairDist(a, [...b].reverse());
  const startD = dist(a[0], b[0]);
  const endD = dist(a[a.length - 1], b[b.length - 1]);
  const tol = isDot ? 230 : 210;

  if (back + 40 < fwd && back < tol) return { ok: false, reason: 'backwards' };
  if (fwd > tol || startD > tol + 60 || endD > tol + 80) {
    // the right shape but in the wrong place, or just the wrong shape?
    const shift: Pt = [b[0][0] - a[0][0], b[0][1] - a[0][1]];
    const moved = a.map((p) => [p[0] + shift[0], p[1] + shift[1]] as Pt);
    return { ok: false, reason: avgPairDist(moved, b) < tol * 0.7 ? 'place' : 'shape' };
  }
  if (!isDot && dLen < tLen * 0.35) return { ok: false, reason: 'tooShort' };
  const hook = findHook(target);
  if (hook && !hasHook(drawn, hook)) return { ok: false, reason: 'hook' };
  return { ok: true };
}

/** Check against the stroke that comes next, and notice when the learner wrote a later stroke instead. */
export function checkNext(drawn: Pt[], medians: Pt[][], next: number): StrokeCheck {
  const r = checkStroke(drawn, medians[next]);
  const a = resample(drawn);
  const mine = avgPairDist(a, resample(medians[next]));
  for (let j = next + 1; j < medians.length; j++) {
    const other = avgPairDist(a, resample(medians[j]));
    if (other < mine * 0.6 && checkStroke(drawn, medians[j]).ok) return { ok: false, reason: 'order' };
  }
  return r;
}
