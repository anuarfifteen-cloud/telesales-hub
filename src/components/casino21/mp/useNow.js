import { useEffect, useState } from "react";

// Shared 1-second clock for the betting and turn countdowns. It only ticks
// while the tab is visible, matching the table's visible-only network rule.
export default function useNow(interval = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const iv = setInterval(() => {
      if (document.visibilityState === "visible") setNow(Date.now());
    }, interval);
    return () => clearInterval(iv);
  }, [interval]);
  return now;
}