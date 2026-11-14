import { useCallback, useEffect, useRef, useState } from "react";

/**
 * The Closer — HTML5 audio engine.
 *
 * Every URL below is a placeholder slot. Drop your own .mp3 files in and paste
 * the URLs here; nothing else in the game needs to change. Leaving a URL empty
 * simply means that sound is skipped (no failed network requests).
 */
export const AUDIO_URLS = {
  // (a) Looping suspenseful bed played while a round is running.
  bgMusic: "", // <-- paste the background music .mp3 URL here

  // (b) Player taps the folder they will keep.
  sfxSelect: "", // <-- paste the "select folder" .mp3 URL here

  // (c) A desk folder flips open.
  sfxEliminate: "", // <-- paste the "folder eliminated" .mp3 URL here

  // (d) The Manager's buyout modal appears.
  sfxRing: "", // <-- paste the "manager ring" .mp3 URL here

  // (e) The deal is taken, or the final folder is revealed.
  sfxWin: "", // <-- paste the "win" .mp3 URL here
};

/** Music comes up under the effects rather than over them. */
const MUSIC_VOLUME = 0.35;

/**
 * @param {boolean} active  true while a round is being played
 * @returns {{ muted: boolean, toggleMuted: () => void, play: (key: string) => void }}
 */
export default function useCloserAudio({ active }) {
  // Starts muted on purpose: browsers block audio until the player interacts,
  // so the header toggle is the deliberate opt-in that starts the music.
  const [muted, setMuted] = useState(true);
  const musicRef = useRef(null);
  const sfxRef = useRef({});

  // Build the audio elements once, and release them on unmount.
  useEffect(() => {
    if (AUDIO_URLS.bgMusic) {
      const music = new Audio(AUDIO_URLS.bgMusic);
      music.loop = true;
      music.preload = "auto";
      music.volume = MUSIC_VOLUME;
      musicRef.current = music;
    }

    Object.entries(AUDIO_URLS).forEach(([key, url]) => {
      if (key !== "bgMusic" && url) sfxRef.current[key] = new Audio(url);
    });

    return () => {
      const music = musicRef.current;
      if (music) {
        music.pause();
        music.src = "";
      }
      musicRef.current = null;

      Object.values(sfxRef.current).forEach((sfx) => {
        sfx.pause();
        sfx.src = "";
      });
      sfxRef.current = {};
    };
  }, []);

  // The bed follows the mute state and whether a round is live.
  useEffect(() => {
    const music = musicRef.current;
    if (!music) return;
    if (muted || !active) {
      music.pause();
      return;
    }
    music.play().catch(() => {});
  }, [muted, active]);

  const toggleMuted = useCallback(() => {
    const next = !muted;
    setMuted(next);
    const music = musicRef.current;
    if (!music) return;
    if (next) {
      music.pause();
    } else if (active) {
      // Started straight from the tap so the browser treats it as user-initiated.
      music.play().catch(() => {});
    }
  }, [muted, active]);

  /** Fire a one-shot effect. Silent while muted, and silent if no URL is set. */
  const play = useCallback(
    (key) => {
      if (muted) return;
      const sfx = sfxRef.current[key];
      if (!sfx) return;
      try {
        sfx.currentTime = 0;
        sfx.play().catch(() => {});
      } catch {
        /* a browser blocking this cue is not worth interrupting the game */
      }
    },
    [muted]
  );

  return { muted, toggleMuted, play };
}