/**
 * The Closer — light sales-floor score, synthesized live with the Web Audio API
 * (the same approach as the Derby's raceAudio): no audio files to load and
 * nothing to host.
 *
 * The groove is a relaxed, upbeat lounge/game-show loop at 124 BPM so the desk
 * feels busy and cheerful rather than tense:
 *   · a soft wooden tick on every eighth note (the rhythmic pulse)
 *   · a bouncing walking bass on the quarters
 *   · swung major-seventh chord stabs on the off-beats
 *   · a marimba sparkle once a bar
 *
 * Browsers refuse audio before a user gesture, so `unlockCloserAudio()` is
 * called from the seat tap; the music itself only starts once a round is live.
 */

const BPM = 124;
const STEP = 60 / BPM / 4; // one 16th note
const SWING = 0.055; // pushes the off-beats late for a shuffle
const LOOKAHEAD = 0.25;
const MASTER = 0.85;

/** Cmaj7 · Am7 · Dm7 · G7 — the four-bar loop. */
const BARS = [
  { bass: [130.81, 196.0, 196.0, 164.81], chord: [329.63, 392.0, 493.88] },
  { bass: [110.0, 164.81, 164.81, 146.83], chord: [261.63, 329.63, 392.0] },
  { bass: [146.83, 220.0, 220.0, 196.0], chord: [293.66, 349.23, 440.0] },
  { bass: [98.0, 146.83, 123.47, 146.83], chord: [293.66, 349.23, 493.88] },
];

let ac = null;
let master = null;
let timer = null;
let nextAt = 0;
let step = 0;
let running = false;
let muted = false;

/** Lazily build (and resume) the shared graph. */
function graph() {
  if (typeof window === "undefined") return null;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  if (!ac) {
    ac = new AC();
    master = ac.createGain();
    master.gain.value = muted ? 0 : MASTER;
    master.connect(ac.destination);
  }
  if (ac.state === "suspended") ac.resume().catch(() => {});
  return ac;
}

/** Call from a click so the browser treats audio as user-initiated. */
export function unlockCloserAudio() {
  graph();
}

export function setCloserMuted(next) {
  muted = next;
  if (!ac || !master) return;
  const now = ac.currentTime;
  master.gain.cancelScheduledValues(now);
  master.gain.setValueAtTime(master.gain.value, now);
  master.gain.linearRampToValueAtTime(muted ? 0 : MASTER, now + 0.25);
}

/* ── voices ─────────────────────────────────────────────────────────────── */

/** Wooden tick — the track's pulse. */
function tick(t, peak) {
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  const band = ac.createBiquadFilter();
  osc.type = "square";
  osc.frequency.setValueAtTime(2100, t);
  osc.frequency.exponentialRampToValueAtTime(1150, t + 0.03);
  band.type = "bandpass";
  band.frequency.value = 1900;
  band.Q.value = 3;
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(peak, t + 0.004);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
  osc.connect(band);
  band.connect(gain);
  gain.connect(master);
  osc.start(t);
  osc.stop(t + 0.06);
}

/** Bouncy upright bass. */
function bassNote(freq, t) {
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = "triangle";
  osc.frequency.setValueAtTime(freq, t);
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(0.1, t + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.34);
  osc.connect(gain);
  gain.connect(master);
  osc.start(t);
  osc.stop(t + 0.36);
}

/** Short swung chord stab. */
function chordStab(notes, t, peak) {
  notes.forEach((freq, i) => {
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = i === 0 ? "triangle" : "sine";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(peak, t + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
    osc.connect(gain);
    gain.connect(master);
    osc.start(t);
    osc.stop(t + 0.24);
  });
}

/** Marimba sparkle for the bar's flourish. */
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

/** A soft pitched thump — heartbeat and impact body for the cues. */
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

/** Filtered noise burst — paper, air, and breath. */
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

/* ── the loop ───────────────────────────────────────────────────────────── */

function schedule() {
  if (!ac || !running) return;
  while (nextAt < ac.currentTime + LOOKAHEAD) {
    const bar = BARS[Math.floor(step / 16) % BARS.length];
    const inBar = step % 16;
    const swung = inBar % 4 === 2;
    const t = swung ? nextAt + SWING : nextAt;

    if (inBar % 4 === 0) {
      bassNote(bar.bass[inBar / 4], t);
      tick(t, inBar === 0 || inBar === 8 ? 0.055 : 0.04);
      // One marimba flourish to close each bar.
      if (inBar === 12) pluck(bar.chord[2] * 2, t + 0.03, 0.5, 0.036);
    } else if (swung) {
      chordStab(bar.chord, t, inBar === 10 ? 0.055 : 0.045);
      tick(t, 0.022);
    }

    step += 1;
    nextAt += STEP;
  }
}

export function startCloserMusic() {
  const ctx = graph();
  if (!ctx || running) return;
  running = true;
  step = 0;
  nextAt = ctx.currentTime + 0.08;
  timer = setInterval(schedule, 60);
  schedule();
}

export function stopCloserMusic() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
  running = false;
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