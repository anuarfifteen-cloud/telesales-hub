/**
 * The Closer — audio.
 *
 * Everything here is synthesised with the Web Audio API: the background bed is
 * the "Sneaky Office Heist" loop — bouncy pizzicato strings walking over
 * tiptoe percussion with cheeky little woodblock winks — and the short cues
 * sit on the same graph. No MP3, no network request, so the bed cannot fail
 * because a file host is blocked.
 */

const MASTER = 0.8;
const MUSIC_LEVEL = 0.9;

let ac = null;
let master = null;
let musicBus = null;
let muted = false;

/* ── the music loop ─────────────────────────────────────────────────────── */

const BPM = 112;
const STEP = 60 / BPM / 2; // eighth notes
const LOOP_STEPS = 16;

/** Walking pizzicato bass — the tiptoe across the office floor. */
const BASS = [
  { step: 0, freq: 146.83, dur: 0.22, peak: 0.075 }, // D3
  { step: 3, freq: 146.83, dur: 0.16, peak: 0.05 },
  { step: 4, freq: 174.61, dur: 0.22, peak: 0.065 }, // F3
  { step: 6, freq: 196.0, dur: 0.2, peak: 0.06 }, // G3
  { step: 8, freq: 220.0, dur: 0.22, peak: 0.07 }, // A3
  { step: 11, freq: 196.0, dur: 0.16, peak: 0.05 },
  { step: 12, freq: 174.61, dur: 0.22, peak: 0.06 },
  { step: 14, freq: 164.81, dur: 0.18, peak: 0.055 }, // E3
  { step: 15, freq: 155.56, dur: 0.14, peak: 0.05 }, // Eb3 — the cheeky lift
];

/** Bouncy staccato riff on top, with plenty of little rests to stay sneaky. */
const RIFF = [
  { step: 0, freq: 440.0, dur: 0.18, peak: 0.05 }, // A4
  { step: 1, freq: 587.33, dur: 0.16, peak: 0.048 }, // D5
  { step: 2, freq: 698.46, dur: 0.18, peak: 0.052 }, // F5
  { step: 3, freq: 659.25, dur: 0.14, peak: 0.042 }, // E5
  { step: 4, freq: 587.33, dur: 0.2, peak: 0.05 }, // D5
  { step: 5, freq: 440.0, dur: 0.14, peak: 0.04 }, // A4
  { step: 7, freq: 523.25, dur: 0.16, peak: 0.044 }, // C5
  { step: 8, freq: 587.33, dur: 0.18, peak: 0.05 }, // D5
  { step: 9, freq: 698.46, dur: 0.16, peak: 0.046 }, // F5
  { step: 10, freq: 880.0, dur: 0.2, peak: 0.05 }, // A5
  { step: 11, freq: 783.99, dur: 0.16, peak: 0.044 }, // G5
  { step: 12, freq: 698.46, dur: 0.18, peak: 0.046 }, // F5
  { step: 14, freq: 587.33, dur: 0.16, peak: 0.044 }, // D5
  { step: 15, freq: 554.37, dur: 0.16, peak: 0.046 }, // C#5, landing back on D
];

/** Tiptoe percussion: off-beat ticks, soft kicks, brush strokes, woodblock winks. */
const TICKS = [1, 3, 5, 7, 9, 11, 13];
const BRUSHES = [4, 12];
const KICKS = [0, 8, 11];
const WINK = 6;
const WOODBLOCK = 15;

let musicTimer = null;
let stepIndex = 0;

/* ── graph ──────────────────────────────────────────────────────────────── */

/** Lazily build (and resume) the shared audio graph. */
function graph() {
  if (typeof window === "undefined") return null;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  if (!ac) {
    ac = new AC();
    master = ac.createGain();
    master.gain.value = muted ? 0 : MASTER;
    master.connect(ac.destination);
    musicBus = ac.createGain();
    musicBus.gain.value = MUSIC_LEVEL;
    musicBus.connect(master);
  }
  if (ac.state === "suspended") ac.resume().catch(() => {});
  return ac;
}

