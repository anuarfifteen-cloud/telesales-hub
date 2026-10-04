import { useCallback, useEffect, useRef, useState } from "react";
import { SYMBOLS } from "./scratchPrizes";

const BRUSH = 24; // scratch radius in px
const REVEAL_THRESHOLD = 0.45; // share of a cell that must be cleared to count as scratched
const SAMPLES = 8; // 8x8 sample points per cell drive the coverage maths

const symbolById = (id) => SYMBOLS.find((s) => s.id === id);

// The order the nine squares pop in, reshuffled for every ticket.
function shuffleCells() {
  const order = [0, 1, 2, 3, 4, 5, 6, 7, 8];
  for (let i = order.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}

/**
 * A gold scratch ticket: the 3x3 symbols sit in the DOM and an HTML5 canvas is
 * layered on top. Pointer strokes erase the canvas (destination-out) and are
 * tracked against a per-cell sample mask, so a cell counts as revealed once
 * roughly half of it is gone. All nine revealed -> onScratched(), then the
 * shuffled reveal ceremony runs and onRevealComplete() closes the ticket out.
 */
export default function ScratchCardTicket({ cells, active, ticketKey, onScratched, onRevealComplete, onProgress }) {
  const canvasRef = useRef(null);
  const cellRefs = useRef([]);
  const rectsRef = useRef([]);
  const maskRef = useRef([]);
  const revealedRef = useRef(new Set());
  const drawingRef = useRef(false);
  const lastRef = useRef(null);
  const doneRef = useRef(false);
  const orderRef = useRef([]); // shuffled order the squares pop in
  const stepOfRef = useRef([]); // cell index -> its position in that order
  const [ceremony, setCeremony] = useState(false);
  const [revealStep, setRevealStep] = useState(0);
  const [foilGone, setFoilGone] = useState(false);

  const onScratchedRef = useRef(onScratched);
  const onRevealCompleteRef = useRef(onRevealComplete);
  const onProgressRef = useRef(onProgress);
  onScratchedRef.current = onScratched;
  onRevealCompleteRef.current = onRevealComplete;
  onProgressRef.current = onProgress;

  const measureRects = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const canvasRect = canvas.getBoundingClientRect();
    rectsRef.current = cellRefs.current.map((el) => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { x: r.left - canvasRect.left, y: r.top - canvasRect.top, w: r.width, h: r.height };
    });
  }, []);

  // Paint a fresh metallic overlay and reset all scratch progress.
  const paintOverlay = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const W = Math.max(1, rect.width);
    const H = Math.max(1, rect.height);

    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);

    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.globalCompositeOperation = "source-over";

    const g = ctx.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, "#f2cd6d");
    g.addColorStop(0.26, "#fff6cf");
    g.addColorStop(0.52, "#d8a63a");
    g.addColorStop(0.74, "#fff6cf");
    g.addColorStop(1, "#c68d22");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    ctx.save();
    ctx.globalAlpha = 0.1;
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 14;
    for (let x = -H; x < W; x += 46) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + H, H);
      ctx.stroke();
    }
    ctx.restore();

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "rgba(92,58,8,0.8)";
    ctx.font = `900 ${Math.max(14, Math.min(26, W * 0.08))}px Inter, system-ui, sans-serif`;
    ctx.fillText("SCRATCH TO REVEAL", W / 2, H / 2 - 14);
    ctx.fillStyle = "rgba(92,58,8,0.6)";
    ctx.font = `800 ${Math.max(9, Math.min(14, W * 0.042))}px Inter, system-ui, sans-serif`;
    ctx.fillText("SCRATCH ALL NINE SQUARES", W / 2, H / 2 + 16);

    maskRef.current = Array.from({ length: 9 }, () => new Uint8Array(SAMPLES * SAMPLES));
    revealedRef.current = new Set();
    doneRef.current = false;
    onProgressRef.current?.(0);
    measureRects();
  }, [measureRects]);

  useEffect(() => {
    paintOverlay();
  }, [paintOverlay, ticketKey]);

  useEffect(() => {
    const onResize = () => paintOverlay();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [paintOverlay]);

  // A fresh shuffled reveal order for every ticket.
  useEffect(() => {
    setCeremony(false);
    setRevealStep(0);
    setFoilGone(false);
    const order = shuffleCells();
    orderRef.current = order;
    const stepOf = new Array(9).fill(0);
    order.forEach((cellIndex, step) => {
      stepOf[cellIndex] = step;
    });
    stepOfRef.current = stepOf;
  }, [ticketKey]);

  // Reveal ceremony: the leftover foil fades, then the squares pop one at a time
  // in the shuffled order — holding a longer beat before the final square — and
  // the ticket is settled only once that last square has landed.
  useEffect(() => {
    if (!ceremony) return undefined;
    const timers = [];
    const order = orderRef.current;
    setFoilGone(true);
    let t = 320;
    order.forEach((_, step) => {
      timers.push(setTimeout(() => setRevealStep(step + 1), t));
      t += step === order.length - 2 ? 620 : 140;
    });
    timers.push(setTimeout(() => onRevealCompleteRef.current?.(), t + 550));
    return () => timers.forEach(clearTimeout);
  }, [ceremony]);

  const pointFromEvent = (e) => {
    const r = canvasRef.current.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  const erase = (from, to) => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    ctx.save();
    ctx.globalCompositeOperation = "destination-out";
    ctx.fillStyle = "rgba(0,0,0,1)";
    ctx.strokeStyle = "rgba(0,0,0,1)";
    ctx.lineWidth = BRUSH * 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(to.x, to.y, BRUSH, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };

  const trackCoverage = (from, to) => {
    const rects = rectsRef.current;
    const distance = Math.hypot(to.x - from.x, to.y - from.y);
    const steps = Math.max(1, Math.ceil(distance / (BRUSH * 0.6)));

    for (let s = 0; s <= steps; s += 1) {
      const t = steps === 0 ? 1 : s / steps;
      const px = from.x + (to.x - from.x) * t;
      const py = from.y + (to.y - from.y) * t;

      rects.forEach((rect, ci) => {
        if (!rect || revealedRef.current.has(ci)) return;
        if (
          px < rect.x - BRUSH ||
          px > rect.x + rect.w + BRUSH ||
          py < rect.y - BRUSH ||
          py > rect.y + rect.h + BRUSH
        ) {
          return;
        }

        const mask = maskRef.current[ci];
        if (!mask) return;
        let cleared = 0;
        for (let sy = 0; sy < SAMPLES; sy += 1) {
          for (let sx = 0; sx < SAMPLES; sx += 1) {
            const idx = sy * SAMPLES + sx;
            if (mask[idx]) {
              cleared += 1;
              continue;
            }
            const qx = rect.x + ((sx + 0.5) / SAMPLES) * rect.w;
            const qy = rect.y + ((sy + 0.5) / SAMPLES) * rect.h;
            if (Math.hypot(qx - px, qy - py) <= BRUSH * 1.15) {
              mask[idx] = 1;
              cleared += 1;
            }
          }
        }

        if (cleared / (SAMPLES * SAMPLES) >= REVEAL_THRESHOLD) {
          revealedRef.current.add(ci);
          onProgressRef.current?.(revealedRef.current.size);
        }
      });
    }

    if (revealedRef.current.size === 9 && !doneRef.current) {
      doneRef.current = true;
      onScratchedRef.current?.();
      setCeremony(true);
    }
  };

  const handleDown = (e) => {
    if (!active) return;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    drawingRef.current = true;
    const p = pointFromEvent(e);
    lastRef.current = p;
    erase(p, p);
    trackCoverage(p, p);
  };

  const handleMove = (e) => {
    if (!active || !drawingRef.current) return;
    if (e.pointerType === "mouse" && e.buttons !== 1) {
      drawingRef.current = false;
      return;
    }
    const p = pointFromEvent(e);
    const from = lastRef.current || p;
    erase(from, p);
    trackCoverage(from, p);
    lastRef.current = p;
  };

  const stop = () => {
    drawingRef.current = false;
    lastRef.current = null;
  };

  return (
    <div className="relative">
      <style>{`
        @keyframes scratchCellPop {
          0% { transform: scale(0.84); }
          55% { transform: scale(1.09); }
          100% { transform: scale(1); }
        }
        @keyframes scratchCellGlow {
          0% { box-shadow: 0 0 0 0 rgba(255,215,106,0.9), 0 0 26px rgba(255,215,106,0.75); }
          100% { box-shadow: 0 0 0 4px rgba(255,215,106,0), 0 0 0 rgba(255,215,106,0); }
        }
      `}</style>

      <div className="grid grid-cols-3 gap-2 p-2">
        {cells.map((id, i) => {
          const sym = symbolById(id);
          const shown = revealStep > (stepOfRef.current[i] ?? 0);
          return (
            <div
              key={i}
              ref={(el) => {
                cellRefs.current[i] = el;
              }}
              className="flex flex-col items-center justify-center rounded-xl"
              style={{
                aspectRatio: "1 / 1",
                background: "#fffdf4",
                border: `2px solid ${sym?.ring || "#e2e8f0"}`,
                animation: shown
                  ? "scratchCellPop 0.4s cubic-bezier(0.34,1.56,0.64,1), scratchCellGlow 0.85s ease-out forwards"
                  : undefined,
              }}
            >
              {sym?.src ? (
                <img
                  src={sym.src}
                  alt={sym.label}
                  style={{
                    width: 30,
                    height: 30,
                    objectFit: sym.round ? "cover" : "contain",
                    borderRadius: sym.round ? "50%" : undefined,
                  }}
                />
              ) : (
                <span style={{ fontSize: 30, lineHeight: 1 }}>{sym?.emoji}</span>
              )}
              <span
                className="font-black tracking-wider"
                style={{ marginTop: 7, fontSize: 8, color: "#8a6413" }}
              >
                {sym?.label}
              </span>
            </div>
          );
        })}
      </div>

      <canvas
        ref={canvasRef}
        className="absolute inset-0 h-full w-full rounded-2xl"
        style={{
          touchAction: "none",
          cursor: active ? "crosshair" : "default",
          pointerEvents: active ? "auto" : "none",
          opacity: foilGone ? 0 : 1,
          transition: "opacity 0.4s ease",
        }}
        onPointerDown={handleDown}
        onPointerMove={handleMove}
        onPointerUp={stop}
        onPointerCancel={stop}
        onPointerLeave={stop}
      />
    </div>
  );
}