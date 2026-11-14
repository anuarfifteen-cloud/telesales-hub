/**
 * The Closer — cinematic suspense score, synthesized live with the Web Audio
 * API (the same approach as the Derby's raceAudio): no audio files to load and
 * nothing to host.
 *
 * The bed is deliberately restrained so the cues stay the star:
 *   · a low A1/E2 drone with a slow 0.13 Hz tremolo
 *   · a 60 BPM heartbeat (lub-dub) underneath it
 *   · a sparse high tension note every four beats
 *
 * Browsers refuse audio before a user gesture, so `unlockCloserAudio()` is
 * called from the seat tap; the music itself only starts once a round is live.
 */

const BEAT = 0.5; // eighth-note resolution at 60 BPM
const LOOKAHEAD = 0.25;
const MASTER = 0.85;

let ac = null;
let master = null;
let drone = null;
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

/** A soft pitched thump — heartbeat and impact body. */
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

/** A slow-rising high note used for tension. */
function swell(t, freq, dur = 3.2, peak = 0.04) {
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

/* ── the bed ────────────────────────────────────────────────────────────── */

function startDrone() {
  const now = ac.currentTime;
  const gain = ac.createGain();
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.linearRampToValueAtTime(0.15, now + 1.8);

  const filter = ac.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 340;
  filter.Q.value = 0.6;
  gain.connect(filter);
  filter.connect(master);

  const voices = [
    { freq: 55, type: "sine" },
    { freq: 55.4, type: "sine" },
    { freq: 82.41, type: "triangle" },
  ];
  const nodes = voices.map(({ freq, type }) => {
    const osc = ac.createOscillator();
    osc.type = type;
    osc.frequency.value = freq;
    osc.connect(gain);
    osc.start(now);
    return osc;
  });

  // Slow tremolo keeps the drone breathing instead of droning flat.
  const lfo = ac.createOscillator();
  const lfoDepth = ac.createGain();
  lfo.frequency.value = 0.13;
  lfoDepth.gain.value = 0.05;
  lfo.connect(lfoDepth);
  lfoDepth.connect(gain.gain);
  lfo.start(now);
  nodes.push(lfo);

  drone = { nodes, gain };
}

const TENSION = [440, 523.25, 587.33, 659.25];

function schedule() {
  if (!ac || !running) return;
  while (nextAt < ac.currentTime + LOOKAHEAD) {
    const t = nextAt;
    const beat = step % 8;

    // Heartbeat once a second: "lub" then the softer "dub".
    if (beat % 2 === 0) {
      thump(t, 72, 40, 0.34, 0.15);
      thump(t + 0.2, 62, 34, 0.3, 0.09);
    }
    // One high tension note per four-beat bar.
    if (beat === 0) {
      swell(t, TENSION[Math.floor(step / 8) % TENSION.length]);
    }

    step += 1;
    nextAt += BEAT;
  }
}

export function startCloserMusic() {
  const ctx = graph();
  if (!ctx || running) return;
  running = true;
  startDrone();
  step = 0;
  nextAt = ctx.currentTime + 0.1;
  timer = setInterval(schedule, 60);
  schedule();
}

export function stopCloserMusic() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
  running = false;
  if (!ac || !drone) return;
  const now = ac.currentTime;
  const { nodes, gain } = drone;
  drone = null;
  try {
    gain.gain.cancelScheduledValues(now);
    gain.gain.setValueAtTime(gain.gain.value, now);
    gain.gain.linearRampToValueAtTime(0.0001, now + 0.8);
    nodes.forEach((node) => node.stop(now + 0.9));
  } catch {
    /* already torn down */
  }
}

/* ── cues ───────────────────────────────────────────────────────────────── */

/** select = folder kept · reveal = folder flipped · ring = the Manager · win = payout */
export function playCloserCue(key) {
  if (muted) return;
  const ctx = graph();
  if (!ctx) return;
  const t = ctx.currentTime + 0.02;

  if (key === "select") {
    thump(t, 300, 165, 0.13, 0.1);
    swell(t, 587.33, 0.5, 0.035);
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
    // Warm A-major swell that resolves the tension instead of shouting.
    [220, 277.18, 329.63, 440].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = i === 0 ? "triangle" : "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.linearRampToValueAtTime(0.055, t + 0.9);
      gain.gain.linearRampToValueAtTime(0.0001, t + 2.6);
      osc.connect(gain);
      gain.connect(master);
      osc.start(t);
      osc.stop(t + 2.7);
    });
    thump(t, 96, 46, 0.55, 0.1);
    paper(t + 0.05, 0.5, 0.045, 3200, 0.8);
  }
}