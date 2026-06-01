const ctx = () => new (window.AudioContext || window.webkitAudioContext)();

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