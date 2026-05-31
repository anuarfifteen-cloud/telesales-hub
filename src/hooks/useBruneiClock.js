import { useState, useEffect, useRef } from "react";

const TZ = "Asia/Brunei";

/** Returns a live Date object ticking every second, corrected to server time.
 *  The returned Date's UTC value is accurate — do NOT call toZonedTime() on it again. */
export function useBruneiClock(serverTimestamp = null, localFetchTime = null) {
  const offsetRef = useRef(0);

  const getCorrectedNow = () => new Date(Date.now() + offsetRef.current);

  const [now, setNow] = useState(getCorrectedNow);

  useEffect(() => {
    if (serverTimestamp && localFetchTime) {
      // offset = serverTime - deviceTimeAtResponseArrival
      // If device clock is set ahead, Date.now() is inflated → offset is negative → corrects forward manipulation
      const serverMs = new Date(serverTimestamp).getTime();
      const localMs = new Date(localFetchTime).getTime();
      offsetRef.current = serverMs - localMs;
    } else {
      offsetRef.current = 0;
    }

    // Immediately update now with the corrected time
    setNow(new Date(Date.now() + offsetRef.current));

    const id = setInterval(() => {
      setNow(new Date(Date.now() + offsetRef.current));
    }, 1000);

    return () => clearInterval(id);
  }, [serverTimestamp, localFetchTime]);

  return now;
}