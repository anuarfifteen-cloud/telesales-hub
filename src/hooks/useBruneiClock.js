import { useState, useEffect, useRef } from "react";
import { toZonedTime } from "date-fns-tz";

const TZ = "Asia/Brunei";

/** Returns a live Date object ticking every second, always in Brunei timezone.
 *  Accepts an optional server timestamp + local fetch time to correct device clock drift. */
export function useBruneiClock(serverTimestamp = null, localFetchTime = null) {
  const [now, setNow] = useState(() => toZonedTime(new Date(), TZ));
  const offsetRef = useRef(0);

  useEffect(() => {
    if (serverTimestamp && localFetchTime) {
      const serverDate = new Date(serverTimestamp);
      offsetRef.current = serverDate.getTime() - localFetchTime.getTime();
    } else {
      offsetRef.current = 0;
    }

    const id = setInterval(() => {
      const corrected = new Date(new Date().getTime() + offsetRef.current);
      setNow(toZonedTime(corrected, TZ));
    }, 1000);

    return () => clearInterval(id);
  }, [serverTimestamp, localFetchTime]);

  return now;
}