/**
 * The Closer — audio.
 *
 * Background music is a real looping MP3 played through an HTML5 Audio element
 * (no synthesis), while the short cues stay synthesized with the Web Audio API
 * so they stay crisp and need no files.
 *
 * ── SWAP THE MUSIC ────────────────────────────────────────────────────────
 * Change BG_MUSIC_URL below to any royalty-free .mp3 of your own; the loop and
 * 0.35 volume are applied automatically.
 */

export const BG_MUSIC_URL =
  "https://assets.mixkit.co/music/preview/mixkit-game-level-music-689.mp3";

const BG_MUSIC_VOLUME = 0.35;
const MASTER = 0.85;

let ac = null;
let master = null;
let muted = false;

/* ── background music (HTML5 Audio) ─────────────────────────────────────── */

let bgMusic = null;

function music() {
  if (typeof window === "undefined") return null;
  if (!bgMusic) {
    bgMusic = new window.Audio(BG_MUSIC_URL);
    bgMusic.loop = true;
    bgMusic.preload = "auto";
    bgMusic.volume = muted ? 0 : BG_MUSIC_VOLUME;
  }
  return bgMusic;
}

export function startCloserMusic() {
  const el = music();
  if (!el) return;
  el.volume = muted ? 0 : BG_MUSIC_VOLUME;
  if (!el.paused) return;
  const attempt = el.play();
  if (attempt && attempt.catch) attempt.catch(() => {});
}

export function stopCloserMusic() {
  const el = bgMusic;
  if (!el) return;
  el.pause();
  try {
    el.currentTime = 0;
  } catch {
    // streams that have not buffered yet can refuse a seek — pausing is enough
  }
}

/* ── cue graph ──────────────────────────────────────────────────────────── */

/** Lazily build (and resume) the shared cue graph. */
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
  music();
}

export function setCloserMuted(next) {
  muted = next;
  const el = bgMusic;
  if (el) el.volume = muted ? 0 : BG_MUSIC_VOLUME;
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