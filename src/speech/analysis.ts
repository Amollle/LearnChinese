/**
 * Speech analysis for speaking practice (runs fully on the phone, no internet).
 * - reads the recorded audio (WAV/CAF, 16-bit or float PCM)
 * - tracks voice pitch (YIN) to judge tones
 * - computes MFCC "sound fingerprints" and compares them to the model recording (DTW)
 * The same code is used offline to prepare the model recordings' data.
 */

import { TONE_MODEL } from './toneModel';

export const SR = 16000;
export const HOP = 160; // 10 ms
const FRAME = 400; // 25 ms
const NFFT = 512;
const N_MELS = 26;
export const N_MFCC = 12;

/* ---------------- audio decoding ---------------- */

function readStr(b: Uint8Array, o: number, n: number) {
  let s = '';
  for (let i = 0; i < n; i++) s += String.fromCharCode(b[o + i]);
  return s;
}

/** Decode a WAV (RIFF) or CAF file with PCM samples into mono float samples. */
export function decodePcm(bytes: Uint8Array): { samples: Float32Array; sampleRate: number } {
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const tag = readStr(bytes, 0, 4);
  let fmt = { rate: 16000, channels: 1, bits: 16, float: false, little: true };
  let dataOff = -1;
  let dataLen = 0;
  if (tag === 'RIFF') {
    let o = 12;
    while (o + 8 <= bytes.length) {
      const id = readStr(bytes, o, 4);
      const size = dv.getUint32(o + 4, true);
      if (id === 'fmt ') {
        const format = dv.getUint16(o + 8, true);
        fmt = {
          channels: dv.getUint16(o + 10, true),
          rate: dv.getUint32(o + 12, true),
          bits: dv.getUint16(o + 22, true),
          float: format === 3,
          little: true,
        };
        if (format === 0xfffe && size >= 40) fmt.float = dv.getUint16(o + 32, true) === 3;
      } else if (id === 'data') {
        dataOff = o + 8;
        dataLen = Math.min(size, bytes.length - dataOff);
        if (size === 0 || size === 0xffffffff) dataLen = bytes.length - dataOff;
        break;
      }
      o += 8 + size + (size % 2);
    }
  } else if (tag === 'caff') {
    let o = 8;
    while (o + 12 <= bytes.length) {
      const id = readStr(bytes, o, 4);
      const sizeHi = dv.getUint32(o + 4, false);
      const sizeLo = dv.getUint32(o + 8, false);
      let size = sizeHi * 2 ** 32 + sizeLo;
      const body = o + 12;
      if (id === 'desc') {
        const rate = dv.getFloat64(body, false);
        const flags = dv.getUint32(body + 12, false);
        fmt = {
          rate,
          channels: dv.getUint32(body + 24, false),
          bits: dv.getUint32(body + 28, false),
          float: (flags & 1) === 1,
          little: (flags & 2) === 2,
        };
      } else if (id === 'data') {
        dataOff = body + 4; // skip edit count
        if (sizeHi === 0xffffffff || size > bytes.length - body) size = bytes.length - body;
        dataLen = size - 4;
        break;
      }
      o = body + size;
    }
  }
  if (dataOff < 0) throw new Error('Could not read the recording.');
  const bps = fmt.bits / 8;
  const frames = Math.floor(dataLen / (bps * fmt.channels));
  const out = new Float32Array(frames);
  for (let i = 0; i < frames; i++) {
    let sum = 0;
    for (let c = 0; c < fmt.channels; c++) {
      const p = dataOff + (i * fmt.channels + c) * bps;
      let v = 0;
      if (fmt.float) v = bps === 8 ? dv.getFloat64(p, fmt.little) : dv.getFloat32(p, fmt.little);
      else if (bps === 2) v = dv.getInt16(p, fmt.little) / 32768;
      else if (bps === 4) v = dv.getInt32(p, fmt.little) / 2147483648;
      else if (bps === 3) {
        const b0 = bytes[p], b1 = bytes[p + 1], b2 = bytes[p + 2];
        let x = fmt.little ? b0 | (b1 << 8) | (b2 << 16) : b2 | (b1 << 8) | (b0 << 16);
        if (x & 0x800000) x -= 0x1000000;
        v = x / 8388608;
      } else if (bps === 1) v = (bytes[p] - 128) / 128;
      sum += v;
    }
    out[i] = sum / fmt.channels;
  }
  return { samples: out, sampleRate: fmt.rate };
}

