/**
 * Original score and crowd for the Daily Derby, synthesized live with the Web
 * Audio API — no audio files to load, and the music, hoofbeats and crowd are
 * composed here rather than sampled.
 *
 * Browsers refuse audio before a user gesture, so playback only starts from an
 * unlock (the Watch the Race tap, or any first interaction). Layers:
 *   · a 160 BPM arcade chiptune loop (square lead, bouncing triangle bass,
 *     kick, snare and hats)
 *   · a three-beat gallop of hoof thumps underneath it
 *   · band-passed noise for the crowd, swelling as the race closes
 * One master gain carries the mute, one bus gain fades the race out.
 */

const BEAT = 0.375; // 160 BPM
const HALF = BEAT / 2;

const NOTE = {
  F2: 87.31,
  G2: 98.0,
  A2: 110.0,
  C3: 130.81,
  F3: 174.61,
  G3: 196.0,
  A3: 220.0,
  B3: 246.94,
  C4: 261.63,
  D4: 293.66,
  E4: 329.63,
  F4: 349.23,
  G4: 392.0,
  A4: 440.0,
  B4: 493.88,
  C5: 523.25,
  D5: 587.33,
  E5: 659.25,
  G5: 783.99,
  A5: 880.0,
};

// Four-bar loop: a driving minor riff with a bouncing bass per bar.
const BARS = [
  { bass: "A2", lead: ["A4", "C5", "E5", "A4", "G4", "E5", "C5", "E5"] },
  { bass: "F2", lead: ["F4", "A4", "C5", "F4", "E4", "C5", "A4", "C5"] },
  { bass: "G2", lead: ["G4", "B4", "D5", "G4", "F4", "D5", "B4", "D5"] },
  { bass: "A2", lead: ["A4", "C5", "E5", "A5", "G5", "E5", "C5", "A4"] },
];

let ac = null;
let master = null;
let bus = null;
let noise = null;
let crowd = null;
let timer = null;
let nextBeatAt = 0;
let beatIndex = 0;
let playing = false;
let wanted = false;
let muted = false;
let raceSeconds = 15;

const listeners = new Set();

function ensure() {
  if (typeof window === "undefined") return null;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  if (!ac) {
    ac = new AC();
    master = ac.createGain();
    master.gain.value = muted ? 0 : 1;
    master.connect(ac.destination);
    bus = ac.createGain();
    bus.gain.value = 0.0001;
    bus.connect(master);
  }
  return ac;
}

function noiseBuffer() {
  if (noise) return noise;
  const len = Math.floor(ac.sampleRate * 2);
  noise = ac.createBuffer(1, len, ac.sampleRate);
  const data = noise.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  return noise;
}

