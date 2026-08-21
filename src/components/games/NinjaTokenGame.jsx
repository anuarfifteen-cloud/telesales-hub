import { useState, useEffect, useRef, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Loader2, Trophy, Trash2 } from "lucide-react";

// Emoji-capable font stack — makes canvas paint full-color opaque emoji
// (serif fallback renders ghosted outline glyphs on many browsers)
const EMOJI_FONT =
  "'Apple Color Emoji','Segoe UI Emoji','Noto Color Emoji',sans-serif";

// Score = number of Golden Tokens collected (each worth +1)

// ── Ninja Token — Golden Temple Dawn canvas NinJump climber ────────────────────
const WALL_PAD = 28;
const NINJA_FONT = 44;        // bumped so the ninja emoji reads clearly
const ENEMY_FONT = 40;        // bumped so oni / bomb read clearly
const DASH_TIME = 0.16;
const REST_DEATH_TOL = 26;
const KILL_TOL = 38;
const BOMB_X_TOL = 28;
const BOMB_Y_TOL = 32;
const TOKEN_TOL = 38;
const TOKEN_SIZE = 36;        // drawn token image size (px)

// Difficulty: normal-playable base, gradually increasing +step every 500 pts
const BASE_SPEED = 1600;
const SPEED_STEP = 320;

// Golden Temple Dawn palette
const RAIL = "#5a3a1a";
const RUNG = "#7a4f24";
const TEMPLE = "rgba(139, 90, 43, 0.30)";
const PILL_BG = "#EDE3CE";
const PILL_BORDER = "#3a2a1a";
const PILL_TEXT = "#3a2a1a";

// User-provided Golden Token image — +200 on collect
const TOKEN_IMG_URL =
  "https://media.base44.com/images/public/6a02849f1b6bb0b71bf23993/44c1b0077_tokens.png";

// Footer legend raster icons — guaranteed full-color on every device
const NINJA_ICON_URL =
  "https://media.base44.com/images/public/6a02849f1b6bb0b71bf23993/db2bf6b08_generated_image.png";
const ONI_ICON_URL =
  "https://media.base44.com/images/public/6a02849f1b6bb0b71bf23993/6682e09d9_generated_image.png";
const BOMB_ICON_URL =
  "https://media.base44.com/images/public/6a02849f1b6bb0b71bf23993/97372eab8_generated_image.png";

// Eastern pentatonic ladder — fast arpeggio for the BGM
const PENT = [523.25, 587.33, 659.25, 783.99, 880, 1046.5, 880, 659.25];

