import { useCallback, useEffect, useRef, useState } from "react";

const SFX_KEY = "ds_sfx";
const MUSIC_KEY = "ds_music";

/**
 * Procedural Web Audio sound system for Diamond Smash.
 * No external assets — all sounds are synthesized with the Web Audio API.
 */
export function useDiamondSmashAudio() {
  const ctxRef = useRef(null);
  const masterRef = useRef(null);
  const musicTimerRef = useRef(null);

  const [sfxOn, setSfxOn] = useState(() => localStorage.getItem(SFX_KEY) !== "false");
  const [musicOn, setMusicOn] = useState(() => localStorage.getItem(MUSIC_KEY) !== "false");

  const ensureCtx = useCallback(() => {
    if (typeof window === "undefined") return null;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;
    if (!ctxRef.current) {
      ctxRef.current = new Ctx();
      masterRef.current = ctxRef.current.createGain();
      masterRef.current.gain.value = 0.5;
      masterRef.current.connect(ctxRef.current.destination);
    }
    if (ctxRef.current.state === "suspended") ctxRef.current.resume();
    return ctxRef.current;
  }, []);

  const sfxEnabled = useCallback(() => localStorage.getItem(SFX_KEY) !== "false", []);

  // Rising arpeggio for standard 3-matches — more notes for higher cascades.
  const ARP = [523, 659, 784, 1047, 1319, 1568, 2093];
  const match = useCallback((cascade = 1) => {
    if (!sfxEnabled()) return;
    const ctx = ensureCtx();
    if (!ctx || !masterRef.current) return;
    const noteCount = Math.min(ARP.length, 2 + Math.max(1, cascade));
    const t0 = ctx.currentTime;
    for (let i = 0; i < noteCount; i++) {
      const t = t0 + i * 0.06;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(ARP[i], t);
      gain.gain.setValueAtTime(0.001, t);
      gain.gain.exponentialRampToValueAtTime(0.25, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
      osc.connect(gain).connect(masterRef.current);
      osc.start(t);
      osc.stop(t + 0.2);
    }
  }, [ensureCtx, sfxEnabled]);

  // One layered boom for every special (4-match row/col clear & 5+-match color wipe).
  // 80 Hz sine (0.25s, gain 0.30) + 160 Hz sawtooth (0.18s) + 400 Hz square (0.12s)
  // + a second 80 Hz sine at an 0.08s delay.
  const explosion = useCallback(() => {
    if (!sfxEnabled()) return;
    const ctx = ensureCtx();
    if (!ctx || !masterRef.current) return;
    const t0 = ctx.currentTime;
    const layers = [
      { type: "sine",    freq: 80,  dur: 0.25, gain: 0.30, delay: 0 },
      { type: "sawtooth", freq: 160, dur: 0.18, gain: 0.20, delay: 0 },
      { type: "square",  freq: 400, dur: 0.12, gain: 0.12, delay: 0 },
      { type: "sine",    freq: 80,  dur: 0.25, gain: 0.30, delay: 0.08 },
    ];
    layers.forEach((L) => {
      const t = t0 + L.delay;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = L.type;
      osc.frequency.setValueAtTime(L.freq, t);
      gain.gain.setValueAtTime(0.001, t);
      gain.gain.exponentialRampToValueAtTime(L.gain, t + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, t + L.dur);
      osc.connect(gain).connect(masterRef.current);
      osc.start(t);
      osc.stop(t + L.dur + 0.02);
    });
  }, [ensureCtx, sfxEnabled]);

  const sounds = { match, explosion };

  const playGameOver = useCallback(() => {
    if (!sfxEnabled()) return;
    const ctx = ensureCtx();
    if (!ctx || !masterRef.current) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(330, t);
    osc.frequency.exponentialRampToValueAtTime(80, t + 0.7);
    gain.gain.setValueAtTime(0.001, t);
    gain.gain.exponentialRampToValueAtTime(0.2, t + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.75);
    osc.connect(gain).connect(masterRef.current);
    osc.start(t);
    osc.stop(t + 0.76);
  }, [ensureCtx, sfxEnabled]);

  const stopMusic = useCallback(() => {
    if (musicTimerRef.current) {
      clearInterval(musicTimerRef.current);
      musicTimerRef.current = null;
    }
  }, []);

  const startMusic = useCallback(() => {
    if (localStorage.getItem(MUSIC_KEY) === "false") return;
    const ctx = ensureCtx();
    if (!ctx || !masterRef.current) return;
    stopMusic();
    const bpm = 120;
    const stepMs = ((60 / bpm) * 1000) / 2; // eighth notes
    const freqs = [261.63, 329.63, 392.0, 523.25]; // C major arpeggio
    let i = 0;
    const playNote = () => {
      const c = ctxRef.current;
      const m = masterRef.current;
      if (!c || !m) return;
      const f = freqs[i % freqs.length];
      i++;
      const t = c.currentTime;
      const osc = c.createOscillator();
      const gain = c.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(f, t);
      gain.gain.setValueAtTime(0.001, t);
      gain.gain.exponentialRampToValueAtTime(0.07, t + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, t + (stepMs / 1000) * 0.9);
      osc.connect(gain).connect(m);
      osc.start(t);
      osc.stop(t + stepMs / 1000);
    };
    playNote();
    musicTimerRef.current = setInterval(playNote, stepMs);
  }, [ensureCtx, stopMusic]);

  const toggleSfx = useCallback(() => {
    setSfxOn((prev) => {
      const next = !prev;
      localStorage.setItem(SFX_KEY, String(next));
      return next;
    });
  }, []);

  const toggleMusic = useCallback(() => {
    setMusicOn((prev) => {
      const next = !prev;
      localStorage.setItem(MUSIC_KEY, String(next));
      if (next) startMusic();
      else stopMusic();
      return next;
    });
  }, [startMusic, stopMusic]);

  useEffect(() => {
    return () => stopMusic();
  }, [stopMusic]);

  return {
    sfxOn,
    musicOn,
    toggleSfx,
    toggleMusic,
    sounds,
    playGameOver,
    startMusic,
    stopMusic,
  };
}