/** Bouncy pizzicato string pluck — fast attack, quick choked decay. */
function pizz(freq, t, dur, peak) {
  const body = ac.createOscillator();
  body.type = "sawtooth";
  body.frequency.setValueAtTime(freq, t);
  const top = ac.createOscillator();
  top.type = "triangle";
  top.frequency.setValueAtTime(freq * 2, t);

  const lp = ac.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.setValueAtTime(Math.min(6000, freq * 9), t);
  lp.frequency.exponentialRampToValueAtTime(Math.max(400, freq * 2.2), t + dur);
  lp.Q.value = 2.4;

  const gain = ac.createGain();
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(peak, t + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);

  body.connect(lp);
  top.connect(lp);
  lp.connect(gain);
  gain.connect(musicBus);
  body.start(t);
  body.stop(t + dur + 0.02);
  top.start(t);
  top.stop(t + dur + 0.02);
}

/** Short filtered noise — tiptoe ticks and brush strokes. */
function musicNoise(t, dur, peak, bandFreq, q = 1.4) {
  const len = Math.max(1, Math.floor(ac.sampleRate * dur));
  const buffer = ac.createBuffer(1, len, ac.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < len; i += 1) {
    data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2);
  }
  const src = ac.createBufferSource();
  src.buffer = buffer;
  const band = ac.createBiquadFilter();
  band.type = "bandpass";
  band.frequency.setValueAtTime(bandFreq, t);
  band.Q.value = q;
  const gain = ac.createGain();
  gain.gain.setValueAtTime(peak, t);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(band);
  band.connect(gain);
  gain.connect(musicBus);
  src.start(t);
  src.stop(t + dur + 0.02);
}