/** Resample to 16 kHz (linear interpolation, with a simple low-pass when downsampling). */
export function resampleTo16k(x: Float32Array, rate: number): Float32Array {
  if (Math.abs(rate - SR) < 1) return x;
  let src = x;
  if (rate > SR) {
    // moving-average low-pass to reduce aliasing
    const k = Math.max(1, Math.round(rate / SR));
    if (k > 1) {
      src = new Float32Array(x.length);
      let acc = 0;
      for (let i = 0; i < x.length; i++) {
        acc += x[i];
        if (i >= k) acc -= x[i - k];
        src[i] = acc / Math.min(i + 1, k);
      }
    }
  }
  const n = Math.floor((src.length * SR) / rate);
  const out = new Float32Array(n);
  const step = rate / SR;
  for (let i = 0; i < n; i++) {
    const t = i * step;
    const j = Math.floor(t);
    const f = t - j;
    out[i] = (src[j] ?? 0) * (1 - f) + (src[j + 1] ?? src[j] ?? 0) * f;
  }
  return out;
}

/* ---------------- frame features ---------------- */

export type Features = {
  energy: number[]; // dB per frame
  pitch: number[]; // semitones re 100 Hz, NaN = unvoiced
  mfcc: number[][]; // [frame][N_MFCC], mean/variance normalised
};

function fft(re: Float64Array, im: Float64Array) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      [re[i], re[j]] = [re[j], re[i]];
      [im[i], im[j]] = [im[j], im[i]];
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len;
    const wr = Math.cos(ang), wi = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let cr = 1, ci = 0;
      for (let j = 0; j < len / 2; j++) {
        const ar = re[i + j], ai = im[i + j];
        const br = re[i + j + len / 2] * cr - im[i + j + len / 2] * ci;
        const bi = re[i + j + len / 2] * ci + im[i + j + len / 2] * cr;
        re[i + j] = ar + br; im[i + j] = ai + bi;
        re[i + j + len / 2] = ar - br; im[i + j + len / 2] = ai - bi;
        const t = cr * wr - ci * wi;
        ci = cr * wi + ci * wr;
        cr = t;
      }
    }
  }
}

let melBank: number[][] | null = null;
function getMelBank() {
  if (melBank) return melBank;
  const mel = (f: number) => 2595 * Math.log10(1 + f / 700);
  const inv = (m: number) => 700 * (10 ** (m / 2595) - 1);
  const lo = mel(60), hi = mel(7600);
  const pts = Array.from({ length: N_MELS + 2 }, (_, i) => inv(lo + ((hi - lo) * i) / (N_MELS + 1)));
  const bins = pts.map((f) => Math.floor(((NFFT + 1) * f) / SR));
  melBank = [];
  for (let m = 1; m <= N_MELS; m++) {
    const row = new Array(NFFT / 2 + 1).fill(0);
    for (let k = bins[m - 1]; k < bins[m]; k++) row[k] = (k - bins[m - 1]) / Math.max(1, bins[m] - bins[m - 1]);
    for (let k = bins[m]; k < bins[m + 1]; k++) row[k] = (bins[m + 1] - k) / Math.max(1, bins[m + 1] - bins[m]);
    melBank.push(row);
  }
  return melBank;
}

const hann = Array.from({ length: FRAME }, (_, i) => 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (FRAME - 1)));

/** YIN pitch for one frame; returns Hz or NaN when unvoiced. */
function yin(x: Float32Array, start: number): number {
  const W = 512;
  const minLag = Math.floor(SR / 450), maxLag = Math.ceil(SR / 65);
  if (start + W + maxLag >= x.length) return NaN;
  const d = new Float64Array(maxLag + 1);
  for (let tau = 1; tau <= maxLag; tau++) {
    let s = 0;
    for (let i = 0; i < W; i++) {
      const diff = x[start + i] - x[start + i + tau];
      s += diff * diff;
    }
    d[tau] = s;
  }
  // cumulative mean normalised difference
  let running = 0;
  const cmnd = new Float64Array(maxLag + 1);
  cmnd[0] = 1;
  for (let tau = 1; tau <= maxLag; tau++) {
    running += d[tau];
    cmnd[tau] = running > 0 ? (d[tau] * tau) / running : 1;
  }
  let best = -1;
  for (let tau = minLag; tau <= maxLag; tau++) {
    if (cmnd[tau] < 0.15) {
      while (tau + 1 <= maxLag && cmnd[tau + 1] < cmnd[tau]) tau++;
      best = tau;
      break;
    }
  }
  if (best < 0) {
    let m = Infinity;
    for (let tau = minLag; tau <= maxLag; tau++) if (cmnd[tau] < m) { m = cmnd[tau]; best = tau; }
    if (m > 0.3) return NaN;
  }
  // parabolic interpolation
  const a = cmnd[best - 1] ?? cmnd[best], b = cmnd[best], c = cmnd[best + 1] ?? cmnd[best];
  const denom = a - 2 * b + c;
  const shift = denom !== 0 ? (0.5 * (a - c)) / denom : 0;
  return SR / (best + Math.max(-1, Math.min(1, shift)));
}

