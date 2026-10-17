import {
  classifyTone,
  extractFeatures,
  Features,
  median,
  N_MFCC,
  segmentSyllables,
  speechBounds,
  syllableShape,
  toneFeatures,
  toneVerdict,
} from './analysis';

/* ---------------- model-voice reference data ---------------- */

export type SpeechSyllable = { py: string; base: string; tone: number; spoken: number };
export type SpeechWord = { id: string; hanzi: string; text: string; syllables: SpeechSyllable[] };
export type RefData = { mfcc: string; pitch: string; frames: number; cuts: number[] };

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
export function b64ToBytes(s: string): Uint8Array {
  const clean = s.replace(/[^A-Za-z0-9+/]/g, '');
  const out = new Uint8Array(Math.floor((clean.length * 3) / 4));
  let o = 0;
  for (let i = 0; i < clean.length; i += 4) {
    const n = (B64.indexOf(clean[i]) << 18) | (B64.indexOf(clean[i + 1]) << 12) | ((B64.indexOf(clean[i + 2] ?? 'A') & 63) << 6) | (B64.indexOf(clean[i + 3] ?? 'A') & 63);
    out[o++] = (n >> 16) & 255;
    if (clean[i + 2] !== undefined) out[o++] = (n >> 8) & 255;
    if (clean[i + 3] !== undefined) out[o++] = n & 255;
  }
  return out.slice(0, o);
}
export function bytesToB64(b: Uint8Array): string {
  let s = '';
  for (let i = 0; i < b.length; i += 3) {
    const n = (b[i] << 16) | ((b[i + 1] ?? 0) << 8) | (b[i + 2] ?? 0);
    s += B64[(n >> 18) & 63] + B64[(n >> 12) & 63] + (i + 1 < b.length ? B64[(n >> 6) & 63] : '=') + (i + 2 < b.length ? B64[n & 63] : '=');
  }
  return s;
}

/** Pack trimmed features into compact reference data. */
export function packRef(f: Features, a: number, b: number, cuts: number[]): RefData {
  const frames = b - a + 1;
  const m = new Int8Array(frames * N_MFCC);
  const p = new Int8Array(frames);
  for (let i = 0; i < frames; i++) {
    for (let k = 0; k < N_MFCC; k++) m[i * N_MFCC + k] = Math.max(-127, Math.min(127, Math.round(f.mfcc[a + i][k] * 20)));
    const v = f.pitch[a + i];
    p[i] = Number.isNaN(v) ? -128 : Math.max(-127, Math.min(127, Math.round(v * 4)));
  }
  return {
    mfcc: bytesToB64(new Uint8Array(m.buffer)),
    pitch: bytesToB64(new Uint8Array(p.buffer)),
    frames,
    cuts: cuts.map((c) => c - a),
  };
}

export function unpackRef(r: RefData) {
  const mb = new Int8Array(b64ToBytes(r.mfcc).buffer);
  const pb = new Int8Array(b64ToBytes(r.pitch).buffer);
  const mfcc: number[][] = [];
  const pitch: number[] = [];
  for (let i = 0; i < r.frames; i++) {
    const row: number[] = [];
    for (let k = 0; k < N_MFCC; k++) row.push(mb[i * N_MFCC + k] / 20);
    mfcc.push(row);
    pitch.push(pb[i] === -128 ? NaN : pb[i] / 4);
  }
  return { mfcc, pitch, cuts: r.cuts };
}

/* ---------------- evaluation ---------------- */

export type SyllableResult = {
  py: string;
  expected: number; // spoken tone (after tone-change rules); 5 = neutral
  heard: number | null; // the tone it sounded like
  verdict: 'ok' | 'wrong' | 'unclear' | 'neutral' | 'nopitch';
  message: string;
};

export type Attempt = {
  ok: boolean;
  problem?: string; // when the recording couldn't be judged
  syllables: SyllableResult[];
  tonesRight: number;
  tonesJudged: number;
  sound: 'good' | 'close' | 'off';
  soundTip?: string;
  summary: string;
  userPitch: number[]; // for the graph (semitones, NaN = silent)
  refPitch: number[];
  userCuts: number[];
  refCuts: number[];
};


const TONE_NAMES = ['', '1st tone (high & flat)', '2nd tone (rising)', '3rd tone (low dip)', '4th tone (falling)'];
const TONE_HOW = [
  '',
  'Keep it high and level, like singing one note.',
  'Start mid and rise, like asking “huh?”',
  'Go low — dip down, deep and relaxed.',
  'Start high and drop sharply, like “No!”',
];

