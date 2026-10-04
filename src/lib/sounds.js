// One shared AudioContext for the whole app. Creating a fresh context per
// sound is expensive and browsers cap how many can be live at once, which
// caused audio lag and dropped sounds. Reuse a single one (and resume it if
// the browser suspended it) instead.
let sharedCtx = null;
const ctx = () => {
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) throw new Error("Web Audio unsupported");
  if (!sharedCtx) sharedCtx = new AC();
  if (sharedCtx.state === "suspended") sharedCtx.resume();
  return sharedCtx;
};

export function playClick() {
  try {
    const ac = ctx();
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.connect(gain);
    gain.connect(ac.destination);
    osc.type = "sine";
    osc.frequency.setValueAtTime(600, ac.currentTime);
    osc.frequency.exponentialRampToValueAtTime(300, ac.currentTime + 0.08);
    gain.gain.setValueAtTime(0.3, ac.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.08);
    osc.start(ac.currentTime);
    osc.stop(ac.currentTime + 0.08);
  } catch {}
}

export function playWin() {
  try {
    const ac = ctx();
    [0, 0.1, 0.2].forEach((delay, i) => {
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.connect(gain);
      gain.connect(ac.destination);
      osc.type = "sine";
      osc.frequency.setValueAtTime([523, 659, 784][i], ac.currentTime + delay);
      gain.gain.setValueAtTime(0.25, ac.currentTime + delay);
      gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + delay + 0.2);
      osc.start(ac.currentTime + delay);
      osc.stop(ac.currentTime + delay + 0.2);
    });
  } catch {}
}

export function playLoss() {
  try {
    const ac = ctx();
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.connect(gain);
    gain.connect(ac.destination);
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(220, ac.currentTime);
    osc.frequency.exponentialRampToValueAtTime(100, ac.currentTime + 0.3);
    gain.gain.setValueAtTime(0.2, ac.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.3);
    osc.start(ac.currentTime);
    osc.stop(ac.currentTime + 0.3);
  } catch {}
}

// Perfect 10 — start beep (short rising tone)
export function playP10Start() {
  try {
    const ac = ctx();
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.connect(gain);
    gain.connect(ac.destination);
    osc.type = "sine";
    osc.frequency.setValueAtTime(400, ac.currentTime);
    osc.frequency.exponentialRampToValueAtTime(700, ac.currentTime + 0.12);
    gain.gain.setValueAtTime(0.25, ac.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.12);
    osc.start(ac.currentTime);
    osc.stop(ac.currentTime + 0.12);
  } catch {}
}

// Perfect 10 — stop beep (neutral click-thud)
export function playP10Stop() {
  try {
    const ac = ctx();
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.connect(gain);
    gain.connect(ac.destination);
    osc.type = "square";
    osc.frequency.setValueAtTime(250, ac.currentTime);
    osc.frequency.exponentialRampToValueAtTime(120, ac.currentTime + 0.1);
    gain.gain.setValueAtTime(0.18, ac.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.1);
    osc.start(ac.currentTime);
    osc.stop(ac.currentTime + 0.1);
  } catch {}
}

// Perfect 10 — jackpot (triumphant ascending arpeggio)
export function playP10Jackpot() {
  try {
    const ac = ctx();
    [523, 659, 784, 1047].forEach((freq, i) => {
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.connect(gain);
      gain.connect(ac.destination);
      osc.type = "sine";
      const t = ac.currentTime + i * 0.1;
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.3, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
      osc.start(t);
      osc.stop(t + 0.25);
    });
  } catch {}
}

// Perfect 10 — close call (two quick rising pings)
export function playP10Close() {
  try {
    const ac = ctx();
    [600, 800].forEach((freq, i) => {
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.connect(gain);
      gain.connect(ac.destination);
      osc.type = "sine";
      const t = ac.currentTime + i * 0.15;
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.22, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
      osc.start(t);
      osc.stop(t + 0.18);
    });
  } catch {}
}

// Perfect 10 — miss (descending buzz)
export function playP10Miss() {
  try {
    const ac = ctx();
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.connect(gain);
    gain.connect(ac.destination);
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(300, ac.currentTime);
    osc.frequency.exponentialRampToValueAtTime(130, ac.currentTime + 0.35);
    gain.gain.setValueAtTime(0.18, ac.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.35);
    osc.start(ac.currentTime);
    osc.stop(ac.currentTime + 0.35);
  } catch {}
}

// Casino 21 — ceramic chip clink
export function playClink() {
  try {
    const ac = ctx();
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.connect(gain);
    gain.connect(ac.destination);
    osc.type = "triangle";
    osc.frequency.setValueAtTime(1400, ac.currentTime);
    osc.frequency.exponentialRampToValueAtTime(900, ac.currentTime + 0.06);
    gain.gain.setValueAtTime(0.15, ac.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.08);
    osc.start(ac.currentTime);
    osc.stop(ac.currentTime + 0.08);
  } catch {}
}

// Casino 21 — soft card slide / deal swish (filtered noise burst)
export function playCardSlide() {
  try {
    const ac = ctx();
    const buffer = ac.createBuffer(1, ac.sampleRate * 0.12, ac.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / data.length, 2);
    }
    const src = ac.createBufferSource();
    src.buffer = buffer;
    const filter = ac.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = 2500;
    const gain = ac.createGain();
    gain.gain.value = 0.12;
    src.connect(filter);
    filter.connect(gain);
    gain.connect(ac.destination);
    src.start();
  } catch {}
}

// Casino 21 — win fanfare (5-note ascending arpeggio)
export function playWinFanfare() {
  try {
    const ac = ctx();
    [523, 659, 784, 988, 1175].forEach((freq, i) => {
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.connect(gain);
      gain.connect(ac.destination);
      osc.type = "sine";
      const t = ac.currentTime + i * 0.09;
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.28, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
      osc.start(t);
      osc.stop(t + 0.22);
    });
  } catch {}
}

// Casino 21 — push chime (two soft neutral tones)
export function playPush() {
  try {
    const ac = ctx();
    [440, 440].forEach((freq, i) => {
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.connect(gain);
      gain.connect(ac.destination);
      osc.type = "sine";
      const t = ac.currentTime + i * 0.18;
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.18, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
      osc.start(t);
      osc.stop(t + 0.16);
    });
  } catch {}
}