function tone(type, freq, t, dur, vol, endFreq) {
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (endFreq) osc.frequency.exponentialRampToValueAtTime(endFreq, t + dur);
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(vol, t + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(gain);
  gain.connect(bus);
  osc.start(t);
  osc.stop(t + dur + 0.03);
}

function noiseHit(t, dur, vol, type, freq, q = 1) {
  const src = ac.createBufferSource();
  src.buffer = noiseBuffer();
  const filter = ac.createBiquadFilter();
  filter.type = type;
  filter.frequency.value = freq;
  filter.Q.value = q;
  const gain = ac.createGain();
  gain.gain.setValueAtTime(vol, t);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(filter);
  filter.connect(gain);
  gain.connect(bus);
  src.start(t, Math.random() * 1.5, dur + 0.05);
}

function scheduleBeat(index, t) {
  const bar = BARS[Math.floor(index / 8) % BARS.length];
  const beat = index % 8;

  // bass — two pumping eighths, second one an octave up
  tone("triangle", NOTE[bar.bass], t, HALF * 0.9, 0.17);
  tone("triangle", NOTE[bar.bass] * 2, t + HALF, HALF * 0.75, 0.11);

  // lead — square arpeggio run
  tone("square", NOTE[bar.lead[beat]], t, 0.2, 0.05);
  tone("square", NOTE[bar.lead[(beat + 4) % 8]], t + HALF, 0.14, 0.035);

  // drums
  if (beat === 0 || beat === 3 || beat === 4) tone("sine", 130, t, 0.16, 0.5, 46);
  if (beat === 2 || beat === 6) noiseHit(t, 0.11, 0.13, "bandpass", 1900, 0.8);
  noiseHit(t, 0.035, 0.05, "highpass", 6800);
  noiseHit(t + HALF, 0.03, 0.04, "highpass", 7200);

  // gallop — three hoof thumps per beat, slightly ragged like real hooves
  [0.02, 0.14, 0.25].forEach((offset, i) => {
    const jitter = (Math.random() - 0.5) * 0.012;
    tone("sine", 165 - i * 14, t + offset + jitter, 0.1, 0.13, 62);
    noiseHit(t + offset + jitter, 0.05, 0.045, "lowpass", 900);
  });
}

function tick() {
  const horizon = ac.currentTime + 0.45;
  while (nextBeatAt < horizon) {
    scheduleBeat(beatIndex, nextBeatAt);
    nextBeatAt += BEAT;
    beatIndex += 1;
  }
}

function startCrowd() {
  const src = ac.createBufferSource();
  src.buffer = noiseBuffer();
  src.loop = true;
  const band = ac.createBiquadFilter();
  band.type = "bandpass";
  band.frequency.value = 850;
  band.Q.value = 0.7;
  const air = ac.createBiquadFilter();
  air.type = "bandpass";
  air.frequency.value = 2400;
  air.Q.value = 1.2;
  const gain = ac.createGain();

  const now = ac.currentTime;
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.03, now + 1.4);
  gain.gain.linearRampToValueAtTime(0.045, now + raceSeconds * 0.72);
  gain.gain.linearRampToValueAtTime(0.13, now + raceSeconds);

  src.connect(band);
  band.connect(gain);
  src.connect(air);
  air.connect(gain);
  gain.connect(bus);
  src.start();
  crowd = src;
}

function begin() {
  if (!ac || playing) return;
  playing = true;
  const now = ac.currentTime;
  bus.gain.cancelScheduledValues(now);
  bus.gain.setValueAtTime(0.0001, now);
  bus.gain.exponentialRampToValueAtTime(0.9, now + 0.12);
  beatIndex = 0;
  nextBeatAt = now + 0.06;
  startCrowd();
  tick();
  timer = setInterval(tick, 90);
}

function halt() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
  if (!ac || !playing) return;
  playing = false;
  const now = ac.currentTime;
  bus.gain.cancelScheduledValues(now);
  bus.gain.setValueAtTime(Math.max(bus.gain.value, 0.0001), now);
  bus.gain.linearRampToValueAtTime(0.0001, now + 0.22);
  const src = crowd;
  crowd = null;
  if (src) {
    try {
      src.stop(now + 0.26);
    } catch {
      /* already stopped */
    }
  }
}

function notify() {
  listeners.forEach((fn) => fn(muted));
}

export function isRaceAudioMuted() {
  return muted;
}

export function subscribeRaceAudioMute(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function setRaceAudioMuted(next) {
  muted = Boolean(next);
  if (ac && master) master.gain.setTargetAtTime(muted ? 0 : 1, ac.currentTime, 0.02);
  notify();
}

/** Call from a click/tap so the browser lets the race be heard. */
export function unlockRaceAudio() {
  const ctx = ensure();
  if (!ctx) return;
  if (ctx.state === "suspended") {
    ctx.resume().then(() => {
      if (wanted) begin();
    }).catch(() => {});
  } else if (wanted && !playing) {
    begin();
  }
}

export function startRaceAudio(seconds = 15) {
  const ctx = ensure();
  if (!ctx) return;
  raceSeconds = seconds;
  wanted = true;
  if (ctx.state === "running") begin();
  else
    ctx.resume().then(() => {
      if (wanted) begin();
    }).catch(() => {});
}

export function stopRaceAudio() {
  wanted = false;
  halt();
}