function median(a: number[]) {
  const s = a.filter((v) => !Number.isNaN(v)).sort((p, q) => p - q);
  if (!s.length) return NaN;
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

/** Compute energy, pitch and MFCC for 16 kHz audio. */
export function extractFeatures(x: Float32Array): Features {
  const n = Math.max(0, Math.floor((x.length - FRAME) / HOP) + 1);
  const energy: number[] = [];
  const pitchHz: number[] = [];
  const mfccRaw: number[][] = [];
  const bank = getMelBank();
  const re = new Float64Array(NFFT), im = new Float64Array(NFFT);
  for (let f = 0; f < n; f++) {
    const s = f * HOP;
    let e = 0;
    for (let i = 0; i < FRAME; i++) e += x[s + i] * x[s + i];
    energy.push(10 * Math.log10(e / FRAME + 1e-10));
    re.fill(0); im.fill(0);
    for (let i = 0; i < FRAME; i++) re[i] = (x[s + i] - 0.97 * (s + i > 0 ? x[s + i - 1] : 0)) * hann[i];
    fft(re, im);
    const power = new Array(NFFT / 2 + 1);
    for (let k = 0; k <= NFFT / 2; k++) power[k] = re[k] * re[k] + im[k] * im[k];
    const logMel = bank.map((row) => {
      let v = 0;
      for (let k = 0; k < row.length; k++) if (row[k]) v += row[k] * power[k];
      return Math.log(v + 1e-10);
    });
    const c: number[] = [];
    for (let i = 1; i <= N_MFCC; i++) {
      let v = 0;
      for (let m = 0; m < N_MELS; m++) v += logMel[m] * Math.cos((Math.PI * i * (m + 0.5)) / N_MELS);
      c.push(v);
    }
    mfccRaw.push(c);
    pitchHz.push(yin(x, s));
  }
  // voiced only where loud enough
  const maxE = Math.max(...energy, -100);
  let pitch = pitchHz.map((hz, i) => (Number.isNaN(hz) || energy[i] < maxE - 30 ? NaN : 12 * Math.log2(hz / 100)));
  pitch = cleanPitch(pitch);
  // CMVN on MFCC
  const mfcc = cmvn(mfccRaw);
  return { energy, pitch, mfcc };
}

function cmvn(m: number[][]) {
  if (!m.length) return m;
  const d = m[0].length;
  const mean = new Array(d).fill(0), sd = new Array(d).fill(0);
  for (const r of m) r.forEach((v, i) => (mean[i] += v / m.length));
  for (const r of m) r.forEach((v, i) => (sd[i] += (v - mean[i]) ** 2 / m.length));
  return m.map((r) => r.map((v, i) => (v - mean[i]) / Math.sqrt(sd[i] + 1e-6)));
}

/** Remove octave errors and isolated blips; smooth. */
function cleanPitch(p: number[]): number[] {
  const out = p.slice();
  const med = median(out);
  for (let i = 0; i < out.length; i++) {
    if (Number.isNaN(out[i])) continue;
    // octave jumps relative to the utterance median
    if (out[i] - med > 9) out[i] -= 12;
    else if (med - out[i] > 9) out[i] += 12;
  }
  // drop isolated voiced frames
  for (let i = 0; i < out.length; i++) {
    if (Number.isNaN(out[i])) continue;
    const prev = Number.isNaN(out[i - 1] ?? NaN), next = Number.isNaN(out[i + 1] ?? NaN);
    if (prev && next) out[i] = NaN;
  }
  // median filter (5)
  const sm = out.slice();
  for (let i = 0; i < out.length; i++) {
    if (Number.isNaN(out[i])) continue;
    const w = [out[i - 2], out[i - 1], out[i], out[i + 1], out[i + 2]].filter((v) => v !== undefined && !Number.isNaN(v)) as number[];
    sm[i] = median(w);
  }
  return sm;
}

/* ---------------- trimming and syllables ---------------- */

/** First and last frame of speech (energy within 35 dB of the loudest frame). */
export function speechBounds(f: Features): [number, number] | null {
  const maxE = Math.max(...f.energy, -100);
  if (maxE < -55) return null; // nearly silent
  const thr = Math.max(maxE - 35, -60);
  let a = f.energy.findIndex((e) => e > thr);
  let b = f.energy.length - 1;
  while (b > a && f.energy[b] <= thr) b--;
  if (a < 0 || b - a < 8) return null;
  return [Math.max(0, a - 2), Math.min(f.energy.length - 1, b + 2)];
}

/**
 * Split [a, b] into n syllables. Boundaries prefer quiet / unvoiced frames,
 * and segments are kept reasonably even in length.
 */
export function segmentSyllables(f: Features, a: number, b: number, n: number): number[] {
  if (n <= 1) return [a, b + 1];
  const L = b - a + 1;
  const minLen = Math.max(6, Math.floor(L / (n * 3)));
  // boundary cost per frame: louder & voiced = worse place to cut
  const eMax = Math.max(...f.energy.slice(a, b + 1));
  const sm = (i: number) => {
    let s = 0, c = 0;
    for (let k = i - 2; k <= i + 2; k++) if (k >= a && k <= b) { s += f.energy[k]; c++; }
    return s / c;
  };
  const cost: number[] = [];
  for (let i = a; i <= b; i++) {
    const e = (sm(i) - (eMax - 40)) / 40; // ~0 quiet .. 1 loud
    const voiced = Number.isNaN(f.pitch[i]) ? 0 : 0.35;
    cost.push(Math.max(0, e) + voiced);
  }
  // also reward pitch jumps between frames (often a syllable boundary)
  const ideal = L / n;
  // DP over boundaries
  const INF = 1e9;
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(L + 1).fill(INF));
  const back: number[][] = Array.from({ length: n + 1 }, () => new Array(L + 1).fill(-1));
  dp[0][0] = 0;
  for (let k = 1; k <= n; k++) {
    for (let end = k * minLen; end <= L; end++) {
      if (k === n && end !== L) continue;
      for (let start = (k - 1) * minLen; start <= end - minLen; start++) {
        if (dp[k - 1][start] >= INF) continue;
        const len = end - start;
        const lenPenalty = 0.6 * ((len - ideal) / ideal) ** 2;
        const bCost = k < n ? cost[end] ?? 1 : 0;
        const v = dp[k - 1][start] + lenPenalty + 1.2 * bCost;
        if (v < dp[k][end]) {
          dp[k][end] = v;
          back[k][end] = start;
        }
      }
    }
  }
  const cuts = [L];
  let pos = L;
  for (let k = n; k > 0; k--) {
    pos = back[k][pos];
    if (pos < 0) {
      // fallback: equal split
      return Array.from({ length: n + 1 }, (_, i) => a + Math.round((i * L) / n));
    }
    cuts.unshift(pos);
  }
  return cuts.map((c) => a + c);
}

