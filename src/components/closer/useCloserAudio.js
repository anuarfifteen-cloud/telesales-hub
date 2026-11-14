import { useCallback, useEffect, useState } from "react";
import {
  playCloserCue,
  setCloserMuted,
  startCloserMusic,
  stopCloserMusic,
  unlockCloserAudio,
} from "@/lib/closerAudio";

/** Game-side cue keys → score cue names. */
const CUES = {
  sfxSelect: "select",
  sfxEliminate: "reveal",
  sfxRing: "ring",
  sfxWin: "win",
};

/**
 * Cinematic-suspense audio for The Closer.
 *
 * Sound is ON by default, but the bed only starts once a round is live and the
 * graph has been unlocked from the seat tap — the gesture browsers require.
 *
 * @param {boolean} active  true while a round is being played
 */
export default function useCloserAudio({ active }) {
  const [muted, setMuted] = useState(false);

  // Keep the engine's master gain in step with the header toggle.
  useEffect(() => {
    setCloserMuted(muted);
  }, [muted]);

  // Bed follows the round: live while playing, faded out otherwise.
  useEffect(() => {
    if (active && !muted) {
      startCloserMusic();
    } else {
      stopCloserMusic();
    }
  }, [active, muted]);

  // Leaving the tab must not leave the bed running.
  useEffect(() => stopCloserMusic, []);

  const toggleMuted = useCallback(() => setMuted((prev) => !prev), []);

  /** Call synchronously from a real click (the seat tap) to allow audio to start. */
  const unlock = useCallback(() => unlockCloserAudio(), []);

  /** Pause and rewind the bed (used when a seat purchase is refused). */
  const stop = useCallback(() => stopCloserMusic(), []);

  const play = useCallback(
    (key) => {
      if (muted) return;
      // Every game tap is a gesture, so a blocked bed gets retried right here.
      startCloserMusic();
      playCloserCue(CUES[key] || key);
    },
    [muted]
  );

  return { muted, toggleMuted, unlock, stop, play };
}