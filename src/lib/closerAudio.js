/**
 * The Closer — audio.
 *
 * Everything here is synthesised with the Web Audio API: the background bed is
 * a slow, tense sixteenth-note sequencer (a minor-key pulse plus a sparse
 * marimba motif) and the short cues sit on the same graph. No MP3, no network
 * request, so the bed cannot fail because a file host is blocked.
 */

const MASTER = 0.8;
const MUSIC_LEVEL = 0.9;

let ac = null;
let master = null;
let musicBus = null;
let muted = false;

/* ── the music loop ─────────────────────────────────────────────────────── */

const BPM = 84;
const STEP = 60 / BPM / 2; // eighth notes
const LOOP_STEPS = 16;

/** Heartbeat low end — D2 with a passing A2/C2 to keep it unsettled. */
const BASS = [
  { step: 0, freq: 73.42, dur: 0.95, peak: 0.085 },
  { step: 4, freq: 73.42, dur: 0.55, peak: 0.06 },
  { step: 6, freq: 110.0, dur: 0.5, peak: 0.045 },
  { step: 8, freq: 73.42, dur: 0.95, peak: 0.085 },
  { step: 12, freq: 73.42, dur: 0.55, peak: 0.06 },
  { step: 14, freq: 98.0, dur: 0.5, peak: 0.045 },
];

/** D harmonic minor motif — the raised C# is what makes it feel like a gamble. */
const MOTIF = [
  { step: 0, freq: 293.66, dur: 0.5, peak: 0.042 },
  { step: 2, freq: 349.23, dur: 0.4, peak: 0.034 },
  { step: 4, freq: 440.0, dur: 0.5, peak: 0.038 },
  { step: 6, freq: 554.37, dur: 0.45, peak: 0.036 },
  { step: 8, freq: 587.33, dur: 0.6, peak: 0.042 },
  { step: 10, freq: 440.0, dur: 0.4, peak: 0.032 },
  { step: 12, freq: 349.23, dur: 0.45, peak: 0.034 },
  { step: 14, freq: 329.63, dur: 0.5, peak: 0.036 },
];

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

/** One soft note routed to the music bus. */
function musicNote(freq, type, t, dur, peak) {
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(peak, t + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(gain);
  gain.connect(musicBus);
  osc.start(t);
  osc.stop(t + dur + 0.03);
}

/** Schedule a single step of the loop. */
function musicStep() {
  if (!ac || !musicBus) return;
  const t = ac.currentTime + 0.03;
  const i = stepIndex % LOOP_STEPS;
  stepIndex += 1;

  BASS.forEach((n) => {
    if (n.step === i) musicNote(n.freq, "triangle", t, n.dur, n.peak);
  });
  MOTIF.forEach((n) => {
    if (n.step === i) musicNote(n.freq, "sine", t, n.dur, n.peak);
  });
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