function easeOut(t) {
  return 1 - Math.pow(1 - t, 3);
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// Remove the icon images' cream background so they composite cleanly on the arena sky.
// Runs once per image at load; returns an offscreen canvas usable as a drawImage source.
const ICON_BG = [245, 240, 225]; // #F5F0E1 cream (matches the generated character art)
function keyBackground(img) {
  const cv = document.createElement("canvas");
  cv.width = img.naturalWidth || img.width;
  cv.height = img.naturalHeight || img.height;
  const cx = cv.getContext("2d");
  cx.drawImage(img, 0, 0);
  try {
    const data = cx.getImageData(0, 0, cv.width, cv.height);
    const px = data.data;
    for (let i = 0; i < px.length; i += 4) {
      const dr = px[i] - ICON_BG[0], dg = px[i + 1] - ICON_BG[1], db = px[i + 2] - ICON_BG[2];
      if (dr * dr + dg * dg + db * db < 26 * 26) px[i + 3] = 0; // transparent
    }
    cx.putImageData(data, 0, 0);
  } catch (_) {
    // CORS taint — fall back to the drawn image (cream box may show)
  }
  return cv;
}

function drawTemple(ctx, cx, baseY, w, h) {
  ctx.fillStyle = TEMPLE;
  ctx.fillRect(cx - w / 2, baseY - h * 0.32, w, h * 0.32);
  ctx.beginPath();
  ctx.moveTo(cx - w * 0.6, baseY - h * 0.32);
  ctx.lineTo(cx + w * 0.6, baseY - h * 0.32);
  ctx.lineTo(cx, baseY - h * 0.54);
  ctx.closePath();
  ctx.fill();
  ctx.fillRect(cx - w * 0.34, baseY - h * 0.6, w * 0.68, h * 0.18);
  ctx.beginPath();
  ctx.moveTo(cx - w * 0.46, baseY - h * 0.6);
  ctx.lineTo(cx + w * 0.46, baseY - h * 0.6);
  ctx.lineTo(cx, baseY - h * 0.78);
  ctx.closePath();
  ctx.fill();
  ctx.fillRect(cx - w * 0.06, baseY - h * 0.84, w * 0.12, h * 0.2);
  ctx.beginPath();
  ctx.moveTo(cx - w * 0.18, baseY - h * 0.84);
  ctx.lineTo(cx + w * 0.18, baseY - h * 0.84);
  ctx.lineTo(cx, baseY - h);
  ctx.closePath();
  ctx.fill();
}

export default function NinjaTokenGame({ user /* , onUserUpdate */ }) {
  const [phase, setPhase] = useState("IDLE"); // IDLE | PLAYING | GAME_OVER
  const [best, setBest] = useState(null);
  const [leaders, setLeaders] = useState([]);
  const [leadersLoading, setLeadersLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isNewBest, setIsNewBest] = useState(false);
  const [finalRun, setFinalRun] = useState(0);
  const [muted, setMuted] = useState(() => localStorage.getItem("ninja_muted") === "1");
  const [resetting, setResetting] = useState(false);

  const wrapRef = useRef(null);
  const canvasRef = useRef(null);
  const rafRef = useRef(null);
  const lastRef = useRef(0);
  const sizeRef = useRef({ w: 320, h: 460, dpr: 1 });
  const phaseRef = useRef("IDLE");
  useEffect(() => { phaseRef.current = phase; }, [phase]);

  const worldRef = useRef(null);
  const scoreIntRef = useRef(0);
  const tokenImgRef = useRef(null);
  const ninjaImgRef = useRef(null);
  const oniImgRef = useRef(null);
  const bombImgRef = useRef(null);

  // ── Audio engine ───────────────────────────────────────────────────────────────
  const audioRef = useRef(null);   // { ctx, master, muted }
  const bgmRef = useRef(null);      // active BGM scheduler

  const ensureAudio = useCallback(() => {
    if (audioRef.current) return audioRef.current;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    const ctx = new AC();
    const master = ctx.createGain();
    const isMuted = localStorage.getItem("ninja_muted") === "1";
    master.gain.value = isMuted ? 0 : 1;
    master.connect(ctx.destination);
    audioRef.current = { ctx, master, muted: isMuted };
    return audioRef.current;
  }, []);

  // SFX: dash / slash — rising saw sweep filtered like a whoosh
  const playDash = useCallback(() => {
    const a = ensureAudio();
    if (!a) return;
    const ctx = a.ctx;
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 1500;
    o.type = "sawtooth";
    o.frequency.setValueAtTime(240, t);
    o.frequency.exponentialRampToValueAtTime(760, t + 0.16);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.18, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
    o.connect(g).connect(lp).connect(a.master);
    o.start(t);
    o.stop(t + 0.2);
  }, [ensureAudio]);

  // SFX: slice — short white-noise burst with fast decay (paper-slice / impact)
  const playSlice = useCallback(() => {
    const a = ensureAudio();
    if (!a) return;
    const ctx = a.ctx;
    const t = ctx.currentTime;
    const len = Math.floor(ctx.sampleRate * 0.18);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 2400;
    bp.Q.value = 0.8;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.35, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
    src.connect(bp).connect(g).connect(a.master);
    src.start(t);
    src.stop(t + 0.15);
  }, [ensureAudio]);

  // SFX: golden token — bright double-ping (800Hz + 1200Hz sines)
  const playToken = useCallback(() => {
    const a = ensureAudio();
    if (!a) return;
    const ctx = a.ctx;
    let t = ctx.currentTime;
    for (const f of [800, 1200]) {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "sine";
      o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.32, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
      o.connect(g).connect(a.master);
      o.start(t);
      o.stop(t + 0.2);
      t += 0.1;
    }
  }, [ensureAudio]);

  // SFX: game over — descending low sine "womp"
  const playGameOver = useCallback(() => {
    const a = ensureAudio();
    if (!a) return;
    const ctx = a.ctx;
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(320, t);
    o.frequency.exponentialRampToValueAtTime(70, t + 0.6);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.4, t + 0.03);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.7);
    o.connect(g).connect(a.master);
    o.start(t);
    o.stop(t + 0.72);
  }, [ensureAudio]);

  // BGM: looping Eastern pentatonic arpeggio (alternating sine/triangle)
  const startMusic = useCallback(() => {
    const a = ensureAudio();
    if (!a) return;
    // clear any existing scheduler
    if (bgmRef.current) {
      clearInterval(bgmRef.current.timer);
      bgmRef.current.running = false;
    }
    const ctx = a.ctx;
    const bgmGain = ctx.createGain();
    bgmGain.gain.value = 0.16;
    bgmGain.connect(a.master);
    const seq = {
      gain: bgmGain,
      step: 0,
      nextTime: ctx.currentTime + 0.06,
      timer: null,
      running: true,
    };
    const stepDur = 0.15;
    const scheduleNote = (when, freq, isBass) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = isBass ? "triangle" : (Math.floor(when * 10) % 2 ? "sine" : "triangle");
      o.frequency.value = freq;
      g.gain.setValueAtTime(0.0001, when);
      g.gain.linearRampToValueAtTime(isBass ? 0.5 : 0.8, when + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, when + (isBass ? 0.3 : 0.16));
      o.connect(g).connect(bgmGain);
      o.start(when);
      o.stop(when + (isBass ? 0.32 : 0.18));
    };
    const tick = () => {
      if (!seq.running) return;
      const now = ctx.currentTime;
      while (seq.nextTime < now + 0.12) {
        const freq = PENT[seq.step % PENT.length];
        scheduleNote(seq.nextTime, freq, false);
        if (seq.step % 4 === 0) scheduleNote(seq.nextTime, freq / 4, true); // low drone pulse
        seq.step++;
        seq.nextTime += stepDur;
      }
    };
    seq.timer = setInterval(tick, 25);
    bgmRef.current = seq;
  }, [ensureAudio]);

  const stopMusic = useCallback(() => {
    const seq = bgmRef.current;
    if (!seq) return;
    seq.running = false;
    clearInterval(seq.timer);
    const now = seq.gain.context.currentTime;
    seq.gain.gain.cancelScheduledValues(now);
    seq.gain.gain.setValueAtTime(seq.gain.gain.value, now);
    seq.gain.gain.linearRampToValueAtTime(0, now + 0.2);
    const g = seq.gain;
    setTimeout(() => { try { g.disconnect(); } catch {} }, 300);
    bgmRef.current = null;
  }, []);

  const toggleMute = useCallback(() => {
    const a = ensureAudio();
    const next = !muted;
    setMuted(next);
    localStorage.setItem("ninja_muted", next ? "1" : "0");
    if (a) {
      a.muted = next;
      const now = a.ctx.currentTime;
      a.master.gain.cancelScheduledValues(now);
      a.master.gain.setValueAtTime(a.master.gain.value, now);
      a.master.gain.linearRampToValueAtTime(next ? 0 : 1, now + 0.08);
    }
  }, [ensureAudio, muted]);

  // Music + game-over tone driven by phase
  useEffect(() => {
    if (phase === "PLAYING") startMusic();
    else stopMusic();
    if (phase === "GAME_OVER") playGameOver();
    return () => stopMusic();
  }, [phase, startMusic, stopMusic, playGameOver]);

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      stopMusic();
      const a = audioRef.current;
      if (a) { try { a.ctx.close(); } catch {} }
    };
  }, [stopMusic]);

  // Preload character/token icons. Character art ships on a cream tile, so we
  // chroma-key that background out at load for clean canvas compositing.
  useEffect(() => {
    const loadImg = (url, ref, key) => {
      const img = new Image();
      if (key) img.crossOrigin = "anonymous";
      img.src = url;
      img.onload = () => {
        try { ref.current = key ? keyBackground(img) : img; }
        catch (_) { ref.current = img; }
      };
    };
    loadImg(TOKEN_IMG_URL, tokenImgRef, false);
    loadImg(NINJA_ICON_URL, ninjaImgRef, true);
    loadImg(ONI_ICON_URL, oniImgRef, true);
    loadImg(BOMB_ICON_URL, bombImgRef, true);
  }, []);

  // ── Leaderboards ───────────────────────────────────────────────────────────
  const refreshLeaders = useCallback(async () => {
    try {
      const rows = await base44.entities.NinjaTokenScore.list("-score", 5);
      setLeaders(rows || []);
    } catch {
      setLeaders([]);
    } finally {
      setLeadersLoading(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      if (user?.id) {
        try {
          const rows = await base44.entities.NinjaTokenScore.filter({ user_id: user.id });
          setBest(rows[0]?.score ?? 0);
        } catch {
          setBest(0);
        }
      }
      refreshLeaders();
    })();
    const unsub = base44.entities.NinjaTokenScore.subscribe(() => refreshLeaders());
    return unsub;
  }, [user?.id, refreshLeaders]);

  // ── Canvas sizing (DPR-aware, responsive) ────────────────────────────────────
  const resize = useCallback(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = wrap.clientWidth;
    const h = 460;
    sizeRef.current = { w, h, dpr };
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    canvas.style.width = w + "px";
    canvas.style.height = h + "px";
    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }, []);

  useEffect(() => {
    resize();
    const ro = new ResizeObserver(resize);
    if (wrapRef.current) ro.observe(wrapRef.current);
    window.addEventListener("resize", resize);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", resize);
    };
  }, [resize]);

  // ── Input ────────────────────────────────────────────────────────────────────
  const tryDash = useCallback(() => {
    const w = worldRef.current;
    if (!w || phaseRef.current !== "PLAYING" || w.ninja.dashing) return;
    const { w: W } = sizeRef.current;
    w.ninja.dashing = true;
    w.ninja.dashT = 0;
    w.ninja.srcX = w.ninja.wall === "left" ? WALL_PAD : W - WALL_PAD;
    w.ninja.destWall = w.ninja.wall === "left" ? "right" : "left";
    w.ninja.destX = w.ninja.destWall === "left" ? WALL_PAD : W - WALL_PAD;
    playDash();
  }, [playDash]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.code === "Space") {
        e.preventDefault();
        tryDash();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [tryDash]);

  // ── Game lifecycle ───────────────────────────────────────────────────────────
  const makeWorld = () => {
    const { w: W, h: H } = sizeRef.current;
    return {
      ninja: {
        wall: "left",
        x: WALL_PAD,
        y: H * 0.72,
        dashing: false,
        dashT: 0,
        srcX: WALL_PAD,
        destX: W - WALL_PAD,
        destWall: "right",
      },
      entities: [],
      elapsed: 0,
      spawnTimer: 0,
      climb: 0,        // distance — drives speed tier only, not score
      killPoints: 0,   // retained for internal pacing only
      tokensCollected: 0, // ← score = this count
      particles: [],
    };
  };

  const upsertScore = useCallback(
    async (finalScore) => {
      if (!user?.id) return;
      setSaving(true);
      try {
        const name = user.full_name || (user.email ? user.email.split("@")[0] : "Player");
        const existing = await base44.entities.NinjaTokenScore.filter({ user_id: user.id });
        const entry = existing[0];
        if (entry) {
          if (finalScore > (entry.score ?? 0)) {
            await base44.entities.NinjaTokenScore.update(entry.id, {
              score: finalScore,
              updated_at: new Date().toISOString(),
            });
          }
        } else {
          await base44.entities.NinjaTokenScore.create({
            user_id: user.id,
            user_name: name,
            score: finalScore,
            updated_at: new Date().toISOString(),
          });
        }
        await refreshLeaders();
        try {
          const me = await base44.entities.NinjaTokenScore.filter({ user_id: user.id });
          setBest(me[0]?.score ?? finalScore);
        } catch {}
      } catch (e) {
        console.error("[NinjaToken] upsert failed:", e?.message || e);
      } finally {
        setSaving(false);
      }
    },
    [user?.id, user?.full_name, user?.email, refreshLeaders]
  );

  const gameOver = useCallback(
    (finalScore) => {
      if (phaseRef.current !== "PLAYING") return;
      phaseRef.current = "GAME_OVER";
      setFinalRun(finalScore);
      setIsNewBest(best == null ? true : finalScore > best);
      setPhase("GAME_OVER");
      upsertScore(finalScore);
      if (navigator.vibrate) navigator.vibrate([60, 40, 120]);
    },
    [best, upsertScore]
  );

  const startGame = useCallback(() => {
    // Resume audio context on first user interaction (autoplay-policy safe)
    const a = ensureAudio();
    if (a && a.ctx.state === "suspended") a.ctx.resume();
    worldRef.current = makeWorld();
    scoreIntRef.current = 0; // tokens collected this run
    setIsNewBest(false);
    setFinalRun(0);
    phaseRef.current = "PLAYING";
    setPhase("PLAYING");
    lastRef.current = performance.now();
  }, [ensureAudio]);

  // ── Main loop (runs always; updates only while PLAYING) ─────────────────────
  const update = useCallback(
    (dt) => {
      const w = worldRef.current;
      if (!w) return;
      const { w: W, h: H } = sizeRef.current;
      const restY = H * 0.72;

      w.elapsed += dt;

      // Speed tier scales with distance climbed (pacing only)
      const tier = Math.floor(w.climb / 500);
      const speed = BASE_SPEED + tier * SPEED_STEP;
      const spawnInterval = Math.max(0.45, 1.1 - tier * 0.12);
      w._speed = speed;

      w.climb += speed * dt * 0.06;

      // Score = Golden Tokens collected only
      const intScore = w.tokensCollected;
      if (intScore !== scoreIntRef.current) scoreIntRef.current = intScore;

      if (w.ninja.dashing) {
        w.ninja.dashT += dt;
        const p = Math.min(1, w.ninja.dashT / DASH_TIME);
        w.ninja.x = w.ninja.srcX + (w.ninja.destX - w.ninja.srcX) * easeOut(p);
        if (p >= 1) {
          w.ninja.dashing = false;
          w.ninja.wall = w.ninja.destWall;
          w.ninja.x = w.ninja.destX;
        }
      }

      for (const e of w.entities) {
        e.y += (e.type === "bomb" ? speed * 1.18 : speed) * dt;
      }
      w.entities = w.entities.filter((e) => e.y < H + 50 && !e._cull);

      w.spawnTimer += dt;
      if (w.spawnTimer >= spawnInterval) {
        w.spawnTimer = 0;
        const roll = Math.random();
        if (roll < 0.5) {
          const wall = Math.random() < 0.5 ? "left" : "right";
          w.entities.push({
            type: "oni",
            wall,
            x: wall === "left" ? WALL_PAD : W - WALL_PAD,
            y: -40,
            dead: false,
          });
        } else if (roll < 0.82) {
          w.entities.push({
            type: "bomb",
            x: WALL_PAD + Math.random() * (W - 2 * WALL_PAD),
            y: -40,
            sliced: false,
          });
        } else {
          // Golden Token — falls through the open middle air; dash through for +200
          w.entities.push({
            type: "token",
            x: W * 0.28 + Math.random() * (W * 0.44),
            y: -40,
            taken: false,
          });
        }
      }

      // ── Collisions ──────────────────────────────────────────────────────────
      const nx = w.ninja.x;
      if (w.ninja.dashing) {
        // Attacking across the full width: slash oni (+10), slice bombs (+100),
        // collect Golden Tokens (+200). Nothing is lethal while dashing.
        for (const e of w.entities) {
          if (e.type === "oni" && !e.dead && Math.abs(e.y - restY) < KILL_TOL) {
            e.dead = true;
            w.killPoints += 10;
            w.particles.push({ x: e.x, y: e.y, t: 0, life: 0.4 });
            playSlice();
            if (navigator.vibrate) navigator.vibrate(12);
          }
          if (e.type === "bomb" && !e.sliced && Math.abs(e.y - restY) < BOMB_Y_TOL) {
            e.sliced = true;
            e._cull = true;
            w.killPoints += 100;
            w.particles.push({ x: e.x, y: e.y, t: 0, life: 0.45, gold: true });
            playSlice();
            if (navigator.vibrate) navigator.vibrate(18);
          }
          if (e.type === "token" && !e.taken && Math.abs(e.y - restY) < TOKEN_TOL) {
            e.taken = true;
            e._cull = true;
            w.tokensCollected += 1; // ← score increments by 1 per token
            w.particles.push({ x: e.x, y: e.y, t: 0, life: 0.5, gold: true, big: true });
            playToken();
            if (navigator.vibrate) navigator.vibrate([20, 15, 40]);
          }
        }
      } else {
        // Resting: oni on the same wall → death; an un-sliced bomb in the ninja wall
        // lane → death. Bombs in the middle pass safely.
        for (const e of w.entities) {
          if (e.type === "oni" && e.wall === w.ninja.wall && Math.abs(e.y - restY) < REST_DEATH_TOL) {
            gameOver(w.tokensCollected);
            return;
          }
          if (
            e.type === "bomb" &&
            !e.sliced &&
            Math.abs(e.y - restY) < BOMB_Y_TOL &&
            Math.abs(e.x - nx) < BOMB_X_TOL
          ) {
            gameOver(w.tokensCollected);
            return;
          }
        }
      }
      w.entities = w.entities.filter((e) => !(e.type === "oni" && e.dead));
      for (const p of w.particles) p.t += dt;
      w.particles = w.particles.filter((p) => p.t < p.life);
    },
    [gameOver, playSlice, playToken]
  );

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const { w: W, h: H } = sizeRef.current;
    const w = worldRef.current;

    // Sky gradient — Golden Temple Dawn
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, "#FDE093");
    sky.addColorStop(1, "#D48E36");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);

    // Parallax pagoda silhouettes
    const drift = w ? w.elapsed * 6 : 0;
    drawTemple(ctx, W * 0.2 - ((drift * 0.04) % 120), H * 0.82, 58, 96);
    drawTemple(ctx, W * 0.55, H * 0.82 - 6, 80, 128);
    drawTemple(ctx, W * 0.92, H * 0.82, 48, 86);

    // Wooden-ladder walls (rails + scrolling rungs)
    ctx.save();
    ctx.fillStyle = RAIL;
    ctx.fillRect(2, 0, 6, H);
    ctx.fillRect(W - 8, 0, 6, H);
    const step = 36;
    const off = w ? (w.elapsed * (w._speed || BASE_SPEED)) % step : 0;
    ctx.fillStyle = RUNG;
    for (let y = -step + (off % step); y < H; y += step) {
      ctx.fillRect(2, y, 26, 4);
      ctx.fillRect(W - 28, y, 26, 4);
    }
    ctx.restore();

    if (w) {
      // Dash slash trail (sepia)
      if (w.ninja.dashing) {
        ctx.save();
        ctx.strokeStyle = "rgba(90, 58, 26, 0.5)";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(w.ninja.srcX, w.ninja.y);
        ctx.lineTo(w.ninja.x, w.ninja.y);
        ctx.stroke();
        ctx.restore();
      }

      // Entities — dark drop-shadow so emojis stay crisp on the bright dawn sky
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      for (const e of w.entities) {
        if (e.type === "token") {
          // User-provided Golden Token image — +200 on collect
          const img = tokenImgRef.current;
          const s = TOKEN_SIZE;
          if (img) {
            ctx.save();
            ctx.shadowColor = "rgba(0,0,0,0.35)";
            ctx.shadowBlur = 5;
            ctx.drawImage(img, e.x - s / 2, e.y - s / 2, s, s);
            ctx.restore();
          } else {
            ctx.save();
            ctx.fillStyle = "#FFD24A";
            ctx.beginPath();
            ctx.arc(e.x, e.y, 16, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          }
        } else {
          const img = e.type === "oni" ? oniImgRef.current : bombImgRef.current;
          const s = ENEMY_FONT;
          ctx.save();
          ctx.shadowColor = "rgba(0,0,0,0.35)";
          ctx.shadowBlur = 4;
          ctx.shadowOffsetY = 1;
          if (img) {
            ctx.drawImage(img, e.x - s / 2, e.y - s / 2, s, s);
          } else {
            ctx.font = `${s}px ${EMOJI_FONT}`;
            ctx.fillText(e.type === "oni" ? "👹" : "💣", e.x, e.y);
          }
          ctx.restore();
        }
      }

      // Ninja — full-color raster icon (chroma-keyed, 100% visible like the token)
      {
        const img = ninjaImgRef.current;
        const s = NINJA_FONT;
        ctx.save();
        ctx.shadowColor = "rgba(0,0,0,0.4)";
        ctx.shadowBlur = 5;
        ctx.shadowOffsetY = 2;
        if (img) {
          ctx.drawImage(img, w.ninja.x - s / 2, w.ninja.y - s / 2, s, s);
        } else {
          ctx.font = `${s}px ${EMOJI_FONT}`;
          ctx.fillText("🥷", w.ninja.x, w.ninja.y);
        }
        ctx.restore();
      }

      // Kill particles (gold pop for coins/bombs)
      for (const p of w.particles) {
        const a = 1 - p.t / p.life;
        ctx.save();
        ctx.globalAlpha = a;
        ctx.fillStyle = p.gold ? "#FFD24A" : "#5a3a1a";
        ctx.beginPath();
        ctx.arc(p.x, p.y, (p.big ? 10 : 6) + p.t * 70, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // Top pill score (PLAYING only)
      if (phaseRef.current === "PLAYING") {
        const txt = String(scoreIntRef.current);
        ctx.save();
        ctx.font = "bold 26px ui-monospace, SFMono-Regular, Menlo, monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        const tw = ctx.measureText(txt).width;
        const pw = tw + 44, ph = 40, px = W / 2 - pw / 2, py = 16;
        ctx.fillStyle = PILL_BG;
        ctx.strokeStyle = PILL_BORDER;
        ctx.lineWidth = 2;
        roundRect(ctx, px, py, pw, ph, ph / 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = PILL_TEXT;
        ctx.fillText(txt, W / 2, py + ph / 2 + 1);
        ctx.restore();
      }
    }
  }, []);

  const loop = useCallback(
    (t) => {
      const dt = Math.min(0.05, (t - lastRef.current) / 1000 || 0);
      lastRef.current = t;
      if (phaseRef.current === "PLAYING") update(dt);
      render();
      rafRef.current = requestAnimationFrame(loop);
    },
    [update, render]
  );

  useEffect(() => {
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [loop]);

  const medals = ["🥇", "🥈", "🥉"];
  const shownBest = best == null ? finalRun : Math.max(best, finalRun);
  const top5 = leaders.slice(0, 5);

  return (
    <div className="flex flex-col gap-3">
      {/* Arena shell — Golden Temple Dawn */}
      <div className="relative rounded-3xl border border-[#B8860B] bg-[#FDE093] overflow-hidden shadow-md font-mono">
        {/* Mute toggle — top right corner */}
        <button
          onClick={toggleMute}
          aria-label={muted ? "Unmute" : "Mute"}
          className="absolute top-2 right-2 z-20 w-9 h-9 rounded-full bg-[#FFF7E0] border-2 border-[#B8860B] text-[#3a2a1a] shadow-md hover:scale-105 transition-transform flex items-center justify-center text-lg"
        >
          {muted ? "🔇" : "🔊"}
        </button>

        {/* Header */}
        <div className="px-4 pt-3 pb-2.5 text-center border-b border-[#B8860B]/50">
          <div className="flex items-center justify-center gap-2">
            <span className="text-xl">🥷</span>
            <div className="leading-none">
              <h1 className="text-lg font-black tracking-[0.2em] text-[#3a2a1a]">
                NINJA TOKEN
              </h1>
              <p className="mt-0.5 text-[9px] tracking-[0.4em] text-[#7a3b00]">BETA ARCADE</p>
            </div>
            <span className="text-xl scale-x-[-1]">🥷</span>
          </div>
          <div className="mt-2 flex items-center justify-center gap-1.5">
            {[0.9, 0.72, 0.55, 0.4, 0.55, 0.72].map((o, i) => (
              <span
                key={i}
                className="w-1.5 h-1.5 rounded-full bg-[#B8860B]"
                style={{ opacity: o }}
              />
            ))}
          </div>
        </div>

        {/* Canvas arena */}
        <div ref={wrapRef} className="relative w-full select-none" style={{ height: 460 }}>
          <canvas
            ref={canvasRef}
            onPointerDown={(e) => {
              e.preventDefault();
              tryDash();
            }}
            style={{ touchAction: "none" }}
            className="block w-full h-full"
          />

          {/* Start overlay */}
          {phase === "IDLE" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-[#FDE093]/80 backdrop-blur-sm px-6">
              <p className="text-xs tracking-[0.15em] text-[#3a2a1a] text-center leading-relaxed font-mono">
                Dash between walls.<br />
                Snag <img src={TOKEN_IMG_URL} alt="token" className="inline w-4 h-4 align-middle" /> for +1 score. Slash 👹 and 💣 just to survive.<br />
                Don't rest on an oni — and don't ignore a bomb on your wall!
              </p>
              <button
                onClick={startGame}
                className="px-8 py-3 rounded-xl font-black text-sm tracking-[0.2em] bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-md hover:scale-105 transition-transform"
              >
                ▶ TAP TO START
              </button>
              {best != null && best > 0 && (
                <p className="text-[10px] tracking-[0.3em] text-[#7a3b00] font-mono">BEST: {best}</p>
              )}
            </div>
          )}

          {/* Game Over modal — no Hall of Fame */}
          {phase === "GAME_OVER" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-5 bg-[#FDE093]/90 backdrop-blur-md">
              <h2 className="text-2xl font-black tracking-[0.3em] text-[#7a3b00] font-mono">
                GAME OVER
              </h2>

              {isNewBest && (
                <span className="px-4 py-1 rounded-full font-black text-[11px] tracking-[0.2em] bg-gradient-to-r from-amber-300 to-yellow-500 text-[#5a3a1a] shadow-md">
                  ⭐ NEW HIGH SCORE ⭐
                </span>
              )}

              <div className="w-full max-w-[260px] rounded-2xl border border-[#B8860B] bg-[#FFF7E0]/95 px-5 py-3 text-center shadow-md">
                <p className="text-[9px] tracking-[0.3em] text-[#7a3b00] font-mono">FINAL SCORE</p>
                <p className="text-3xl font-black text-[#3a2a1a] tabular-nums font-mono">{finalRun}</p>
                <p className="mt-1 text-[9px] tracking-[0.3em] text-[#7a3b00] font-mono">BEST: {shownBest}</p>
              </div>

              <button
                onClick={startGame}
                disabled={saving}
                className="mt-1 w-full max-w-[260px] px-5 py-2.5 rounded-xl font-black text-sm tracking-[0.15em] bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-md hover:scale-105 transition-transform flex items-center justify-center gap-2 font-mono"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "▶ PLAY AGAIN"}
              </button>
            </div>
          )}
        </div>

        {/* Footer legend */}
        <div className="px-4 py-2.5 border-t border-[#B8860B]/50 flex items-center justify-center gap-2 text-[10px] tracking-[0.12em] text-[#7a3b00] font-mono">
          <img src={NINJA_ICON_URL} alt="ninja" className="w-4 h-4 leading-none object-contain" />
          <img src={ONI_ICON_URL} alt="oni" className="w-4 h-4 leading-none object-contain" />
          <img src={BOMB_ICON_URL} alt="bomb" className="w-4 h-4 leading-none object-contain" />
          <img src={TOKEN_IMG_URL} alt="token" className="w-4 h-4 leading-none" />
          <span className="ml-1">SPACE • CLICK • TAP — DASH TO ATTACK</span>
        </div>
      </div>

      {/* Top Ninjas leaderboard — at the bottom */}
      <div className="rounded-2xl border border-[#B8860B] bg-[#FFF7E0]/95 shadow-md overflow-hidden font-mono">
        <div className="px-4 py-2.5 border-b border-[#B8860B]/50 bg-[#FDE093]/60 flex items-center justify-center gap-2">
          <Trophy className="w-4 h-4 text-[#B8860B]" />
          <p className="text-xs font-black uppercase tracking-widest text-[#7a3b00]">
            TOP NINJAS 🥷
          </p>
        </div>
        {leadersLoading ? (
          <div className="py-4 flex justify-center">
            <Loader2 className="w-4 h-4 animate-spin text-[#B8860B]" />
          </div>
        ) : top5.length === 0 ? (
          <p className="py-4 text-center text-[11px] tracking-widest uppercase text-[#7a3b00]/70">
            No scores yet — be the first!
          </p>
        ) : null}

        {/* Reset leaderboard — admin only */}
        {user?.role === "admin" && top5.length > 0 && (
          <div className="px-3 py-2 border-t border-[#B8860B]/30">
            <button
              onClick={async () => {
                if (resetting) return;
                if (!window.confirm("Wipe ALL saved Ninja Token high scores for every player?")) return;
                setResetting(true);
                try {
                  await base44.entities.NinjaTokenScore.deleteMany({});
                  setLeaders([]);
                  setBest(0);
                } catch (e) {
                  console.error("[NinjaToken] reset failed:", e?.message || e);
                } finally {
                  setResetting(false);
                }
              }}
              disabled={resetting}
              className="w-full flex items-center justify-center gap-2 py-1.5 rounded-lg text-[10px] font-black tracking-widest uppercase bg-red-500/10 border border-red-500/40 text-red-600 hover:bg-red-500/20 transition-colors disabled:opacity-50"
            >
              {resetting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
              Reset Leaderboard
            </button>
          </div>
        )}

        {top5.length > 0 && (
          <div className="divide-y divide-[#B8860B]/30">
            {top5.map((l, i) => (
              <div key={l.id} className="flex items-center gap-3 px-4 py-2">
                <span className="w-6 text-center text-base">{i < 3 ? medals[i] : `${i + 1}`}</span>
                <span
                  className="flex-1 min-w-0 text-sm font-bold text-[#3a2a1a] truncate"
                  style={{ wordBreak: "break-word" }}
                >
                  {l.user_name}
                </span>
                <span className="text-sm font-black text-[#B8860B] tabular-nums">{l.score}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}