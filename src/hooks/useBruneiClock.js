import { useState, useEffect } from "react";
import { toZonedTime } from "date-fns-tz";

const TZ = "Asia/Brunei";

/** Returns a live Date object ticking every second, always in Brunei timezone. */
export function useBruneiClock() {
  const [now, setNow] = useState(() => toZonedTime(new Date(), TZ));

  useEffect(() => {
    const id = setInterval(() => {
      setNow(toZonedTime(new Date(), TZ));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  return now;
}