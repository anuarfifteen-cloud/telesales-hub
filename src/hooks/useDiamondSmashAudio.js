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

  const playMatch = useCallback(() => {
    if (!sfxEnabled()) return;
    const ctx = ensureCtx();
    if (!ctx || !masterRef.current) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(523, t);
    osc.frequency.exponentialRampToValueAtTime(784, t + 0.12);
    gain.gain.setValueAtTime(0.001, t);
    gain.gain.exponentialRampToValueAtTime(0.3, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
    osc.connect(gain).connect(masterRef.current);
    osc.start(t);
    osc.stop(t + 0.26);
  }, [ensureCtx, sfxEnabled]);

  const playCascade = useCallback((multiplier) => {
    if (!sfxEnabled()) return;
    const ctx = ensureCtx();
    if (!ctx || !masterRef.current) return;
    const base = 659 + Math.max(0, multiplier - 2) * 80;
    [base, base * 1.5].forEach((freq, i) => {
      const t = ctx.currentTime + i * 0.07;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.001, t);
      gain.gain.exponentialRampToValueAtTime(0.25, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
      osc.connect(gain).connect(masterRef.current);
      osc.start(t);
      osc.stop(t + 0.24);
    });
  }, [ensureCtx, sfxEnabled]);

  const playDiamond = useCallback(() => {
    if (!sfxEnabled()) return;
    const ctx = ensureCtx();
    if (!ctx || !masterRef.current) return;
    [1047, 1319, 1568].forEach((freq, i) => {
      const t = ctx.currentTime + i * 0.05;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.001, t);
      gain.gain.exponentialRampToValueAtTime(0.22, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
      osc.connect(gain).connect(masterRef.current);
      osc.start(t);
      osc.stop(t + 0.32);
    });
  }, [ensureCtx, sfxEnabled]);

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
    playMatch,
    playCascade,
    playDiamond,
    playGameOver,
    startMusic,
    stopMusic,
  };
}