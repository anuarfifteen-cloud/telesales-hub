import { useState, useEffect, useRef } from "react";

// useOdometer — animates a number upward (easeOutCubic) when it increases.
// Decreases snap immediately so it never fights real-time balance updates.
export function useOdometer(value, duration = 800) {
  const [display, setDisplay] = useState(value);
  const prev = useRef(value);

  useEffect(() => {
    const from = prev.current;
    const to = value;
    if (to === from) return;
    prev.current = to;
    if (to < from) {
      setDisplay(to);
      return;
    }
    const start = performance.now();
    let raf;
    const tick = (now) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(from + (to - from) * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);

  return display;
}

// OdometerNumber — drop-in animated <span> for token/chip balances.
export default function OdometerNumber({ value, duration, className = "" }) {
  const display = useOdometer(value, duration);
  return <span className={className}>{display}</span>;
}