/** Soft low kick that keeps the groove walking. */
function musicKick(t, peak) {
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(140, t);
  osc.frequency.exponentialRampToValueAtTime(52, t + 0.13);
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(peak, t + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
  osc.connect(gain);
  gain.connect(musicBus);
  osc.start(t);
  osc.stop(t + 0.19);
}

/** Cheeky little woodblock wink. */
function musicWoodblock(t, freq, peak) {
  const osc = ac.createOscillator();
  const bp = ac.createBiquadFilter();
  const gain = ac.createGain();
  osc.type = "square";
  osc.frequency.setValueAtTime(freq, t);
  bp.type = "bandpass";
  bp.frequency.value = freq * 1.6;
  bp.Q.value = 6;
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(peak, t + 0.004);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
  osc.connect(bp);
  bp.connect(gain);
  gain.connect(musicBus);
  osc.start(t);
  osc.stop(t + 0.11);
}

/** Schedule a single step of the loop. */
function musicStep() {
  if (!ac || !musicBus) return;
  const t = ac.currentTime + 0.03;
  const i = stepIndex % LOOP_STEPS;
  stepIndex += 1;

  BASS.forEach((n) => {
    if (n.step === i) pizz(n.freq, t, n.dur, n.peak);
  });
  RIFF.forEach((n) => {
    if (n.step === i) pizz(n.freq, t, n.dur, n.peak);
  });
  if (KICKS.includes(i)) musicKick(t, i === 0 ? 0.085 : 0.055);
  if (TICKS.includes(i)) musicNoise(t, 0.05, 0.026, 5200, 3);
  if (BRUSHES.includes(i)) musicNoise(t, 0.12, 0.05, 1900, 1.1);
  if (i === WINK) musicWoodblock(t, 1500, 0.03);
  if (i === WOODBLOCK) {
    musicWoodblock(t, 1180, 0.05);
    musicWoodblock(t + 0.09, 1560, 0.038);
  }
}

/**
 * Start (or resume) the bed. Always safe to call from a click handler: the
 * graph is created and resumed synchronously inside the gesture.
 */
export function startCloserMusic() {
  const ctx = graph();
  if (!ctx || musicTimer) return;
  stepIndex = 0;
  musicStep();
  musicTimer = setInterval(musicStep, STEP * 1000);
}

export function stopCloserMusic() {
  if (musicTimer) {
    clearInterval(musicTimer);
    musicTimer = null;
  }
  stepIndex = 0;
}

/**
 * Call synchronously from a click (the seat tap) so the browser treats audio as
 * user-initiated: the graph resumes and the bed starts in that same gesture.
 */
export function unlockCloserAudio() {
  graph();
  startCloserMusic();
}

export function setCloserMuted(next) {
  muted = next;
  if (!ac || !master) return;
  const now = ac.currentTime;
  master.gain.cancelScheduledValues(now);
  master.gain.setValueAtTime(master.gain.value, now);
  master.gain.linearRampToValueAtTime(muted ? 0 : MASTER, now + 0.25);
}

/* ── voices (cues only) ─────────────────────────────────────────────────── */

/** A soft pitched thump — impact body for the cues. */
function thump(t, from, to, dur, peak) {
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(from, t);
  osc.frequency.exponentialRampToValueAtTime(to, t + dur);
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(peak, t + 0.014);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(gain);
  gain.connect(master);
  osc.start(t);
  osc.stop(t + dur + 0.03);
}

/** Bright marimba-style note. */
function pluck(freq, t, dur, peak) {
  [
    { freq, type: "sine", gain: peak },
    { freq: freq * 2, type: "triangle", gain: peak * 0.35 },
  ].forEach((voice) => {
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = voice.type;
    osc.frequency.value = voice.freq;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(voice.gain, t + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(gain);
    gain.connect(master);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  });
}

/** Slow-rising high note. */
function swell(t, freq, dur = 1.4, peak = 0.035) {
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(freq, t);
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.linearRampToValueAtTime(peak, t + dur * 0.4);
  gain.gain.linearRampToValueAtTime(0.0001, t + dur);
  osc.connect(gain);
  gain.connect(master);
  osc.start(t);
  osc.stop(t + dur + 0.05);
}

/** Filtered noise burst — paper and air. */
function paper(t, dur, peak, bandFreq, q = 1.2) {
  const len = Math.max(1, Math.floor(ac.sampleRate * dur));
  const buffer = ac.createBuffer(1, len, ac.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < len; i += 1) {
    data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.2);
  }
  const src = ac.createBufferSource();
  src.buffer = buffer;
  const band = ac.createBiquadFilter();
  band.type = "bandpass";
  band.frequency.setValueAtTime(bandFreq, t);
  band.frequency.exponentialRampToValueAtTime(Math.max(200, bandFreq * 0.4), t + dur);
  band.Q.value = q;
  const gain = ac.createGain();
  gain.gain.setValueAtTime(peak, t);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(band);
  band.connect(gain);
  gain.connect(master);
  src.start(t);
  src.stop(t + dur + 0.02);
}

/* ── cues ───────────────────────────────────────────────────────────────── */

/** select = folder kept · reveal = folder flipped · ring = the Manager · win = payout */
export function playCloserCue(key) {
  if (muted) return;
  const ctx = graph();
  if (!ctx) return;
  const t = ctx.currentTime + 0.02;

  if (key === "select") {
    pluck(880, t, 0.4, 0.06);
    thump(t, 300, 165, 0.1, 0.07);
    return;
  }

  if (key === "reveal") {
    paper(t, 0.26, 0.11, 2400);
    thump(t, 120, 58, 0.19, 0.06);
    return;
  }

  if (key === "ring") {
    // A restrained two-tone office ring, two rings only.
    [0, 0.62].forEach((offset) => {
      [440, 480].forEach((freq) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.0001, t + offset);
        gain.gain.linearRampToValueAtTime(0.05, t + offset + 0.03);
        gain.gain.setValueAtTime(0.05, t + offset + 0.24);
        gain.gain.linearRampToValueAtTime(0.0001, t + offset + 0.3);
        osc.connect(gain);
        gain.connect(master);
        osc.start(t + offset);
        osc.stop(t + offset + 0.34);
      });
    });
    return;
  }

  if (key === "win") {
    // A bright major flourish to celebrate the payout.
    [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
      pluck(freq, t + i * 0.09, 0.9, 0.055);
    });
    swell(t, 523.25, 1.6, 0.03);
    paper(t + 0.05, 0.45, 0.04, 3200, 0.8);
  }
}