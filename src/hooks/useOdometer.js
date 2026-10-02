import { useState, useEffect, useRef } from "react";

// Counts a number upward (easeOutCubic) toward `value`; jumps instantly on decrease.
export function useOdometer(value, duration = 800) {
  const [display, setDisplay] = useState(() => Number(value) || 0);
  const rafRef = useRef(null);
  const startRef = useRef(null);

  useEffect(() => {
    const target = Number(value) || 0;
    const from = Number(display) || 0;
    if (target === from) return;
    if (target < from) {
      setDisplay(target);
      return;
    }
    cancelAnimationFrame(rafRef.current);
    startRef.current = null;
    const animate = (t) => {
      if (startRef.current === null) startRef.current = t;
      const elapsed = t - startRef.current;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(from + (target - from) * eased));
      if (progress < 1) rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, duration]);

  return display;
}