/** Tips for sounds English speakers often get wrong, keyed by the start of the syllable. */
function soundTip(base: string): string | undefined {
  if (base.startsWith('zh')) return '“zh” is like “j” in jump, tongue curled back.';
  if (base.startsWith('ch')) return '“ch” is like “ch” in church, tongue curled back, with a puff of air.';
  if (base.startsWith('sh')) return '“sh” has the tongue curled back a little.';
  if (base.startsWith('x')) return '“x” is like “sh” with a big smile.';
  if (base.startsWith('q')) return '“q” is like “ch” in cheese, with a smile and a puff of air.';
  if (base.startsWith('j')) return '“j” is like “j” in jeep, with a smile.';
  if (base.startsWith('c')) return '“c” is like “ts” in cats.';
  if (base.startsWith('z')) return '“z” is like “ds” in kids.';
  if (base.startsWith('r')) return '“r” is like the “s” in measure.';
  if (base.includes('v') || (/^[jqxy]u/.test(base))) return '“ü”: say “ee” with rounded lips.';
  if (base.startsWith('h')) return '“h” is rough, like clearing your throat softly.';
  if (/^[ptk]/.test(base)) return `Add a puff of air on “${base[0]}”.`;
  if (/^[bdg]/.test(base)) return `“${base[0]}” has no puff of air — softer than English.`;
  if (base.endsWith('ng')) return 'End with “ng” as in sing.';
  if (base.endsWith('n')) return 'End cleanly on “n”.';
  if (base === 'e' || /[^i]e$/.test(base)) return '“e” is like “uh”, said from the back of the mouth.';
  return undefined;
}

/* ---- sound comparison: rank the intended word against other words ----
 * Calibrated offline with native recordings: correct speech is rated "good" ~91% of the time
 * and never "off"; a different word is rated "off" ~40% and "close" ~34% of the time. */
const deltas = (m: number[][]) =>
  m.map((r, i) => {
    const a = m[Math.max(0, i - 2)], b = m[Math.min(m.length - 1, i + 2)];
    return [...r, ...r.map((_, k) => (b[k] - a[k]) / 4)];
  });
function cosDist(x: number[], y: number[]) {
  let a = 0, b = 0, c = 0;
  for (let i = 0; i < x.length; i++) { a += x[i] * y[i]; b += x[i] * x[i]; c += y[i] * y[i]; }
  return 1 - a / Math.sqrt(b * c + 1e-9);
}
function dtwCost(a: number[][], b: number[][]) {
  const n = a.length, m = b.length;
  if (!n || !m) return 1;
  let prevD = new Float64Array(m).fill(Infinity), prevL = new Float64Array(m);
  for (let i = 0; i < n; i++) {
    const D = new Float64Array(m).fill(Infinity), L = new Float64Array(m);
    for (let j = 0; j < m; j++) {
      const c = cosDist(a[i], b[j]);
      if (i === 0 && j === 0) { D[0] = c; L[0] = 1; continue; }
      let best = Infinity, bl = 0;
      if (i > 0 && prevD[j] < best) { best = prevD[j]; bl = prevL[j]; }
      if (j > 0 && D[j - 1] < best) { best = D[j - 1]; bl = L[j - 1]; }
      if (i > 0 && j > 0 && prevD[j - 1] <= best) { best = prevD[j - 1]; bl = prevL[j - 1]; }
      D[j] = c + best; L[j] = bl + 1;
    }
    prevD = D; prevL = L;
  }
  return prevD[m - 1] / prevL[m - 1];
}
const refCache: Record<string, number[][]> = {};

/** DTW alignment: for each reference frame j, the user frame it lines up with. */
function alignToRef(u: number[][], r: number[][]): number[] {
  const n = u.length, m = r.length;
  const D = Array.from({ length: n }, () => new Float64Array(m).fill(Infinity));
  const P = Array.from({ length: n }, () => new Int8Array(m));
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < m; j++) {
      const c = cosDist(u[i], r[j]);
      if (i === 0 && j === 0) { D[0][0] = c; continue; }
      let best = Infinity, p = 0;
      if (i > 0 && D[i - 1][j] < best) { best = D[i - 1][j]; p = 1; }
      if (j > 0 && D[i][j - 1] < best) { best = D[i][j - 1]; p = 2; }
      if (i > 0 && j > 0 && D[i - 1][j - 1] <= best) { best = D[i - 1][j - 1]; p = 3; }
      D[i][j] = c + best;
      P[i][j] = p;
    }
  }
  const map = new Array(m).fill(-1);
  let i = n - 1, j = m - 1;
  while (i >= 0 && j >= 0) {
    if (map[j] < 0 || i < map[j]) map[j] = i;
    if (i === 0 && j === 0) break;
    const p = P[i][j];
    if (p === 1) i--;
    else if (p === 2) j--;
    else { i--; j--; }
  }
  for (let k = 1; k < m; k++) if (map[k] < 0) map[k] = map[k - 1];
  return map;
}