/* ---------------- tones ---------------- */

export type ToneShape = { contour: number[]; start: number; end: number; min: number; max: number; minPos: number; voicedFrac: number };

/** The pitch shape of one syllable (voiced core only, smoothed, 10 points). */
export function syllableShape(pitch: number[], s: number, e: number): ToneShape | null {
  const idx: number[] = [];
  for (let i = s; i < e; i++) if (!Number.isNaN(pitch[i])) idx.push(i);
  if (idx.length < 5) return null;
  // trim the first 15% and last 10% of voicing (onset/offset glitches)
  const a = Math.floor(idx.length * 0.15), b = Math.ceil(idx.length * 0.9);
  const core = idx.slice(a, Math.max(a + 4, b)).map((i) => pitch[i]);
  const pts: number[] = [];
  for (let k = 0; k < 10; k++) {
    const lo = Math.floor((k * core.length) / 10), hi = Math.max(lo + 1, Math.floor(((k + 1) * core.length) / 10));
    const seg = core.slice(lo, hi);
    pts.push(seg.reduce((x, y) => x + y, 0) / seg.length);
  }
  const start = (pts[0] + pts[1]) / 2;
  const end = (pts[8] + pts[9]) / 2;
  let min = Infinity, minI = 0, max = -Infinity;
  pts.forEach((v, i) => {
    if (v < min) { min = v; minI = i; }
    if (v > max) max = v;
  });
  return { contour: pts, start, end, min, max, minPos: minI / 9, voicedFrac: idx.length / Math.max(1, e - s) };
}

/** Feature vector for the tone classifier. `rel` = syllable mean minus the speaker's mean pitch (0 for single syllables). */
export function toneFeatures(t: ToneShape, rel: number, frames: number): number[] {
  const delta = t.end - t.start;
  const dipStart = t.start - t.min;
  const dipEnd = t.end - t.min;
  const range = t.max - t.min;
  const c = t.contour;
  const firstSlope = (c[4] - c[0]) / 4;
  const secondSlope = (c[9] - c[5]) / 4;
  const mean = c.reduce((a, b) => a + b, 0) / c.length;
  const shape = c.map((v) => v - mean);
  return [delta, dipStart, dipEnd, range, t.minPos, firstSlope, secondSlope, rel, frames / 30, t.voicedFrac, ...shape];
}

/** Tone classifier: small neural network trained offline on recordings with known tones. */
export function classifyTone(features: number[]): { tone: number; probs: number[] } {
  const { mean, scale, w1, b1, w2, b2 } = TONE_MODEL;
  const z = features.map((v, i) => (v - mean[i]) / scale[i]);
  const h = b1.map((b, j) => {
    let v = b;
    for (let i = 0; i < z.length; i++) v += z[i] * w1[i][j];
    return Math.max(0, v);
  });
  const logits = b2.map((b, k) => {
    let v = b;
    for (let j = 0; j < h.length; j++) v += h[j] * w2[j][k];
    return v;
  });
  const m = Math.max(...logits);
  const ex = logits.map((l) => Math.exp(l - m));
  const sum = ex.reduce((a, b) => a + b, 0);
  const probs = ex.map((v) => v / sum);
  let best = 0;
  probs.forEach((p, i) => (p > probs[best] ? (best = i) : 0));
  return { tone: best + 1, probs };
}

/** Lenient verdict for learners: only say "wrong" when the model is confident. */
export function toneVerdict(probs: number[], expected: number): 'ok' | 'wrong' | 'unclear' {
  const pe = probs[expected - 1];
  const best = probs.indexOf(Math.max(...probs));
  const other = Math.max(...probs.filter((_, i) => i !== expected - 1));
  if (pe >= 0.25 || best === expected - 1) return 'ok';
  if (pe < 0.1 && other >= 0.6) return 'wrong';
  return 'unclear';
}

/* ---------------- sound comparison ---------------- */

/** DTW between two MFCC sequences. Returns per-frame cost along the best path, indexed by frames of `a`. */
export function dtwCosts(a: number[][], b: number[][]): number[] {
  const n = a.length, m = b.length;
  if (!n || !m) return [];
  const dist = (i: number, j: number) => {
    let s = 0;
    for (let k = 0; k < a[i].length; k++) s += (a[i][k] - b[j][k]) ** 2;
    return Math.sqrt(s / a[i].length);
  };
  const band = Math.max(Math.abs(n - m) + 10, Math.floor(Math.max(n, m) * 0.4));
  const D = Array.from({ length: n }, () => new Float64Array(m).fill(Infinity));
  const P = Array.from({ length: n }, () => new Int8Array(m));
  for (let i = 0; i < n; i++) {
    const jc = Math.round((i * (m - 1)) / Math.max(1, n - 1));
    for (let j = Math.max(0, jc - band); j <= Math.min(m - 1, jc + band); j++) {
      const c = dist(i, j);
      if (i === 0 && j === 0) { D[i][j] = c; continue; }
      let best = Infinity, p = 0;
      if (i > 0 && D[i - 1][j] < best) { best = D[i - 1][j]; p = 1; }
      if (j > 0 && D[i][j - 1] < best) { best = D[i][j - 1]; p = 2; }
      if (i > 0 && j > 0 && D[i - 1][j - 1] <= best) { best = D[i - 1][j - 1]; p = 3; }
      D[i][j] = c + best;
      P[i][j] = p;
    }
  }
  // backtrack, average local cost per frame of a
  const per = new Array(n).fill(0), cnt = new Array(n).fill(0);
  let i = n - 1, j = m - 1;
  while (i >= 0 && j >= 0) {
    per[i] += dist(i, j);
    cnt[i]++;
    const p = P[i][j];
    if (i === 0 && j === 0) break;
    if (p === 1) i--;
    else if (p === 2) j--;
    else { i--; j--; }
  }
  return per.map((v, k) => (cnt[k] ? v / cnt[k] : 0));
}

export { median };