export function evaluateAttempt(
  samples16k: Float32Array,
  word: SpeechWord,
  ref: RefData,
  competitors: { id: string; ref: RefData }[] = [],
): Attempt {
  const f = extractFeatures(samples16k);
  const r = unpackRef(ref);
  const n = word.syllables.length;
  const empty: Attempt = {
    ok: false,
    syllables: [],
    tonesRight: 0,
    tonesJudged: 0,
    sound: 'close',
    summary: '',
    userPitch: [],
    refPitch: r.pitch,
    userCuts: [],
    refCuts: r.cuts,
  };
  const bounds = speechBounds(f);
  if (!bounds) return { ...empty, problem: 'I couldn’t hear you. Hold the phone closer and speak a little louder.' };
  const [a, b] = bounds;
  const voiced = f.pitch.slice(a, b + 1).filter((v) => !Number.isNaN(v)).length;
  if (voiced < 6) return { ...empty, problem: 'That was too quiet or too short. Try again, a bit louder.' };
  if (b - a > 450) return { ...empty, problem: 'That was long — say just the word, then tap stop.' };

  const userPitch = f.pitch.slice(a, b + 1);
  const uttMed = median(userPitch);

  // --- sounds ---
  const u = deltas(f.mfcc.slice(a, b + 1));
  const rd = deltas(r.mfcc);
  const target = dtwCost(u, rd);

  // syllable boundaries: line the recording up with the model voice and reuse the model's syllable positions
  let cuts: number[];
  if (n > 1 && r.cuts.length === n + 1) {
    const map = alignToRef(u, rd);
    cuts = r.cuts.map((c, k) => (k === 0 ? a : k === n ? b + 1 : a + map[Math.min(c, map.length - 1)]));
    for (let k = 1; k < cuts.length; k++) if (cuts[k] <= cuts[k - 1]) cuts[k] = Math.min(b + 1, cuts[k - 1] + 3);
  } else {
    cuts = segmentSyllables(f, a, b, n);
  }
  let rank = 1;
  if (competitors.length) {
    const costs = competitors.map((c) => {
      refCache[c.id] ??= deltas(unpackRef(c.ref).mfcc);
      return dtwCost(u, refCache[c.id]);
    });
    rank = costs.filter((c) => c > target).length / costs.length;
  }
  if (competitors.length && rank < 0.2) {
    return {
      ...empty,
      userPitch,
      userCuts: cuts.map((c) => c - a),
      problem: `That didn’t sound like ${word.text}. Listen to the model once more, then try again.`,
    };
  }
  const sound: Attempt['sound'] = rank >= 0.75 ? 'good' : rank >= 0.4 ? 'close' : 'off';
  const soundTipText = sound === 'good' ? undefined : word.syllables.map((s) => soundTip(s.base)).find(Boolean);

  // --- tones ---
  // The model voice is the yardstick: in fast speech tones blend, so a syllable is only judged
  // when the model's own version of it clearly has the textbook tone.
  const refMed = median(r.pitch);
  const refShapeTone = (k: number) => {
    if (n === 1 || r.cuts.length !== n + 1) return 'ok' as const;
    const sh = syllableShape(r.pitch, r.cuts[k], r.cuts[k + 1]);
    if (!sh) return 'skip' as const;
    const m = sh.contour.reduce((x, y) => x + y, 0) / 10;
    return toneVerdict(classifyTone(toneFeatures(sh, m - refMed, r.cuts[k + 1] - r.cuts[k])).probs, word.syllables[k].spoken) === 'ok' ? ('ok' as const) : ('skip' as const);
  };
  const syllables: SyllableResult[] = word.syllables.map((syl, k) => {
    const s = cuts[k], e = cuts[k + 1];
    if (syl.spoken === 5) {
      return { py: syl.py, expected: 5, heard: null, verdict: 'neutral', message: 'Light and short — no tone here.' };
    }
    if (refShapeTone(k) === 'skip') {
      return { py: syl.py, expected: syl.spoken, heard: null, verdict: 'neutral', message: 'Said quickly here — just copy the model.' };
    }
    const shape = syllableShape(f.pitch, s, e);
    if (!shape) {
      if (n > 3) return { py: syl.py, expected: syl.spoken, heard: null, verdict: 'neutral', message: 'Said quickly here — just copy the model.' };
      return { py: syl.py, expected: syl.spoken, heard: null, verdict: 'nopitch', message: 'Couldn’t hear the pitch — say it longer and louder.' };
    }
    const mean = shape.contour.reduce((x, y) => x + y, 0) / 10;
    const { tone, probs } = classifyTone(toneFeatures(shape, n > 1 ? mean - uttMed : 0, e - s));
    let verdict = toneVerdict(probs, syl.spoken);
    // in sentences, be gentler: a confident "wrong" becomes "not clear"
    if (verdict === 'wrong' && n > 3 && probs[syl.spoken - 1] > 0.04) verdict = 'unclear';
    let message: string;
    if (verdict === 'ok') message = `Good ${TONE_NAMES[syl.spoken]}.`;
    else if (verdict === 'wrong') message = `Sounded like tone ${tone}. ${TONE_HOW[syl.spoken]}`;
    else message = `Not quite clear. ${TONE_HOW[syl.spoken]}`;
    if (syl.spoken !== syl.tone && verdict !== 'ok') message += ` (Said as tone ${syl.spoken} here.)`;
    return { py: syl.py, expected: syl.spoken, heard: tone, verdict, message };
  });

  const judged = syllables.filter((s) => s.verdict === 'ok' || s.verdict === 'wrong' || s.verdict === 'unclear');
  const tonesRight = judged.filter((s) => s.verdict === 'ok').length;
  const allTones = judged.length > 0 && tonesRight === judged.length;
  let summary: string;
  if (allTones && sound === 'good') summary = 'Excellent! Tones and sounds both match. 太棒了!';
  else if (allTones) summary = 'Tones are right! The sounds can be a little clearer.';
  else if (tonesRight === 0 && judged.length) summary = 'Focus on the tones — listen to the model and copy its pitch.';
  else summary = 'Close! Check the parts marked below.';

  return {
    ok: true,
    syllables,
    tonesRight,
    tonesJudged: judged.length,
    sound,
    soundTip: soundTipText,
    summary,
    userPitch,
    refPitch: r.pitch,
    userCuts: cuts.map((c) => c - a),
    refCuts: r.cuts,
  };
}

/** Other practice words to compare against (same number of syllables where possible). */
export function pickCompetitors(word: SpeechWord, words: SpeechWord[], refs: Record<string, RefData>, max = 12) {
  const n = word.syllables.length;
  let pool = words.filter((w) => w.id !== word.id && w.syllables.length === n && refs[w.id]);
  if (pool.length < 6) pool = pool.concat(words.filter((w) => w.id !== word.id && Math.abs(w.syllables.length - n) === 1 && refs[w.id]));
  return pool.slice(0, max).map((w) => ({ id: w.id, ref: refs[w.id] }));
}

/**
 * Work out which of several possible replies the learner said.
 * Returns the best match, or null when it isn't clear (then the app asks them to try again or tap).
 */
export function identifyReply(
  samples16k: Float32Array,
  options: { id: string; ref: RefData }[],
  others: { id: string; ref: RefData }[],
): { id: string | null; reason?: 'quiet' | 'unclear' } {
  const f = extractFeatures(samples16k);
  const bounds = speechBounds(f);
  if (!bounds) return { id: null, reason: 'quiet' };
  const [a, b] = bounds;
  const u = deltas(f.mfcc.slice(a, b + 1));
  const cost = (c: { id: string; ref: RefData }) => {
    refCache[c.id] ??= deltas(unpackRef(c.ref).mfcc);
    return dtwCost(u, refCache[c.id]);
  };
  const scored = options.map((o) => ({ id: o.id, c: cost(o) })).sort((x, y) => x.c - y.c);
  const best = scored[0];
  // must sound more like the best option than most unrelated lines
  if (others.length) {
    const oc = others.map(cost);
    const rank = oc.filter((c) => c > best.c).length / oc.length;
    if (rank < 0.5) return { id: null, reason: 'unclear' };
  }
  // with several options, the best must be clearly better than the runner-up
  if (scored.length > 1 && best.c > scored[1].c * 0.97) return { id: null, reason: 'unclear' };
  return { id: best.id };
}
